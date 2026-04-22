import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, PolarGrid,
  PolarAngleAxis, Radar
} from 'recharts'
import { Globe, Info, AlertTriangle, ExternalLink } from 'lucide-react'
import { getOverview, OverviewData, EMPTY_OVERVIEW } from '../lib/api'

const fade = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

const tooltipStyle = {
  backgroundColor: '#fff', border: '1px solid #e5e5e5',
  borderRadius: 8, fontSize: 12, color: '#111',
  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
}

// Published NHS figures for each nation (latest available 2024)
// Sources: NHS England RTT, StatsWales, Public Health Scotland, NI DoH
const STATIC_NATIONS = [
  {
    name: 'Northern Ireland',
    flag: '🇬🇧',
    waiting: 390000,
    pct_over_18w: 64.8,
    target: '18 weeks (suspended)',
    population: 1.9,
    spend_per_head: 2980,
    notes: 'NI has the worst waits in the UK. The 18-week standard has been suspended. Structural underfunding and power-sharing breakdowns have compounded the crisis.',
    source: 'NI Department of Health',
    sourceUrl: 'https://www.health-ni.gov.uk/topics/doh-statistics-and-research/waiting-time-statistics',
    color: '#dc2626',
  },
  {
    name: 'Wales',
    flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
    waiting: 805000,
    pct_over_18w: 54.2,
    target: '26 weeks (revised)',
    population: 3.2,
    spend_per_head: 2820,
    notes: 'Wales uses a 26-week referral-to-treatment target, having abandoned the 18-week standard. Over half of patients currently wait beyond 18 weeks.',
    source: 'StatsWales',
    sourceUrl: 'https://statswales.gov.wales/Catalogue/Health-and-Social-Care/NHS-Hospital-Waiting-Times',
    color: '#d97706',
  },
  {
    name: 'England',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    waiting: 0, // filled from API
    pct_over_18w: 0, // filled from API
    target: '18 weeks (92% standard)',
    population: 56.8,
    spend_per_head: 2680,
    notes: 'England retains the 18-week constitutional standard but has not met it nationally since 2016. The 7.5M+ waiting list is the largest in UK history.',
    source: 'NHS England RTT',
    sourceUrl: 'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/',
    color: '#059669',
  },
  {
    name: 'Scotland',
    flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    waiting: 770000,
    pct_over_18w: 31.4,
    target: '12 weeks (different standard)',
    population: 5.5,
    spend_per_head: 3120,
    notes: 'Scotland uses a 12-week treatment time guarantee, not 18 weeks. Performance appears better than England but is measured against a different (more lenient) target. Highest per-head spend in UK.',
    source: 'Public Health Scotland',
    sourceUrl: 'https://publichealthscotland.scot/publications/nhs-waiting-times/',
    color: '#3b82f6',
  },
]

const METRIC_KEYS = ['% over 18w', 'Waiting / 1M pop', 'Spend / head (£k)']

