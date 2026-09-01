import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { RegionMap } from '@/components/RegionMap'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { BoardData, Country, Group } from '@/types'
import { GROUPS, destCountry, destFactory, deviceGroup, fmtNum, lineGroup, todayStr } from '@/types'

const GROUP_COLOR: Record<Group, string> = { 设备: '#0891b2', 零部件: '#b45309', 辅助工具: '#d97706' }
const GROUP_UNIT: Record<Group, string> = { 设备: '台', 零部件: '个', 辅助工具: '个' }

/** 地区/工厂设备卡：图片 + 编号 + 名称 + 数量，图片加载失败时显示占位 */
function RegionDeviceCard({
  code, name, group, total, photos, to,
}: {
  code: string; name: string; group: Group; total: number
  photos: { id: string; file: string }[]; to: string
}) {
  const [imgError, setImgError] = useState(false)
  const cover = photos[0]
  return (
    <Link to={to} className="block overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/60">
      <div className="flex w-full items-center justify-center bg-slate-100 p-2">
        {cover && !imgError ? (
          <img src={`/uploads/${cover.file}`} alt={name}
            onError={() => setImgError(true)}
            className="block max-h-[280px] w-full object-contain" />
        ) : (
          <span className="py-12 text-xs text-muted-foreground">暂无照片</span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="mono text-xs text-primary">{code}</span>
          <span className="mono text-sm font-semibold" style={{ color: GROUP_COLOR[group] }}>
            {fmtNum(total)} {GROUP_UNIT[group]}
          </span>
        </div>
        <div className="mt-1 text-sm font-medium leading-snug">{name}</div>
        {photos.length > 1 && (
          <div className="mt-1 text-[10px] text-muted-foreground">共 {photos.length} 张照片，点击查看全部 →</div>
        )}
      </div>
    </Link>
  )
}

interface FactoryStat {
  factory: string
  total: number
  byGroup: Record<Group, number>
  deviceIds: Map<string, number> // 关联设备的出货量
  bulk: { line: string; qty: number }[] // 未关联设备的散装出货
}

export default function Dashboard({ board }: { board: BoardData }) {
  const { devices, shipments, photos } = board
  const [selected, setSelected] = useState<Country | null>(null)
  const [factory, setFactory] = useState<string | null>(null)

  // 类型分布：设备 / 零部件 / 辅助工具 三大分组
  const byGroup = useMemo(() => {
    const m = new Map<Group, number>(GROUPS.map((g) => [g, 0]))
    for (const d of devices) m.set(deviceGroup(d), (m.get(deviceGroup(d)) ?? 0) + 1)
    return m
  }, [devices])

  const month = todayStr().slice(0, 7)
  const monthShip = useMemo(
    () => shipments.filter((s) => s.date.startsWith(month)).reduce((n, s) => n + s.quantity, 0),
    [shipments, month],
  )

  // 选中国家的工厂列表：按出货目的地聚合
  const factories = useMemo<FactoryStat[]>(() => {
    if (!selected) return []
    const deviceIds = new Set(devices.map((d) => d.id))
    const map = new Map<string, FactoryStat>()
    for (const s of shipments) {
      if (destCountry(s.destination) !== selected) continue
      const fname = destFactory(s.destination || '未填写目的地')
      const rec: FactoryStat = map.get(fname) ?? {
        factory: fname, total: 0,
        byGroup: { 设备: 0, 零部件: 0, 辅助工具: 0 },
        deviceIds: new Map(), bulk: [],
      }
      rec.total += s.quantity
      rec.byGroup[lineGroup(s.productLine)] += s.quantity
      if (s.deviceId && deviceIds.has(s.deviceId)) {
        rec.deviceIds.set(s.deviceId, (rec.deviceIds.get(s.deviceId) ?? 0) + s.quantity)
      } else {
        const b = rec.bulk.find((x) => x.line === s.productLine)
        if (b) b.qty += s.quantity
        else rec.bulk.push({ line: s.productLine, qty: s.quantity })
      }
      map.set(fname, rec)
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [selected, shipments, devices])

  // 选中工厂的设备清单
  const factoryDevices = useMemo(() => {
    const f = factories.find((x) => x.factory === factory)
    if (!f) return null
    const cards = [...f.deviceIds.entries()]
      .map(([deviceId, total]) => ({
        deviceId,
        total,
        device: devices.find((d) => d.id === deviceId),
        photos: photos.filter((p) => p.deviceId === deviceId),
      }))
      .filter((r) => r.device)
      .sort((a, b) => b.total - a.total)
    return { stat: f, cards }
  }, [factories, factory, devices, photos])

  const openCountry = (c: Country | null) => { setSelected(c); setFactory(null) }

  return (
    <div className="space-y-4">
      {/* 主区：左类型分布 / 右地图（大屏两栏同高、底边对齐） */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="panel flex flex-col lg:col-span-3 lg:h-[520px]">
          <div className="hairline-b shrink-0 px-3 py-2 label">机器类型分布</div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {GROUPS.map((g) => {
              const count = byGroup.get(g) ?? 0
              return (
                <div key={g}>
                  <div className="flex justify-between text-xs">
                    <span>{g}</span>
                    <span className="mono text-muted-foreground">{count} 种</span>
                  </div>
                  <div className="mt-1 h-1 w-full bg-border">
                    <div className="h-full" style={{ width: `${devices.length ? (count / devices.length) * 100 : 0}%`, background: GROUP_COLOR[g] }} />
                  </div>
                </div>
              )
            })}
            {devices.length === 0 && <div className="text-xs text-muted-foreground">暂无设备</div>}
          </div>
        </div>

        <div className="panel flex flex-col lg:col-span-9 lg:h-[520px]">
          <div className="hairline-b shrink-0 px-3 py-2 label">出货分布（点击国家查看工厂与设备清单）</div>
          <div className="relative min-h-0 flex-1">
            <RegionMap shipments={shipments} selected={selected} onSelect={openCountry} />
          </div>
        </div>
      </div>

      {/* 底部统计条：型号与本月出货 */}
      <div className="panel flex flex-wrap items-center gap-x-6 gap-y-1 px-3 py-2.5 text-xs">
        <span className="label">型号统计</span>
        <span className="text-muted-foreground">
          {GROUPS.map((g, i) => (
            <span key={g}>
              {i > 0 && ' · '}{g} <span className="mono font-semibold" style={{ color: GROUP_COLOR[g] }}>{byGroup.get(g) ?? 0}</span>
            </span>
          ))}
          <span className="mono text-foreground">（共 {devices.length}）</span>
        </span>
        <span className="label">本月出货</span>
        <span className="text-muted-foreground">
          <span className="mono font-semibold text-foreground">{fmtNum(monthShip)}</span>（{month} 累计，含零部件/辅具）
        </span>
      </div>

      {/* 国家 → 工厂 → 设备清单 两级弹窗 */}
      <Dialog open={selected !== null} onOpenChange={(open) => !open && openCountry(null)}>
        <DialogContent className="flex h-[85vh] max-w-4xl flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-base font-semibold">
              {factory ? (
                <span className="flex items-center gap-2">
                  <button onClick={() => setFactory(null)} className="text-sm font-normal text-primary hover:underline">← 返回工厂</button>
                  {selected} · {factory}
                  <span className="text-sm font-normal text-muted-foreground">设备清单</span>
                </span>
              ) : (
                <span>{selected} · 工厂<span className="ml-2 text-sm font-normal text-muted-foreground">{factories.length} 个 · 出货合计 {fmtNum(factories.reduce((n, f) => n + f.total, 0))}</span></span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* 第一级：工厂列表 */}
          {!factory && (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {factories.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">该地区暂无出货记录</div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {factories.map((f) => (
                    <button key={f.factory} onClick={() => setFactory(f.factory)}
                      className="rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/60 hover:bg-accent/40">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold">{f.factory}</span>
                        <span className="mono text-sm text-muted-foreground">合计 {fmtNum(f.total)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {GROUPS.filter((g) => f.byGroup[g] > 0).map((g) => (
                          <span key={g}>{g} <span className="mono font-semibold" style={{ color: GROUP_COLOR[g] }}>{fmtNum(f.byGroup[g])}</span> {GROUP_UNIT[g]}</span>
                        ))}
                      </div>
                      <div className="mt-2 text-[10px] text-primary">关联设备 {f.deviceIds.size} 种 · 查看设备清单 →</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 第二级：工厂设备清单 */}
          {factory && factoryDevices && (
            <>
              <div className="grid shrink-0 grid-cols-3 gap-2">
                {GROUPS.map((g) => (
                  <div key={g} className="rounded-lg border border-border px-3 py-2">
                    <div className="label">{g}出货</div>
                    <div className="bignum mt-0.5 text-lg" style={{ color: GROUP_COLOR[g] }}>
                      {fmtNum(factoryDevices.stat.byGroup[g])} {GROUP_UNIT[g]}
                    </div>
                  </div>
                ))}
              </div>
              {factoryDevices.stat.bulk.length > 0 && (
                <div className="shrink-0 rounded-lg border border-dashed border-border px-3 py-2">
                  <div className="label">散装出货（未关联设备档案，已计入上方汇总）</div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {factoryDevices.stat.bulk.map((b) => (
                      <span key={b.line}>{b.line} <span className="mono font-semibold text-[#d97706]">{fmtNum(b.qty)}</span> 个</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {factoryDevices.cards.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">该工厂暂无关联设备的出货记录</div>
                ) : (
                  <div className="columns-1 gap-3 sm:columns-2">
                    {factoryDevices.cards.map((r) => (
                      <div key={r.deviceId} className="mb-3 break-inside-avoid">
                        <RegionDeviceCard
                          to={`/devices/${r.deviceId}`}
                          code={r.device!.code}
                          name={r.device!.name}
                          group={deviceGroup(r.device!)}
                          total={r.total}
                          photos={r.photos}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
