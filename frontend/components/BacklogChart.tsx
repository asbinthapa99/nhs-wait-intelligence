import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface DataPoint {
  month: string
  value: number
}

interface BacklogChartProps {
  data: DataPoint[]
}

const fmtM = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}

export default function BacklogChart({ data }: BacklogChartProps) {
  // Show abbreviated month labels like "Jan 22", "May 22"…
  const display = data.map((d) => ({
    ...d,
    label: d.month.length > 7 ? d.month.slice(0, 7) : d.month,
  }))

  // Only show ~6 tick marks to avoid crowding
  const tickEvery = Math.max(1, Math.floor(display.length / 6))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={display} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="backlogGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          interval={tickEvery - 1}
        />
        <YAxis
          tickFormatter={fmtM}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          width={42}
        />
        <Tooltip
          formatter={(v: number) => [fmtM(v), 'Waiting']}
          contentStyle={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 12,
          }}
          cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#1d4ed8"
          strokeWidth={2}
          fill="url(#backlogGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#1d4ed8' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