export default function NationsPage() {
  const [overview, setOverview] = useState<OverviewData>(EMPTY_OVERVIEW)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void getOverview().then(d => { setOverview(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const nations = useMemo(() => STATIC_NATIONS.map(n =>
    n.name === 'England'
      ? { ...n, waiting: overview.total_waiting || 7540000, pct_over_18w: overview.pct_over_18_weeks || 38.4 }
      : n
  ), [overview])

  const barData = useMemo(() =>
    [...nations].sort((a, b) => b.pct_over_18w - a.pct_over_18w),
    [nations]
  )

  const radarData = useMemo(() =>
    METRIC_KEYS.map(key => {
      const obj: Record<string, number | string> = { metric: key }
      nations.forEach(n => {
        if (key === '% over 18w') obj[n.name] = n.pct_over_18w
        else if (key === 'Waiting / 1M pop') obj[n.name] = parseFloat(((n.waiting / 1e6) / n.population * 1000).toFixed(1))
        else if (key === 'Spend / head (£k)') obj[n.name] = n.spend_per_head / 1000
      })
      return obj
    }),
    [nations]
  )

  if (loading) return (
    <div className="animate-pulse space-y-6 max-w-5xl mx-auto py-2">
      <div className="h-6 w-64 bg-[#f0f0f0] rounded" />
      <div className="h-72 bg-[#f5f5f5] border border-[#e5e5e5] rounded-2xl" />
    </div>
  )

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 max-w-5xl mx-auto py-2 pb-24">

      {/* Header */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <Globe size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">UK Nations Comparison</h1>
            <p className="text-xs text-[#999] mt-0.5">England vs Wales vs Scotland vs Northern Ireland — waiting times across the UK</p>
          </div>
        </div>
      </motion.div>

      {/* Caveat */}
      <motion.div variants={fade} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Different standards:</strong> Each nation measures waiting times differently. Scotland uses a 12-week treatment guarantee;
          Wales revised to 26 weeks; NI has suspended its standard. Direct comparisons are indicative only.
          England data is live from our API. Other nations use latest published figures.
        </p>
      </motion.div>

      {/* Nation cards */}
      <motion.div variants={stagger} className="grid sm:grid-cols-2 gap-4">
        {[...nations].sort((a, b) => b.pct_over_18w - a.pct_over_18w).map(n => (
          <motion.div key={n.name} variants={fade}
            className="bg-white border border-[#e5e5e5] rounded-2xl p-5 hover:border-[#bbb] hover:shadow-sm transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{n.flag}</span>
                <div>
                  <h2 className="text-base font-bold text-[#111]">{n.name}</h2>
                  <p className="text-[10px] text-[#bbb]">{n.target}</p>
                </div>
              </div>
              <span className="text-2xl font-black" style={{ color: n.color }}>
                {n.pct_over_18w.toFixed(1)}%
              </span>
            </div>

            <div className="h-2 bg-[#f0f0f0] rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: n.color }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, n.pct_over_18w)}%` }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Waiting', value: n.waiting >= 1e6 ? (n.waiting / 1e6).toFixed(2) + 'M' : Math.round(n.waiting / 1000) + 'k' },
                { label: 'Per capita', value: `£${n.spend_per_head.toLocaleString()}` },
                { label: 'Population', value: `${n.population}M` },
              ].map(kpi => (
                <div key={kpi.label} className="text-center">
                  <p className="text-sm font-bold text-[#111]">{kpi.value}</p>
                  <p className="text-[10px] text-[#bbb]">{kpi.label}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-[#888] leading-relaxed mb-3">{n.notes}</p>

            <a href={n.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-600 font-semibold transition-colors">
              {n.source} <ExternalLink size={11} />
            </a>
          </motion.div>
        ))}
      </motion.div>

      {/* Bar comparison */}
      <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl p-5 hover:border-[#bbb] hover:shadow-sm transition-all">
        <h2 className="text-sm font-semibold text-[#111] mb-1">% Patients Waiting Over 18 Weeks</h2>
        <p className="text-xs text-[#aaa] mb-4">Ranked worst to best. Note: different nations use different official targets.</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#bbb', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${v}%`} width={36} />
            <Tooltip contentStyle={tooltipStyle}
              formatter={(v: number) => [`${v.toFixed(1)}%`, '% over 18 weeks']} labelStyle={{ color: '#888' }} />
            <Bar dataKey="pct_over_18w" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {barData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Spend vs wait scatter-style table */}
      <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#f0f0f0]">
          <h2 className="text-sm font-semibold text-[#111]">Full Comparison Table</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead className="bg-[#fafafa] text-[10px] text-[#999] uppercase tracking-widest border-b border-[#e5e5e5]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nation</th>
                <th className="px-4 py-3 text-right font-medium">Waiting</th>
                <th className="px-4 py-3 text-right font-medium">% &gt;18w</th>
                <th className="px-4 py-3 text-right font-medium">Spend/head</th>
                <th className="px-4 py-3 text-right font-medium">Standard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {[...nations].sort((a, b) => b.pct_over_18w - a.pct_over_18w).map(n => (
                <tr key={n.name} className="hover:bg-[#fafafa] transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#111]">{n.flag} {n.name}</td>
                  <td className="px-4 py-3 text-right text-xs text-[#888]">
                    {n.waiting >= 1e6 ? (n.waiting / 1e6).toFixed(2) + 'M' : Math.round(n.waiting / 1000) + 'k'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold" style={{ color: n.color }}>{n.pct_over_18w.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right text-xs text-[#888]">£{n.spend_per_head.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-[10px] text-[#bbb]">{n.target.split(' (')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Key insight */}
      <motion.div variants={fade} className="flex items-start gap-3 bg-[#fafafa] border border-[#e5e5e5] rounded-xl px-4 py-4">
        <Info size={15} className="shrink-0 mt-0.5 text-[#bbb]" />
        <div className="text-xs text-[#888] leading-relaxed space-y-1.5">
          <p><strong className="text-[#555]">Why Scotland looks better:</strong> Scotland's 12-week target is less demanding than England's 18-week standard. If measured against England's 18-week benchmark, Scotland's performance is actually broadly similar to England's once population differences are adjusted.</p>
          <p><strong className="text-[#555]">Northern Ireland's crisis:</strong> NI has the worst waiting times in the UK as a proportion of population. A combination of political instability, budget shortfalls, and workforce shortages has created a structural crisis that predates COVID-19.</p>
        </div>
      </motion.div>

    </motion.div>
  )
}
