import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  label: string
  value: string
  subtext: string
  valueColor?: 'red' | 'amber' | 'green' | 'blue' | 'default'
  trend?: 'up' | 'down' | null
  icon?: React.ReactNode
}

const colorConfig = {
  red:     { value: 'text-red-600',     accent: 'bg-red-50 border-red-200',     dot: 'bg-red-500', textAccent: 'text-red-700' },
  amber:   { value: 'text-amber-500',   accent: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500', textAccent: 'text-amber-700' },
  green:   { value: 'text-emerald-600', accent: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', textAccent: 'text-emerald-700' },
  blue:    { value: 'text-[#005eb8]',   accent: 'bg-blue-50 border-blue-200',   dot: 'bg-[#005eb8]', textAccent: 'text-[#005eb8]' },
  default: { value: 'text-slate-900',   accent: 'bg-slate-50 border-slate-200', dot: 'bg-[#005eb8]', textAccent: 'text-slate-600' },
}

export default function KPICard({ label, value, subtext, valueColor = 'default', trend, icon }: KPICardProps) {
  const cfg = colorConfig[valueColor]

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 flex flex-col gap-3 relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
      <div className={`absolute top-0 left-0 right-0 h-1 ${cfg.dot}`} />

      <div className="flex items-start justify-between">
        <span className="text-sm font-extrabold uppercase tracking-widest text-slate-500">{label}</span>
        {icon && (
          <span className={`flex items-center justify-center w-8 h-8 rounded-lg border ${cfg.accent} text-sm shadow-sm`}>
            {icon}
          </span>
        )}
      </div>

      <span className={`text-4xl font-black tabular-nums tracking-tight ${cfg.value} mt-2`}>
        {value}
      </span>

      <div className="flex items-center gap-1.5 mt-1">
        {trend === 'up' && <TrendingUp size={16} className={`${cfg.textAccent} flex-shrink-0`} strokeWidth={2.5} />}
        {trend === 'down' && <TrendingDown size={16} className={`${cfg.textAccent} flex-shrink-0`} strokeWidth={2.5} />}
        {trend === null && <Minus size={16} className="text-slate-400 flex-shrink-0" strokeWidth={2.5} />}
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{subtext}</span>
      </div>
    </div>
  )
}
