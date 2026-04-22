import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Target, ArrowUpDown, AlertTriangle, TrendingUp, TrendingDown, Minus, Activity, Search } from 'lucide-react'
import DataStatusBanner from '../components/DataStatusBanner'
import { DataStatus, getDataStatus, getRegions, RegionDetail } from '../lib/api'

const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.22 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }

interface ICSRow {
  id: string; name: string; parentRegion: string
  inequalityScore: number; pctOver18w: number; backlogRate: number
  equityAdjustedScore: number; trend: 'improving' | 'stable' | 'deteriorating'
}

function seededRand(seed: number) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
}

const TREND_OPTIONS: ICSRow['trend'][] = ['improving', 'stable', 'deteriorating']

function generateICSData(regions: RegionDetail[]): ICSRow[] {
  return regions.flatMap((r, ri) =>
    Array.from({ length: 4 }).map((_, i) => {
      const rand = seededRand(ri * 100 + i)
      return {
        id: `${r.id}-ics-${i}`,
        name: `${r.name.split(' ')[0]} ICS ${i + 1}`,
        parentRegion: r.name,
        inequalityScore: Math.min(100, Math.round(r.inequality_score * (0.8 + rand() * 0.4))),
        pctOver18w: parseFloat((r.pct_over_18_weeks * (0.9 + rand() * 0.2)).toFixed(1)),
        backlogRate: Math.round(r.backlog_rate_per_100k * (0.8 + rand() * 0.4)),
        equityAdjustedScore: Math.round(r.backlog_rate_per_100k * (r.deprivation_index || 0.5) * 100),
        trend: TREND_OPTIONS[Math.round(rand() * 2)],
      }
    })
  )
}

type SortKey = 'inequalityScore' | 'pctOver18w' | 'backlogRate'

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (value / Math.max(max, 1)) * 100)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }} className={`h-full rounded-full ${color}`} />
      </div>
      <span className="text-xs font-semibold text-[#333] w-8 text-right tabular-nums shrink-0">{value}</span>
    </div>
  )
}

function TrendBadge({ trend }: { trend: ICSRow['trend'] }) {
  if (trend === 'improving') return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
      <TrendingDown size={10} /> Improving
    </span>
  )
  if (trend === 'deteriorating') return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
      <TrendingUp size={10} /> Worsening
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
      <Minus size={10} /> Stable
    </span>
  )
}

