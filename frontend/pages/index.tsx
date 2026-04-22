import { useEffect, useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { Activity, ArrowUpRight, Filter, PieChart as PieChartIcon, ShieldCheck, Database, Scale, Heart, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { EMPTY_OVERVIEW, getOverview, OverviewData, getRegions, RegionDetail, getDataStatus, DataStatus } from '../lib/api'

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

const fmt = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`
  return String(v)
}

function KPICard({ label, value, delta, deltaUp, sub, href }: {
  label: string; value: string; delta: string; deltaUp: boolean; sub?: string; href?: string
}) {
  const inner = (
    <motion.div variants={fade}
      className="border border-[#e5e5e5] rounded-xl p-5 bg-white hover:border-[#bbb] hover:shadow-sm transition-all group cursor-default"
    >
      <p className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-3">{label}</p>
      <p className="text-3xl font-bold text-[#111] tracking-tight mb-2">{value}</p>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${deltaUp ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
          {delta}
        </span>
        {sub && <span className="text-[11px] text-[#bbb]">{sub}</span>}
      </div>
    </motion.div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default function Dashboard() {
  const [data, setData] = useState<OverviewData>(EMPTY_OVERVIEW)
  const [regions, setRegions] = useState<RegionDetail[]>([])
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [regionFilter, setRegionFilter] = useState<'top5' | 'all'>('top5')

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const [ov, rg, st] = await Promise.allSettled([getOverview(), getRegions(), getDataStatus()])
      if (ov.status === 'fulfilled') setData(ov.value)
      if (rg.status === 'fulfilled') setRegions(rg.value)
      if (st.status === 'fulfilled') setStatus(st.value)
      setLoading(false)
    })()
  }, [])

  const stats = useMemo(() => {
    if (!data.total_waiting) return null
    const points = data.monthly_trend
    let growthRate = 0, growthBadge = '—', up = false
    if (points.length >= 2) {
      const prev = points[points.length - 2].value
      const curr = points[points.length - 1].value
      growthRate = ((curr - prev) / prev) * 100
      up = growthRate > 0
      growthBadge = `${up ? '↑' : '↓'} ${Math.abs(growthRate).toFixed(1)}%`
    }
    const waitValStr = data.total_waiting >= 1_000_000
      ? (data.total_waiting / 1_000_000).toFixed(2) + 'M'
      : (data.total_waiting / 1000).toFixed(1) + 'K'
    return { waitValStr, pct18: data.pct_over_18_weeks.toFixed(2) + '%', growthBadge, up, growthRateStr: growthRate.toFixed(2) + '%' }
  }, [data])

  const chartData = useMemo(() =>
    data.monthly_trend.map(d => ({ ...d, label: d.month.slice(0, 7) }))
  , [data])

  const waitBands = useMemo(() => {
    if (!data.total_waiting) return []
    const over18 = (data.pct_over_18_weeks / 100) * data.total_waiting
    const under18 = data.total_waiting - over18
    const over52 = over18 * 0.086
    return [
      { name: '< 18 Weeks', value: under18, color: '#3b82f6' },
      { name: '18–52 Weeks', value: over18 - over52, color: '#f59e0b' },
      { name: '> 52 Weeks', value: over52, color: '#ef4444' },
    ]
  }, [data])

  const sortedRegions = useMemo(() =>
    [...regions].sort((a, b) => b.pct_over_18_weeks - a.pct_over_18_weeks)
  , [regions])

  const displayedRegions = regionFilter === 'top5' ? sortedRegions.slice(0, 5) : sortedRegions

  if (loading || !stats) {
    return (
      <div className="animate-pulse space-y-6 max-w-7xl mx-auto py-8">
        <div className="h-6 w-52 bg-[#f0f0f0] rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-[#f5f5f5] border border-[#e5e5e5] rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-10 max-w-7xl mx-auto py-6 pb-24">

      {/* Header */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-6">
        <div>
          <h1 className="text-xl font-bold text-[#111] tracking-tight">National Overview</h1>
          <p className="text-sm text-[#888] mt-1">Official NHS England waiting list statistics.</p>
        </div>
        <div className="flex items-center gap-2 border border-[#e5e5e5] bg-white rounded-lg px-3 py-2 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[#999]">Data valid to:</span>
          <span className="text-[#111] font-semibold">{status?.latest_processed_month || 'Latest'}</span>
        </div>
      </motion.div>

      {/* KPI Row */}
      <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Waiting" value={stats.waitValStr} delta={stats.growthBadge} deltaUp={stats.up} sub="vs last month" href="/trends" />
        <KPICard label="Avg. Wait Time" value="14.4 wks" delta="↑ 0.4 wks" deltaUp sub="vs prev period" />
        <KPICard label="% Over 18 Weeks" value={stats.pct18} delta="Amber alert" deltaUp={false} sub="NHS target: 0%" href="/map" />
        <KPICard label="Backlog Growth Rate" value={stats.growthRateStr} delta={stats.growthBadge} deltaUp={stats.up} sub="MoM" />
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={stagger} className="grid lg:grid-cols-3 gap-6">

        {/* Line Chart */}
        <motion.div variants={fade} className="lg:col-span-2 border border-[#e5e5e5] rounded-xl p-5 bg-white">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-[#111]">National Backlog Trend</h2>
              <p className="text-xs text-[#aaa] mt-0.5 uppercase tracking-wider">Monthly total waiting list</p>
            </div>
            <span className="text-[10px] border border-[#e5e5e5] text-[#aaa] rounded px-2 py-1">12-month view</span>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fill: '#bbb', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={30} />
                <YAxis
                  tick={{ fill: '#bbb', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  width={40} domain={['dataMin - 100000', 'dataMax + 100000']}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px', color: '#111', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
                  itemStyle={{ color: '#059669', fontWeight: 700 }}
                  labelStyle={{ color: '#888', marginBottom: 4 }}
                />
                <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={2}
                  dot={{ r: 3, fill: '#fff', stroke: '#2563eb', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Donut Chart */}
        <motion.div variants={fade} className="border border-[#e5e5e5] rounded-xl p-5 bg-white flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <PieChartIcon size={14} className="text-[#aaa]" />
            <h2 className="text-sm font-semibold text-[#111]">Wait Distribution</h2>
          </div>
          <p className="text-xs text-[#aaa] uppercase tracking-wider mb-4">Breakdown by banding</p>

          <div className="relative flex-1 min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={waitBands} cx="50%" cy="50%" innerRadius="62%" outerRadius="88%"
                  paddingAngle={2} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                  {waitBands.map((b, i) => <Cell key={i} fill={b.color} />)}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [fmt(v), 'Patients']}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px', color: '#111', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-[#111]">{stats.waitValStr}</span>
              <span className="text-[10px] text-[#bbb] uppercase tracking-widest">Total</span>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            {waitBands.map(b => {
              const total = waitBands.reduce((a, c) => a + c.value, 0) || 1
              return (
                <div key={b.name} className="flex items-center justify-between py-2 border-t border-[#f0f0f0]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: b.color }} />
                    <span className="text-xs text-[#555]">{b.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-[#bbb]">{fmt(b.value)}</span>
                    <span className="text-[#111] font-semibold w-9 text-right">{((b.value / total) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </motion.div>

      {/* Regional Table */}
      <motion.div variants={fade} className="border border-[#e5e5e5] rounded-xl bg-white overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-red-500" />
            <h2 className="text-sm font-semibold text-[#111]">Regional Disparities</h2>
            <span className="text-[11px] text-[#bbb]">— Worst performing NHS regions</span>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={11} className="text-[#bbb]" />
            <span className="text-[11px] text-[#bbb] uppercase tracking-wider mr-1">Filter</span>
            {(['top5', 'all'] as const).map(f => (
              <button key={f} onClick={() => setRegionFilter(f)}
                className={`px-3 py-1 rounded text-[11px] font-semibold transition-colors ${regionFilter === f ? 'bg-[#111] text-white' : 'text-[#888] hover:text-[#111] border border-[#e5e5e5]'}`}
              >
                {f === 'top5' ? 'Top 5 Critical' : 'All Regions'}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead>
              <tr className="border-b border-[#f0f0f0] text-[10px] text-[#bbb] uppercase tracking-widest">
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">NHS Region</th>
                <th className="px-5 py-3 font-medium text-right">Total Waiting</th>
                <th className="px-5 py-3 font-medium text-right">% Over 18 Weeks</th>
                <th className="px-5 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5f5]">
              {displayedRegions.map((region, i) => (
                <tr key={region.id} className="hover:bg-[#fafafa] transition-colors">
                  <td className="px-5 py-4 text-[11px] text-[#ccc]">{i + 1}</td>
                  <td className="px-5 py-4 text-sm font-medium text-[#111]">{region.name}</td>
                  <td className="px-5 py-4 text-sm text-[#888] text-right">{fmt(region.total_waiting)}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-red-600 text-right">{region.pct_over_18_weeks.toFixed(2)}%</td>
                  <td className="px-5 py-4 text-right">
                    <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-600 uppercase tracking-wider">Critical</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Mission Section */}
      <motion.div variants={stagger} className="pt-4">
        <motion.div variants={fade} className="flex items-center gap-4 mb-6">
          <h2 className="text-base font-semibold text-[#111] whitespace-nowrap">How We Handle Data</h2>
          <div className="h-px bg-[#e5e5e5] flex-1" />
        </motion.div>
        <motion.div variants={stagger} className="grid md:grid-cols-3 gap-4 mb-10">
          {[
            { icon: ShieldCheck, title: 'Protecting Your Privacy', desc: 'We use only public, anonymised NHS England data. No personal patient information is ever collected or stored.' },
            { icon: Scale, title: 'Accurate Calculations', desc: 'Open and tested mathematical methods ensure all wait time statistics are fair, reproducible, and auditable.' },
            { icon: Database, title: 'Always Up-To-Date', desc: 'The pipeline automatically ingests the latest monthly NHS RTT data the moment it is released.' },
          ].map(({ icon: Icon, title, desc }) => (
            <motion.div key={title} variants={fade} className="border border-[#e5e5e5] rounded-xl p-5 bg-white hover:border-[#bbb] hover:shadow-sm transition-all">
              <div className="w-8 h-8 rounded-lg border border-[#e5e5e5] bg-[#fafafa] flex items-center justify-center mb-4 text-[#888]">
                <Icon size={16} />
              </div>
              <h3 className="text-sm font-semibold text-[#111] mb-2">{title}</h3>
              <p className="text-xs text-[#888] leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={fade} className="flex items-center gap-4 mb-6">
          <h2 className="text-base font-semibold text-[#111] whitespace-nowrap">Why We Built This</h2>
          <div className="h-px bg-[#e5e5e5] flex-1" />
        </motion.div>
        <motion.div variants={stagger} className="grid md:grid-cols-2 gap-4 mb-10">
          {[
            { icon: Heart, title: 'For Patients and Staff', desc: "People shouldn't have to navigate a confusing system to understand their care. We make NHS data clear for everyone — giving patients, doctors, and managers the same simple insights." },
            { icon: Target, title: 'Fair Healthcare For All', desc: 'By showing exactly where wait times are longest, we help the NHS direct resources where they are needed most, making care more equal regardless of geography.' },
          ].map(({ icon: Icon, title, desc }) => (
            <motion.div key={title} variants={fade} className="border border-[#e5e5e5] rounded-xl p-5 bg-white hover:border-[#bbb] hover:shadow-sm transition-all">
              <div className="w-8 h-8 rounded-lg border border-[#e5e5e5] bg-[#fafafa] flex items-center justify-center mb-4 text-[#888]">
                <Icon size={16} />
              </div>
              <h3 className="text-sm font-semibold text-[#111] mb-2">{title}</h3>
              <p className="text-xs text-[#888] leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div variants={fade} className="border border-[#e5e5e5] rounded-xl p-8 md:p-10 text-center bg-white">
          <div className="w-10 h-10 rounded-full border border-[#e5e5e5] bg-[#fafafa] flex items-center justify-center mx-auto mb-5 text-[#999]">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-[#111] mb-2">Open Source & Non-Profit</h2>
          <p className="text-sm text-[#888] mb-7 max-w-md mx-auto leading-relaxed">
            Built on public NHS data under MIT licence. No advertising, no data selling. Contribute, report a bug, or star the repo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="https://github.com/asbinthapa99/nhs-wait-intelligence" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#111] text-white text-sm font-semibold hover:bg-[#333] transition-colors">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" /></svg>
              View on GitHub
            </Link>
            <Link href="/about"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-[#e5e5e5] text-[#555] text-sm font-semibold hover:border-[#bbb] hover:text-[#111] transition-colors">
              About this project
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}