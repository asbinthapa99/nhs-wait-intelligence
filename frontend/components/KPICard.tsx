interface KPICardProps {
  label: string
  value: string
  subtext: string
  valueColor?: 'red' | 'amber' | 'green' | 'default'
  trend?: 'up' | 'down' | null
}

export default function KPICard({ label, value, subtext, valueColor = 'default', trend }: KPICardProps) {
  const colorMap: Record<string, string> = {
    red: 'text-red-500',
    amber: 'text-amber-500',
    green: 'text-green-600',
    default: 'text-slate-900',
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-1 shadow-sm">
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      <span className={`text-3xl font-bold leading-tight ${colorMap[valueColor]}`}>
        {value}
      </span>
      <span className="text-xs text-slate-500 flex items-center gap-1">
        {trend === 'up' && <span className="text-red-500">▲</span>}
        {trend === 'down' && <span className="text-green-600">▼</span>}
        {subtext}
      </span>
    </div>
  )
}
