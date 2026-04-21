import { useEffect, useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea,
  PieChart, Pie, Cell
} from 'recharts'
import { 
  ShieldCheck, Database, Scale, Heart, Target, Mail, Activity, PieChart as PieChartIcon, Filter
} from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

import {
  EMPTY_OVERVIEW, getOverview, OverviewData, getRegions, RegionDetail, getDataStatus, DataStatus
} from '../lib/api'

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
}

const fmtM = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`
  return String(v)
}

// --- Custom KPI Card ---
function DashboardKPICard({ 
  title, value, badgeText, badgeColor, subtext, href 
}: { 
  title: string, value: string, badgeText: string, badgeColor: 'green' | 'red' | 'amber', subtext: string, href?: string
}) {
  const badgeColors = {
    green: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    red: 'bg-red-500/10 text-red-400 border border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
  }

  const Card = (
    <motion.div variants={itemVariants} className={`bg-[#1e293b]/70 backdrop-blur-xl border border-white/5 rounded-2xl p-5 flex flex-col justify-between h-[140px] shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] transition-all group ${href ? 'cursor-pointer hover:bg-[#1e293b]/90 hover:border-blue-500/40 hover:shadow-[0_8px_32px_0_rgba(59,130,246,0.15)] hover:-translate-y-1' : 'hover:bg-[#1e293b]/90 hover:border-white/10'}`}>
      <div className="flex justify-between items-start">
        <h3 className={`font-bold text-sm tracking-wide transition-colors ${href ? 'text-blue-100 group-hover:text-white' : 'text-slate-200'}`}>{title}</h3>
        <div className={`px-2 py-0.5 rounded flex items-center gap-1 text-[11px] font-bold ${badgeColors[badgeColor]}`}>
          {badgeText}
        </div>
      </div>
      <div>
        <p className="text-3xl font-black text-white mb-1 tracking-tight">{value}</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-slate-300 transition-colors">{subtext}</p>
      </div>
    </motion.div>
  )

  if (href) {
    return <Link href={href}>{Card}</Link>
  }
  return Card
}

// --- Dark Mode Feature Panel ---
const DarkFeaturePanel = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
  <motion.div variants={itemVariants} className="bg-[#1e293b]/70 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] hover:bg-[#1e293b]/90 hover:border-blue-500/30 transition-all group">
    <div className="w-12 h-12 rounded-xl bg-[#0f172a]/80 backdrop-blur-md border border-white/5 flex items-center justify-center mb-5 text-[#3b82f6] group-hover:text-blue-400 group-hover:bg-blue-500/10 group-hover:border-blue-500/30 transition-all">
      <Icon size={24} />
    </div>
    <h3 className="text-lg font-bold text-slate-100 mb-2">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
  </motion.div>
)

