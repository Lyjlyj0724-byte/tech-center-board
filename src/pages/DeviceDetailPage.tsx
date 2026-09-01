import { useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import type { BoardData, PhotoItem } from '@/types'
import { destCountry, fmtNum } from '@/types'

// 设备详情介绍页：基本信息 + 图文介绍 + 照片墙 + 视频 + 出货/产量记录
export default function DeviceDetailPage({ board, refresh }: { board: BoardData; refresh: () => void }) {
  const { id: deviceId } = useParams()
  const device = board.devices.find((d) => d.id === deviceId)

  const photos = useMemo(() => board.photos.filter((p) => p.deviceId === deviceId), [board.photos, deviceId])
  const videos = useMemo(() => board.videos.filter((v) => v.deviceId === deviceId), [board.videos, deviceId])
  const deviceShipments = useMemo(
    () => board.shipments.filter((s) => s.deviceId === deviceId).sort((a, b) => b.date.localeCompare(a.date)),
    [board.shipments, deviceId],
  )

  const [editingDesc, setEditingDesc] = useState(false)
  const [desc, setDesc] = useState<string | null>(null)
  const [savingDesc, setSavingDesc] = useState(false)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<PhotoItem | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // 视频上传
  const [videoTitle, setVideoTitle] = useState('')
  const [videoUploader, setVideoUploader] = useState('')
  const [videoProgress, setVideoProgress] = useState<number | null>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  if (!device) {
    return (
      <div className="panel px-4 py-10 text-center text-sm text-muted-foreground">
        设备不存在或已被删除。<Link to="/devices" className="text-primary hover:underline">返回设备列表</Link>
      </div>
    )
  }

  const totalShipped = deviceShipments.reduce((s, x) => s + x.quantity, 0)
  const destSummary = new Map<string, number>()
  for (const s of deviceShipments) destSummary.set(s.destination, (destSummary.get(s.destination) ?? 0) + s.quantity)

  const saveDesc = async () => {
    setSavingDesc(true)
    setError(null)
    try {
      await api.updateDevice(device.id, { description: desc ?? device.description })
      setEditingDesc(false)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSavingDesc(false)
    }
  }

  const doUploadPhoto = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) { setError('请先选择照片'); return }
    setUploading(true)
    setError(null)
    try {
      await api.uploadPhoto(device.id, file, caption)
      setCaption('')
      if (fileRef.current) fileRef.current.value = ''
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const delPhoto = async (p: PhotoItem) => {
    if (!window.confirm('删除这张照片？')) return
    try { await api.deletePhoto(p.id); refresh() } catch (e) { alert(e instanceof Error ? e.message : '删除失败') }
  }

  const doUploadVideo = async () => {
    const file = videoRef.current?.files?.[0]
    if (!file) { setError('请先选择视频文件'); return }
    setError(null)
    setVideoProgress(0)
    try {
      await api.uploadVideo(device.id, file, videoTitle || file.name, videoUploader, setVideoProgress)
      setVideoTitle('')
      if (videoRef.current) videoRef.current.value = ''
      setVideoProgress(null)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败')
      setVideoProgress(null)
    }
  }

  const delVideo = async (vid: string, title: string) => {
    if (!window.confirm(`删除视频「${title}」？文件将从服务器移除。`)) return
    try { await api.deleteVideo(vid); refresh() } catch (e) { alert(e instanceof Error ? e.message : '删除失败') }
  }

  return (
    <div className="space-y-3">
      {/* 头部：基本信息 */}
      <div className="panel px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/devices" className="label text-primary hover:underline">← 设备列表</Link>
          <span className="text-border">|</span>
          <span className="mono text-xs text-primary">{device.code}</span>
          <h1 className="text-lg font-semibold tracking-wide">{device.name}</h1>
          <span className="border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{device.type === '龙头' ? '龙头' : device.category}</span>
          <div className="flex-1" />
          <span className="label">累计出货 <span className="text-[#d97706]">{fmtNum(totalShipped)}</span> {device.category === '设备' ? '台' : '个'}</span>
        </div>
        <div className="mono mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          {device.type && <span>类型 <span className="text-foreground">{device.type}</span></span>}
          {device.model && <span>型号 <span className="text-foreground">{device.model}</span></span>}
          <span>归属 <span className="text-foreground">{device.country}{device.site ? ` · ${device.site}` : ''}</span></span>
          {device.installDate && <span>投产 <span className="text-foreground">{device.installDate}</span></span>}
        </div>
      </div>

      {error && <div className="panel px-3 py-2 text-xs text-destructive">{error}</div>}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* 左：介绍 + 照片墙 */}
        <div className="space-y-3 lg:col-span-7">
          {/* 介绍 */}
          <div className="panel">
            <div className="hairline-b flex items-center justify-between px-3 py-2">
              <span className="label">设备介绍</span>
              {!editingDesc
                ? <button className="label text-primary hover:underline" onClick={() => { setDesc(device.description); setEditingDesc(true) }}>编辑</button>
                : (
                  <span className="flex gap-2">
                    <button className="label text-muted-foreground hover:text-foreground" onClick={() => setEditingDesc(false)}>取消</button>
                    <button className="label text-primary hover:underline" onClick={saveDesc}>{savingDesc ? '保存中…' : '保存'}</button>
                  </span>
                )}
            </div>
            <div className="px-3 py-3">
              {editingDesc ? (
                <Textarea
                  className="min-h-[140px] border-input bg-background/60 text-sm leading-relaxed"
                  placeholder="填写设备用途、技术特点、适用工艺、核心参数等介绍内容…"
                  value={desc ?? ''}
                  onChange={(e) => setDesc(e.target.value)}
                />
              ) : device.description ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{device.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">暂无介绍，点击右上角「编辑」补充设备用途、技术特点、核心参数等内容。</p>
              )}
            </div>
          </div>

          {/* 照片墙 */}
          <div className="panel">
            <div className="hairline-b flex items-center justify-between px-3 py-2">
              <span className="label">设备照片 · {photos.length}</span>
              <span className="flex items-center gap-2">
                <Input ref={fileRef} type="file" accept="image/*" className="h-7 w-44 border-input bg-background/60 text-[10px] file:mr-1 file:text-[10px]" />
                <Input placeholder="说明" className="h-7 w-24 border-input bg-background/60 text-xs" value={caption} onChange={(e) => setCaption(e.target.value)} />
                <Button size="sm" className="h-7" onClick={doUploadPhoto} disabled={uploading}>{uploading ? '上传中…' : '上传'}</Button>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3 md:grid-cols-3">
              {photos.map((p) => (
                <figure key={p.id} className="group relative border border-border">
                  <button className="block w-full" onClick={() => setLightbox(p)}>
                    <img src={`/uploads/${p.file}`} alt={p.caption || device.name} loading="lazy"
                      className="aspect-[4/3] w-full bg-slate-100 object-contain" />
                  </button>
                  <figcaption className="flex items-center justify-between px-2 py-1">
                    <span className="truncate text-[10px] text-muted-foreground">{p.caption || p.originalName}</span>
                    <button className="text-[10px] text-destructive opacity-0 transition-opacity group-hover:opacity-100" onClick={() => delPhoto(p)}>删除</button>
                  </figcaption>
                </figure>
              ))}
              {photos.length === 0 && (
                <div className="col-span-full border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                  暂无照片，使用上方上传按钮添加设备照片
                </div>
              )}
            </div>
          </div>

          {/* 视频 */}
          <div className="panel">
            <div className="hairline-b px-3 py-2 label">设备视频 · {videos.length}</div>
            <div className="space-y-3 p-3">
              {/* 上传区 */}
              <div className="border border-dashed border-border p-3">
                <div className="label mb-2">上传视频（单个最大 1GB，支持 mp4 / webm / mov 等）</div>
                <div className="grid grid-cols-[1fr_120px_100px_auto] items-end gap-2">
                  <Input ref={videoRef} type="file" accept="video/*" className="h-8 border-input bg-background/60 text-xs file:mr-2 file:text-xs" />
                  <Input placeholder="标题（可选）" className="h-8 border-input bg-background/60 text-xs" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} />
                  <Input placeholder="上传人" className="h-8 border-input bg-background/60 text-xs" value={videoUploader} onChange={(e) => setVideoUploader(e.target.value)} />
                  <Button size="sm" className="h-8" onClick={doUploadVideo} disabled={videoProgress !== null}>
                    {videoProgress !== null ? `${videoProgress}%` : '上传'}
                  </Button>
                </div>
                {videoProgress !== null && (
                  <div className="mt-2 h-1 w-full bg-border">
                    <div className="h-full bg-primary transition-all" style={{ width: `${videoProgress}%` }} />
                  </div>
                )}
              </div>

              {videos.map((v) => (
                <div key={v.id} className="border border-border">
                  <video controls preload="metadata" className="max-h-64 w-full bg-black" src={`/uploads/${v.file}`} />
                  <div className="flex items-center justify-between px-2 py-1">
                    <div className="min-w-0">
                      <div className="truncate text-xs">{v.title}</div>
                      <div className="mono text-[10px] text-muted-foreground">
                        {(v.size / 1024 / 1024).toFixed(1)}MB · {new Date(v.uploadedAt).toLocaleString('zh-CN')}{v.uploadedBy ? ` · ${v.uploadedBy}` : ''}
                      </div>
                    </div>
                    <button className="text-[10px] text-destructive hover:underline" onClick={() => delVideo(v.id, v.title)}>删除</button>
                  </div>
                </div>
              ))}
              {videos.length === 0 && (
                <div className="border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  暂无视频，使用上方上传区添加设备运行 / 操作视频
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右：出货分布 + 产量 */}
        <div className="space-y-3 lg:col-span-5">
          <div className="panel">
            <div className="hairline-b px-3 py-2 label">出货分布</div>
            <div className="divide-y divide-border">
              {[...destSummary.entries()].sort((a, b) => b[1] - a[1]).map(([dest, qty]) => (
                <div key={dest} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm">{dest}</span>
                  <span className="flex items-center gap-2">
                    <span className="label">{destCountry(dest)}</span>
                    <span className="mono text-sm text-[#d97706]">{fmtNum(qty)}</span>
                  </span>
                </div>
              ))}
              {destSummary.size === 0 && <div className="px-3 py-4 text-xs text-muted-foreground">暂无出货记录</div>}
            </div>
          </div>

          <div className="panel">
            <div className="hairline-b px-3 py-2 label">出货记录 · {deviceShipments.length}</div>
            <div className="max-h-56 divide-y divide-border overflow-y-auto">
              {deviceShipments.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <div className="text-sm">{s.destination || '—'}</div>
                    <div className="mono text-[10px] text-muted-foreground">{s.date}{s.note ? ` · ${s.note}` : ''}</div>
                  </div>
                  <span className="mono text-sm text-[#d97706]">{fmtNum(s.quantity)}</span>
                </div>
              ))}
              {deviceShipments.length === 0 && <div className="px-3 py-4 text-xs text-muted-foreground">暂无出货记录</div>}
            </div>
          </div>
        </div>
      </div>

      {/* 照片大图 */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6" onClick={() => setLightbox(null)}>
          <img src={`/uploads/${lightbox.file}`} alt={lightbox.caption} className="max-h-full max-w-full object-contain" />
          <div className="absolute bottom-6 text-xs text-muted-foreground">{lightbox.caption || lightbox.originalName} · 点击任意处关闭</div>
        </div>
      )}
    </div>
  )
}
