import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

interface SpecialtyItem {
  name: string
  total_waiting: number
  pct_over_18_weeks: number
}

interface SpecialtyPerformanceChartProps {
  specialties: SpecialtyItem[]
}

function barColor(pct18: number): string {
  // pct_over_18_weeks is the % NOT meeting 18-week standard
  const perf = 100 - pct18
  if (perf < 50) return '#ef4444'   // red
  if (perf < 65) return '#f59e0b'   // amber
  return '#3b82f6'                   // blue
}

export default function SpecialtyPerformanceChart({ specialties }: SpecialtyPerformanceChartProps) {
  const data = specialties
    .slice(0, 8)
    .map((s) => ({
      name: s.name.replace('General Surgery', 'Gen Surgery'),
      performance: Math.round((100 - s.pct_over_18_weeks) * 10) / 10,
      color: barColor(s.pct_over_18_weeks),
    }))
    .sort((a, b) => a.performance - b.performance)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-800">18-week RTT performance</h2>
        <p className="text-xs text-slate-400 mt-0.5">% completing within 18 weeks · constitutional standard: 92%</p>
      </div>

      <div className="flex-grow min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
            barSize={18}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={90}
              tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => [`${value}%`, '18-week performance']}
              contentStyle={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 12,
              }}
              cursor={{ fill: '#f8fafc' }}
            />
            <ReferenceLine
              x={92}
              stroke="#10b981"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <Bar dataKey="performance" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
