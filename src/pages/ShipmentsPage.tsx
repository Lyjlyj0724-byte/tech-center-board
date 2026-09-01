import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import type { BoardData, ProductLine, Shipment } from '@/types'
import { fmtNum, lineGroup, todayStr } from '@/types'

const LINES: ProductLine[] = ['设备', '辅助工具', '零部件']
const emptyForm = { date: todayStr(), deviceId: '', productLine: '设备', quantity: '', destination: '', note: '' }

export default function ShipmentsPage({ board, refresh }: { board: BoardData; refresh: () => void }) {
  const { devices, shipments } = board
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  // 编辑
  const [editing, setEditing] = useState<Shipment | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  // 筛选
  const [fLine, setFLine] = useState<string>('全部')
  const [fDest, setFDest] = useState<string>('全部')
  const [kw, setKw] = useState('')

  const destinations = useMemo(
    () => [...new Set(shipments.map((s) => s.destination).filter(Boolean))].sort(),
    [shipments],
  )

  const rows = useMemo(() => {
    return [...shipments]
      .filter((s) => fLine === '全部' || lineGroup(s.productLine ?? '设备') === fLine)
      .filter((s) => fDest === '全部' || s.destination === fDest)
      .filter((s) => {
        if (!kw) return true
        const dev = devices.find((d) => d.id === s.deviceId)
        const hay = `${s.destination}${s.note}${dev?.code ?? ''}${dev?.name ?? ''}`.toLowerCase()
        return hay.includes(kw.toLowerCase())
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [shipments, devices, fLine, fDest, kw])

  const filteredTotal = useMemo(() => rows.reduce((s, x) => s + x.quantity, 0), [rows])

  const submit = async () => {
    setError(null)
    try {
      await api.createShipment({
        date: form.date,
        deviceId: form.deviceId === 'none' ? '' : form.deviceId,
        productLine: form.productLine as ProductLine,
        quantity: Number(form.quantity),
        destination: form.destination,
        note: form.note,
      })
      setForm(emptyForm)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    }
  }

  const openEdit = (s: Shipment) => {
    setEditing(s)
    setError(null)
    setEditForm({
      date: s.date,
      deviceId: s.deviceId || 'none',
      productLine: s.productLine ?? '设备',
      quantity: String(s.quantity),
      destination: s.destination,
      note: s.note,
    })
  }

  const submitEdit = async () => {
    if (!editing) return
    setError(null)
    try {
      await api.updateShipment(editing.id, {
        date: editForm.date,
        deviceId: editForm.deviceId === 'none' ? '' : editForm.deviceId,
        productLine: editForm.productLine as ProductLine,
        quantity: Number(editForm.quantity),
        destination: editForm.destination,
        note: editForm.note,
      })
      setEditing(null)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    }
  }

  const del = async (id: string) => {
    if (!window.confirm('删除这条出货记录？')) return
    try { await api.deleteShipment(id); refresh() } catch (e) { alert(e instanceof Error ? e.message : '删除失败') }
  }

  const field = 'h-8 border-input bg-background/60 text-sm'

  return (
    <div className="space-y-3">
      <div className="panel px-3 py-3">
        <div className="label mb-2">登记出货</div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-[140px_110px_1fr_120px_1fr_1fr_auto]">
          <Input type="date" className={field} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          <Select value={form.productLine} onValueChange={(v) => setForm((f) => ({ ...f, productLine: v }))}>
            <SelectTrigger className={`${field} text-xs`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {LINES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={form.deviceId} onValueChange={(v) => setForm((f) => ({ ...f, deviceId: v }))}>
            <SelectTrigger className={`${field} text-xs`}><SelectValue placeholder="关联设备（可选）" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">不关联设备</SelectItem>
              {[...devices].sort((a, b) => a.code.localeCompare(b.code)).map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.code} · {d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="number" min={1} placeholder="数量 *" className={`${field} mono`} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
          <Input placeholder="发往 / 客户（如 越南世通）" className={field} value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} />
          <Input placeholder="备注" className={field} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          <Button size="sm" disabled={!form.date || !(Number(form.quantity) > 0)} onClick={submit}>登记</Button>
        </div>
        {error && !editing && <div className="mt-2 text-xs text-destructive">{error}</div>}
      </div>

      {/* 筛选与查询 */}
      <div className="panel flex flex-wrap items-center gap-2 px-3 py-2">
        <span className="label mr-1">筛选</span>
        <span className="flex gap-1">
          {['全部', ...LINES].map((p) => (
            <button
              key={p}
              onClick={() => setFLine(p)}
              className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs leading-none transition-colors ${fLine === p ? 'bg-primary font-medium text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
            >
              {p}
            </button>
          ))}
        </span>
        <Select value={fDest} onValueChange={setFDest}>
          <SelectTrigger className="h-8 w-36 border-input bg-background/60 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="全部">全部目的地</SelectItem>
            {destinations.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="h-8 w-52 border-input bg-background/60 text-xs" placeholder="查询目的地 / 备注 / 设备编号…" value={kw} onChange={(e) => setKw(e.target.value)} />
        <div className="flex-1" />
        <span className="label">
          {rows.length} 条 · 合计 <span className="text-[#d97706]">{fmtNum(filteredTotal)}</span>
        </span>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="hairline-b">
              <th className="th-cell">日期</th>
              <th className="th-cell">产品线</th>
              <th className="th-cell">关联设备</th>
              <th className="th-cell text-right">数量</th>
              <th className="th-cell">发往 / 客户</th>
              <th className="th-cell">备注</th>
              <th className="th-cell text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((s) => {
              const dev = devices.find((d) => d.id === s.deviceId)
              return (
                <tr key={s.id} className="hover:bg-accent/40">
                  <td className="td-cell mono text-xs">{s.date}</td>
                  <td className="td-cell text-xs">{lineGroup(s.productLine ?? '设备')}</td>
                  <td className="td-cell text-xs">{dev ? `${dev.code} · ${dev.name}` : <span className="text-muted-foreground">—</span>}</td>
                  <td className="td-cell mono text-right text-[#d97706]">{fmtNum(s.quantity)}</td>
                  <td className="td-cell text-sm">{s.destination || '—'}</td>
                  <td className="td-cell text-xs text-muted-foreground">{s.note}</td>
                  <td className="td-cell text-right">
                    <button className="mr-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => openEdit(s)}>编辑</button>
                    <button className="text-xs text-destructive hover:underline" onClick={() => del(s.id)}>删除</button>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && <tr><td colSpan={7} className="td-cell py-8 text-center text-muted-foreground">没有符合条件的出货记录</td></tr>}
          </tbody>
        </table>
      </div>

      {/* 编辑对话框 */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md border-border bg-popover">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">编辑出货记录</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="label">日期 *</Label>
              <Input type="date" className={field} value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <Label className="label">产品线</Label>
              <Select value={editForm.productLine} onValueChange={(v) => setEditForm((f) => ({ ...f, productLine: v }))}>
                <SelectTrigger className={`${field} text-xs`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LINES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="label">关联设备</Label>
              <Select value={editForm.deviceId} onValueChange={(v) => setEditForm((f) => ({ ...f, deviceId: v }))}>
                <SelectTrigger className={`${field} text-xs`}><SelectValue placeholder="不关联设备" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不关联设备</SelectItem>
                  {[...devices].sort((a, b) => a.code.localeCompare(b.code)).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.code} · {d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="label">数量 *</Label>
              <Input type="number" min={1} className={`${field} mono`} value={editForm.quantity} onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <Label className="label">发往 / 客户</Label>
              <Input className={field} value={editForm.destination} onChange={(e) => setEditForm((f) => ({ ...f, destination: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label className="label">备注</Label>
              <Input className={field} value={editForm.note} onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
          {error && <div className="text-xs text-destructive">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>取消</Button>
            <Button size="sm" disabled={!editForm.date || !(Number(editForm.quantity) > 0)} onClick={submitEdit}>保存</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
