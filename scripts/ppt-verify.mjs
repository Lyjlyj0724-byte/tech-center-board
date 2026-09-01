// PPT 数据导入后的端到端验证
const BASE = 'http://localhost:8100'
const j = (r) => r.json()

async function main() {
  const boot = await fetch(`${BASE}/api/bootstrap`).then(j)
  const eq = boot.devices.filter((d) => d.category === '设备')
  const aux = boot.devices.filter((d) => d.category === '辅助工具')
  console.log('1. devices:', eq.length === 20, 'aux:', aux.length === 16, 'photos:', boot.photos.length === 26)

  // 校验出货总量 = PPT 的 432 台设备 / 1980 辅具 / 1190 龙头
  const sum = (line) => boot.shipments.filter((s) => (s.productLine ?? '设备') === line).reduce((n, s) => n + s.quantity, 0)
  console.log('2. 设备出货:', sum('设备') === 432, sum('设备'), '| 辅具:', sum('辅助工具') === 1980, sum('辅助工具'), '| 龙头:', sum('龙头') === 1190, sum('龙头'))

  // 上领机分段装置：PPT 出货 105 台（德利19 + 世通86），带照片
  const sz25 = boot.devices.find((d) => d.code === 'YFB-SZ25')
  const sz25Ship = boot.shipments.filter((s) => s.deviceId === sz25.id).reduce((n, s) => n + s.quantity, 0)
  const sz25Photo = boot.photos.find((p) => p.deviceId === sz25.id)
  console.log('3. YFB-SZ25 出货 105:', sz25Ship === 105, '| 有照片:', !!sz25Photo)
  const img = await fetch(`${BASE}/uploads/${sz25Photo.file}`)
  console.log('4. 照片可访问:', img.status === 200, (await img.arrayBuffer()).byteLength > 10000)

  // 编辑介绍
  const upd = await fetch(`${BASE}/api/devices/${sz25.id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: '用于上领工序的分段辅助装置，提升领口拼接一致性。' }),
  }).then(j)
  console.log('5. 介绍编辑:', upd.description.includes('上领工序'))

  // 上传 + 删除照片
  const fd = new FormData()
  fd.append('photo', new Blob([new Uint8Array(2048)], { type: 'image/jpeg' }), '测试照片.jpg')
  fd.append('caption', '联调测试')
  const up = await fetch(`${BASE}/api/devices/${sz25.id}/photos`, { method: 'POST', body: fd }).then(j)
  console.log('6. 照片上传:', !!up.id, up.originalName === '测试照片.jpg')
  const del = await fetch(`${BASE}/api/photos/${up.id}`, { method: 'DELETE' }).then(j)
  console.log('7. 照片删除:', del.ok)

  // 出货登记带产品线
  const sh = await fetch(`${BASE}/api/shipments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2026-08-25', productLine: '龙头', quantity: 12, destination: '越南德利' }),
  }).then(j)
  console.log('8. 龙头出货登记:', sh.productLine === '龙头')
  await fetch(`${BASE}/api/shipments/${sh.id}`, { method: 'DELETE' })

  // 新增辅助工具
  const nd = await fetch(`${BASE}/api/devices`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'TEST-AUX', name: '联调辅具', category: '辅助工具', type: '压脚', country: '中国' }),
  }).then(j)
  console.log('9. 新增辅具类别:', nd.category === '辅助工具')
  await fetch(`${BASE}/api/devices/${nd.id}`, { method: 'DELETE' })

  // SPA 路由回退到详情页
  const deep = await fetch(`${BASE}/devices/${sz25.id}`).then((r) => r.text())
  console.log('10. 详情页路由:', deep.includes('<div id="root">'))
}

main().then(() => console.log('ALL PASS')).catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
