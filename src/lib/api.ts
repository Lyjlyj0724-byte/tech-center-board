import type { BoardData, Device, OutputEntry, PhotoItem, Report, Shipment, VideoItem } from '@/types'

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    let msg = `请求失败 (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) msg = body.error
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const api = {
  bootstrap: () => req<BoardData>('/api/bootstrap'),

  createDevice: (d: Partial<Device>) => req<Device>('/api/devices', json('POST', d)),
  updateDevice: (id: string, d: Partial<Device>) => req<Device>(`/api/devices/${id}`, json('PUT', d)),
  deleteDevice: (id: string) => req<{ ok: true }>(`/api/devices/${id}`, { method: 'DELETE' }),

  saveOutputs: (date: string, entries: Array<Pick<OutputEntry, 'deviceId' | 'quantity' | 'good'>>) =>
    req<{ ok: true; count: number }>('/api/outputs/bulk', json('POST', { date, entries })),

  createShipment: (s: Partial<Shipment>) => req<Shipment>('/api/shipments', json('POST', s)),
  updateShipment: (id: string, s: Partial<Shipment>) => req<Shipment>(`/api/shipments/${id}`, json('PUT', s)),
  deleteShipment: (id: string) => req<{ ok: true }>(`/api/shipments/${id}`, { method: 'DELETE' }),

  uploadVideo: (deviceId: string, file: File, title: string, uploadedBy: string, onProgress?: (pct: number) => void) =>
    new Promise<VideoItem>((resolve, reject) => {
      const form = new FormData()
      form.append('video', file)
      form.append('title', title)
      form.append('uploadedBy', uploadedBy)
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `/api/devices/${deviceId}/videos`)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText) as VideoItem)
        } else {
          try { reject(new Error(JSON.parse(xhr.responseText).error)) } catch { reject(new Error(`上传失败 (${xhr.status})`)) }
        }
      }
      xhr.onerror = () => reject(new Error('网络错误，上传失败'))
      xhr.send(form)
    }),
  deleteVideo: (id: string) => req<{ ok: true }>(`/api/videos/${id}`, { method: 'DELETE' }),

  uploadPhoto: (deviceId: string, file: File, caption: string) => {
    const form = new FormData()
    form.append('photo', file)
    form.append('caption', caption)
    return req<PhotoItem>(`/api/devices/${deviceId}/photos`, { method: 'POST', body: form })
  },
  deletePhoto: (id: string) => req<{ ok: true }>(`/api/photos/${id}`, { method: 'DELETE' }),

  report: (from: string, to: string) => req<Report>(`/api/report?from=${from}&to=${to}`),
}
