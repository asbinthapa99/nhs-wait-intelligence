import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Target, ArrowUpDown, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'

import DataStatusBanner from '../components/DataStatusBanner'
import { DataStatus, getDataStatus, getRegions, RegionDetail } from '../lib/api'

interface ICSRow {
  id: string; name: string; parentRegion: string
  inequalityScore: number; pctOver18w: number; backlogRate: number
  equityAdjustedScore: number; trend: 'improving' | 'stable' | 'deteriorating'
}

function seededRand(seed: number): () => number {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
}

const TREND_OPTIONS: ICSRow['trend'][] = ['improving', 'stable', 'deteriorating']

function generateICSData(regions: RegionDetail[]): ICSRow[] {
  return regions.flatMap((r, ri) =>
    Array.from({ length: 4 }).map((_, i) => {
      const rand = seededRand(ri * 100 + i)
      return {
        id: `${r.id}-ics-${i}`, name: `${r.name} ICS ${i + 1}`, parentRegion: r.name,
        inequalityScore: Math.min(100, Math.round(r.inequality_score * (0.8 + rand() * 0.4))),
        pctOver18w: parseFloat((r.pct_over_18_weeks * (0.9 + rand() * 0.2)).toFixed(1)),
        backlogRate: Math.round(r.backlog_rate_per_100k * (0.8 + rand() * 0.4)),
        equityAdjustedScore: Math.round(r.backlog_rate_per_100k * (r.deprivation_index || 0.5) * 100),
        trend: TREND_OPTIONS[Math.round(rand() * 2)],
      }
    })
  )
}

type SortKey = 'inequalityScore' | 'pctOver18w' | 'backlogRate' | 'equityAdjustedScore'

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
          className={`h-full rounded-full ${color}`} />
      </div>
      <span className="text-xs font-semibold text-slate-300 w-8 text-right tabular-nums">{value}</span>
    </div>
  )
}

function TrendBadge({ trend }: { trend: ICSRow['trend'] }) {
  if (trend === 'improving') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
      <TrendingDown className="w-3 h-3" /> Improving
    </span>
  )
  if (trend === 'deteriorating') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
      <TrendingUp className="w-3 h-3" /> Worsening
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
      <Minus className="w-3 h-3" /> Stable
    </span>
  )
}

export default function ICSPage() {
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [regions, setRegions] = useState<RegionDetail[]>([])
  const [icsList, setIcsList] = useState<ICSRow[]>([])
  const [selectedParent, setSelectedParent] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('inequalityScore')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    getDataStatus().then(setStatus).catch(() => {})
    getRegions().then(data => { setRegions(data); setIcsList(generateICSData(data)) }).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    const rows = selectedParent ? icsList.filter(r => r.parentRegion === selectedParent) : icsList
    return [...rows].sort((a, b) => sortAsc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey])
  }, [icsList, selectedParent, sortKey, sortAsc])

  const maxIneq = Math.max(...icsList.map(r => r.inequalityScore), 1)
  const maxBacklog = Math.max(...icsList.map(r => r.backlogRate), 1)
  const worseCount = filtered.filter(r => r.inequalityScore > 65).length
  const avgScore = filtered.length ? Math.round(filtered.reduce((s, r) => s + r.inequalityScore, 0) / filtered.length) : 0
  const deterioratingCount = filtered.filter(r => r.trend === 'deteriorating').length

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(v => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  function SortTh({ label, field }: { label: string; field: SortKey }) {
    const active = sortKey === field
    return (
      <th onClick={() => handleSort(field)}
        className="px-3 py-3 text-right font-medium cursor-pointer select-none whitespace-nowrap">
        <span className={`inline-flex items-center gap-1 transition-colors ${active ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
          {label}
          <ArrowUpDown className={`w-3 h-3 ${active ? 'text-blue-400' : 'text-slate-700'}`} />
        </span>
      </th>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center shrink-0">
          <Target className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">ICS Benchmarks</h1>
          <p className="text-sm text-slate-400 mt-0.5">Integrated Care System performance, equity, and waiting-list burden.</p>
        </div>
      </div>

      <DataStatusBanner status={status} />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: 'ICS tracked', value: filtered.length, sub: `Across ${new Set(filtered.map(r => r.parentRegion)).size} regions`, color: 'text-white' },
          { label: 'High risk', value: worseCount, sub: 'Inequality score > 65', color: 'text-red-400' },
          { label: 'Worsening', value: deterioratingCount, sub: `Of ${filtered.length} in view`, color: 'text-amber-400' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="card p-3 sm:p-4">
            <p className="text-[10px] sm:text-[11px] uppercase tracking-widest text-slate-500 mb-1 leading-tight">{kpi.label}</p>
            <p className={`text-2xl sm:text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1 leading-tight">{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Notice */}
      <div className="alert border border-amber-500/20 bg-amber-500/10 text-amber-300 text-sm rounded-xl">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span><strong className="text-amber-200">Illustrative data:</strong> ICS breakdown is simulated from NHS England regional aggregates for demonstration. True ICS mapping requires Trust-level ETL.</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">ICS Performance Table</h2>
            <p className="text-xs text-slate-500 mt-0.5">Click column headers to sort</p>
          </div>
          <select value={selectedParent} onChange={e => setSelectedParent(e.target.value)}
            className="select select-sm select-bordered bg-slate-800 border-slate-700 text-slate-200 w-full md:w-56">
            <option value="" className="bg-slate-900">All regions ({icsList.length} ICS)</option>
            {regions.map(r => <option key={r.id} value={r.name} className="bg-slate-900">{r.name}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-800/50 text-[10px] text-slate-500 uppercase tracking-widest">
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-2 py-3 font-medium">ICS</th>
                <th className="px-2 py-3 font-medium">Region</th>
                <SortTh label="Inequality" field="inequalityScore" />
                <SortTh label="Over 18w %" field="pctOver18w" />
                <SortTh label="Backlog /100k" field="backlogRate" />
                <th className="px-5 py-3 font-medium text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((ics, idx) => (
                <motion.tr key={ics.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                  className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3 text-xs font-bold text-slate-600">#{idx + 1}</td>
                  <td className="px-2 py-3 font-semibold text-slate-200 whitespace-nowrap max-w-[180px] truncate">{ics.name}</td>
                  <td className="px-2 py-3 text-xs text-slate-500 whitespace-nowrap">{ics.parentRegion}</td>
                  <td className="px-3 py-3 w-40">
                    <ScoreBar value={ics.inequalityScore} max={maxIneq}
                      color={ics.inequalityScore > 65 ? 'bg-red-500' : ics.inequalityScore > 45 ? 'bg-amber-400' : 'bg-emerald-500'} />
                  </td>
                  <td className="px-2 py-3 text-right">
                    <span className={`text-sm font-semibold tabular-nums ${ics.pctOver18w > 40 ? 'text-red-400' : 'text-slate-300'}`}>
                      {ics.pctOver18w}%
                    </span>
                  </td>
                  <td className="px-2 py-3 w-36">
                    <ScoreBar value={ics.backlogRate} max={maxBacklog} color="bg-blue-500/60" />
                  </td>
                  <td className="px-5 py-3 text-right"><TrendBadge trend={ics.trend} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-14 text-center text-slate-500 text-sm">No ICS data — waiting for regional data from backend.</div>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="px-5 py-3 bg-slate-800/30 border-t border-slate-800 text-xs text-slate-500 flex justify-between">
            <span>{filtered.length} ICS shown</span>
            <span>Avg inequality score: <strong className="text-slate-300">{avgScore}</strong></span>
          </div>
        )}
      </div>
    </div>
  )
}
