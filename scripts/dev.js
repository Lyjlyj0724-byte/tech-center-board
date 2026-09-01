// 开发模式：同时启动后端 API(8100) 与 Vite 前端(3000)，命令行参数转发给 Vite
// 例：npm run dev -- --port 3000 --host
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
const forward = process.argv.slice(2)

const procs = [
  spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], { stdio: 'inherit', cwd: ROOT }),
  spawn(process.execPath, [viteBin, ...forward], { stdio: 'inherit', cwd: ROOT }),
]

const shutdown = () => {
  for (const p of procs) p.kill()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
for (const p of procs) p.on('exit', (code) => {
  if (code && code !== 0) shutdown()
})
