import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface DataPoint {
  month: string
  value: number
}

interface BacklogChartProps {
  data: DataPoint[]
  color?: string
}

export default function BacklogChart({ data, color = '#1e3a5f' }: BacklogChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barSize={22}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          domain={[0, 8]}
          ticks={[0, 4, 8]}
        />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v: number) => [`${v}M`, 'Waiting']}
          cursor={{ fill: '#f1f5f9' }}
        />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