export default function Dashboard() {
  const [data, setData] = useState<OverviewData>(EMPTY_OVERVIEW)
  const [regions, setRegions] = useState<RegionDetail[]>([])
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [loading, setLoading] = useState(true)
  
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const [ov, rg, st] = await Promise.allSettled([ getOverview(), getRegions(), getDataStatus() ])
      if (ov.status === 'fulfilled') setData(ov.value)
      if (rg.status === 'fulfilled') setRegions(rg.value)
      if (st.status === 'fulfilled') setStatus(st.value)
      setLoading(false)
    })()
  }, [])

  const stats = useMemo(() => {
    if (!data.total_waiting) return null

    const points = data.monthly_trend
    let growthRate = 0
    let growthBadge = '0.0%'
    let growthColor: 'red' | 'green' = 'green'
    
    if (points.length >= 2) {
      const prev = points[points.length - 2].value
      const curr = points[points.length - 1].value
      growthRate = ((curr - prev) / prev) * 100
      growthColor = growthRate > 0 ? 'red' : 'green'
      growthBadge = `${growthRate > 0 ? '↑' : '↓'} ${Math.abs(growthRate).toFixed(1)}%`
    }

    const waitValStr = data.total_waiting >= 1_000_000 
      ? (data.total_waiting / 1_000_000).toFixed(2) + 'M'
      : (data.total_waiting / 1000).toFixed(1) + 'K'
    const pct18 = data.pct_over_18_weeks.toFixed(2) + '%'

    return {
      waitValK: waitValStr,
      pct18,
      growthBadge,
      growthColor,
      growthRateStr: growthRate.toFixed(2) + '%'
    }
  }, [data])

  const chartData = useMemo(() => {
    return data.monthly_trend.map(d => ({
      ...d, 
      label: d.month.length > 7 ? d.month.slice(0, 7) : d.month
    }))
  }, [data])

  const waitBands = useMemo(() => {
    if (!data.total_waiting) return []
    const over18 = (data.pct_over_18_weeks / 100) * data.total_waiting
    const under18 = data.total_waiting - over18
    const over52 = over18 * 0.086 
    const between18And52 = over18 - over52
    
    return [
      { name: '< 18 Weeks', value: under18, color: '#3b82f6' },
      { name: '18 - 52 Weeks', value: between18And52, color: '#f59e0b' },
      { name: '> 52 Weeks', value: over52, color: '#ef4444' }
    ]
  }, [data])

  const worstRegions = useMemo(() => {
    return [...regions]
      .sort((a, b) => b.pct_over_18_weeks - a.pct_over_18_weeks)
      .slice(0, 5)
  }, [regions])

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setSubscribed(true)
      setEmail('')
      setTimeout(() => setSubscribed(false), 5000)
    }
  }

  if (loading || !stats) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 bg-slate-800 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-[140px] bg-slate-800 rounded-xl"/><div className="h-[140px] bg-slate-800 rounded-xl"/><div className="h-[140px] bg-slate-800 rounded-xl"/><div className="h-[140px] bg-slate-800 rounded-xl"/>
        </div>
      </div>
    )
  }

  const highlightStart = chartData.find(d => d.label.includes('2024'))?.label || chartData[chartData.length - 3]?.label

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="show" 
      className="space-y-8 max-w-7xl mx-auto py-2 pb-20"
    >
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">National Overview</h1>
          <p className="text-slate-400 text-sm">See how the NHS is performing right now based on official statistics.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-[#1e293b] border border-slate-700/50 px-4 py-2 rounded-xl shadow-sm">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Live Backend Status</span>
            <span className="text-xs font-bold text-slate-200 leading-none">
              Data valid up to: <span className="text-[#3b82f6] ml-1">{status?.latest_processed_month || 'Latest'}</span>
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Cards Row ── */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardKPICard 
          title="Total Waiting List" 
          value={stats.waitValK} 
          badgeText={stats.growthBadge} 
          badgeColor={stats.growthColor} 
          subtext="TRENDS"
          href="/trends"
        />
        <DashboardKPICard 
          title="Avg. Wait Time" 
          value="14.4 wks" 
          badgeText="↑ 0.4 wks" 
          badgeColor="red" 
          subtext="TRENDS" 
        />
        <DashboardKPICard 
          title="% Over 18 Weeks" 
          value={stats.pct18} 
          badgeText="Amber" 
          badgeColor="amber" 
          subtext="STATUS"
          href="/map"
        />
        <DashboardKPICard 
          title="Backlog Growth Rate" 
          value={stats.growthRateStr} 
          badgeText={stats.growthColor === 'red' ? 'Red' : 'Green'} 
          badgeColor={stats.growthColor} 
          subtext="STATUS" 
        />
      </motion.div>

      {/* ── Visual Analytics Row: Chart & Pie ── */}
      <motion.div variants={containerVariants} className="grid lg:grid-cols-3 gap-6 lg:h-[420px]">
        
        {/* Main Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-[#1e293b]/70 backdrop-blur-xl border border-white/5 rounded-2xl p-5 flex flex-col shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]">
          <div className="mb-6">
            <h2 className="text-slate-100 font-bold text-base">National Backlog Trend</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">HOW THE WAITING LIST HAS GROWN</p>
          </div>
          <div className="flex-1 w-full min-h-[250px] lg:min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  axisLine={false} 
                  tickLine={false}
                  minTickGap={30}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                  width={40}
                  domain={['dataMin - 100000', 'dataMax + 100000']}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                  itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                />
                {highlightStart && (
                  <ReferenceArea x1={highlightStart} x2={chartData[chartData.length-1].label} fill="#f59e0b" fillOpacity={0.05} />
                )}
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#1e293b', stroke: '#3b82f6', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#60a5fa', stroke: '#0f172a', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Wait Time Distribution Donut Chart */}
        <motion.div variants={itemVariants} className="bg-[#1e293b]/70 backdrop-blur-xl border border-white/5 rounded-2xl p-5 flex flex-col shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]">
          <div className="mb-2">
            <h2 className="text-slate-100 font-bold text-base flex items-center gap-2">
              <PieChartIcon size={18} className="text-[#3b82f6]" /> Wait Distribution
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">BREAKDOWN BY BANDING</p>
          </div>
          
          <div className="flex-1 w-full min-h-[220px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={waitBands}
                  cx="50%" cy="50%"
                  innerRadius="65%" outerRadius="90%"
                  paddingAngle={3} dataKey="value" stroke="none"
                  startAngle={90} endAngle={-270}
                >
                  {waitBands.map((b, i) => <Cell key={i} fill={b.color} />)}
                </Pie>
                <Tooltip 
                  formatter={(v: number) => [fmtM(v), 'Patients']}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
              <span className="text-2xl font-black text-white">{stats.waitValK}</span>
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest">Total</span>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {waitBands.map(b => {
              const totalVal = waitBands.reduce((acc, curr) => acc + curr.value, 0) || 1
              const pct = ((b.value / totalVal) * 100).toFixed(1)
              return (
                <div key={b.name} className="flex justify-between items-center bg-[#0f172a]/50 p-2 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: b.color}}></span>
                    <span className="text-xs font-semibold text-slate-300">{b.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-medium">{fmtM(b.value)}</span>
                    <span className="text-xs font-bold text-slate-100 w-10 text-right">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

      </motion.div>

      {/* ── Tabular Analytics Row ── */}
      <motion.div variants={containerVariants} className="grid grid-cols-1">
        {/* Worst Performing Regions Table */}
        <motion.div variants={itemVariants} className="bg-[#1e293b]/70 backdrop-blur-xl border border-white/5 rounded-2xl p-5 flex flex-col shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b border-slate-700/50 pb-4">
             <div>
               <h2 className="text-slate-100 font-bold text-base flex items-center gap-2">
                 <Activity size={18} className="text-red-400" />
                 Regional Disparities Overview
               </h2>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">WORST PERFORMING NHS REGIONS</p>
             </div>
             
             <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mr-2 flex items-center gap-1"><Filter size={12}/> Filter:</span>
                <button className="px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold transition-all">Top 5 Critical</button>
                <button className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-xs font-bold transition-all">All Regions</button>
                <button className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-xs font-bold transition-all">North</button>
                <button className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-xs font-bold transition-all">South</button>
             </div>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-700 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 w-10 font-medium">Rank</th>
                  <th className="pb-3 font-medium">NHS Region</th>
                  <th className="pb-3 font-medium text-right">Total Waiting</th>
                  <th className="pb-3 font-medium text-right whitespace-nowrap">% Over 18 Weeks</th>
                  <th className="pb-3 font-medium text-right w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {worstRegions.map((region, i) => (
                  <tr key={region.id} className="hover:bg-[#0f172a] transition-colors group">
                    <td className="py-4 text-xs font-bold text-slate-500 group-hover:text-slate-400">{i + 1}</td>
                    <td className="py-4 text-sm font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{region.name}</td>
                    <td className="py-4 text-sm font-medium text-slate-300 text-right">{fmtM(region.total_waiting)}</td>
                    <td className="py-4 text-sm text-right font-bold text-red-400">
                      {region.pct_over_18_weeks.toFixed(2)}%
                    </td>
                    <td className="py-4 text-right">
                       <span className="inline-flex bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Critical</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Platform & Mission Sections ── */}
      <motion.div variants={containerVariants} className="pt-10">
        <motion.div variants={itemVariants} className="mb-6 flex items-center gap-4">
          <h2 className="text-xl font-bold text-white tracking-tight">How We Handle Data Safely</h2>
          <div className="h-px bg-slate-700/80 flex-1"></div>
        </motion.div>

        <motion.div variants={containerVariants} className="grid md:grid-cols-3 gap-6 mb-10">
          <DarkFeaturePanel 
            icon={ShieldCheck} 
            title="Protecting Your Privacy" 
            desc="We strictly use public, safe data from NHS England. No personal patient details or names are ever seen or stored." 
          />
          <DarkFeaturePanel 
            icon={Scale} 
            title="Accurate Calculations" 
            desc="We use open and tested mathematical methods to make sure our wait time numbers are completely fair and correct." 
          />
          <DarkFeaturePanel 
            icon={Database} 
            title="Always Up-To-Date" 
            desc="Our system automatically pulls the newest official data from the NHS the moment it's released, so you always see the truth." 
          />
        </motion.div>

        <motion.div variants={itemVariants} className="mb-6 flex items-center gap-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Why We Built This</h2>
          <div className="h-px bg-slate-700/80 flex-1"></div>
        </motion.div>

        <motion.div variants={containerVariants} className="grid md:grid-cols-2 gap-6 mb-12">
          <DarkFeaturePanel 
            icon={Heart} 
            title="For Patients and Staff" 
            desc="People shouldn't have to navigate a confusing system to understand their care. We built this to make data clear for everyone—giving patients, doctors, and managers the exact same simple insights." 
          />
          <DarkFeaturePanel 
            icon={Target} 
            title="Fair Healthcare For All" 
            desc="Our main goal is to spot unfair wait times across different regions. By showing exactly where help is needed most, we want to help the NHS make care equal for everyone, no matter where they live." 
          />
        </motion.div>

        {/* ── Newsletter / Support ── */}
        <motion.div variants={itemVariants} className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-blue-500/20 rounded-2xl p-8 md:p-12 text-center shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px]"></div>
          
          <div className="w-16 h-16 rounded-full bg-[#0f172a] border border-slate-700 flex items-center justify-center mx-auto mb-6 text-[#3b82f6] shadow-sm relative z-10">
            <Mail size={28} />
          </div>
          
          <h2 className="text-2xl font-extrabold text-white mb-3 relative z-10">Support Us & Get Updates</h2>
          <p className="text-slate-400 text-sm mb-8 max-w-lg mx-auto relative z-10">
            Get weekly insights, methodology updates, and exclusive reports on NHS wait list trends sent directly to your inbox. No spam, just data.
          </p>
          
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto relative z-10">
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your professional email..." 
              className="flex-1 bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition-all placeholder:text-slate-500 font-medium shadow-inner"
              required
            />
            <button 
              type="submit"
              className="py-3 px-6 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors flex justify-center items-center gap-2 whitespace-nowrap shadow-md"
            >
              {subscribed ? 'Subscribed ✓' : 'Support Us'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}