import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, Download, AlertTriangle, RefreshCw,
  ArrowUpRight, ArrowDownRight, Activity, Eye, EyeOff
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Area, AreaChart,
} from 'recharts'
import DataStatusBanner from '../components/DataStatusBanner'
import EmptyStateCard from '../components/EmptyStateCard'
import AIInsightsPanel from '../components/AIInsightsPanel'
import { DataStatus, EMPTY_TRENDS, getApiUrl, getDataStatus, getTrends, TrendData } from '../lib/api'

const REGION_COLORS = ['#059669', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

interface PolicyEvent { month: string; label: string; short: string; color: string }
const POLICY_EVENTS: PolicyEvent[] = [
  { month: '2020-03', label: 'COVID-19 — elective care suspended', short: 'COVID', color: '#ef4444' },
  { month: '2021-07', label: 'NHS Elective Recovery Fund launched', short: 'ERF', color: '#f59e0b' },
  { month: '2022-02', label: 'NHS Elective Recovery Plan published', short: 'ERP', color: '#3b82f6' },
  { month: '2023-04', label: 'Integrated Care Systems established', short: 'ICS', color: '#8b5cf6' },
  { month: '2024-01', label: 'Elective Reform Plan — 18w target', short: 'Reform', color: '#10b981' },
]

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }

function formatChange(series: { month: string; value: number }[]) {
  if (series.length < 2 || series[0].value === 0) return 0
  return ((series[series.length - 1].value - series[0].value) / series[0].value) * 100
}

