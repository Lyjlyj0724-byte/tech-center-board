import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DeviceForm } from '@/components/DeviceForm'
import { VideoPanel } from '@/components/VideoPanel'
import { api } from '@/lib/api'
import type { BoardData, Device } from '@/types'
import { COUNTRIES, GROUPS, deviceGroup } from '@/types'

export default function DevicesPage({ board, refresh }: { board: BoardData; refresh: () => void }) {
  const { devices, videos, photos } = board
  const [country, setCountry] = useState<string>('全部')
  const [type, setType] = useState<string>('全部')
  const [category, setCategory] = useState<string>('全部')
  const [kw, setKw] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Device | null>(null)
  const [videoDevice, setVideoDevice] = useState<Device | null>(null)

  const types = useMemo(() => [...new Set(devices.map((d) => d.type))], [devices])

  const rows = useMemo(() => {
    return devices
      .filter((d) => category === '全部' || deviceGroup(d) === category)
      .filter((d) => (country === '全部' || d.country === country) && (type === '全部' || d.type === type))
      .filter((d) => !kw || `${d.code}${d.name}${d.model}${d.site}`.toLowerCase().includes(kw.toLowerCase()))
      .map((d) => ({
        ...d,
        videoCount: videos.filter((v) => v.deviceId === d.id).length,
        photoCount: photos.filter((p) => p.deviceId === d.id).length,
      }))
      .sort((a, b) => a.code.localeCompare(b.code))
  }, [devices, videos, photos, category, country, type, kw])

  const del = async (d: Device) => {
    if (!window.confirm(`删除设备「${d.code} ${d.name}」？\n其产量记录与视频将一并删除，此操作不可恢复。`)) return
    try {
      await api.deleteDevice(d.id)
      refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : '删除失败')
    }
  }

  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-center gap-2 px-3 py-2">
        <span className="label mr-2">设备台账 · {rows.length} 条</span>
        <span className="flex gap-1">
          {['全部', ...GROUPS].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs leading-none transition-colors ${category === c ? 'bg-primary font-medium text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
            >
              {c}
            </button>
          ))}
        </span>
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="h-8 w-28 border-input bg-background/60 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="全部">全部国家</SelectItem>
            {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-8 w-32 border-input bg-background/60 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="全部">全部类型</SelectItem>
            {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="h-8 w-48 border-input bg-background/60 text-xs" placeholder="搜索编号 / 名称 / 厂区…" value={kw} onChange={(e) => setKw(e.target.value)} />
        <div className="flex-1" />
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>+ 新增设备</Button>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="hairline-b">
              <th className="th-cell">编号</th>
              <th className="th-cell">名称</th>
              <th className="th-cell">类型 / 型号</th>
              <th className="th-cell">分布</th>
              <th className="th-cell text-center">视频</th>
              <th className="th-cell text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((d) => (
              <tr key={d.id} className="hover:bg-accent/40">
                <td className="td-cell mono text-xs text-primary">{d.code}</td>
                <td className="td-cell">
                  <Link to={`/devices/${d.id}`} className="text-foreground hover:text-primary hover:underline">{d.name}</Link>
                  <div className="text-[10px] text-muted-foreground">
                    {deviceGroup(d)}{d.photoCount > 0 ? ` · 📷${d.photoCount}` : ''}{d.description ? ' · 有介绍' : ''}
                  </div>
                </td>
                <td className="td-cell text-xs">{d.type}{d.model ? ` · ${d.model}` : ''}</td>
                <td className="td-cell text-xs">{d.country}{d.site ? ` · ${d.site}` : ''}</td>
                <td className="td-cell text-center">
                  <button className="mono text-xs text-primary hover:underline" onClick={() => setVideoDevice(d)}>
                    {d.videoCount > 0 ? `▶ ${d.videoCount}` : '上传'}
                  </button>
                </td>
                <td className="td-cell text-right">
                  <button className="mr-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setEditing(d); setFormOpen(true) }}>编辑</button>
                  <button className="text-xs text-destructive hover:underline" onClick={() => del(d)}>删除</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="td-cell py-8 text-center text-muted-foreground">没有符合条件的设备，点击右上角「新增设备」开始录入</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <DeviceForm
        open={formOpen}
        device={editing}
        typeSuggestions={['贴片机', 'CNC', '注塑机', '组装线', '检测仪', '包装机', ...types]}
        onClose={(changed) => { setFormOpen(false); if (changed) refresh() }}
      />
      <VideoPanel
        device={videoDevice}
        videos={videos}
        onClose={(changed) => { setVideoDevice(null); if (changed) refresh() }}
      />
    </div>
  )
}
