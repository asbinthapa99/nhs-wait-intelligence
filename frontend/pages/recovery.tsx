import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine
} from 'recharts'
import {
  Target, TrendingDown, AlertTriangle, CheckCircle2,
  Clock, ChevronRight, Activity, ArrowUpRight, Info
} from 'lucide-react'
import Link from 'next/link'
import { getOverview, getRegions, OverviewData, RegionDetail, EMPTY_OVERVIEW } from '../lib/api'

const NHS_18W_TARGET = 92
const fade = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e5e5e5',
  borderRadius: 8,
  fontSize: 12,
  color: '#111',
  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
}

// ── Animated progress arc ──────────────────────────────────────────────────
function ProgressArc({
  value, target, unit = '%', inverted = false, label, description, color
}: {
  value: number; target: number; unit?: string; inverted?: boolean
  label: string; description: string; color: string
}) {
  const onTarget = inverted ? value <= target : value >= target
  const pct = inverted
    ? Math.max(0, Math.min(100, 100 - (value / Math.max(target * 10, 0.1)) * 100))
    : Math.max(0, Math.min(100, (value / target) * 100))
  const gap = inverted ? value - target : target - value
  const arcColor = onTarget ? '#059669' : Math.abs(gap) < target * 0.15 ? '#d97706' : '#dc2626'

  return (
    <motion.div variants={fade}
      className="bg-white border border-[#e5e5e5] rounded-2xl p-6 flex flex-col gap-5 hover:border-[#bbb] hover:shadow-sm transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#999] mb-1">{label}</p>
          <p className="text-xs text-[#aaa] leading-snug max-w-[200px]">{description}</p>
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${onTarget ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
          {onTarget
            ? <CheckCircle2 size={15} className="text-emerald-600" />
            : <AlertTriangle size={15} className="text-red-500" />}
        </div>
      </div>

      <div className="flex items-center gap-5">
        {/* Arc gauge */}
        <div className="relative w-32 h-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="50%" innerRadius="58%" outerRadius="88%"
              startAngle={210} endAngle={-30}
              data={[{ value: 100, fill: '#f0f0f0' }, { value: pct, fill: arcColor }]}>
              <RadialBar dataKey="value" cornerRadius={6} background={false} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-[#111] leading-none">{value.toFixed(1)}</span>
            <span className="text-[10px] text-[#bbb] uppercase tracking-widest">{unit}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-[#aaa]">Target</span>
              <span className="font-bold text-[#333]">{target}{unit}</span>
            </div>
            <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: arcColor }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, pct)}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <span className={`inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-lg ${onTarget ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
              {onTarget ? '✓ On target' : `${Math.abs(gap).toFixed(1)}${unit} off target`}
            </span>
            <p className="text-[10px] text-[#bbb]">
              Target: {target}{unit} {inverted ? 'maximum' : 'minimum'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function RecoveryPage() {
  const [overview, setOverview] = useState<OverviewData>(EMPTY_OVERVIEW)
  const [regions, setRegions] = useState<RegionDetail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const [ov, rg] = await Promise.allSettled([getOverview(), getRegions()])
      if (ov.status === 'fulfilled') setOverview(ov.value)
      if (rg.status === 'fulfilled') setRegions(rg.value)
      setLoading(false)
    })()
  }, [])

  const pctWithin18 = overview.total_waiting ? 100 - overview.pct_over_18_weeks : 0
  const pctOver52 = overview.total_waiting ? overview.pct_over_18_weeks * 0.086 : 0

  const sortedRegions = useMemo(() =>
    [...regions].sort((a, b) => a.pct_over_18_weeks - b.pct_over_18_weeks),
    [regions]
  )

  // Bar chart data
  const barData = useMemo(() => sortedRegions.map(r => ({
    name: r.name.replace('NHS England ', '').replace(' Integrated Care Board', '').slice(0, 18),
    value: parseFloat((100 - r.pct_over_18_weeks).toFixed(1)),
    onTarget: (100 - r.pct_over_18_weeks) >= NHS_18W_TARGET,
  })), [sortedRegions])

  const milestones = [
    {
      label: '18-Week Standard',
      target: '92% within 18 weeks',
      status: pctWithin18 >= NHS_18W_TARGET ? 'met' : 'missed',
      detail: 'The NHS constitutional standard. 92% of patients should start treatment within 18 weeks of referral. Not met nationally since 2016.',
      year: 'Target: ongoing',
    },
    {
      label: 'No 52-Week Waits',
      target: '0 patients waiting over 1 year',
      status: pctOver52 < 0.1 ? 'met' : 'missed',
      detail: 'NHS Long Term Plan commitment to eliminate all waits over one year. Originally targeted March 2025, subsequently extended.',
      year: 'Target: Mar 2025+',
    },
    {
      label: '65-Week Elimination',
      target: '0 patients waiting 65+ weeks',
      status: 'missed' as const,
      detail: 'A stepping-stone target to eliminate the very longest waits before restoring the broader 18-week standard.',
      year: 'In progress',
    },
  ]

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-5xl mx-auto py-4">
        <div className="h-6 w-64 bg-[#f0f0f0] rounded" />
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="h-52 bg-[#f5f5f5] border border-[#e5e5e5] rounded-2xl" />
          <div className="h-52 bg-[#f5f5f5] border border-[#e5e5e5] rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 max-w-5xl mx-auto py-2 pb-24">

      {/* ── Header ── */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Target size={18} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">Elective Recovery Tracker</h1>
            <p className="text-xs text-[#999] mt-0.5">NHS England performance vs constitutional standards</p>
          </div>
        </div>
        <Link href="/methodology"
          className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors shrink-0">
          How we measure <ChevronRight size={12} />
        </Link>
      </motion.div>

      {/* ── Context Banner ── */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
        <Info size={15} className="text-amber-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">NHS Constitutional Standard</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            92% of patients should begin consultant-led treatment within 18 weeks of referral.
            This standard has <strong>not been met nationally since February 2016</strong>.
          </p>
        </div>
      </motion.div>

      {/* ── Gauge Pair ── */}
      <motion.div variants={stagger} className="grid md:grid-cols-2 gap-5">
        <ProgressArc
          label="18-week standard"
          value={pctWithin18}
          target={NHS_18W_TARGET}
          unit="%"
          color="#059669"
          description="Patients treated within 18 weeks of referral."
        />
        <ProgressArc
          label="Over 52-week waits"
          value={pctOver52}
          target={0}
          unit="%"
          inverted
          color="#dc2626"
          description="Share of patients waiting more than 1 year."
        />
      </motion.div>

      {/* ── Milestone Cards ── */}
      <motion.div variants={fade}>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-bold text-[#111] whitespace-nowrap">Recovery Milestones</h2>
          <div className="h-px bg-[#e5e5e5] flex-1" />
        </div>
        <div className="space-y-3">
          {milestones.map(m => (
            <motion.div key={m.label} variants={fade}
              className={`flex items-start gap-4 bg-white rounded-xl px-5 py-4 border ${m.status === 'met' ? 'border-emerald-200' : 'border-[#e5e5e5]'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${m.status === 'met' ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
                {m.status === 'met'
                  ? <CheckCircle2 size={15} className="text-emerald-600" />
                  : <Clock size={15} className="text-red-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-[#111]">{m.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${m.status === 'met' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                    {m.status === 'met' ? 'Met' : 'Not Met'}
                  </span>
                  <span className="text-[10px] text-[#bbb] border border-[#e5e5e5] px-2 py-0.5 rounded-full">{m.year}</span>
                </div>
                <p className="text-xs text-[#888] leading-relaxed">{m.detail}</p>
                <p className="text-xs text-[#bbb] mt-1 sm:hidden">{m.target}</p>
              </div>
              <span className="text-xs text-[#bbb] shrink-0 font-medium hidden sm:block whitespace-nowrap">{m.target}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Regional Bar Chart ── */}
      {barData.length > 0 && (
        <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-[#111]">Regional Progress vs 18-Week Target</h2>
              <p className="text-xs text-[#aaa] mt-0.5">% of patients treated within 18 weeks. Green line = 92% target.</p>
            </div>
            <Activity size={15} className="text-[#bbb] shrink-0" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fill: '#bbb', fontSize: 10 }} axisLine={false} tickLine={false}
                angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fill: '#bbb', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`} domain={[0, 100]} width={36} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [`${v}%`, 'Within 18 weeks']}
                labelStyle={{ color: '#888', marginBottom: 4 }}
              />
              <ReferenceLine y={NHS_18W_TARGET} stroke="#059669" strokeDasharray="5 3" strokeWidth={1.5}
                label={{ value: '92% target', position: 'right', fontSize: 10, fill: '#059669' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.onTarget ? '#059669' : entry.value >= 80 ? '#d97706' : '#dc2626'} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 justify-end">
            {[['#059669', 'On target (≥92%)'], ['#d97706', 'Amber (80–92%)'], ['#dc2626', 'Critical (<80%)']].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1.5 text-[10px] text-[#888]">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} /> {l}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── What Would It Take ── */}
      <motion.div variants={fade}>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-bold text-[#111] whitespace-nowrap">What Would It Take?</h2>
          <div className="h-px bg-[#e5e5e5] flex-1" />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: Target,
              label: 'Reduce backlog to ~4M',
              detail: 'The national waiting list needs to fall from current levels to below 4 million patients to restore the 18-week standard.',
              badge: 'Volume',
              color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100',
            },
            {
              icon: TrendingDown,
              label: 'Sustained throughput +10–15%',
              detail: 'NHS England modelling suggests 10–15% more elective activity per month, sustained over 2–3 years.',
              badge: 'Capacity',
              color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100',
            },
            {
              icon: CheckCircle2,
              label: 'Eliminate long waits first',
              detail: 'Policy focus is on eliminating 52-week waits before restoring the 18-week standard for all patients.',
              badge: 'Priority',
              color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100',
            },
          ].map(({ icon: Icon, label, detail, badge, color, bg, border }) => (
            <motion.div key={label} variants={fade}
              className="bg-white border border-[#e5e5e5] rounded-xl p-5 hover:border-[#bbb] hover:shadow-sm transition-all">
              <div className={`w-8 h-8 rounded-lg ${bg} border ${border} flex items-center justify-center mb-4`}>
                <Icon size={15} className={color} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${bg} border ${border} ${color}`}>{badge}</span>
              <p className="text-sm font-semibold text-[#111] mt-3 mb-2 leading-snug">{label}</p>
              <p className="text-xs text-[#888] leading-relaxed">{detail}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

    </motion.div>
  )
}
