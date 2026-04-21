import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, AlertTriangle, RefreshCw, Activity, Filter } from 'lucide-react'

import AIInsightsPanel from '../components/AIInsightsPanel'
import DataStatusBanner from '../components/DataStatusBanner'
import EmptyStateCard from '../components/EmptyStateCard'
import { DataStatus, getApiUrl, getDataStatus, getSpecialties, Specialty } from '../lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

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
  if (pct >= 50) return 'text-red-400'
  if (pct >= 40) return 'text-amber-400'
  if (pct >= 30) return 'text-yellow-400'
  return 'text-emerald-400'
}

function yoyColor(v: number) {
  if (v >= 15) return 'text-red-400'
  if (v >= 10) return 'text-amber-400'
  if (v <= 0) return 'text-emerald-400'
  return 'text-green-400'
}

const tooltipStyle = {
  background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, fontSize: 12, color: '#f8fafc', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
}

export default function SpecialtiesPage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Clinical Specialty Deep-Dive</h1>
          <p className="text-sm text-slate-400 mt-1">Identify which specific medical specialties are under the most operational pressure.</p>
        </div>
        <button onClick={handleDownload} disabled={!hasData}
          className="btn btn-sm btn-outline border-slate-700 text-slate-300 gap-2 hidden md:flex hover:bg-[#0f172a]">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <DataStatusBanner status={status} loading={loading && !status} />

      {error && (
        <div className="alert border border-red-500/20 bg-red-500/10 text-red-300 text-sm rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => void loadSpecialties()} className="btn btn-xs btn-ghost ml-auto gap-1">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
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
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="alert border border-red-500/20 bg-red-500/10 rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(239,68,68,0.1)]">
              <Activity className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-300">
                  {worst.name} is the most severely pressured specialty
                </p>
                <p className="text-xs text-red-400/80 mt-0.5">
                  {worst.pct_over_18_weeks}% of patients waiting over 18 weeks — growing by {formatSignedPercent(worst.yoy_change)} year-on-year.{' '}
                  {formatWaiting(worst.total_waiting)} total patients affected.
                </p>
              </div>
            </motion.div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            <div className="bg-[#1e293b]/70 backdrop-blur-xl border border-white/5 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] p-5">
              <h2 className="text-sm font-bold text-slate-200 mb-4 tracking-wide">% Waiting Over 18 Weeks</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sortedByWaits} layout="vertical" margin={{ top: 4, right: 24, left: 100, bottom: 4 }} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} opacity={0.5} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false}
                    domain={[0, 60]} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false} tickLine={false} width={95} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }} labelStyle={{ color: '#94a3b8', marginBottom: '4px' }} formatter={(v: number) => [`${v}%`, 'Over 18 weeks']}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="pct_over_18_weeks" radius={[0, 4, 4, 0]}>
                    {sortedByWaits.map(s => <Cell key={s.name} fill={barColor(s.pct_over_18_weeks)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[#1e293b]/70 backdrop-blur-xl border border-white/5 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] p-5">
              <h2 className="text-sm font-bold text-slate-200 mb-4 tracking-wide">Year-on-Year Growth (%)</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sortedByGrowth} layout="vertical" margin={{ top: 4, right: 24, left: 100, bottom: 4 }} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} opacity={0.5} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false} tickLine={false} width={95} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }} labelStyle={{ color: '#94a3b8', marginBottom: '4px' }} formatter={(v: number) => [formatSignedPercent(v), 'YoY growth']}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="yoy_change" radius={[0, 4, 4, 0]}>
                    {sortedByGrowth.map(s => <Cell key={s.name} fill={s.yoy_change > 0 ? '#ef4444' : '#10b981'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {status?.has_live_data && (
            <div className="mt-6">
              <AIInsightsPanel topic="specialties" askQuestion="Which specialty needs the most urgent intervention and why?" />
            </div>
          )}

          {/* Table */}
          <div className="bg-[#1e293b]/70 backdrop-blur-xl border border-white/5 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] overflow-hidden mt-6">
            <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-sm font-bold text-slate-200">Full Specialty Breakdown</h2>
              <div className="flex flex-wrap items-center gap-2">
                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mr-2 flex items-center gap-1"><Filter size={12}/> Filter:</span>
                 <button className="px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold transition-all">All</button>
                 <button className="px-3 py-1.5 rounded-lg border border-slate-700/50 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 text-xs font-bold transition-all">Surgical</button>
                 <button className="px-3 py-1.5 rounded-lg border border-slate-700/50 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 text-xs font-bold transition-all">Medical</button>
                 <button className="px-3 py-1.5 rounded-lg border border-slate-700/50 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 text-xs font-bold transition-all">Paediatric</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/50 text-[10px] text-slate-500 uppercase tracking-widest">
                    <th className="text-left px-4 py-3 font-medium">Specialty</th>
                    <th className="text-right px-4 py-3 font-medium">Total waiting</th>
                    <th className="text-right px-4 py-3 font-medium">% over 18w</th>
                    <th className="text-right px-4 py-3 font-medium">YoY change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {sortedByWaits.map((s, idx) => (
                    <tr key={s.name} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-200">{s.name}</td>
                      <td className="px-4 py-3 text-right text-slate-400 tabular-nums">{formatWaiting(s.total_waiting)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold tabular-nums ${pctColor(s.pct_over_18_weeks)}`}>{s.pct_over_18_weeks}%</span>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium tabular-nums ${yoyColor(s.yoy_change)}`}>
                        {formatSignedPercent(s.yoy_change)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-slate-800 md:hidden">
              <button onClick={handleDownload} disabled={!hasData}
                className="btn btn-sm btn-outline border-slate-700 text-slate-400 w-full gap-2">
                <Download className="w-3.5 h-3.5" /> Download CSV
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
