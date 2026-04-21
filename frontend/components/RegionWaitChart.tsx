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
          contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: 13, color: '#f8fafc', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
          itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
          labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
          formatter={(v: number) => [`${v}M`, 'People Waiting']}
          labelFormatter={(label: string) => label.replace('\n', '')}
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
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