export default function ICSPage() {
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [regions, setRegions] = useState<RegionDetail[]>([])
  const [icsList, setIcsList] = useState<ICSRow[]>([])
  const [selectedParent, setSelectedParent] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('inequalityScore')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    void getDataStatus().then(setStatus).catch(() => {})
    void getRegions().then(data => { setRegions(data); setIcsList(generateICSData(data)) }).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    let rows = selectedParent ? icsList.filter(r => r.parentRegion === selectedParent) : icsList
    if (search.trim()) rows = rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.parentRegion.toLowerCase().includes(search.toLowerCase()))
    return [...rows].sort((a, b) => sortAsc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey])
  }, [icsList, selectedParent, search, sortKey, sortAsc])

  const maxIneq = Math.max(...icsList.map(r => r.inequalityScore), 1)
  const maxBacklog = Math.max(...icsList.map(r => r.backlogRate), 1)
  const worseCount = filtered.filter(r => r.inequalityScore > 65).length
  const avgScore = filtered.length ? Math.round(filtered.reduce((s, r) => s + r.inequalityScore, 0) / filtered.length) : 0
  const deterioratingCount = filtered.filter(r => r.trend === 'deteriorating').length
  const improvingCount = filtered.filter(r => r.trend === 'improving').length

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(v => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  function SortTh({ label, field }: { label: string; field: SortKey }) {
    const active = sortKey === field
    return (
      <th onClick={() => handleSort(field)}
        className="px-3 py-3 text-right font-medium cursor-pointer select-none whitespace-nowrap">
        <span className={`inline-flex items-center gap-1 transition-colors text-[10px] uppercase tracking-widest ${active ? 'text-emerald-600' : 'text-[#bbb] hover:text-[#666]'}`}>
          {label} <ArrowUpDown size={10} className={active ? 'text-emerald-600' : 'text-[#ccc]'} />
        </span>
      </th>
    )
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 pb-24">

      {/* ── Header ── */}
      <motion.div variants={fade} className="flex items-center gap-3 border-b border-[#e5e5e5] pb-5">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <Target size={17} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#111] tracking-tight">ICS Benchmarks</h1>
          <p className="text-xs text-[#999] mt-0.5">Integrated Care System performance, equity, and waiting-list burden</p>
        </div>
      </motion.div>

      <DataStatusBanner status={status} />

      {/* ── KPI Strip ── */}
      <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'ICS Tracked',  value: filtered.length,       sub: `${new Set(filtered.map(r => r.parentRegion)).size} regions`, icon: Activity,      accent: 'text-[#111]',       bg: 'bg-white',      border: 'border-[#e5e5e5]' },
          { label: 'High Risk',    value: worseCount,            sub: 'Inequality score > 65',                                      icon: AlertTriangle,  accent: 'text-red-600',      bg: 'bg-red-50',     border: 'border-red-100' },
          { label: 'Worsening',    value: deterioratingCount,    sub: `Of ${filtered.length} in view`,                              icon: TrendingUp,     accent: 'text-amber-600',    bg: 'bg-amber-50',   border: 'border-amber-100' },
          { label: 'Improving',    value: improvingCount,        sub: 'Positive trend',                                             icon: TrendingDown,   accent: 'text-emerald-700',  bg: 'bg-emerald-50', border: 'border-emerald-100' },
        ].map(kpi => {
          const Icon = kpi.icon
          return (
            <motion.div key={kpi.label} variants={fade} className={`${kpi.bg} border ${kpi.border} rounded-xl p-4 hover:shadow-sm transition-all`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#aaa]">{kpi.label}</p>
                <Icon size={13} className={kpi.accent} />
              </div>
              <p className={`text-2xl font-black ${kpi.accent}`}>{kpi.value}</p>
              <p className="text-[10px] text-[#bbb] mt-1">{kpi.sub}</p>
            </motion.div>
          )
        })}
      </motion.div>

      {/* ── Illustrative data notice ── */}
      <motion.div variants={fade} className="flex items-start gap-3 border border-amber-200 bg-amber-50 rounded-xl px-4 py-3">
        <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Illustrative data:</strong> ICS breakdown is simulated from NHS England regional aggregates for demonstration purposes.
          True ICS mapping requires Trust-level ETL.
        </p>
      </motion.div>

      {/* ── Table card ── */}
      <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-[#f0f0f0]">
          <div>
            <h2 className="text-sm font-semibold text-[#111]">ICS Performance Table</h2>
            <p className="text-xs text-[#bbb] mt-0.5">Click column headers to sort · {filtered.length} ICS shown · Avg score: <strong className="text-[#444]">{avgScore}</strong></p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-48">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#ccc]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search ICS..."
                className="w-full text-xs pl-7 pr-3 py-2 rounded-lg border border-[#e5e5e5] focus:outline-none focus:border-emerald-400 bg-[#fafafa] text-[#111] placeholder:text-[#ccc]" />
            </div>
            {/* Region filter */}
            <select value={selectedParent} onChange={e => setSelectedParent(e.target.value)}
              className="text-xs px-2.5 py-2 rounded-lg border border-[#e5e5e5] bg-[#fafafa] text-[#555] focus:outline-none focus:border-emerald-400 shrink-0">
              <option value="">All regions</option>
              {regions.map(r => <option key={r.id} value={r.name}>{r.name.split(' ').slice(0, 2).join(' ')}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#f0f0f0]">
                <th className="px-5 py-3 text-[10px] font-bold text-[#bbb] uppercase tracking-widest w-10">#</th>
                <th className="px-2 py-3 text-[10px] font-bold text-[#bbb] uppercase tracking-widest">ICS</th>
                <th className="px-2 py-3 text-[10px] font-bold text-[#bbb] uppercase tracking-widest hidden md:table-cell">Region</th>
                <SortTh label="Inequality" field="inequalityScore" />
                <SortTh label="Over 18w %" field="pctOver18w" />
                <SortTh label="Backlog /100k" field="backlogRate" />
                <th className="px-5 py-3 text-[10px] font-bold text-[#bbb] uppercase tracking-widest text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5f5]">
              {filtered.map((ics, idx) => (
                <motion.tr key={ics.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                  className="hover:bg-[#fafafa] transition-colors">
                  <td className="px-5 py-3 text-xs font-bold text-[#ccc]">{idx + 1}</td>
                  <td className="px-2 py-3">
                    <p className="text-sm font-semibold text-[#111] whitespace-nowrap">{ics.name}</p>
                  </td>
                  <td className="px-2 py-3 text-xs text-[#aaa] whitespace-nowrap hidden md:table-cell">
                    {ics.parentRegion.split(' ').slice(0, 3).join(' ')}
                  </td>
                  <td className="px-3 py-3 w-44">
                    <ScoreBar value={ics.inequalityScore} max={maxIneq}
                      color={ics.inequalityScore > 65 ? 'bg-red-500' : ics.inequalityScore > 45 ? 'bg-amber-400' : 'bg-emerald-500'} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={`text-sm font-bold tabular-nums ${ics.pctOver18w > 40 ? 'text-red-600' : 'text-[#444]'}`}>
                      {ics.pctOver18w}%
                    </span>
                  </td>
                  <td className="px-3 py-3 w-36">
                    <ScoreBar value={ics.backlogRate} max={maxBacklog} color="bg-[#059669]/50" />
                  </td>
                  <td className="px-5 py-3 text-right"><TrendBadge trend={ics.trend} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-[#bbb] text-sm">
              {icsList.length === 0 ? 'Waiting for regional data from the backend.' : 'No ICS match your search or filter.'}
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-[#f0f0f0] flex justify-between text-[11px] text-[#bbb]">
            <span>{filtered.length} ICS shown</span>
            <span>Avg inequality score: <strong className="text-[#444]">{avgScore}</strong></span>
          </div>
        )}
      </motion.div>

    </motion.div>
  )
}
