// 轻量 JSON 文件数据库：适合局域网内小规模协作（几人~几十人同时编辑）
// 原子写入（临时文件 + 重命名），防抖保存，避免损坏
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
export const DATA_DIR = path.join(ROOT, 'data')
export const UPLOAD_DIR = path.join(ROOT, 'uploads')
const DB_FILE = path.join(DATA_DIR, 'db.json')

for (const dir of [DATA_DIR, UPLOAD_DIR]) {
  fs.mkdirSync(dir, { recursive: true })
}

const empty = () => ({ devices: [], outputs: [], shipments: [], videos: [], photos: [] })

let db = empty()
if (fs.existsSync(DB_FILE)) {
  try {
    db = { ...empty(), ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }
  } catch (err) {
    const backup = DB_FILE + '.broken-' + Date.now()
    fs.copyFileSync(DB_FILE, backup)
    console.error(`[store] 数据文件损坏，已备份到 ${backup}，从空库启动`)
  }
}

let saveTimer = null
function persist() {
  const tmp = DB_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2))
  fs.renameSync(tmp, DB_FILE)
}
export function save() {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    try { persist() } catch (err) { console.error('[store] 保存失败:', err) }
  }, 200)
}
process.on('exit', () => { if (saveTimer) persist() })

export const id = () => crypto.randomUUID()
export const now = () => new Date().toISOString()

export function all() { return db }
export function collection(name) { return db[name] }

export function insert(name, record) {
  db[name].push(record)
  save()
  return record
}

export function update(name, rid, patch) {
  const item = db[name].find((r) => r.id === rid)
  if (!item) return null
  Object.assign(item, patch)
  save()
  return item
}

export function remove(name, rid) {
  const i = db[name].findIndex((r) => r.id === rid)
  if (i === -1) return false
  db[name].splice(i, 1)
  save()
  return true
}

// upsert：同一 deviceId + date 只保留一条产量记录
export function upsertOutput({ deviceId, date, quantity, good }) {
  const existing = db.outputs.find((o) => o.deviceId === deviceId && o.date === date)
  if (existing) {
    existing.quantity = quantity
    existing.good = good
    save()
    return existing
  }
  const record = { id: id(), deviceId, date, quantity, good }
  db.outputs.push(record)
  save()
  return record
}
