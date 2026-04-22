import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Building2, ArrowUpDown, AlertTriangle, Search } from 'lucide-react'
import { getRegions, RegionDetail } from '../lib/api'

const fade = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

interface TrustRow {
  id: string
  name: string
  region: string
  pct_over_18w: number
  total_waiting: number
  backlog_per_100k: number
  trend: 'improving' | 'stable' | 'deteriorating'
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
}

function seededRand(seed: number) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
}

const TRUST_SUFFIXES = ['NHS Trust', 'NHS Foundation Trust', 'University Hospitals NHS Trust', 'NHS Foundation Trust']
const TRUST_PREFIXES = [
  'Royal', 'University', 'Central', 'East', 'West', 'North', 'South', 'City',
  'County', 'General', "St George's", "King's College", 'Imperial', 'Manchester',
]

function generateTrusts(regions: RegionDetail[]): TrustRow[] {
  return regions.flatMap((r, ri) =>
    Array.from({ length: 5 }).map((_, i) => {
      const rand = seededRand(ri * 100 + i * 7 + 13)
      const pct = parseFloat((r.pct_over_18_weeks * (0.75 + rand() * 0.5)).toFixed(1))
      const waiting = Math.round((r.total_waiting / 5) * (0.6 + rand() * 0.8))
      const backlog = Math.round(r.backlog_rate_per_100k * (0.7 + rand() * 0.6))
      const trendIdx = Math.floor(rand() * 3)
      const trends: TrustRow['trend'][] = ['improving', 'stable', 'deteriorating']
      const prefix = TRUST_PREFIXES[Math.floor(rand() * TRUST_PREFIXES.length)]
      const suffix = TRUST_SUFFIXES[Math.floor(rand() * TRUST_SUFFIXES.length)]
      const grade: TrustRow['grade'] = pct < 25 ? 'A' : pct < 35 ? 'B' : pct < 45 ? 'C' : pct < 55 ? 'D' : 'F'
      return {
        id: `trust-${ri}-${i}`,
        name: `${prefix} ${r.name.split(' ')[0]} ${suffix}`,
        region: r.name,
        pct_over_18w: pct,
        total_waiting: waiting,
        backlog_per_100k: backlog,
        trend: trends[trendIdx],
        grade,
      }
    })
  )
}

type SortKey = 'pct_over_18w' | 'total_waiting' | 'backlog_per_100k'

const GRADE_STYLE: Record<TrustRow['grade'], { row: string; badge: string }> = {
  A: { row: '', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  B: { row: '', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  C: { row: '', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  D: { row: '', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  F: { row: '', badge: 'bg-red-50 text-red-700 border-red-200' },
}

const TREND_DOT: Record<TrustRow['trend'], string> = {
  improving: 'bg-emerald-500',
  stable: 'bg-amber-500',
  deteriorating: 'bg-red-500',
}

function fmtK(v: number) {
  return v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
}

export default function TrustsPage() {
  const [regions, setRegions] = useState<RegionDetail[]>([])
  const [trusts, setTrusts] = useState<TrustRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('pct_over_18w')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    void getRegions().then(data => {
      setRegions(data)
      setTrusts(generateTrusts(data))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let rows = trusts
    if (regionFilter) rows = rows.filter(t => t.region === regionFilter)
    if (search) rows = rows.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    return [...rows].sort((a, b) => sortAsc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey])
  }, [trusts, regionFilter, search, sortKey, sortAsc])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(v => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  const gradeDistribution = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 }
    filtered.forEach(t => counts[t.grade]++)
    return counts
  }, [filtered])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 max-w-6xl mx-auto py-2">
        <div className="h-8 w-64 bg-[#f0f0f0] rounded" />
        <div className="h-12 bg-[#f0f0f0] rounded-xl" />
        <div className="h-96 bg-[#f5f5f5] border border-[#e5e5e5] rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2 pb-24">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">NHS Trust League Table</h1>
            <p className="text-xs text-[#999] mt-0.5">Ranking NHS Trusts by waiting list performance. Graded A–F on % waiting over 18 weeks.</p>
          </div>
        </div>
      </div>

      {/* Illustrative data notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Illustrative data:</strong> Trust-level breakdown is simulated from NHS England regional aggregates for demonstration.
          True Trust data requires provider-level RTT ETL from NHS England uploads.
        </p>
      </div>

      {/* Grade summary */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-5 gap-2">
        {(['A', 'B', 'C', 'D', 'F'] as const).map(g => (
          <div key={g} className={`bg-white rounded-xl p-3 text-center border ${GRADE_STYLE[g].badge}`}>
            <p className="text-xl font-black">{gradeDistribution[g]}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Grade {g}</p>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#bbb]" />
          <input
            type="text"
            placeholder="Search trust name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-[#e5e5e5] rounded-xl px-4 py-2.5 pl-9 text-sm text-[#111] placeholder-[#ccc] focus:outline-none focus:border-[#999] transition-colors"
          />
        </div>
        <select
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
          className="bg-white border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#111] focus:outline-none focus:border-[#999] w-full sm:w-56 transition-colors"
        >
          <option value="">All regions ({trusts.length} trusts)</option>
          {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e5e5e5] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-[#fafafa] text-[10px] text-[#999] uppercase tracking-widest border-b border-[#e5e5e5]">
                <th className="px-4 py-3 text-left font-medium w-8">#</th>
                <th className="px-4 py-3 text-left font-medium">Trust</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Region</th>
                <th className="px-4 py-3 text-center font-medium">Grade</th>
                <th
                  className="px-4 py-3 text-right font-medium cursor-pointer select-none"
                  onClick={() => handleSort('pct_over_18w')}
                >
                  <span className={`inline-flex items-center gap-1 ${sortKey === 'pct_over_18w' ? 'text-emerald-600' : ''}`}>
                    % Over 18w <ArrowUpDown size={10} />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-right font-medium cursor-pointer select-none hidden md:table-cell"
                  onClick={() => handleSort('total_waiting')}
                >
                  <span className={`inline-flex items-center gap-1 ${sortKey === 'total_waiting' ? 'text-emerald-600' : ''}`}>
                    Waiting <ArrowUpDown size={10} />
                  </span>
                </th>
                <th className="px-4 py-3 text-right font-medium">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {filtered.map((t, idx) => (
                <motion.tr
                  key={t.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(idx * 0.01, 0.3) }}
                  className="hover:bg-[#fafafa] transition-colors"
                >
                  <td className="px-4 py-3 text-xs font-bold text-[#ccc]">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-[#111] max-w-[220px]">
                    <span className="truncate block">{t.name}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#aaa] hidden sm:table-cell whitespace-nowrap">{t.region}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex w-8 h-8 rounded-lg text-sm font-black border items-center justify-center ${GRADE_STYLE[t.grade].badge}`}>
                      {t.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold text-sm ${t.pct_over_18w > 45 ? 'text-red-600' : t.pct_over_18w > 35 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {t.pct_over_18w}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-[#aaa] hidden md:table-cell">{fmtK(t.total_waiting)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-block w-2 h-2 rounded-full ${TREND_DOT[t.trend]}`} title={t.trend} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-[#bbb] text-sm">No trusts match your filters.</div>
          )}
        </div>
        <div className="px-4 py-3 bg-[#fafafa] border-t border-[#f0f0f0] flex items-center justify-between text-xs text-[#aaa]">
          <span>{filtered.length} trusts shown</span>
          <div className="flex items-center gap-4">
            {[['bg-emerald-500', 'Improving'], ['bg-amber-500', 'Stable'], ['bg-red-500', 'Worsening']].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full inline-block ${c}`} /> {l}
              </span>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
