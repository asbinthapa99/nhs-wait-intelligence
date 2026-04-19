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

export default function WaitingBandSplit({ totalWaiting, pctOver18Weeks }: WaitingBandSplitProps) {
  const over18 = (pctOver18Weeks / 100) * totalWaiting
  const under18 = totalWaiting - over18
  const over52 = over18 * 0.086          // ~8.6% of over-18 = over-52 weeks
  const between18And52 = over18 - over52

  const bands = [
    { name: 'Under 18 weeks', value: under18, color: '#1d4ed8' },
    { name: '18 to 52 weeks', value: between18And52, color: '#f59e0b' },
    { name: 'Over 52 weeks', value: over52, color: '#ef4444' },
  ]

  const total = bands.reduce((s, b) => s + b.value, 0) || 1

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-full flex flex-col">
      <div className="mb-2">
        <h2 className="text-base font-bold text-slate-800">Waiting time distribution</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {fmtV(totalWaiting)} total pathways
        </p>
      </div>

      <div className="flex-grow min-h-[200px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={bands}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {bands.map((b, i) => (
                <Cell key={i} fill={b.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => [fmtV(v), 'Waiting']}
              contentStyle={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        {bands.map((b) => {
          const pct = ((b.value / total) * 100).toFixed(1)
          return (
            <div key={b.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: b.color }} />
                <span className="text-slate-600">{b.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-slate-800 w-14 text-right">{fmtV(b.value)}</span>
                <span className="text-slate-400 w-10 text-right">{pct}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
