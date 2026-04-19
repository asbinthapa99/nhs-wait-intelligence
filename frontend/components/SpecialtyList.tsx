import React from 'react'

interface SpecialtyItem {
  name: string
  category?: string
  total_waiting: number
  pct_over_18_weeks: number
}

interface SpecialtyListProps {
  specialties: SpecialtyItem[]
}

const CATEGORY_MAP: Record<string, string> = {
  Orthopaedics: 'Musculoskeletal',
  Ophthalmology: 'Eye services',
  Gastroenterology: 'Gastrointestinal',
  'General Surgery': 'Surgery',
  Cardiology: 'Cardiac services',
  Neurology: 'Neurosciences',
  Urology: 'Urology',
  Dermatology: 'Skin services',
}

function perfColor(pct18: number): string {
  // pct_over_18_weeks is the % that are STILL over 18 weeks (worse = higher)
  if (pct18 > 50) return '#ef4444'        // red  – worst
  if (pct18 > 35) return '#f59e0b'        // amber
  if (pct18 > 20) return '#3b82f6'        // blue
  return '#10b981'                         // green – best
}

function badgeStyle(pct18: number) {
  const c = perfColor(pct18)
  const light = pct18 > 50 ? '#fef2f2' : pct18 > 35 ? '#fffbeb' : pct18 > 20 ? '#eff6ff' : '#f0fdf4'
  return { color: c, backgroundColor: light }
}

export default function SpecialtyList({ specialties }: SpecialtyListProps) {
  const sorted = [...specialties].sort((a, b) => b.total_waiting - a.total_waiting)
  const top = sorted.slice(0, 7)
  const maxWait = top[0]?.total_waiting ?? 1

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-full flex flex-col">
      <div className="mb-1">
        <h2 className="text-base font-bold text-slate-800">Pathway volumes by specialty</h2>
        <p className="text-xs text-slate-400 mt-0.5">Incomplete RTT pathways · latest snapshot</p>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr,auto,auto] gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 py-3 mt-3">
        <span>Specialty</span>
        <span className="text-right w-16">Volume</span>
        <span className="text-right w-16">18-week</span>
      </div>

      <div className="flex flex-col divide-y divide-slate-50 flex-1">
        {top.map((s) => {
          const barPct = Math.max(4, (s.total_waiting / maxWait) * 100)
          const color = perfColor(s.pct_over_18_weeks)
          const volumeK = s.total_waiting >= 1000
            ? `${Math.round(s.total_waiting / 1000)}k`
            : String(s.total_waiting)
          const perfLabel = `${s.pct_over_18_weeks.toFixed(1)}%`
          const category = CATEGORY_MAP[s.name] ?? ''

          return (
            <div key={s.name} className="grid grid-cols-[1fr,auto,auto] gap-2 items-center py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800 leading-tight">{s.name}</p>
                {category && <p className="text-xs text-slate-400 mt-0.5">{category}</p>}
                <div className="mt-1.5 h-1 w-full max-w-[120px] bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${barPct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-700 text-right w-16">{volumeK}</span>
              <span
                className="text-xs font-bold text-right w-16 px-2 py-0.5 rounded-md"
                style={badgeStyle(s.pct_over_18_weeks)}
              >
                {perfLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
