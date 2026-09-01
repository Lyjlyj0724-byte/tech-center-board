// 技术中心设备看板 · 后端服务
// 局域网部署：默认监听 0.0.0.0:8100，同网段电脑用 http://<本机IP>:8100 访问
// 开发模式由 Vite 代理 /api 与 /uploads；生产模式直接托管 dist/
import express from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { all, collection, insert, update, remove, upsertOutput, id, now, UPLOAD_DIR } from './store.js'
import { seedIfEmpty } from './seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PORT = Number(process.env.PORT || 8100)
const HOST = process.env.HOST || '0.0.0.0'

seedIfEmpty()

const app = express()
app.use(express.json({ limit: '2mb' }))

// ── 视频上传 ──────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 10) || '.mp4'
    cb(null, `${id()}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 单个视频最大 1GB
  fileFilter: (_req, file, cb) => {
    if ((file.mimetype || '').startsWith('video/')) return cb(null, true)
    // 部分浏览器对 .avi/.mov 不填 mimetype，按扩展名放行
    const ok = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'].includes(
      path.extname(file.originalname || '').toLowerCase(),
    )
    cb(ok ? null : new Error('仅支持视频文件'), ok)
  },
})

// ── 照片上传 ──
const photoUpload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 单张照片最大 30MB
  fileFilter: (_req, file, cb) => {
    const mimeOk = (file.mimetype || '').startsWith('image/')
    const extOk = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(
      path.extname(file.originalname || '').toLowerCase(),
    )
    cb(mimeOk || extOk ? null : new Error('仅支持图片文件'), mimeOk || extOk)
  },
})

// 上传的文件名里有中文时 multer 拿到的是 latin1，这里转回 utf8
const fixName = (name) => {
  try { return Buffer.from(name, 'latin1').toString('utf8') } catch { return name }
}

app.use('/uploads', express.static(UPLOAD_DIR))

// ── 数据接口 ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, time: now() }))

// 一次性拉取全部数据（看板轮询用）
app.get('/api/bootstrap', (_req, res) => {
  res.json({ ...all(), serverTime: now() })
})

// ── 设备 ──
const COUNTRIES = ['中国', '越南', '柬埔寨']
const CATEGORIES = ['设备', '辅助工具']

app.post('/api/devices', (req, res) => {
  const b = req.body || {}
  if (!b.code || !b.name || !b.type || !COUNTRIES.includes(b.country)) {
    return res.status(400).json({ error: '设备编号、名称、类型、国家为必填项' })
  }
  if (collection('devices').some((d) => d.code === b.code)) {
    return res.status(409).json({ error: `设备编号 ${b.code} 已存在` })
  }
  const stamp = now()
  const rec = insert('devices', {
    id: id(),
    code: String(b.code).trim(),
    name: String(b.name).trim(),
    category: CATEGORIES.includes(b.category) ? b.category : '设备',
    type: String(b.type).trim(),
    model: String(b.model || '').trim(),
    description: String(b.description || '').trim(),
    country: b.country,
    site: String(b.site || '').trim(),
    installDate: b.installDate || '',
    note: String(b.note || '').trim(),
    createdAt: stamp,
    updatedAt: stamp,
  })
  res.status(201).json(rec)
})

app.put('/api/devices/:rid', (req, res) => {
  const b = req.body || {}
  const patch = { updatedAt: now() }
  for (const k of ['code', 'name', 'type', 'model', 'site', 'installDate', 'note', 'description']) {
    if (b[k] !== undefined) patch[k] = String(b[k]).trim()
  }
  if (b.country !== undefined && COUNTRIES.includes(b.country)) patch.country = b.country
  if (b.category !== undefined && CATEGORIES.includes(b.category)) patch.category = b.category
  const rec = update('devices', req.params.rid, patch)
  if (!rec) return res.status(404).json({ error: '设备不存在' })
  res.json(rec)
})

app.delete('/api/devices/:rid', (req, res) => {
  const rid = req.params.rid
  if (!remove('devices', rid)) return res.status(404).json({ error: '设备不存在' })
  // 级联删除产量、视频与照片记录（文件一并清理）
  for (const o of collection('outputs').filter((o) => o.deviceId === rid)) remove('outputs', o.id)
  for (const v of collection('videos').filter((v) => v.deviceId === rid)) {
    fs.rm(path.join(UPLOAD_DIR, v.file), () => {})
    remove('videos', v.id)
  }
  for (const p of collection('photos').filter((p) => p.deviceId === rid)) {
    fs.rm(path.join(UPLOAD_DIR, p.file), () => {})
    remove('photos', p.id)
  }
  res.json({ ok: true })
})

// ── 日产量（同一设备同一天 upsert）──
app.post('/api/outputs/bulk', (req, res) => {
  const { date, entries } = req.body || {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Array.isArray(entries)) {
    return res.status(400).json({ error: '参数格式不正确' })
  }
  const deviceIds = new Set(collection('devices').map((d) => d.id))
  const saved = []
  for (const e of entries) {
    if (!deviceIds.has(e.deviceId)) continue
    const quantity = Math.max(0, Number(e.quantity) || 0)
    const good = Math.min(quantity, Math.max(0, Number(e.good) || 0))
    saved.push(upsertOutput({ deviceId: e.deviceId, date, quantity, good }))
  }
  res.json({ ok: true, count: saved.length })
})

// ── 出货 ──
app.post('/api/shipments', (req, res) => {
  const b = req.body || {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '') || !(Number(b.quantity) > 0)) {
    return res.status(400).json({ error: '出货日期与数量为必填项' })
  }
  const rec = insert('shipments', {
    id: id(),
    date: b.date,
    deviceId: b.deviceId || '',
    productLine: ['设备', '辅助工具', '龙头'].includes(b.productLine) ? b.productLine : '设备',
    quantity: Number(b.quantity),
    destination: String(b.destination || '').trim(),
    note: String(b.note || '').trim(),
  })
  res.status(201).json(rec)
})

app.delete('/api/shipments/:rid', (req, res) => {
  if (!remove('shipments', req.params.rid)) return res.status(404).json({ error: '记录不存在' })
  res.json({ ok: true })
})

app.put('/api/shipments/:rid', (req, res) => {
  const b = req.body || {}
  const patch = {}
  if (b.date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return res.status(400).json({ error: '日期格式不正确' })
    patch.date = b.date
  }
  if (b.quantity !== undefined) {
    if (!(Number(b.quantity) > 0)) return res.status(400).json({ error: '数量必须大于 0' })
    patch.quantity = Number(b.quantity)
  }
  if (b.deviceId !== undefined) patch.deviceId = String(b.deviceId)
  if (b.productLine !== undefined && ['设备', '辅助工具', '龙头'].includes(b.productLine)) patch.productLine = b.productLine
  if (b.destination !== undefined) patch.destination = String(b.destination).trim()
  if (b.note !== undefined) patch.note = String(b.note).trim()
  const rec = update('shipments', req.params.rid, patch)
  if (!rec) return res.status(404).json({ error: '记录不存在' })
  res.json(rec)
})

// ── 视频 ──
app.post('/api/devices/:rid/videos', upload.single('video'), (req, res) => {
  const device = collection('devices').find((d) => d.id === req.params.rid)
  if (!device) {
    if (req.file) fs.rm(req.file.path, () => {})
    return res.status(404).json({ error: '设备不存在' })
  }
  if (!req.file) return res.status(400).json({ error: '未收到视频文件' })
  const originalName = fixName(req.file.originalname || req.file.filename)
  const rec = insert('videos', {
    id: id(),
    deviceId: device.id,
    title: String(req.body.title || originalName).trim(),
    file: req.file.filename,
    originalName,
    size: req.file.size,
    uploadedBy: String(req.body.uploadedBy || '').trim(),
    uploadedAt: now(),
  })
  res.status(201).json(rec)
})

app.delete('/api/videos/:rid', (req, res) => {
  const v = collection('videos').find((x) => x.id === req.params.rid)
  if (!v) return res.status(404).json({ error: '视频不存在' })
  fs.rm(path.join(UPLOAD_DIR, v.file), () => {})
  remove('videos', v.id)
  res.json({ ok: true })
})

// ── 照片 ──
app.post('/api/devices/:rid/photos', photoUpload.single('photo'), (req, res) => {
  const device = collection('devices').find((d) => d.id === req.params.rid)
  if (!device) {
    if (req.file) fs.rm(req.file.path, () => {})
    return res.status(404).json({ error: '设备不存在' })
  }
  if (!req.file) return res.status(400).json({ error: '未收到照片文件' })
  const originalName = fixName(req.file.originalname || req.file.filename)
  const rec = insert('photos', {
    id: id(),
    deviceId: device.id,
    caption: String(req.body.caption || '').trim(),
    file: req.file.filename,
    originalName,
    size: req.file.size,
    uploadedAt: now(),
  })
  res.status(201).json(rec)
})

app.delete('/api/photos/:rid', (req, res) => {
  const p = collection('photos').find((x) => x.id === req.params.rid)
  if (!p) return res.status(404).json({ error: '照片不存在' })
  fs.rm(path.join(UPLOAD_DIR, p.file), () => {})
  remove('photos', p.id)
  res.json({ ok: true })
})

// ── 报表聚合 ──
app.get('/api/report', (req, res) => {
  const { from, to } = req.query
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(to || '')) {
    return res.status(400).json({ error: '请提供 from 与 to（YYYY-MM-DD）' })
  }
  const inRange = (d) => d >= from && d <= to
  const devices = collection('devices')
  const rows = devices.map((d) => {
    const outs = collection('outputs').filter((o) => o.deviceId === d.id && inRange(o.date))
    const quantity = outs.reduce((s, o) => s + o.quantity, 0)
    const good = outs.reduce((s, o) => s + o.good, 0)
    const shipped = collection('shipments')
      .filter((s) => s.deviceId === d.id && inRange(s.date))
      .reduce((s, x) => s + x.quantity, 0)
    return {
      device: d,
      days: outs.length,
      quantity,
      good,
      yieldRate: quantity > 0 ? good / quantity : null,
      shipped,
    }
  })
  const totals = rows.reduce(
    (t, r) => ({
      quantity: t.quantity + r.quantity,
      good: t.good + r.good,
      shipped: t.shipped + r.shipped,
    }),
    { quantity: 0, good: 0, shipped: 0 },
  )
  totals.yieldRate = totals.quantity > 0 ? totals.good / totals.quantity : null
  const shipments = collection('shipments').filter((s) => inRange(s.date))
  // deviceShipped：已关联设备档案的出货（与设备明细表各行一致）；
  // shipped：周期内全部出货（含未关联设备档案的散装出货，与出货明细表一致）
  totals.deviceShipped = totals.shipped
  totals.shipped = shipments.reduce((n, s) => n + s.quantity, 0)
  res.json({ from, to, rows, totals, shipments, generatedAt: now() })
})

// ── 生产模式：托管前端构建产物 ──
const DIST = path.join(ROOT, 'dist')
if (fs.existsSync(DIST)) {
  // index.html 禁止缓存，保证浏览器每次都拿到最新版本入口；带哈希的静态资源可长缓存
  app.use((req, res, next) => {
    if (req.path === '/' || req.path.endsWith('.html')) {
      res.set('Cache-Control', 'no-store, must-revalidate')
    }
    next()
  })
  app.use(express.static(DIST, {
    setHeaders(res, filePath) {
      if (/assets[\\/].+\.(js|css)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }
    },
  }))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next()
    res.set('Cache-Control', 'no-store, must-revalidate')
    res.sendFile(path.join(DIST, 'index.html'))
  })
}

app.listen(PORT, HOST, () => {
  console.log(`[server] 技术中心设备看板后端已启动: http://${HOST}:${PORT}`)
  if (fs.existsSync(DIST)) console.log(`[server] 检测到 dist/，局域网访问入口: http://<本机IP>:${PORT}`)
})
