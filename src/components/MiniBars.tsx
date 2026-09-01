interface Props {
  data: Array<{ label: string; value: number; title?: string }>
  height?: number
  color?: string
}

// 轻量 SVG 柱状图（最近 N 天趋势）
export function MiniBars({ data, height = 120, color = '#0891b2' }: Props) {
  if (data.length === 0) return <div className="text-xs text-muted-foreground">暂无数据</div>
  const max = Math.max(...data.map((d) => d.value), 1)
  const W = 100 / data.length
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 18)
        return (
          <g key={d.label}>
            <title>{d.title ?? `${d.label}: ${d.value.toLocaleString('zh-CN')}`}</title>
            <rect
              x={i * W + W * 0.18}
              y={height - 14 - h}
              width={W * 0.64}
              height={Math.max(h, 0.5)}
              fill={color}
              opacity={i === data.length - 1 ? 1 : 0.45 + (0.55 * d.value) / max}
            />
            {(i % Math.ceil(data.length / 7) === 0 || i === data.length - 1) && (
              <text x={i * W + W / 2} y={height - 3} fontSize={6} fill="#7f96b8" textAnchor="middle">
                {d.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
