import { useEffect, useState, useMemo } from 'react'
import { Target, ArrowUpDown, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import DataStatusBanner from '../components/DataStatusBanner'
import { DataStatus, getDataStatus, getRegions, RegionDetail } from '../lib/api'

interface ICSRow {
  id: string
  name: string
  parentRegion: string
  inequalityScore: number
  pctOver18w: number
  backlogRate: number
  equityAdjustedScore: number
  trend: 'improving' | 'stable' | 'deteriorating'
}

// Seeded PRNG so values are stable per region/index
function seededRand(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

const TREND_OPTIONS: ICSRow['trend'][] = ['improving', 'stable', 'deteriorating']

function generateICSData(regions: RegionDetail[]): ICSRow[] {
  return regions.flatMap((r, ri) =>
    Array.from({ length: 4 }).map((_, i) => {
      const rand = seededRand(ri * 100 + i)
      return {
        id: `${r.id}-ics-${i}`,
        name: `${r.name} ICS ${i + 1}`,
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

type SortKey = 'inequalityScore' | 'pctOver18w' | 'backlogRate' | 'equityAdjustedScore'

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-8 text-right">{value}</span>
    </div>
  )
}

function TrendBadge({ trend }: { trend: ICSRow['trend'] }) {
  if (trend === 'improving') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
      <TrendingDown size={10} /> Improving
    </span>
  )
  if (trend === 'deteriorating') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
      <TrendingUp size={10} /> Worsening
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      <Minus size={10} /> Stable
    </span>
  )
}

export default function ICSPage() {
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [regions, setRegions] = useState<RegionDetail[]>([])
  const [icsList, setIcsList] = useState<ICSRow[]>([])
  const [selectedParent, setSelectedParent] = useState<string>('')
  const [sortKey, setSortKey] = useState<SortKey>('inequalityScore')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    getDataStatus().then(setStatus).catch(() => {})
    getRegions().then((data) => {
      setRegions(data)
      setIcsList(generateICSData(data))
    }).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    const rows = selectedParent
      ? icsList.filter((r) => r.parentRegion === selectedParent)
      : icsList
    return [...rows].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey]
      return sortAsc ? diff : -diff
    })
  }, [icsList, selectedParent, sortKey, sortAsc])

  const maxIneq = Math.max(...icsList.map((r) => r.inequalityScore), 1)
  const maxBacklog = Math.max(...icsList.map((r) => r.backlogRate), 1)

  const worseCount = filtered.filter((r) => r.inequalityScore > 65).length
  const avgScore = filtered.length
    ? Math.round(filtered.reduce((s, r) => s + r.inequalityScore, 0) / filtered.length)
    : 0
  const deterioratingCount = filtered.filter((r) => r.trend === 'deteriorating').length

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  function SortTh({ label, field, right }: { label: string; field: SortKey; right?: boolean }) {
    const active = sortKey === field
    return (
      <th
        onClick={() => handleSort(field)}
        className={`pb-3 font-semibold uppercase tracking-wider text-xs cursor-pointer select-none whitespace-nowrap ${right ? 'text-right' : ''}`}
      >
        <span className={`inline-flex items-center gap-1 transition-colors ${active ? 'text-nhs-blue' : 'text-slate-400 hover:text-slate-600'}`}>
          {label}
          <ArrowUpDown size={10} className={active ? 'text-nhs-blue' : 'text-slate-300'} />
        </span>
      </th>
    )
  }

  return (
    <>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-nhs-navy rounded-xl mt-0.5">
            <Target size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ICS Benchmarks</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Integrated Care System performance, equity, and waiting-list burden.
            </p>
          </div>
        </div>
      </div>

      <DataStatusBanner status={status} />

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">ICS tracked</p>
          <p className="text-3xl font-black text-slate-900">{filtered.length}</p>
          <p className="text-xs text-slate-500 mt-1">Across {new Set(filtered.map(r => r.parentRegion)).size} regions</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">High risk</p>
          <p className="text-3xl font-black text-red-600">{worseCount}</p>
          <p className="text-xs text-slate-500 mt-1">Inequality score &gt; 65</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Worsening</p>
          <p className="text-3xl font-black text-amber-600">{deterioratingCount}</p>
          <p className="text-xs text-slate-500 mt-1">Of {filtered.length} in view</p>
        </div>
      </div>

      {/* Notice */}
      <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm mb-5 flex gap-3 items-start">
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
        <div>
          <strong>Illustrative data:</strong> ICS breakdown is simulated from NHS England regional aggregates for demonstration. True ICS mapping requires Trust-level ETL parsing.
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-800">ICS Performance Table</h2>
            <p className="text-xs text-slate-400 mt-0.5">Click column headers to sort</p>
          </div>
          <select
            value={selectedParent}
            onChange={(e) => setSelectedParent(e.target.value)}
            className="text-sm px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:border-nhs-blue focus:outline-none w-full md:w-56"
          >
            <option value="">All regions ({icsList.length} ICS)</option>
            {regions.map((r) => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 pb-3 pt-3 font-semibold uppercase tracking-wider text-xs text-slate-400">
                  # Rank
                </th>
                <th className="px-2 pb-3 pt-3 font-semibold uppercase tracking-wider text-xs text-slate-400">ICS</th>
                <th className="px-2 pb-3 pt-3 font-semibold uppercase tracking-wider text-xs text-slate-400">Region</th>
                <SortTh label="Inequality" field="inequalityScore" right />
                <SortTh label="Over 18w %" field="pctOver18w" right />
                <SortTh label="Backlog /100k" field="backlogRate" right />
                <th className="px-6 pb-3 pt-3 font-semibold uppercase tracking-wider text-xs text-slate-400 text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((ics, idx) => (
                <tr key={ics.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-3.5 text-xs font-bold text-slate-400">#{idx + 1}</td>
                  <td className="px-2 py-3.5 font-semibold text-slate-800 whitespace-nowrap max-w-[180px] truncate">
                    {ics.name}
                  </td>
                  <td className="px-2 py-3.5 text-xs text-slate-500 whitespace-nowrap">{ics.parentRegion}</td>
                  <td className="px-6 py-3.5 w-40">
                    <ScoreBar
                      value={ics.inequalityScore}
                      max={maxIneq}
                      color={ics.inequalityScore > 65 ? 'bg-red-500' : ics.inequalityScore > 45 ? 'bg-amber-400' : 'bg-green-500'}
                    />
                  </td>
                  <td className="px-2 py-3.5 text-right">
                    <span className={`text-sm font-semibold ${ics.pctOver18w > 40 ? 'text-red-600' : 'text-slate-700'}`}>
                      {ics.pctOver18w}%
                    </span>
                  </td>
                  <td className="px-2 py-3.5 text-right">
                    <ScoreBar
                      value={ics.backlogRate}
                      max={maxBacklog}
                      color="bg-nhs-blue/60"
                    />
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <TrendBadge trend={ics.trend} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-14 text-center text-slate-500 text-sm">
              No ICS data yet — waiting for regional data from backend.
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
            <span>{filtered.length} ICS shown</span>
            <span>Avg inequality score: <strong className="text-slate-600">{avgScore}</strong></span>
          </div>
        )}
      </div>
    </>
  )
}
