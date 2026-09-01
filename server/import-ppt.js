// 将 PPT《技术中心设备研发2026年（1-7）月》的数据导入系统
// 幂等：先清除示例数据与此前导入的 PPT 数据，再重新导入
// 用法：node server/import-ppt.js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { all, insert, remove, id, now, UPLOAD_DIR } from './store.js'
import { EQUIPMENT, AUX_TOOLS, AUX_MONTHLY, LONGTOU_MONTHLY } from './ppt-data.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const STAGING = path.resolve(ROOT, '..', 'ppt-media-tmp')

const db = all()

// ── 1. 清除示例数据与旧的 PPT 导入 ──
const isSample = (r) => r.note === '示例数据'
const isPptImport = (r) => (r.note || '').includes('PPT导入')
const purgeDeviceIds = new Set(
  db.devices.filter((d) => isSample(d) || isPptImport(d)).map((d) => d.id),
)
for (const did of purgeDeviceIds) {
  for (const o of db.outputs.filter((o) => o.deviceId === did)) remove('outputs', o.id)
  for (const v of db.videos.filter((v) => v.deviceId === did)) {
    fs.rm(path.join(UPLOAD_DIR, v.file), () => {})
    remove('videos', v.id)
  }
  for (const p of db.photos.filter((p) => p.deviceId === did)) {
    fs.rm(path.join(UPLOAD_DIR, p.file), () => {})
    remove('photos', p.id)
  }
  remove('devices', did)
}
// 出货记录的备注可能被用户清空，因此按「内容特征」识别旧的 PPT 导入记录：
// a) 设备汇总出货：日期为 2026-07-31 且关联设备/目的地/数量与 PPT 一致
// b) 辅具/龙头月度出货：无关联设备，且 月份/目的地/数量/产品线 与 PPT 一致
const monthEnd = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
}
const pptTuples = new Set()
for (const eq of EQUIPMENT) {
  for (const [dest, qty] of Object.entries(eq.ship)) pptTuples.add(`设备|2026-07-31|${dest}|${qty}`)
}
for (const [line, rows] of [['辅助工具', AUX_MONTHLY], ['龙头', LONGTOU_MONTHLY]]) {
  for (const [ym, dests] of rows) {
    for (const [dest, qty] of Object.entries(dests)) {
      if (qty) pptTuples.add(`${line}|${monthEnd(ym)}|${dest}|${qty}`)
    }
  }
}
const isOldPptShipment = (s) =>
  isSample(s) || isPptImport(s) ||
  purgeDeviceIds.has(s.deviceId) ||
  pptTuples.has(`${s.productLine ?? '设备'}|${s.date}|${s.destination}|${s.quantity}`)
for (const s of db.shipments.filter(isOldPptShipment)) remove('shipments', s.id)
console.log(`[import] 已清除示例/旧导入设备 ${purgeDeviceIds.size} 条`)

// ── 2. 导入设备与辅具 ──
const stamp = now()
const deviceIds = {}

for (const eq of EQUIPMENT) {
  const rec = insert('devices', {
    id: id(),
    code: eq.code,
    name: eq.name,
    category: '设备',
    type: '研发设备',
    model: eq.code,
    description: '',
    country: '中国',
    site: '技术中心',
    installDate: '2026-01-01',
    note: 'PPT导入',
    createdAt: stamp,
    updatedAt: stamp,
  })
  deviceIds[eq.code] = rec.id
}

for (const aux of AUX_TOOLS) {
  const rec = insert('devices', {
    id: id(),
    code: aux.code,
    name: aux.name,
    category: '辅助工具',
    type: aux.type,
    model: aux.code,
    description: '',
    country: '中国',
    site: '技术中心',
    installDate: '2026-01-01',
    note: 'PPT导入',
    createdAt: stamp,
    updatedAt: stamp,
  })
  deviceIds[aux.code] = rec.id
}
console.log(`[import] 已导入设备 ${EQUIPMENT.length} 种、辅助工具 ${AUX_TOOLS.length} 种`)

// ── 3. 导入出货数据 ──
let shipCount = 0
// 3a. 设备 1-7 月出货（PPT 第 4 页，按目的地汇总）
for (const eq of EQUIPMENT) {
  for (const [dest, qty] of Object.entries(eq.ship)) {
    insert('shipments', {
      id: id(),
      date: '2026-07-31',
      deviceId: deviceIds[eq.code],
      productLine: '设备',
      quantity: qty,
      destination: dest,
      note: '',
    })
    shipCount++
  }
}
// 3b. 辅具 / 龙头月度出货（PPT 第 8、9 页）
for (const [line, rows] of [['辅助工具', AUX_MONTHLY], ['龙头', LONGTOU_MONTHLY]]) {
  for (const [ym, dests] of rows) {
    for (const [dest, qty] of Object.entries(dests)) {
      if (!qty) continue
      insert('shipments', {
        id: id(),
        date: monthEnd(ym),
        deviceId: '',
        productLine: line,
        quantity: qty,
        destination: dest,
        note: '',
      })
      shipCount++
    }
  }
}
console.log(`[import] 已导入出货记录 ${shipCount} 条`)

// ── 4. 导入照片 ──
let photoCount = 0
const photoOf = [
  ...EQUIPMENT.filter((e) => e.photoKey).map((e) => ({ code: e.code, key: e.photoKey })),
  ...AUX_TOOLS.map((a) => ({ code: a.code, key: a.photoKey })),
]
for (const { code, key } of photoOf) {
  const src = path.join(STAGING, `${key}.jpg`)
  if (!fs.existsSync(src)) {
    console.warn(`[import] 缺少照片 ${key}.jpg（${code}），跳过`)
    continue
  }
  const file = `${id()}.jpg`
  fs.copyFileSync(src, path.join(UPLOAD_DIR, file))
  insert('photos', {
    id: id(),
    deviceId: deviceIds[code],
    caption: 'PPT 展示照片',
    file,
    originalName: `${key}.jpg`,
    size: fs.statSync(src).size,
    uploadedAt: stamp,
  })
  photoCount++
}
console.log(`[import] 已导入照片 ${photoCount} 张`)
console.log('[import] 完成 ✓')
