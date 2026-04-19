import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { RegionDetail } from '../lib/api'

interface RegionWaitChartProps {
  regions: RegionDetail[]
}

export default function RegionWaitChart({ regions }: RegionWaitChartProps) {
  // Sort by highest waiting
  const data = [...regions]
    .sort((a, b) => b.total_waiting - a.total_waiting)
    .map(r => ({
      name: r.name.replace(' & ', ' & \n').replace(' of ', ' of \n'),
      shortName: r.name,
      value: Number((r.total_waiting / 1_000_000).toFixed(2)),
      score: r.inequality_score
    }))

  const getColor = (score: number) => {
    if (score >= 75) return '#e05252'
    if (score >= 55) return '#d97706'
    if (score >= 40) return '#eab308'
    return '#16a34a'
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          domain={[0, 'auto']}
        />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 12,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
          formatter={(v: number) => [`${v}M`, 'People Waiting']}
          labelFormatter={(label: string) => label.replace('\n', '')}
          cursor={{ fill: '#f8fafc' }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
