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
  if (pct18 > 20) return '#005eb8'        // blue
  return '#10b981'                         // green – best
}

function badgeStyle(pct18: number) {
  const c = perfColor(pct18)
  const light = pct18 > 50 ? '#fef2f2' : pct18 > 35 ? '#fffbeb' : pct18 > 20 ? '#eff6ff' : '#f0fdf4'
  const border = pct18 > 50 ? '#fca5a5' : pct18 > 35 ? '#fcd34d' : pct18 > 20 ? '#bfdbfe' : '#bbf7d0'
  return { color: c, backgroundColor: light, borderColor: border, borderWidth: '1px' }
}

export default function SpecialtyList({ specialties }: SpecialtyListProps) {
  const sorted = [...specialties].sort((a, b) => b.total_waiting - a.total_waiting)
  const top = sorted.slice(0, 7)
  const maxWait = top[0]?.total_waiting ?? 1

  return (
    <div className="flex flex-col h-full w-full">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr,auto,auto] gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-3 mb-2">
        <span>Specialty Area</span>
        <span className="text-right w-16">Volume</span>
        <span className="text-right w-20">18-week Breaches</span>
      </div>

      <div className="flex flex-col divide-y divide-slate-100/60 flex-1">
        {top.map((s) => {
          const barPct = Math.max(4, (s.total_waiting / maxWait) * 100)
          const color = perfColor(s.pct_over_18_weeks)
          const volumeK = s.total_waiting >= 1000
            ? `${Math.round(s.total_waiting / 1000)}k`
            : String(s.total_waiting)
          const perfLabel = `${s.pct_over_18_weeks.toFixed(1)}%`
          const category = CATEGORY_MAP[s.name] ?? ''

          return (
            <div key={s.name} className="grid grid-cols-[1fr,auto,auto] gap-4 items-center py-3.5 group hover:bg-slate-50/50 transition-colors rounded-xl -mx-2 px-2">
              <div>
                <p className="text-sm font-extrabold text-slate-800 leading-tight group-hover:text-[#005eb8] transition-colors">{s.name}</p>
                {category && <p className="text-[11px] font-bold text-slate-400 mt-0.5">{category}</p>}
                <div className="mt-2 h-1.5 w-full max-w-[140px] bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${barPct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
              <span className="text-sm font-black text-slate-700 text-right w-16">{volumeK}</span>
              <span
                className="text-xs font-black text-right w-20 px-2 py-1 rounded-md shadow-sm"
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
