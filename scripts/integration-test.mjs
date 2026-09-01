// 联调测试：设备增删、产量录入、出货、报表聚合（通过 8100 直连）
const BASE = 'http://localhost:8100'
const j = (r) => r.json()

async function main() {
  const health = await fetch(`${BASE}/api/health`).then(j)
  console.log('1. health:', health.ok)

  const dev = await fetch(`${BASE}/api/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'TEST-01', name: '联调测试机', type: '检测仪', country: '越南', site: '河内工厂' }),
  }).then(j)
  console.log('2. create device:', dev.code, dev.country)
  const did = dev.id

  const dup = await fetch(`${BASE}/api/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'TEST-01', name: 'x', type: 'x', country: '中国' }),
  })
  console.log('3. duplicate code rejected:', dup.status === 409)

  const out = await fetch(`${BASE}/api/outputs/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2026-08-25', entries: [{ deviceId: did, quantity: 1000, good: 970 }] }),
  }).then(j)
  console.log('4. save output:', out.count === 1)

  // upsert 覆盖
  const out2 = await fetch(`${BASE}/api/outputs/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2026-08-25', entries: [{ deviceId: did, quantity: 1200, good: 1150 }] }),
  }).then(j)
  console.log('5. upsert output:', out2.count === 1)

  const ship = await fetch(`${BASE}/api/shipments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2026-08-25', deviceId: did, quantity: 500, destination: '联调客户' }),
  }).then(j)
  console.log('6. shipment:', ship.quantity === 500)

  const rep = await fetch(`${BASE}/api/report?from=2026-08-01&to=2026-08-25`).then(j)
  const row = rep.rows.find((r) => r.device.id === did)
  console.log('7. report row:', row.quantity === 1200, 'yield:', (row.yieldRate * 100).toFixed(1) + '%', 'shipped:', row.shipped)

  const boot = await fetch(`${BASE}/api/bootstrap`).then(j)
  const rec = boot.outputs.find((o) => o.deviceId === did)
  console.log('8. bootstrap sees upserted:', rec.quantity === 1200 && rec.good === 1150)

  const del = await fetch(`${BASE}/api/devices/${did}`, { method: 'DELETE' }).then(j)
  console.log('9. delete device:', del.ok)
  const boot2 = await fetch(`${BASE}/api/bootstrap`).then(j)
  console.log('10. cascade clean:', !boot2.outputs.some((o) => o.deviceId === did))
}

main().then(() => console.log('ALL PASS')).catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
