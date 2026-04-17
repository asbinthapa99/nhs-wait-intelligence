interface KPICardProps {
  label: string
  value: string
  subtext: string
  valueColor?: 'red' | 'default'
}

export default function KPICard({ label, value, subtext, valueColor = 'default' }: KPICardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-1">
      <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</span>
      <span
        className={`text-3xl font-bold leading-tight ${
          valueColor === 'red' ? 'text-red-600' : 'text-slate-800'
        }`}
      >
        {value}
      </span>
      <span className="text-xs text-slate-400">{subtext}</span>
    </div>
  )
}
