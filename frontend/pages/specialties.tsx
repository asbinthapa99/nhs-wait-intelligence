import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, AlertTriangle, RefreshCw, Activity, Filter, ArrowUpRight } from 'lucide-react'

import AIInsightsPanel from '../components/AIInsightsPanel'
import DataStatusBanner from '../components/DataStatusBanner'
import EmptyStateCard from '../components/EmptyStateCard'
import SEO from '../components/SEO'
import { DataStatus, getApiUrl, getDataStatus, getSpecialties, Specialty } from '../lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

function formatWaiting(v: number) {
  return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : `${(v / 1_000).toFixed(0)}k`
}

function formatSignedPercent(v: number) {
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
}

function barColor(pct: number) {
  if (pct >= 50) return '#ef4444'
  if (pct >= 40) return '#f59e0b'
  if (pct >= 30) return '#eab308'
  return '#10b981'
}

function pctColor(pct: number) {
  if (pct >= 50) return 'text-red-600'
  if (pct >= 40) return 'text-amber-600'
  if (pct >= 30) return 'text-yellow-600'
  return 'text-emerald-600'
}

function yoyColor(v: number) {
  if (v >= 15) return 'text-red-600'
  if (v >= 10) return 'text-amber-600'
  if (v <= 0) return 'text-emerald-600'
  return 'text-emerald-500'
}

const tooltipStyle = {
  backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: 8,
  fontSize: 12, color: '#111', boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
}

