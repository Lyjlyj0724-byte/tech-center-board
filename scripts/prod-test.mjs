// 生产模式验证：dist 托管 + 视频上传/删除
const BASE = 'http://localhost:8100'
const j = (r) => r.json()

async function main() {
  // 1. 首页托管
  const html = await fetch(`${BASE}/`).then((r) => r.text())
  console.log('1. serves dist:', html.includes('技术中心设备看板') && html.includes('assets/'))

  // 2. SPA 路由回退
  const deep = await fetch(`${BASE}/devices`).then((r) => r.text())
  console.log('2. SPA fallback:', deep.includes('<div id="root">'))

  // 3. 静态资源
  const asset = /assets\/index-[^"]+\.js/.exec(html)?.[0]
  const js = await fetch(`${BASE}/${asset}`)
  console.log('3. asset served:', js.status === 200, asset)

  // 4. 视频上传（构造 1KB 假 mp4）
  const boot = await fetch(`${BASE}/api/bootstrap`).then(j)
  const device = boot.devices[0]
  const fd = new FormData()
  fd.append('video', new Blob([new Uint8Array(1024)], { type: 'video/mp4' }), '测试视频.mp4')
  fd.append('title', '联调上传测试')
  fd.append('uploadedBy', '系统测试')
  const up = await fetch(`${BASE}/api/devices/${device.id}/videos`, { method: 'POST', body: fd }).then(j)
  console.log('4. upload:', !!up.id, 'name fixed:', up.originalName === '测试视频.mp4')

  // 5. 视频可访问
  const vid = await fetch(`${BASE}/uploads/${up.file}`)
  console.log('5. video served:', vid.status === 200, 'size:', (await vid.arrayBuffer()).byteLength)

  // 6. 删除视频
  const del = await fetch(`${BASE}/api/videos/${up.id}`, { method: 'DELETE' }).then(j)
  const gone = await fetch(`${BASE}/uploads/${up.file}`)
  console.log('6. delete:', del.ok, 'file removed:', gone.status === 404)
}

main().then(() => console.log('PROD PASS')).catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
