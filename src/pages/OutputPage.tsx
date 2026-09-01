import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import type { BoardData } from '@/types'
import { COUNTRIES, fmtNum, todayStr } from '@/types'

export default function OutputPage({ board, refresh }: { board: BoardData; refresh: () => void }) {
  const { devices: allDevices, outputs } = board
  // 日产量只针对「设备」类别（辅助工具按出货量统计）
  const devices = useMemo(() => allDevices.filter((d) => d.category === '设备'), [allDevices])
  const [date, setDate] = useState(todayStr())
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // 载入所选日期的已有记录
  useEffect(() => {
    const d: Record<string, string> = {}
    for (const dev of devices) {
      const rec = outputs.find((o) => o.deviceId === dev.id && o.date === date)
      d[dev.id] = rec ? String(rec.quantity) : ''
    }
    setDrafts(d)
    setMessage(null)
  }, [devices, outputs, date])

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const entries = Object.entries(drafts)
        .filter(([, v]) => v !== '')
        .map(([deviceId, v]) => {
          const quantity = Number(v) || 0
          return { deviceId, quantity, good: quantity }
        })
      const r = await api.saveOutputs(date, entries)
      setMessage(`已保存 ${r.count} 条记录（${date}），局域网内其他终端将在数秒内同步`)
      refresh()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const total = useMemo(
    () => Object.values(drafts).reduce((s, v) => s + (Number(v) || 0), 0),
    [drafts],
  )

  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-center gap-3 px-3 py-2">
        <span className="label">日产量录入</span>
        <Input type="date" className="h-8 w-40 border-input bg-background/60 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        <span className="text-xs text-muted-foreground">同一设备同一天重复保存会覆盖旧记录</span>
        <div className="flex-1" />
        <span className="mono text-xs text-muted-foreground">
          合计 <span className="text-primary">{fmtNum(total)}</span>
        </span>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存全部'}</Button>
      </div>

      {message && <div className="panel border-primary/40 px-3 py-2 text-xs text-primary">{message}</div>}

      {COUNTRIES.map((c) => {
        const ds = devices.filter((d) => d.country === c)
        if (ds.length === 0) return null
        return (
          <div key={c} className="panel overflow-x-auto">
            <div className="hairline-b px-3 py-2 label">{c} · {ds.length} 台</div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="hairline-b">
                  <th className="th-cell">设备</th>
                  <th className="th-cell text-right">产量</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ds.map((d) => (
                  <tr key={d.id} className="hover:bg-accent/40">
                    <td className="td-cell">
                      <span className="mono mr-2 text-xs text-primary">{d.code}</span>
                      <span className="text-sm">{d.name}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground">{d.type}</span>
                    </td>
                    <td className="td-cell text-right">
                      <Input
                        type="number" min={0} inputMode="numeric" placeholder="0"
                        className="ml-auto h-7 w-32 border-input bg-background/60 text-right mono text-sm"
                        value={drafts[d.id] ?? ''}
                        onChange={(e) => setDrafts((s) => ({ ...s, [d.id]: e.target.value }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
      {devices.length === 0 && (
        <div className="panel px-3 py-8 text-center text-sm text-muted-foreground">请先在「设备」页新增设备</div>
      )}
    </div>
  )
}
