import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface DataPoint { month: string; value: number }

const fmtM = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}

export default function BacklogChart({ data }: { data: DataPoint[] }) {
  const display = data.map((d) => ({ ...d, label: d.month.length > 7 ? d.month.slice(0, 7) : d.month }))
  const tickEvery = Math.max(1, Math.floor(display.length / 6))

  return (
    <div className="w-full h-full min-h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={display} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="backlogGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }}
          axisLine={false}
          tickLine={false}
          interval={tickEvery - 1}
        />
        <YAxis
          tickFormatter={fmtM}
          tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          formatter={(v: number) => [fmtM(v), 'Waiting']}
          contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: 13, color: '#f8fafc', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
          itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
          labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
          cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#backlogGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#3b82f6' }}
        />
      </AreaChart>
    </ResponsiveContainer>
    </div>
  )
}