const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e5e5e5',
  borderRadius: 8,
  fontSize: 12,
  color: '#111',
  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
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
    const [tr, st] = await Promise.allSettled([getTrends(), getDataStatus()])
    setData(tr.status === 'fulfilled' ? tr.value : EMPTY_TRENDS)
    if (tr.status === 'rejected') setError('Could not reach the Trends API. Is the backend running?')
    if (st.status === 'fulfilled') setStatus(st.value)
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

  const regionStats = useMemo(() => data.series.map(s => ({
    region: s.region,
    change: formatChange(s.data),
    latest: s.data[s.data.length - 1]?.value ?? 0,
    color: colorByRegion[s.region],
  })), [data.series, colorByRegion])

  const fastestGrowth = regionStats.length ? regionStats.reduce((a, b) => a.change > b.change ? a : b) : null
  const largestBacklog = regionStats.length ? regionStats.reduce((a, b) => a.latest > b.latest ? a : b) : null
  const focusRegion = activeRegion === 'all' ? data.regions[0] : activeRegion
  const focusForecast = focusRegion ? data.forecast.find(s => s.region === focusRegion)?.data ?? [] : []

  const handleDownload = () => {
    if (!hasData) return
    const q = activeRegion === 'all' ? '' : `?regions=${encodeURIComponent(activeRegion)}`
    window.location.assign(getApiUrl(`/api/export/trends.csv${q}`))
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto pb-24">

      {/* ── Page Header ── */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <TrendingUp size={18} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">Trends & Forecasting</h1>
            <p className="text-xs text-[#999] mt-0.5">Regional waiting list history with 6-month ML forecasts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadTrends()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[#e5e5e5] rounded-lg text-[#888] hover:text-[#111] hover:border-[#bbb] transition-colors bg-white">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={handleDownload} disabled={!hasData}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#111] text-white hover:bg-[#333] transition-colors disabled:opacity-40">
            <Download size={12} /> Export CSV
          </button>
        </div>
      </motion.div>

      <DataStatusBanner status={status} loading={loading && !status} />

      {error && (
        <motion.div variants={fade} className="flex items-center gap-3 border border-red-200 bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertTriangle size={15} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => void loadTrends()} className="flex items-center gap-1 text-xs font-semibold hover:underline">
            <RefreshCw size={11} /> Retry
          </button>
        </motion.div>
      )}

      {!hasData && !loading ? (
        <EmptyStateCard title="No trend data available" body="Run the data pipeline to populate trend and forecast tables." actionLabel="Retry" onAction={() => void loadTrends()} />
      ) : (
        <>
          {/* ── KPI Strip ── */}
          <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Tracked Regions',
                value: String(data.regions.length || '—'),
                sub: latestActualMonth ? `Latest: ${latestActualMonth}` : 'No data yet',
                icon: Activity,
                accent: 'text-emerald-600',
                bg: 'bg-emerald-50',
                border: 'border-emerald-100',
              },
              {
                label: 'Largest Backlog',
                value: largestBacklog?.region ?? '—',
                sub: largestBacklog ? `${(largestBacklog.latest / 1_000_000).toFixed(2)}M patients` : 'No data',
                icon: ArrowUpRight,
                accent: 'text-red-500',
                bg: 'bg-red-50',
                border: 'border-red-100',
              },
              {
                label: 'Fastest Growing',
                value: fastestGrowth?.region ?? '—',
                sub: fastestGrowth ? `+${fastestGrowth.change.toFixed(1)}% period growth` : 'No data',
                icon: TrendingUp,
                accent: 'text-amber-600',
                bg: 'bg-amber-50',
                border: 'border-amber-100',
              },
              {
                label: 'Forecast View',
                value: showForecast ? 'Active' : 'Hidden',
                sub: `6-month ML projection`,
                icon: showForecast ? Eye : EyeOff,
                accent: 'text-violet-600',
                bg: 'bg-violet-50',
                border: 'border-violet-100',
              },
            ].map((card) => {
              const Icon = card.icon
              return (
                <motion.div key={card.label} variants={fade}
                  className="bg-white border border-[#e5e5e5] rounded-xl p-4 hover:border-[#bbb] hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-semibold text-[#999] uppercase tracking-widest">{card.label}</p>
                    <div className={`w-7 h-7 rounded-lg ${card.bg} border ${card.border} flex items-center justify-center`}>
                      <Icon size={13} className={card.accent} />
                    </div>
                  </div>
                  <p className={`text-lg font-bold ${card.accent} leading-tight truncate`}>{card.value}</p>
                  <p className="text-[11px] text-[#bbb] mt-1">{card.sub}</p>
                </motion.div>
              )
            })}
          </motion.div>

          {/* ── Filter Bar ── */}
          <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-xl px-4 py-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-[#bbb] uppercase tracking-widest font-semibold mr-1">Filter by region</span>
            {(['all', ...data.regions] as const).map(r => (
              <button key={r} onClick={() => setActiveRegion(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeRegion === r
                    ? 'bg-[#111] text-white'
                    : 'bg-[#f5f5f5] text-[#666] hover:text-[#111] hover:bg-[#ebebeb]'
                }`}
                style={activeRegion !== r && r !== 'all' ? { borderLeft: `3px solid ${colorByRegion[r]}`, paddingLeft: 10 } : {}}>
                {r === 'all' ? 'All Regions' : r}
              </button>
            ))}
            <div className="ml-auto">
              <button onClick={() => setShowForecast(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  showForecast ? 'bg-violet-600 text-white' : 'bg-[#f5f5f5] text-[#666] hover:text-[#111]'
                }`}>
                {showForecast ? <EyeOff size={11} /> : <Eye size={11} />}
                {showForecast ? 'Hide Forecast' : 'Show Forecast'}
              </button>
            </div>
          </motion.div>

          {/* ── Policy Timeline ── */}
          <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-[#111]">Key NHS Policy Events</h2>
              <span className="text-[10px] bg-[#f5f5f5] text-[#999] px-2 py-0.5 rounded">overlaid on chart below</span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {POLICY_EVENTS.map(e => (
                <div key={e.month} className="flex items-center gap-1.5 text-xs text-[#555]">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: e.color }} />
                  <span className="font-medium">{e.month}</span>
                  <span className="text-[#aaa]">—</span>
                  <span>{e.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Main Multi-Region Line Chart ── */}
          <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-xl p-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-[#111]">Waiting List Size by Region</h2>
                <p className="text-xs text-[#aaa] mt-0.5">Millions of patients — actual + forecast (dashed). Vertical lines = NHS policy events.</p>
              </div>
              {latestActualMonth && (
                <span className="text-[10px] border border-[#e5e5e5] bg-[#f9fafb] text-[#999] rounded px-2 py-1">
                  Latest actual: {latestActualMonth}
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" allowDuplicatedCategory={false}
                  tick={{ fontSize: 10, fill: '#bbb' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#bbb' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}M`} width={38} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: '#444', fontWeight: 600 }}
                  labelStyle={{ color: '#999', marginBottom: 4, fontWeight: 500 }}
                  formatter={(v: number, n: string) => [`${v.toFixed(2)}M`, n]}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12, color: '#999' }} />
                {POLICY_EVENTS.map(e => (
                  <ReferenceLine key={e.month} x={e.month} stroke={e.color} strokeWidth={1.5}
                    strokeDasharray="3 3" label={{ value: e.short, position: 'top', fontSize: 9, fill: e.color }} />
                ))}
                {latestActualMonth && (
                  <ReferenceLine x={latestActualMonth} stroke="#d4d4d4" strokeDasharray="4 4"
                    label={{ value: 'Now', position: 'top', fontSize: 10, fill: '#bbb' }} />
                )}
                {visibleSeries.map(s => (
                  <Line key={`a-${s.region}`} data={s.data} type="monotone" dataKey="value"
                    name={s.region} stroke={colorByRegion[s.region]} strokeWidth={2.5} dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }} />
                ))}
                {showForecast && visibleForecast.map(s => (
                  <Line key={`f-${s.region}`} data={s.data} type="monotone" dataKey="predicted"
                    name={`${s.region} (forecast)`} stroke={colorByRegion[s.region]}
                    strokeWidth={2} strokeDasharray="6 3" dot={false} opacity={0.7} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* ── Forecast Area Chart ── */}
          {showForecast && focusForecast.length > 0 && (
            <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-xl p-5">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h2 className="text-sm font-semibold text-[#111]">
                    {focusRegion} — 6-Month Forecast with Confidence Interval
                  </h2>
                  <p className="text-xs text-[#aaa] mt-0.5 mb-4">
                    Linear regression output from the ML pipeline. Shaded band = prediction interval.
                  </p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded bg-violet-50 border border-violet-100 text-violet-600 font-semibold">ML Forecast</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={focusForecast} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={focusRegion ? colorByRegion[focusRegion] : '#059669'} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={focusRegion ? colorByRegion[focusRegion] : '#059669'} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#bbb' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#bbb' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v}M`} width={38} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: '#444', fontWeight: 600 }}
                    labelStyle={{ color: '#999', marginBottom: 4 }}
                    formatter={(v: number, n: string) => [`${v.toFixed(2)}M`, n]}
                  />
                  <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confGrad)" name="Upper bound" />
                  <Area type="monotone" dataKey="lower" stroke="none" fill="#fff" fillOpacity={1} name="Lower bound" />
                  <Line type="monotone" dataKey="predicted"
                    stroke={focusRegion ? colorByRegion[focusRegion] ?? '#059669' : '#059669'}
                    strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: focusRegion ? colorByRegion[focusRegion] ?? '#059669' : '#059669' }}
                    name="Predicted" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* ── Regional Stats Table ── */}
          <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f0f0f0] flex items-center gap-2">
              <ArrowUpRight size={14} className="text-[#aaa]" />
              <h2 className="text-sm font-semibold text-[#111]">Regional Performance Summary</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-[#bbb] uppercase tracking-widest border-b border-[#f0f0f0]">
                    <th className="px-5 py-3 font-medium">Region</th>
                    <th className="px-5 py-3 font-medium text-right">Latest Waiting</th>
                    <th className="px-5 py-3 font-medium text-right">Period Change</th>
                    <th className="px-5 py-3 font-medium text-right">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5f5f5]">
                  {regionStats
                    .sort((a, b) => b.latest - a.latest)
                    .map(r => (
                      <tr key={r.region}
                        onClick={() => setActiveRegion(activeRegion === r.region ? 'all' : r.region)}
                        className={`hover:bg-[#fafafa] cursor-pointer transition-colors ${activeRegion === r.region ? 'bg-emerald-50/50' : ''}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: r.color }} />
                            <span className="text-sm font-medium text-[#111]">{r.region}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[#555] text-right">{(r.latest / 1_000_000).toFixed(2)}M</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={`text-sm font-semibold ${r.change > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {r.change > 0 ? '+' : ''}{r.change.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {r.change > 2
                            ? <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-600 uppercase tracking-wider">Rising</span>
                            : r.change < -1
                            ? <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 uppercase tracking-wider">Falling</span>
                            : <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-600 uppercase tracking-wider">Stable</span>
                          }
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-[#f0f0f0] text-[11px] text-[#bbb]">
              Click a row to filter charts to that region. Click again to deselect.
            </div>
          </motion.div>

          {/* AI Insights */}
          {status?.has_live_data && (
            <motion.div variants={fade}>
              <AIInsightsPanel topic="trends"
                askQuestion="What will happen to the North East backlog if current trends continue to 2026?" />
            </motion.div>
          )}

          {/* Mobile download */}
          <motion.div variants={fade}>
            <button onClick={handleDownload} disabled={!hasData}
              className="flex items-center justify-center gap-2 w-full py-2.5 border border-[#e5e5e5] rounded-xl text-sm font-medium text-[#666] hover:border-[#bbb] hover:text-[#111] transition-colors md:hidden bg-white">
              <Download size={14} /> Download CSV
            </button>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
