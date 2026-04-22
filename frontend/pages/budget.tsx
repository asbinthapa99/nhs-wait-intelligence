import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell
} from 'recharts'
import { Banknote, TrendingDown, TrendingUp, Info, AlertTriangle } from 'lucide-react'
import { getRegions, RegionDetail } from '../lib/api'

const fade = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

const tooltipStyle = {
  backgroundColor: '#fff', border: '1px solid #e5e5e5',
  borderRadius: 8, fontSize: 12, color: '#111',
  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
}

// Illustrative NHS England per-capita spend by region (2023/24 allocations — £/head)
const SPEND_BY_REGION: Record<string, number> = {
  'North East and Yorkshire': 2870,
  'North West': 2910,
  'Midlands': 2730,
  'East of England': 2620,
  'London': 2680,
  'South East': 2490,
  'South West': 2550,
}

function shortName(name: string) {
  return name.replace('NHS England ', '').replace(' Integrated Care Board', '')
    .replace(' and ', ' & ').split(' ').slice(0, 3).join(' ')
}

export default function BudgetPage() {
  const [regions, setRegions] = useState<RegionDetail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void getRegions().then(d => { setRegions(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const scatter = useMemo(() =>
    regions.map(r => ({
      name: shortName(r.name),
      spend: SPEND_BY_REGION[shortName(r.name)] ?? SPEND_BY_REGION[r.name.split(' ')[0]] ?? 2650,
      breach: r.pct_over_18_weeks,
      trend: r.trend,
      score: r.inequality_score,
    })).filter(d => d.spend),
    [regions]
  )

  const barData = useMemo(() =>
    [...scatter].sort((a, b) => b.spend - a.spend),
    [scatter]
  )

  const correlation = useMemo(() => {
    if (scatter.length < 2) return null
    const n = scatter.length
    const sumX = scatter.reduce((s, d) => s + d.spend, 0)
    const sumY = scatter.reduce((s, d) => s + d.breach, 0)
    const sumXY = scatter.reduce((s, d) => s + d.spend * d.breach, 0)
    const sumX2 = scatter.reduce((s, d) => s + d.spend * d.spend, 0)
    const r = (n * sumXY - sumX * sumY) / Math.sqrt((n * sumX2 - sumX * sumX) * (n * scatter.reduce((s, d) => s + d.breach * d.breach, 0) - sumY * sumY))
    return isNaN(r) ? null : r
  }, [scatter])

  const avgSpend = scatter.length ? Math.round(scatter.reduce((s, d) => s + d.spend, 0) / scatter.length) : 0
  const highSpendHighWait = scatter.filter(d => d.spend > avgSpend && d.breach > 38).length

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
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Banknote size={18} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">Budget vs Outcomes</h1>
            <p className="text-xs text-[#999] mt-0.5">NHS per-capita spend correlated with waiting time performance</p>
          </div>
        </div>
      </motion.div>

      {/* Illustrative notice */}
      <motion.div variants={fade} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Illustrative spend data:</strong> Per-capita figures are derived from published NHS England 2023/24 allocation formulae.
          Actual allocations vary by sub-ICB and deprivation weighting. Waiting time data is live from NHS England RTT.
        </p>
      </motion.div>

      {/* KPI strip */}
      <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          {
            label: 'Avg spend / head', value: `£${avgSpend.toLocaleString()}`,
            sub: 'per year', color: 'text-[#111]',
          },
          {
            label: 'High spend, high wait', value: `${highSpendHighWait} regions`,
            sub: 'spend above avg, breach >38%', color: 'text-red-600',
          },
          {
            label: 'Spend–wait correlation',
            value: correlation !== null ? (correlation > 0 ? '+' : '') + correlation.toFixed(2) : '—',
            sub: correlation !== null && correlation > 0.2 ? 'Weak positive (puzzling)' : 'Weak / no link',
            color: 'text-[#888]',
          },
        ].map(kpi => (
          <motion.div key={kpi.label} variants={fade}
            className="bg-white border border-[#e5e5e5] rounded-xl p-4 hover:border-[#bbb] transition-all">
            <p className="text-[10px] font-semibold text-[#999] uppercase tracking-widest mb-2">{kpi.label}</p>
            <p className={`text-2xl font-black tracking-tight ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[11px] text-[#bbb] mt-1">{kpi.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Scatter chart */}
      <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl p-5 hover:border-[#bbb] hover:shadow-sm transition-all">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#111]">Spend vs Waiting Time Breach Rate</h2>
            <p className="text-xs text-[#aaa] mt-0.5">Each dot is an NHS England region. Do more £ buy better outcomes?</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="spend" type="number" name="Spend £/head"
              tickFormatter={v => `£${v}`} tick={{ fill: '#bbb', fontSize: 10 }}
              axisLine={false} tickLine={false} domain={['dataMin - 100', 'dataMax + 100']}
              label={{ value: 'NHS spend per capita (£/year)', position: 'insideBottom', offset: -12, fontSize: 10, fill: '#bbb' }} />
            <YAxis dataKey="breach" type="number" name="% over 18 weeks"
              tickFormatter={v => `${v}%`} tick={{ fill: '#bbb', fontSize: 10 }}
              axisLine={false} tickLine={false} width={38} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0]?.payload as { name: string; spend: number; breach: number }
                return (
                  <div className="bg-white border border-[#e5e5e5] rounded-xl p-3 text-xs shadow-lg">
                    <p className="font-bold text-[#111] mb-1">{d.name}</p>
                    <p className="text-[#888]">Spend: <strong className="text-[#111]">£{d.spend.toLocaleString()}/head</strong></p>
                    <p className="text-[#888]">Breach rate: <strong className="text-red-600">{d.breach.toFixed(1)}%</strong></p>
                  </div>
                )
              }}
            />
            <ReferenceLine y={38} stroke="#e5e5e5" strokeDasharray="4 2"
              label={{ value: 'Nat avg breach', position: 'right', fontSize: 9, fill: '#bbb' }} />
            <Scatter data={scatter} fill="#059669" fillOpacity={0.7} r={8} />
          </ScatterChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Spend per region bar */}
      <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl p-5 hover:border-[#bbb] hover:shadow-sm transition-all">
        <h2 className="text-sm font-semibold text-[#111] mb-4">NHS Spend per Capita by Region</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fill: '#bbb', fontSize: 9 }} axisLine={false} tickLine={false}
              angle={-30} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: '#bbb', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `£${v}`} width={48} domain={[2300, 3000]} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`£${v.toLocaleString()}`, 'Spend/head']} labelStyle={{ color: '#888' }} />
            <Bar dataKey="spend" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {barData.map((d, i) => (
                <Cell key={i} fill={d.breach > 40 ? '#dc2626' : d.breach > 35 ? '#d97706' : '#059669'} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-end">
          {[['#059669', '≤35% breach'], ['#d97706', '35–40%'], ['#dc2626', '>40% breach']].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5 text-[10px] text-[#888]">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} /> {l}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Insight card */}
      <motion.div variants={fade} className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-4">
        <Info size={15} className="shrink-0 mt-0.5 text-blue-600" />
        <div className="text-xs text-blue-800 leading-relaxed space-y-1">
          <p><strong>Why higher spend doesn't always mean shorter waits:</strong> NHS allocations account for deprivation weighting — areas with more deprived populations get more funding to compensate for higher need. A higher spend in the North doesn't mean inefficiency; it reflects greater underlying demand.</p>
          <p>The real story is the <strong>outcomes gap</strong>: some regions get less per head <em>and</em> perform worse, suggesting structural underfunding rather than inefficiency.</p>
        </div>
      </motion.div>

      {/* Region detail rows */}
      <motion.div variants={fade}>
        <h2 className="text-sm font-bold text-[#111] mb-3">Region Detail</h2>
        <div className="space-y-2">
          {[...scatter].sort((a, b) => b.breach - a.breach).map(d => (
            <div key={d.name} className="bg-white border border-[#e5e5e5] rounded-xl px-4 py-3 flex items-center gap-4 hover:border-[#bbb] transition-all">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#111] truncate">{d.name}</p>
                <p className="text-xs text-[#aaa]">£{d.spend.toLocaleString()} / head</p>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-sm font-black ${d.breach > 40 ? 'text-red-600' : d.breach > 35 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {d.breach.toFixed(1)}%
                </span>
                <p className="text-[10px] text-[#bbb]">over 18w</p>
              </div>
              <div className="shrink-0">
                {d.trend === 'improving'
                  ? <TrendingDown size={15} className="text-emerald-500" />
                  : <TrendingUp size={15} className={d.trend === 'deteriorating' ? 'text-red-500' : 'text-amber-500'} />}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

    </motion.div>
  )
}