export default function SpecialtiesPage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('All')

  const loadSpecialties = async () => {
    setLoading(true); setError(null)
    const [spRes, statusRes] = await Promise.allSettled([getSpecialties(), getDataStatus()])
    setSpecialties(spRes.status === 'fulfilled' ? spRes.value.specialties : [])
    if (spRes.status === 'rejected') setError('Specialties API could not be reached.')
    if (statusRes.status === 'fulfilled') setStatus(statusRes.value)
    setLoading(false)
  }

  useEffect(() => { void loadSpecialties() }, [])

  const sortedByWaits = [...specialties].sort((a, b) => b.pct_over_18_weeks - a.pct_over_18_weeks)
  const sortedByGrowth = [...specialties].sort((a, b) => b.yoy_change - a.yoy_change)
  const worst = sortedByWaits[0]
  const hasData = specialties.length > 0

  const handleDownload = () => {
    if (!hasData) return
    window.location.assign(getApiUrl('/api/export/specialties.csv'))
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto pb-24">
      <SEO 
        title="Clinical Specialties" 
        description="Identify which NHS medical specialties (like Orthopaedics and Ophthalmology) are under the most operational pressure with our deep-dive analysis."
      />
      {/* Header */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
            <Activity size={17} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">Clinical Specialty Deep-Dive</h1>
            <p className="text-xs text-[#999] mt-0.5">Identify which medical specialties are under the most operational pressure.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadSpecialties()}
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
          <AlertTriangle size={14} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => void loadSpecialties()} className="flex items-center gap-1 text-xs font-semibold hover:underline">
            <RefreshCw size={11} /> Retry
          </button>
        </motion.div>
      )}

      {!hasData && !loading ? (
        <EmptyStateCard
          title="No specialty data available"
          body="Run the data pipeline to populate specialty analysis."
          actionLabel="Retry" onAction={() => void loadSpecialties()}
        />
      ) : (
        <>
          {/* Worst specialty alert */}
          {worst && (
            <motion.div variants={fade}
              className="flex items-start gap-4 border border-red-200 bg-red-50 rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="w-10 h-10 rounded-xl bg-white border border-red-200 flex items-center justify-center shrink-0 shadow-sm relative z-10">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div className="relative z-10">
                <p className="text-sm font-bold text-red-800 mb-1">
                  {worst.name} is the most severely pressured specialty
                </p>
                <p className="text-xs text-red-700 leading-relaxed max-w-3xl">
                  <strong className="text-red-900">{worst.pct_over_18_weeks}%</strong> of patients waiting over 18 weeks — growing by <strong className="text-red-900">{formatSignedPercent(worst.yoy_change)}</strong> year-on-year.
                  Currently affecting <strong className="text-red-900">{formatWaiting(worst.total_waiting)}</strong> patients.
                </p>
              </div>
            </motion.div>
          )}

          {/* Charts */}
          <motion.div variants={stagger} className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
            <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-sm font-bold text-[#111]">18-Week Breach Rate</h2>
                  <p className="text-[10px] text-[#bbb] uppercase tracking-widest mt-0.5">Worst performing (%)</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={sortedByWaits.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 24, left: 100, bottom: 0 }} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#bbb' }} axisLine={false} tickLine={false}
                    domain={[0, 60]} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#666', fontWeight: 500 }}
                    axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#111', fontWeight: 700 }} labelStyle={{ color: '#888', marginBottom: 4 }} formatter={(v: number) => [`${v}%`, 'Over 18 weeks']}
                    cursor={{ fill: '#f9fafb' }} />
                  <Bar dataKey="pct_over_18_weeks" radius={[0, 4, 4, 0]}>
                    {sortedByWaits.slice(0, 10).map(s => <Cell key={s.name} fill={barColor(s.pct_over_18_weeks)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-sm font-bold text-[#111]">Year-on-Year Growth</h2>
                  <p className="text-[10px] text-[#bbb] uppercase tracking-widest mt-0.5">Fastest growing lists (%)</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={sortedByGrowth.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 24, left: 100, bottom: 0 }} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#bbb' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#666', fontWeight: 500 }}
                    axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#111', fontWeight: 700 }} labelStyle={{ color: '#888', marginBottom: 4 }} formatter={(v: number) => [formatSignedPercent(v), 'YoY growth']}
                    cursor={{ fill: '#f9fafb' }} />
                  <Bar dataKey="yoy_change" radius={[0, 4, 4, 0]}>
                    {sortedByGrowth.slice(0, 10).map(s => <Cell key={s.name} fill={s.yoy_change > 0 ? '#ef4444' : '#10b981'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </motion.div>

          {status?.has_live_data && (
            <motion.div variants={fade} className="mt-6">
              <AIInsightsPanel topic="specialties" askQuestion="Which specialty needs the most urgent intervention and why?" />
            </motion.div>
          )}

          {/* Table */}
          <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl shadow-sm overflow-hidden mt-6">
            <div className="p-5 border-b border-[#f0f0f0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-[#111]">Full Specialty Breakdown</h2>
                <p className="text-xs text-[#bbb] mt-0.5">Performance metrics across all tracked clinical areas</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                 <span className="text-[10px] text-[#bbb] font-bold uppercase tracking-widest mr-1 flex items-center gap-1"><Filter size={12}/> Filter</span>
                 {['All', 'Surgical', 'Medical', 'Paediatric'].map(f => (
                   <button key={f} onClick={() => setFilter(f)}
                     className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                       filter === f
                         ? 'bg-[#111] text-white'
                         : 'bg-white border border-[#e5e5e5] text-[#666] hover:bg-[#fafafa] hover:border-[#bbb] hover:text-[#111]'
                     }`}>
                     {f}
                   </button>
                 ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-[#fafafa] text-[10px] text-[#bbb] uppercase tracking-widest border-b border-[#f0f0f0]">
                    <th className="px-5 py-3 font-bold w-12">#</th>
                    <th className="px-5 py-3 font-bold">Specialty</th>
                    <th className="text-right px-5 py-3 font-bold">Total waiting</th>
                    <th className="text-right px-5 py-3 font-bold">% over 18w</th>
                    <th className="text-right px-5 py-3 font-bold">YoY change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5f5f5]">
                  {sortedByWaits.map((s, idx) => (
                    <motion.tr key={s.name}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                      className="hover:bg-[#fafafa] transition-colors">
                      <td className="px-5 py-4 text-xs font-bold text-[#ccc]">{idx + 1}</td>
                      <td className="px-5 py-4 font-bold text-[#111]">{s.name}</td>
                      <td className="px-5 py-4 text-right text-[#666] tabular-nums">{formatWaiting(s.total_waiting)}</td>
                      <td className="px-5 py-4 text-right">
                        <span className={`font-black tabular-nums ${pctColor(s.pct_over_18_weeks)}`}>{s.pct_over_18_weeks}%</span>
                      </td>
                      <td className={`px-5 py-4 text-right font-black tabular-nums flex items-center justify-end gap-1 ${yoyColor(s.yoy_change)}`}>
                        {s.yoy_change > 0 ? <ArrowUpRight size={14} /> : <ArrowUpRight size={14} className="rotate-90" />}
                        {formatSignedPercent(s.yoy_change)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-[#f0f0f0] md:hidden bg-[#fafafa]">
              <button onClick={handleDownload} disabled={!hasData}
                className="flex items-center justify-center w-full bg-white border border-[#e5e5e5] text-[#666] hover:text-[#111] rounded-xl py-2.5 text-xs font-bold gap-2 transition-colors">
                <Download size={14} /> Download CSV
              </button>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
