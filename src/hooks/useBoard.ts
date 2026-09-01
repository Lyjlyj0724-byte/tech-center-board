import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { BoardData } from '@/types'

// 看板数据轮询：局域网多人编辑时，每 8 秒同步一次他人改动
export function useBoard(pollMs = 8000) {
  const [data, setData] = useState<BoardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const timer = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const d = await api.bootstrap()
      setData(d)
      setError(null)
      setLastSync(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : '连接失败')
    }
  }, [])

  useEffect(() => {
    // 挂载时立即拉取一次是数据加载的标准模式，豁免 set-state-in-effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
    timer.current = window.setInterval(refresh, pollMs)
    return () => { if (timer.current) window.clearInterval(timer.current) }
  }, [refresh, pollMs])

  return { data, error, lastSync, refresh }
}
