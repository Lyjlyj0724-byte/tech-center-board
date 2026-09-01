import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { CATEGORIES, COUNTRIES, type Device } from '@/types'

interface Props {
  open: boolean
  onClose: (changed: boolean) => void
  device?: Device | null // 传入则为编辑
  typeSuggestions: string[]
}

const empty = {
  code: '', name: '', category: '设备' as Device['category'], type: '', model: '',
  description: '', country: '中国' as Device['country'],
  site: '', installDate: '', note: '',
}

export function DeviceForm({ open, onClose, device, typeSuggestions }: Props) {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setForm(device ? {
        code: device.code, name: device.name, category: device.category ?? '设备',
        type: device.type, model: device.model, description: device.description ?? '',
        country: device.country, site: device.site,
        installDate: device.installDate, note: device.note,
      } : empty)
    }
  }, [open, device])

  const set = (k: keyof typeof empty, v: string | number) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      if (device) await api.updateDevice(device.id, form)
      else await api.createDevice(form)
      onClose(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const field = 'bg-background/60 border-input h-8 text-sm'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose(false)}>
      <DialogContent className="max-w-lg border-border bg-popover">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {device ? `编辑设备 · ${device.code}` : '新增设备'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="label">设备编号 *</Label>
            <Input className={field} value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="如 CN-SMT-01" disabled={!!device} />
          </div>
          <div>
            <Label className="label">设备名称 *</Label>
            <Input className={field} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="如 贴片线 1 号机" />
          </div>
          <div>
            <Label className="label">类别 *</Label>
            <Select value={form.category} onValueChange={(v) => set('category', v)}>
              <SelectTrigger className={field}><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="label">机器类型 *</Label>
            <Input className={field} value={form.type} onChange={(e) => set('type', e.target.value)} list="type-suggestions" placeholder="如 研发设备 / 龙头 / 压脚" />
            <datalist id="type-suggestions">
              {typeSuggestions.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div>
            <Label className="label">型号</Label>
            <Input className={field} value={form.model} onChange={(e) => set('model', e.target.value)} />
          </div>
          <div>
            <Label className="label">所在国家 *</Label>
            <Select value={form.country} onValueChange={(v) => set('country', v)}>
              <SelectTrigger className={field}><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="label">厂区 / 地点</Label>
            <Input className={field} value={form.site} onChange={(e) => set('site', e.target.value)} placeholder="如 深圳工厂" />
          </div>
          <div>
            <Label className="label">投产日期</Label>
            <Input className={field} type="date" value={form.installDate} onChange={(e) => set('installDate', e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label className="label">设备介绍</Label>
            <Textarea className="bg-background/60 border-input min-h-[70px] text-sm" placeholder="用途、技术特点、核心参数…（也可稍后在详情页编辑）" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label className="label">备注</Label>
            <Textarea className="bg-background/60 border-input min-h-[50px] text-sm" value={form.note} onChange={(e) => set('note', e.target.value)} />
          </div>
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onClose(false)}>取消</Button>
          <Button size="sm" disabled={saving || !form.code || !form.name || !form.type} onClick={submit}>
            {saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
