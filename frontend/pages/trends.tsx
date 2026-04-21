import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Download, AlertTriangle, RefreshCw, BarChart3 } from 'lucide-react'

import AIInsightsPanel from '../components/AIInsightsPanel'
import DataStatusBanner from '../components/DataStatusBanner'
import EmptyStateCard from '../components/EmptyStateCard'
import { DataStatus, EMPTY_TRENDS, getApiUrl, getDataStatus, getTrends, TrendData } from '../lib/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Area, AreaChart,
} from 'recharts'

const REGION_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316']

function formatChange(series: { month: string; value: number }[]) {
  if (series.length < 2 || series[0].value === 0) return '0.0'
  return (((series[series.length - 1].value - series[0].value) / series[0].value) * 100).toFixed(1)
}

const chartTooltipStyle = {
  background: '#1e293b', border: '1px solid #334155',
  borderRadius: 10, fontSize: 12, color: '#e2e8f0',
}

export default function TrendsPage() {
  const [data, setData] = useState<TrendData>(EMPTY_TRENDS)
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [showForecast, setShowForecast] = useState(true)
  const [activeRegion, setActiveRegion] = useState<'all' | string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTrends = async () => {
    setLoading(true); setError(null)
    const [trendsRes, statusRes] = await Promise.allSettled([getTrends(), getDataStatus()])
    setData(trendsRes.status === 'fulfilled' ? trendsRes.value : EMPTY_TRENDS)
    if (trendsRes.status === 'rejected') setError('Trends API could not be reached.')
    if (statusRes.status === 'fulfilled') setStatus(statusRes.value)
    setLoading(false)
  }

  useEffect(() => { void loadTrends() }, [])

  const colorByRegion = useMemo(
    () => Object.fromEntries(data.regions.map((r, i) => [r, REGION_COLORS[i % REGION_COLORS.length]])) as Record<string, string>,
    [data.regions]
  )

  const hasData = data.series.length > 0
  const visibleSeries = activeRegion === 'all' ? data.series : data.series.filter(s => s.region === activeRegion)
  const visibleForecast = activeRegion === 'all' ? data.forecast : data.forecast.filter(s => s.region === activeRegion)
  const latestActualMonth = data.series[0]?.data[data.series[0].data.length - 1]?.month
  const regionGrowth = data.series.map(s => ({
    region: s.region,
    change: Number(formatChange(s.data)),
    latest: s.data[s.data.length - 1]?.value ?? 0,
  }))
  const fastestGrowth = regionGrowth.length ? regionGrowth.reduce((a, b) => a.change > b.change ? a : b) : null
  const largestBacklog = regionGrowth.length ? regionGrowth.reduce((a, b) => a.latest > b.latest ? a : b) : null
  const forecastPeak = data.forecast.length
    ? data.forecast.reduce((cur, next) => {
        const nextPeak = Math.max(...next.data.map(p => p.predicted))
        return cur.value > nextPeak ? cur : { region: next.region, value: nextPeak }
      }, { region: data.forecast[0].region, value: Math.max(...data.forecast[0].data.map(p => p.predicted)) })
    : null
  const focusRegion = activeRegion === 'all' ? data.regions[0] : activeRegion
  const focusForecast = focusRegion ? data.forecast.find(s => s.region === focusRegion)?.data ?? [] : []

  const handleDownload = () => {
    if (!hasData) return
    const q = activeRegion === 'all' ? '' : `?regions=${encodeURIComponent(activeRegion)}`
    window.location.assign(getApiUrl(`/api/export/trends.csv${q}`))
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Trends &amp; Forecasting</h1>
          <p className="text-sm text-slate-400 mt-1">Regional backlog history with 6-month ML forecasts.</p>
        </div>
        <button onClick={handleDownload} disabled={!hasData}
          className="btn btn-sm btn-outline border-slate-700 text-slate-300 gap-2 hidden md:flex">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <DataStatusBanner status={status} loading={loading && !status} />

      {error && (
        <div className="alert border border-red-500/20 bg-red-500/10 text-red-300 text-sm rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => void loadTrends()} className="btn btn-xs btn-ghost ml-auto gap-1">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {!hasData && !loading ? (
        <EmptyStateCard
          title="No trend series available"
          body="Run the data pipeline to populate trend and forecast tables."
          actionLabel="Retry" onAction={() => void loadTrends()}
        />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Tracked regions', value: String(data.regions.length), sub: latestActualMonth ? `Latest ${latestActualMonth}` : 'No data', color: 'text-blue-400' },
              { label: 'Largest backlog', value: largestBacklog?.region ?? 'N/A', sub: largestBacklog ? `${largestBacklog.latest.toFixed(2)}M` : 'No data', color: 'text-red-400' },
              { label: 'Fastest growth', value: fastestGrowth?.region ?? 'N/A', sub: fastestGrowth ? `+${fastestGrowth.change.toFixed(1)}%` : 'No data', color: 'text-amber-400' },
              { label: 'Forecast peak', value: forecastPeak?.region ?? 'N/A', sub: forecastPeak ? `${forecastPeak.value.toFixed(2)}M projected` : 'No data', color: 'text-violet-400' },
            ].map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="card p-4">
                <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">{item.label}</p>
                <p className={`text-lg font-bold ${item.color} leading-tight truncate`}>{item.value}</p>
                <p className="text-xs text-slate-500 mt-1">{item.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            {(['all', ...data.regions] as const).map(r => (
              <button key={r} onClick={() => setActiveRegion(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeRegion === r
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}>
                {r === 'all' ? 'All regions' : r}
              </button>
            ))}
            <button onClick={() => setShowForecast(v => !v)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ml-auto ${
                showForecast
                  ? 'bg-violet-600/20 border border-violet-500/30 text-violet-300'
                  : 'bg-slate-800 border border-slate-700 text-slate-400'
              }`}>
              {showForecast ? 'Hide forecast' : 'Show forecast'}
            </button>
          </div>

          {/* Main line chart */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-200">Waiting list size (millions) — regional comparison</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" allowDuplicatedCategory={false}
                  tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}M`} />
                <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }} labelStyle={{ color: '#94a3b8', marginBottom: '4px' }} formatter={(v: number, n: string) => [`${v}M`, n]} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8, color: '#94a3b8' }} />
                {latestActualMonth && (
                  <ReferenceLine x={latestActualMonth} stroke="#334155" strokeDasharray="4 4"
                    label={{ value: 'Latest actual', position: 'top', fontSize: 10, fill: '#475569' }} />
                )}
                {visibleSeries.map(s => (
                  <Line key={`actual-${s.region}`} data={s.data} type="monotone" dataKey="value"
                    name={s.region} stroke={colorByRegion[s.region]} strokeWidth={2.5} dot={false}
                    activeDot={{ r: 5 }} />
                ))}
                {showForecast && visibleForecast.map(s => (
                  <Line key={`forecast-${s.region}`} data={s.data} type="monotone" dataKey="predicted"
                    name={`${s.region} forecast`} stroke={colorByRegion[s.region]}
                    strokeWidth={2} strokeDasharray="6 3" dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Forecast area chart */}
          {showForecast && focusForecast.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-200 mb-1">
                {focusRegion} — 6-month forecast with confidence interval
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Linear regression output from the pipeline. {loading ? 'Refreshing…' : 'Loaded from API.'}
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={focusForecast} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="confGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}M`} />
                  <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }} labelStyle={{ color: '#94a3b8', marginBottom: '4px' }} formatter={(v: number, n: string) => [`${v}M`, n]} />
                  <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confGradient)" name="Upper bound" />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="#070d1a" fillOpacity={1} name="Lower bound" />
                  <Line type="monotone" dataKey="predicted"
                    stroke={focusRegion ? colorByRegion[focusRegion] ?? '#3b82f6' : '#3b82f6'}
                    strokeWidth={2.5} dot={{ r: 4 }} name="Predicted" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {status?.has_live_data && (
            <AIInsightsPanel topic="trends"
              askQuestion="What will happen to the North East backlog if current trends continue to 2026?" />
          )}

          <button onClick={handleDownload} disabled={!hasData}
            className="btn btn-sm btn-outline border-slate-700 text-slate-400 w-full md:hidden gap-2">
            <Download className="w-3.5 h-3.5" /> Download CSV
          </button>
        </>
      )}
    </div>
  )
}
