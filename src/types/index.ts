export type Country = '中国' | '越南' | '柬埔寨'
export type Category = '设备' | '辅助工具'
export type ProductLine = '设备' | '辅助工具' | '龙头' | '零部件'

export interface Device {
  id: string
  code: string
  name: string
  category: Category
  type: string
  model: string
  description: string
  country: Country
  site: string
  installDate: string
  note: string
  createdAt: string
  updatedAt: string
}

export interface OutputEntry {
  id: string
  deviceId: string
  date: string // YYYY-MM-DD
  quantity: number
  good: number
}

export interface Shipment {
  id: string
  date: string
  deviceId: string
  productLine: ProductLine
  quantity: number
  destination: string
  note: string
}

export interface VideoItem {
  id: string
  deviceId: string
  title: string
  file: string
  originalName: string
  size: number
  uploadedBy: string
  uploadedAt: string
}

export interface PhotoItem {
  id: string
  deviceId: string
  caption: string
  file: string
  originalName: string
  size: number
  uploadedAt: string
}

export interface BoardData {
  devices: Device[]
  outputs: OutputEntry[]
  shipments: Shipment[]
  videos: VideoItem[]
  photos: PhotoItem[]
  serverTime: string
}

export interface ReportRow {
  device: Device
  days: number
  quantity: number
  good: number
  yieldRate: number | null
  shipped: number
}

export interface Report {
  from: string
  to: string
  rows: ReportRow[]
  totals: { quantity: number; good: number; shipped: number; deviceShipped: number; yieldRate: number | null }
  shipments: Shipment[]
  generatedAt: string
}

export const COUNTRIES: Country[] = ['中国', '越南', '柬埔寨']
export const CATEGORIES: Category[] = ['设备', '辅助工具']

// 设备三大分组：设备 / 零部件（龙头、压脚、托板等机器部件）/ 辅助工具（辅具、装置等）
export type Group = '设备' | '零部件' | '辅助工具'
export const GROUPS: Group[] = ['设备', '零部件', '辅助工具']
const PART_TYPES = ['龙头', '压脚', '托板']
export const deviceGroup = (d: { category: string; type: string }): Group =>
  d.category === '设备' ? '设备' : PART_TYPES.includes(d.type) ? '零部件' : '辅助工具'
// 出货产品线 → 分组（龙头归入零部件）
export const lineGroup = (line: string): Group =>
  line === '设备' ? '设备' : (line === '龙头' || line === '零部件') ? '零部件' : '辅助工具'
// 出货目的地 → 工厂名（去掉国家前缀）：越南德利 → 德利
export const destFactory = (dest: string) => dest.replace(/^(中国|越南|柬埔寨)/, '').trim() || dest

// 出货目的地 → 国家（PPT 中的工厂分布）
export const destCountry = (dest: string): Country => {
  if (dest.includes('柬埔寨')) return '柬埔寨'
  if (dest.includes('越南')) return '越南'
  return '中国'
}
export const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const fmtNum = (n: number) => n.toLocaleString('zh-CN')
export const fmtPct = (r: number | null) => (r === null ? '—' : `${(r * 100).toFixed(1)}%`)
