import { useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import type { Device, VideoItem } from '@/types'

interface Props {
  device: Device | null
  videos: VideoItem[]
  onClose: (changed: boolean) => void
}

// 设备视频管理：上传（带进度）、在线播放、删除
export function VideoPanel({ device, videos, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [uploader, setUploader] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [changed, setChanged] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!device) return null
  const deviceVideos = videos.filter((v) => v.deviceId === device.id)

  const doUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) { setError('请先选择视频文件'); return }
    setError(null)
    setProgress(0)
    try {
      await api.uploadVideo(device.id, file, title || file.name, uploader, setProgress)
      setChanged(true)
      setTitle('')
      if (fileRef.current) fileRef.current.value = ''
      setProgress(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败')
      setProgress(null)
    }
  }

  const doDelete = async (v: VideoItem) => {
    if (!window.confirm(`删除视频「${v.title}」？文件将从服务器移除。`)) return
    try {
      await api.deleteVideo(v.id)
      setChanged(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
    }
  }

  return (
    <Dialog open={!!device} onOpenChange={(o) => !o && onClose(changed)}>
      <DialogContent className="max-w-2xl border-border bg-popover">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            设备视频 · {device.code} {device.name}
          </DialogTitle>
        </DialogHeader>

        {/* 上传区 */}
        <div className="border border-dashed border-border p-3">
          <div className="label mb-2">上传新视频（单个最大 1GB，支持 mp4 / webm / mov 等）</div>
          <div className="grid grid-cols-[1fr_140px_120px_auto] items-end gap-2">
            <div>
              <Label className="label">视频文件</Label>
              <Input ref={fileRef} type="file" accept="video/*" className="h-8 border-input bg-background/60 text-xs file:mr-2 file:text-xs" />
            </div>
            <div>
              <Label className="label">标题（可选）</Label>
              <Input className="h-8 border-input bg-background/60 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label className="label">上传人</Label>
              <Input className="h-8 border-input bg-background/60 text-sm" value={uploader} onChange={(e) => setUploader(e.target.value)} />
            </div>
            <Button size="sm" onClick={doUpload} disabled={progress !== null}>
              {progress !== null ? `${progress}%` : '上传'}
            </Button>
          </div>
          {progress !== null && (
            <div className="mt-2 h-1 w-full bg-border">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        {/* 视频列表 */}
        <div className="max-h-[46vh] space-y-3 overflow-y-auto pr-1">
          {deviceVideos.length === 0 && (
            <div className="border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              暂无视频，上传后可在此在线播放
            </div>
          )}
          {deviceVideos.map((v) => (
            <div key={v.id} className="border border-border">
              <video controls preload="metadata" className="max-h-56 w-full bg-black" src={`/uploads/${v.file}`} />
              <div className="flex items-center justify-between px-3 py-1.5">
                <div className="min-w-0">
                  <div className="truncate text-sm">{v.title}</div>
                  <div className="mono text-[10px] text-muted-foreground">
                    {v.originalName} · {(v.size / 1024 / 1024).toFixed(1)}MB · {new Date(v.uploadedAt).toLocaleString('zh-CN')}
                    {v.uploadedBy ? ` · ${v.uploadedBy}` : ''}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => doDelete(v)}>删除</Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
