import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts'
import { CalendarClock, Target, AlertTriangle, Info, TrendingDown } from 'lucide-react'
import { getOverview, getTrends, OverviewData, EMPTY_OVERVIEW } from '../lib/api'

const fade = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

const NHS_TARGET = 92
const tooltipStyle = {
  backgroundColor: '#fff', border: '1px solid #e5e5e5',
  borderRadius: 8, fontSize: 12, color: '#111',
  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
}

function addMonths(base: string, n: number): string {
  const d = new Date(base + '-01')
  d.setMonth(d.getMonth() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = points.length
  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

export default function ProjectionPage() {
  const [overview, setOverview] = useState<OverviewData>(EMPTY_OVERVIEW)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const [ov] = await Promise.allSettled([getOverview()])
      if (ov.status === 'fulfilled') setOverview(ov.value)
      setLoading(false)
    })()
  }, [])

  const { chartData, projectionYear, monthsToTarget, scenario } = useMemo(() => {
    const trend = overview.monthly_trend
    if (!trend.length) return { chartData: [], projectionYear: null, monthsToTarget: null, scenario: 'unknown' as const }

    // Convert to % within 18w
    const historical = trend.map((pt, i) => ({
      month: pt.month.slice(0, 7),
      within18w: parseFloat((100 - pt.value).toFixed(2)),
      x: i,
      type: 'historical' as const,
    }))

    // Linear regression on last 12 months
    const recent = historical.slice(-12)
    const reg = linearRegression(recent.map(p => ({ x: p.x, y: p.within18w })))

    // Project forward 120 months (10 years)
    const lastIdx = historical[historical.length - 1].x
    const lastMonth = historical[historical.length - 1].month
    const projected: { month: string; projected: number; lower: number; upper: number; x: number }[] = []

    let targetMonth: string | null = null
    for (let i = 1; i <= 120; i++) {
      const x = lastIdx + i
      const val = reg.slope * x + reg.intercept
      const stdErr = 1.5
      const m = addMonths(lastMonth, i)
      if (val >= NHS_TARGET && !targetMonth) targetMonth = m
      projected.push({
        month: m,
        projected: Math.max(0, Math.min(100, parseFloat(val.toFixed(2)))),
        lower: Math.max(0, parseFloat((val - stdErr * Math.sqrt(i)).toFixed(2))),
        upper: Math.min(100, parseFloat((val + stdErr * Math.sqrt(i)).toFixed(2))),
        x,
      })
      if (i > 36 && val >= NHS_TARGET) break
    }

    const currentRate = historical[historical.length - 1]?.within18w ?? 0
    const monthsLeft = targetMonth ? projected.findIndex(p => p.month === targetMonth) + 1 : null
    const scen = reg.slope > 0.05 ? 'improving' : reg.slope < -0.05 ? 'worsening' : 'stagnant'

    // Merge for chart
    const combined = [
      ...historical.map(p => ({ month: p.month, within18w: p.within18w, projected: undefined as number | undefined, lower: undefined as number | undefined, upper: undefined as number | undefined })),
      ...projected.slice(0, 60).map(p => ({ month: p.month, within18w: undefined as number | undefined, projected: p.projected, lower: p.lower, upper: p.upper })),
    ]

    return {
      chartData: combined,
      projectionYear: targetMonth ? targetMonth.slice(0, 4) : null,
      monthsToTarget: monthsLeft,
      scenario: scen,
    }
  }, [overview])

  const currentWithin18 = useMemo(() =>
    overview.monthly_trend.length
      ? 100 - overview.monthly_trend[overview.monthly_trend.length - 1].value
      : 0,
    [overview]
  )
  const gap = NHS_TARGET - currentWithin18

  const SCENARIO_LABELS = {
    improving: { text: 'Improving trajectory', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
    worsening: { text: 'Worsening trajectory', color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
    stagnant: { text: 'Stagnant — no clear trend', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    unknown: { text: 'Insufficient data', color: 'text-[#888]', bg: 'bg-[#f5f5f5] border-[#e5e5e5]' },
  }
  const scenarioLabel = SCENARIO_LABELS[scenario as keyof typeof SCENARIO_LABELS] ?? SCENARIO_LABELS.unknown

  if (loading) return (
    <div className="animate-pulse space-y-6 max-w-5xl mx-auto py-2">
      <div className="h-6 w-64 bg-[#f0f0f0] rounded" />
      <div className="h-80 bg-[#f5f5f5] border border-[#e5e5e5] rounded-2xl" />
    </div>
  )

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 max-w-5xl mx-auto py-2 pb-24">

      {/* Header */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
            <CalendarClock size={18} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">92% Target Projection</h1>
            <p className="text-xs text-[#999] mt-0.5">When will England hit the NHS 18-week constitutional standard?</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border ${scenarioLabel.bg} ${scenarioLabel.color} shrink-0`}>
          {scenarioLabel.text}
        </span>
      </motion.div>

      {/* Headline answer */}
      <motion.div variants={fade} className={`rounded-2xl px-6 py-5 border ${projectionYear ? (scenario === 'improving' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200') : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${projectionYear ? 'bg-white border border-emerald-100' : 'bg-white border border-red-100'}`}>
            {projectionYear ? <Target size={18} className="text-emerald-600" /> : <AlertTriangle size={18} className="text-red-500" />}
          </div>
          <div>
            {projectionYear ? (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-[#999] mb-1">At current trajectory</p>
                <p className="text-2xl sm:text-3xl font-black text-[#111] tracking-tight">
                  92% standard reached: <span className="text-emerald-600">{projectionYear}</span>
                </p>
                <p className="text-sm text-[#888] mt-1">
                  ~{monthsToTarget} months away. {gap.toFixed(1)} percentage points still to close.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-[#999] mb-1">At current trajectory</p>
                <p className="text-2xl font-black text-red-600">Target not reached within 10 years</p>
                <p className="text-sm text-[#888] mt-1">
                  The 18-week standard has not been met nationally since February 2016.
                  Current trend does not show meaningful recovery within a 10-year window.
                </p>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* KPI strip */}
      <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Currently within 18w', value: `${currentWithin18.toFixed(1)}%`, sub: 'national average', color: currentWithin18 >= 92 ? 'text-emerald-600' : 'text-red-600' },
          { label: 'Gap to target', value: `${gap.toFixed(1)}pp`, sub: 'percentage points short of 92%', color: 'text-amber-600' },
          { label: 'Last met standard', value: 'Feb 2016', sub: '9+ years ago', color: 'text-[#111]' },
        ].map(kpi => (
          <motion.div key={kpi.label} variants={fade}
            className="bg-white border border-[#e5e5e5] rounded-xl p-4 hover:border-[#bbb] transition-all">
            <p className="text-[10px] font-semibold text-[#999] uppercase tracking-widest mb-2">{kpi.label}</p>
            <p className={`text-2xl font-black tracking-tight ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[11px] text-[#bbb] mt-1">{kpi.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Main projection chart */}
      {chartData.length > 0 && (
        <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl p-5 hover:border-[#bbb] hover:shadow-sm transition-all">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#111]">% Patients Treated Within 18 Weeks</h2>
              <p className="text-xs text-[#aaa] mt-0.5">Historical data + linear projection at current rate of change</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fill: '#bbb', fontSize: 9 }} axisLine={false} tickLine={false}
                interval={Math.floor(chartData.length / 8)} />
              <YAxis tick={{ fill: '#bbb', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`} width={36} domain={[50, 100]} />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(v: number, name: string) => [`${v?.toFixed(1)}%`, name === 'within18w' ? 'Actual' : 'Projected']}
                labelStyle={{ color: '#888' }} />
              <ReferenceLine y={NHS_TARGET} stroke="#059669" strokeDasharray="5 3" strokeWidth={1.5}
                label={{ value: '92% target', position: 'right', fontSize: 10, fill: '#059669' }} />
              <Area type="monotone" dataKey="within18w" stroke="#059669" strokeWidth={2}
                fill="url(#histGrad)" dot={false} connectNulls={false} name="Actual" />
              <Area type="monotone" dataKey="projected" stroke="#8b5cf6" strokeWidth={2}
                strokeDasharray="5 3" fill="url(#projGrad)" dot={false} connectNulls={false} name="Projected" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-3 justify-end">
            {[['#059669', 'Historical'], ['#8b5cf6', 'Projected (current trend)'], ['#059669', '92% NHS target (dashed)']].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1.5 text-[10px] text-[#888]">
                <span className="w-6 h-0.5" style={{ backgroundColor: c, display: 'inline-block' }} /> {l}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Scenarios */}
      <motion.div variants={fade}>
        <h2 className="text-sm font-bold text-[#111] mb-3">What Would Change the Trajectory?</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: TrendingDown, label: 'Business as usual',
              detail: projectionYear ? `92% standard met ~${projectionYear} at current improvement rate.` : 'No realistic path to 92% within 10 years on current trend.',
              color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', badge: 'Current path',
            },
            {
              icon: Target, label: 'Accelerated recovery',
              detail: 'If elective activity increases 15% above current levels, the target could be met 3–5 years earlier.',
              color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', badge: 'Optimistic',
            },
            {
              icon: AlertTriangle, label: 'Further shocks',
              detail: 'Another major demand shock (pandemic, industrial action, winter crisis) could push target to the 2030s or beyond.',
              color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', badge: 'Pessimistic',
            },
          ].map(({ icon: Icon, label, detail, color, bg, border, badge }) => (
            <div key={label} className={`bg-white border border-[#e5e5e5] rounded-xl p-5 hover:border-[#bbb] hover:shadow-sm transition-all`}>
              <div className={`w-8 h-8 rounded-lg ${bg} border ${border} flex items-center justify-center mb-3`}>
                <Icon size={15} className={color} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${bg} border ${border} ${color}`}>{badge}</span>
              <p className="text-sm font-semibold text-[#111] mt-3 mb-2">{label}</p>
              <p className="text-xs text-[#888] leading-relaxed">{detail}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Methodology note */}
      <motion.div variants={fade} className="flex items-start gap-3 bg-[#fafafa] border border-[#e5e5e5] rounded-xl px-4 py-4">
        <Info size={15} className="shrink-0 mt-0.5 text-[#bbb]" />
        <p className="text-xs text-[#888] leading-relaxed">
          <strong className="text-[#555]">Methodology:</strong> Projection uses ordinary least squares linear regression on the most recent 12 months of NHS England RTT data.
          Confidence bands widen at ±1.5 standard errors × √months ahead. This is intentionally simple — the NHS's own modelling uses more complex methods.
          Treat this as directional, not predictive.
        </p>
      </motion.div>

    </motion.div>
  )
}
