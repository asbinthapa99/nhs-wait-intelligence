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
  return '#005eb8'                   // blue
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
    <div className="flex flex-col h-full w-full">
      <div className="flex-grow min-h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 25, left: 20, bottom: 10 }}
            barSize={20}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }}
              tickFormatter={(v) => `${v}%`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={100}
              tick={{ fill: '#334155', fontSize: 12, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => [`${value}%`, '18-week performance']}
              contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid #e5e5e5', borderRadius: '12px', fontSize: 13, color: '#111', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
              itemStyle={{ color: '#111', fontWeight: 'bold' }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <ReferenceLine
              x={92}
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
            <Bar dataKey="performance" radius={[0, 6, 6, 0]}>
              {data.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 border-t border-[#e5e5e5] pt-4">
        <div className="flex items-center gap-2">
           <div className="w-3 h-1 bg-[#10b981] border border-[#10b981] border-dashed" />
           <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">92% NHS Target</span>
        </div>
      </div>
    </div>
  )
}
