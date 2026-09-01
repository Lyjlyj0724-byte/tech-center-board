import { NavLink, Navigate, Route, Routes } from 'react-router'
import { useBoard } from '@/hooks/useBoard'
import Dashboard from '@/pages/Dashboard'
import DevicesPage from '@/pages/DevicesPage'
import DeviceDetailPage from '@/pages/DeviceDetailPage'
import OutputPage from '@/pages/OutputPage'
import ShipmentsPage from '@/pages/ShipmentsPage'

const NAV = [
  { to: '/', label: '总览' },
  { to: '/devices', label: '设备' },
  { to: '/output', label: '产量' },
  { to: '/shipments', label: '出货' },
]

export default function App() {
  const { data, error, refresh } = useBoard()

  return (
    <div className="min-h-screen bg-background">
      {/* 顶栏（打印时隐藏） */}
      <header className="app-chrome no-print hairline-b sticky top-0 z-20 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-2">
          <img src="/logo.png" alt="技术中心设备研发" className="h-8 w-auto" />

          <nav className="ml-6 flex gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-[13px] leading-none transition-colors ${
                    isActive
                      ? 'bg-primary font-medium text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex-1" />
          {error && (
            <span className="label flex items-center gap-1.5">
              <span className="led" style={{ background: '#dc2626' }} />
              连接中断
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-5">
        {error && !data && (
          <div className="panel px-4 py-10 text-center">
            <div className="text-destructive">无法连接后端服务:{error}</div>
            <div className="mt-2 text-xs text-muted-foreground">请确认已运行 npm run dev（会同时启动后端 8100 端口）</div>
          </div>
        )}
        {!data && !error && <div className="py-20 text-center label">正在连接数据服务…</div>}
        {data && (
          <Routes>
            <Route path="/" element={<Dashboard board={data} />} />
            <Route path="/devices" element={<DevicesPage board={data} refresh={refresh} />} />
            <Route path="/devices/:id" element={<DeviceDetailPage board={data} refresh={refresh} />} />
            <Route path="/output" element={<OutputPage board={data} refresh={refresh} />} />
            <Route path="/shipments" element={<ShipmentsPage board={data} refresh={refresh} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </div>
  )
}
