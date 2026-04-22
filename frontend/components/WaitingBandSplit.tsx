import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface WaitingBandSplitProps {
  totalWaiting: number
  pctOver18Weeks: number
}

const fmtV = (val: number) => {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`
  return val.toString()
}

const BANDS = [
  { name: 'Under 18 weeks', color: '#005eb8', bgColor: 'bg-emerald-50', textColor: 'text-emerald-600', borderColor: 'border-emerald-200' },
  { name: '18 to 52 weeks', color: '#f59e0b', bgColor: 'bg-amber-50', textColor: 'text-amber-600', borderColor: 'border-amber-200' },
  { name: 'Over 52 weeks',  color: '#ef4444', bgColor: 'bg-red-50',   textColor: 'text-red-600',   borderColor: 'border-red-200' },
]

export default function WaitingBandSplit({ totalWaiting, pctOver18Weeks }: WaitingBandSplitProps) {
  const over18 = (pctOver18Weeks / 100) * totalWaiting
  const under18 = totalWaiting - over18
  const over52 = over18 * 0.086
  const between18And52 = over18 - over52

  const bands = [
    { ...BANDS[0], value: under18 },
    { ...BANDS[1], value: between18And52 },
    { ...BANDS[2], value: over52 },
  ]

  const total = bands.reduce((s, b) => s + b.value, 0) || 1

  return (
    <div className="flex flex-col h-full w-full">
      <div className="h-[220px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={bands}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="90%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {bands.map((b, i) => <Cell key={i} fill={b.color} />)}
            </Pie>
            <Tooltip
              formatter={(v: number) => [fmtV(v), 'Patients']}
              contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid #e5e5e5', borderRadius: '12px', fontSize: 13, color: '#111', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
              itemStyle={{ color: '#111', fontWeight: 'bold' }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-[#111]">{fmtV(totalWaiting)}</span>
          <span className="text-[10px] font-bold text-[#666] uppercase tracking-widest mt-1">Total Wait</span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {bands.map((b) => {
          const pct = ((b.value / total) * 100).toFixed(1)
          return (
            <div key={b.name} className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${b.bgColor} ${b.borderColor} shadow-sm`}>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: b.color }} />
                <span className={`text-xs font-extrabold uppercase tracking-wide ${b.textColor}`}>{b.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-black text-[#222] tabular-nums">{fmtV(b.value)}</span>
                <span className={`text-[11px] font-black tabular-nums bg-white px-2 py-1 rounded-md ${b.textColor}`}>{pct}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
