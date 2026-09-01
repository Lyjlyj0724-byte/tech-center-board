import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import type { Report } from '@/types'
import { fmtNum, fmtPct, todayStr } from '@/types'

const monthStart = () => `${todayStr().slice(0, 7)}-01`

export default function ReportsPage() {
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(todayStr())
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      setReport(await api.report(from, to))
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { generate() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3">
      {/* 操作区（不打印） */}
      <div className="panel no-print flex flex-wrap items-center gap-3 px-3 py-2">
        <span className="label">纸质报表</span>
        <Input type="date" className="h-8 w-40 border-input bg-background/60 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-xs text-muted-foreground">至</span>
        <Input type="date" className="h-8 w-40 border-input bg-background/60 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button size="sm" variant="outline" onClick={generate} disabled={loading}>{loading ? '生成中…' : '生成报表'}</Button>
        <div className="flex-1" />
        <Button size="sm" onClick={() => window.print()} disabled={!report}>🖨 打印 / 另存 PDF</Button>
      </div>
      {error && <div className="panel no-print px-3 py-2 text-xs text-destructive">{error}</div>}

      {/* 报表正文（打印区域） */}
      {report && (
        <div className="print-page panel mx-auto max-w-[900px] px-8 py-6">
          <div className="text-center">
            <img src="/logo.png" alt="技术中心设备研发" className="mx-auto mb-3 h-10 w-auto" />
            <div className="serif-cn text-lg font-bold tracking-[0.3em]">技术中心设备生产报表</div>
            <div className="mono mt-1 text-xs text-muted-foreground">
              统计周期：{report.from} 至 {report.to} · 生成时间：{new Date(report.generatedAt).toLocaleString('zh-CN')}
            </div>
          </div>

          {/* 汇总指标 */}
          <div className="mt-5 grid grid-cols-4 gap-px border border-border bg-border">
            {[
              ['期间总产量', fmtNum(report.totals.quantity)],
              ['良品总数', fmtNum(report.totals.good)],
              ['综合良率（收益率）', fmtPct(report.totals.yieldRate)],
              ['期间出货量', fmtNum(report.totals.shipped)],
            ].map(([k, v]) => (
              <div key={k} className="bg-card px-3 py-2 text-center">
                <div className="label">{k}</div>
                <div className="bignum mt-1 text-xl">{v}</div>
              </div>
            ))}
          </div>

          {/* 设备明细 */}
          <div className="label mt-6 mb-2">一、设备产量与良率明细</div>
          <table className="w-full border-collapse border border-border text-sm">
            <thead>
              <tr className="border-b border-border">
                {['编号', '名称', '类型', '分布', '统计天数', '产量', '良品', '良率（收益率）', '出货'].map((h) => (
                  <th key={h} className="label px-2 py-1.5 text-left font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.rows.map((r) => (
                <tr key={r.device.id}>
                  <td className="mono px-2 py-1.5 text-xs">{r.device.code}</td>
                  <td className="px-2 py-1.5">{r.device.name}</td>
                  <td className="px-2 py-1.5 text-xs">{r.device.type}</td>
                  <td className="px-2 py-1.5 text-xs">{r.device.country}{r.device.site ? `·${r.device.site}` : ''}</td>
                  <td className="mono px-2 py-1.5 text-right">{r.days}</td>
                  <td className="mono px-2 py-1.5 text-right">{fmtNum(r.quantity)}</td>
                  <td className="mono px-2 py-1.5 text-right">{fmtNum(r.good)}</td>
                  <td className="mono px-2 py-1.5 text-right">{fmtPct(r.yieldRate)}</td>
                  <td className="mono px-2 py-1.5 text-right">{fmtNum(r.shipped)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border font-semibold">
                <td className="px-2 py-1.5" colSpan={5}>合计</td>
                <td className="mono px-2 py-1.5 text-right">{fmtNum(report.totals.quantity)}</td>
                <td className="mono px-2 py-1.5 text-right">{fmtNum(report.totals.good)}</td>
                <td className="mono px-2 py-1.5 text-right">{fmtPct(report.totals.yieldRate)}</td>
                <td className="mono px-2 py-1.5 text-right">{fmtNum(report.totals.deviceShipped)}</td>
              </tr>
            </tbody>
          </table>

          {/* 出货明细 */}
          <div className="label mt-6 mb-2">二、出货明细（{report.shipments.length} 笔）</div>
          <table className="w-full border-collapse border border-border text-sm">
            <thead>
              <tr className="border-b border-border">
                {['日期', '关联设备', '数量', '发往 / 客户', '备注'].map((h) => (
                  <th key={h} className="label px-2 py-1.5 text-left font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...report.shipments].sort((a, b) => a.date.localeCompare(b.date)).map((s) => {
                const dev = report.rows.find((r) => r.device.id === s.deviceId)?.device
                return (
                  <tr key={s.id}>
                    <td className="mono px-2 py-1.5 text-xs">{s.date}</td>
                    <td className="px-2 py-1.5 text-xs">{dev ? `${dev.code} ${dev.name}` : `散装${s.productLine}（未关联设备）`}</td>
                    <td className="mono px-2 py-1.5 text-right">{fmtNum(s.quantity)}</td>
                    <td className="px-2 py-1.5">{s.destination || '—'}</td>
                    <td className="px-2 py-1.5 text-xs text-muted-foreground">{s.note}</td>
                  </tr>
                )
              })}
              {report.shipments.length === 0 && (
                <tr><td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">本周期无出货记录</td></tr>
              )}
              {report.shipments.length > 0 && (
                <tr className="border-t-2 border-border font-semibold">
                  <td className="px-2 py-1.5" colSpan={2}>合计</td>
                  <td className="mono px-2 py-1.5 text-right">{fmtNum(report.totals.shipped)}</td>
                  <td colSpan={2} />
                </tr>
              )}
            </tbody>
          </table>

          {/* 签批栏 */}
          <div className="mt-10 grid grid-cols-3 gap-8 text-sm">
            {['编制', '审核', '批准'].map((role) => (
              <div key={role} className="flex items-end gap-2">
                <span>{role}：</span>
                <span className="inline-block flex-1 border-b border-border">&nbsp;</span>
              </div>
            ))}
          </div>
          <div className="mono mt-3 text-[10px] text-muted-foreground">
            注：良率（收益率）= 良品数 ÷ 产量 × 100%。期间出货量含未关联设备档案的散装出货（辅助工具 / 龙头）；设备产量明细表仅统计已关联设备。本报表由技术中心设备看板系统自动生成。
          </div>
        </div>
      )}
    </div>
  )
}
