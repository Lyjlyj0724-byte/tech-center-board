import { useMemo } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import regionGeo from '@/assets/region.geo.json'
import type { Country, Shipment } from '@/types'
import { COUNTRIES, destCountry, fmtNum } from '@/types'

// 交互节点位置（真实经纬度，按画面构图摆放）
export const NODE: Record<Country, { lng: number; lat: number; color: string; anchor: 'start' | 'end' }> = {
  中国: { lng: 109.3, lat: 21.3, color: '#0891b2', anchor: 'start' },     // 中国版图左下方 · 北部湾沿岸
  越南: { lng: 106.8, lat: 10.9, color: '#059669', anchor: 'start' },     // 南部（胡志明周边）
  柬埔寨: { lng: 104.7, lat: 11.7, color: '#d97706', anchor: 'end' },     // 金边周边
}

interface Props {
  shipments: Shipment[]
  selected: Country | null
  onSelect: (c: Country | null) => void
}

interface GeoFeature {
  type: 'Feature'
  properties: { name: string; context?: boolean }
  geometry: GeoJSON.MultiPolygon
}

// 真实地图：50m 国界数据 + Mercator 投影，本地离线渲染
// 点击国家 / 节点 → 选中该国家，父组件展示工厂与设备清单
export function RegionMap({ shipments, selected, onSelect }: Props) {
  const W = 640
  const H = 400

  const { paths, project } = useMemo(() => {
    const fc = regionGeo as unknown as { features: GeoFeature[] }
    // 取景范围：华南沿海—中南半岛业务区（99.8°E–122.3°E, 7.5°N–30°N）
    // 只展示业务三国的局部边界线，无关区域自然裁出画面
    const focus = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [[[99.8, 7.5], [99.8, 30], [122.3, 30], [122.3, 7.5], [99.8, 7.5]]] },
    } as unknown as GeoJSON.Feature
    const projection = geoMercator().fitExtent(
      [[6, 6], [W - 6, H - 6]],
      focus,
    )
    const gen = geoPath(projection)
    return {
      paths: fc.features.map((f) => ({ name: f.properties.name, context: !!f.properties.context, d: gen(f as never) ?? '' })),
      project: (lng: number, lat: number) => projection([lng, lat]) as [number, number],
    }
  }, [])

  const stats = COUNTRIES.map((c) => {
    const ss = shipments.filter((s) => destCountry(s.destination) === c)
    const equipQty = ss.filter((s) => s.productLine === '设备').reduce((n, s) => n + s.quantity, 0)
    const auxQty = ss.filter((s) => s.productLine !== '设备').reduce((n, s) => n + s.quantity, 0)
    const [x, y] = project(NODE[c].lng, NODE[c].lat)
    return { country: c, equipQty, auxQty, x, y, color: NODE[c].color, anchor: NODE[c].anchor }
  })

  const cn = stats[0]
  const flows = stats.slice(1).map((s) => ({
    key: s.country,
    d: `M${cn.x},${cn.y} C ${(cn.x + s.x) / 2 + 30},${(cn.y + s.y) / 2 - 20} ${(cn.x + s.x) / 2 - 20},${(cn.y + s.y) / 2 + 30} ${s.x},${s.y}`,
  }))

  const toggle = (c: Country) => onSelect(selected === c ? null : c)
  const dim = (c: Country) => (selected && selected !== c ? 0.35 : 1)

  return (
    <div className="h-full w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="出货分布地图">
        {/* 底色 */}
        <rect x={0} y={0} width={W} height={H} fill="#f4f6f5" />

        {/* 三个业务国家的边界线（局部取景，不展示完整版图与周边国家） */}
        {paths.filter((p) => !p.context).map((p) => {
          const c = p.name as Country
          return (
            <path
              key={p.name}
              d={p.d}
              fill={selected === c ? '#e9e4db' : '#f1ede6'}
              stroke={selected === c ? NODE[c].color : '#b7afa3'}
              strokeWidth={selected === c ? 1.6 : 1.1}
              className="cursor-pointer transition-colors"
              opacity={dim(c)}
              onClick={() => toggle(c)}
            />
          )
        })}

        {/* 供应链流向线 */}
        {flows.map((f) => (
          <path key={f.key} d={f.d} fill="none" stroke="#0891b2" strokeWidth={1} strokeDasharray="3 7" opacity={0.45} />
        ))}

        {/* 国家节点（可点击按钮） */}
        {stats.map((s) => (
          <g key={s.country} className="cursor-pointer" opacity={dim(s.country)} onClick={() => toggle(s.country)}>
            <circle cx={s.x} cy={s.y} r={24} fill="transparent" />
            {selected === s.country && (
              <circle cx={s.x} cy={s.y} r={13} fill="none" stroke={s.color} strokeWidth={1.5} strokeDasharray="3 3" />
            )}
            <circle cx={s.x} cy={s.y} r={selected === s.country ? 8 : 6} fill={s.color} opacity={0.95} stroke="#fff" strokeWidth={1.5} />
            <text
              x={s.anchor === 'start' ? s.x + 15 : s.x - 15}
              y={s.y - 8}
              textAnchor={s.anchor}
              fill="#1a1a1a"
              fontSize={13}
              fontWeight={600}
              style={{ paintOrder: 'stroke', stroke: '#fbfaf8', strokeWidth: 3 }}
            >
              {s.country}
            </text>
            <text
              x={s.anchor === 'start' ? s.x + 15 : s.x - 15}
              y={s.y + 8}
              textAnchor={s.anchor}
              fill="#64748b"
              fontSize={10}
              className="mono"
              style={{ paintOrder: 'stroke', stroke: '#fbfaf8', strokeWidth: 3 }}
            >
              设备 {fmtNum(s.equipQty)} 台
            </text>
            <text
              x={s.anchor === 'start' ? s.x + 15 : s.x - 15}
              y={s.y + 22}
              textAnchor={s.anchor}
              fill={s.color}
              fontSize={10}
              className="mono"
              style={{ paintOrder: 'stroke', stroke: '#fbfaf8', strokeWidth: 3 }}
            >
              零部件/辅具 {fmtNum(s.auxQty)} 个
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
