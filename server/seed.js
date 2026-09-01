// 全新部署（空库）时写入 PPT《技术中心设备研发2026年（1-7）月》的真实数据
// 照片需通过 node server/import-ppt.js 从 PPT 提取导入
import { all, insert, id, now } from './store.js'
import { EQUIPMENT, AUX_TOOLS, AUX_MONTHLY, LONGTOU_MONTHLY } from './ppt-data.js'

export function seedIfEmpty() {
  if (all().devices.length > 0) return

  const stamp = now()
  const deviceIds = {}
  const base = {
    model: '', description: '', country: '中国', site: '技术中心',
    installDate: '2026-01-01',
    note: 'PPT导入', createdAt: stamp, updatedAt: stamp,
  }

  for (const eq of EQUIPMENT) {
    const rec = insert('devices', { id: id(), ...base, code: eq.code, name: eq.name, category: '设备', type: '研发设备', model: eq.code })
    deviceIds[eq.code] = rec.id
  }
  for (const aux of AUX_TOOLS) {
    const rec = insert('devices', { id: id(), ...base, code: aux.code, name: aux.name, category: '辅助工具', type: aux.type, model: aux.code })
    deviceIds[aux.code] = rec.id
  }

  for (const eq of EQUIPMENT) {
    for (const [dest, qty] of Object.entries(eq.ship)) {
      insert('shipments', { id: id(), date: '2026-07-31', deviceId: deviceIds[eq.code], productLine: '设备', quantity: qty, destination: dest, note: '2026年1-7月汇总（PPT导入）' })
    }
  }
  const monthEnd = (ym) => {
    const [y, m] = ym.split('-').map(Number)
    return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
  }
  for (const [line, rows] of [['辅助工具', AUX_MONTHLY], ['龙头', LONGTOU_MONTHLY]]) {
    for (const [ym, dests] of rows) {
      for (const [dest, qty] of Object.entries(dests)) {
        if (!qty) continue
        insert('shipments', { id: id(), date: monthEnd(ym), deviceId: '', productLine: line, quantity: qty, destination: dest, note: 'PPT月度数据（PPT导入）' })
      }
    }
  }

  console.log('[seed] 空库，已写入 PPT 设备/辅具/出货数据（照片请运行 node server/import-ppt.js 导入）')
}
