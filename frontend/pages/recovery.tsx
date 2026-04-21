import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell
} from 'recharts'
import { Target, TrendingDown, AlertTriangle, CheckCircle2, Clock, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { getOverview, getRegions, OverviewData, RegionDetail, EMPTY_OVERVIEW } from '../lib/api'

const NHS_18W_TARGET = 92
const NHS_52W_TARGET = 0

const fade = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }

function GaugeCard({
  label, value, target, unit = '%', inverted = false, description
}: {
  label: string
  value: number
  target: number
  unit?: string
  inverted?: boolean
  description: string
}) {
  const pct = inverted
    ? Math.max(0, Math.min(100, 100 - (value / Math.max(target * 10, 1)) * 100))
    : Math.max(0, Math.min(100, (value / target) * 100))

  const onTarget = inverted ? value <= target : value >= target
  const gap = inverted ? value - target : target - value
  const gapLabel = Math.abs(gap).toFixed(1) + unit

  const gaugeData = [{ value: pct, fill: onTarget ? '#10b981' : value > (inverted ? target * 5 : target * 0.7) ? '#f59e0b' : '#ef4444' }]

  return (
    <motion.div variants={fade} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
          <p className="text-sm text-slate-400 mt-1 leading-snug max-w-xs">{description}</p>
        </div>
        {onTarget
          ? <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-1" />
          : <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-1" />
        }
      </div>

      <div className="flex items-center gap-6">
        <div className="relative w-28 h-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%" cy="50%"
              innerRadius="60%" outerRadius="90%"
              startAngle={210} endAngle={-30}
              data={[{ value: 100, fill: '#1e293b' }, ...gaugeData]}
            >
              <RadialBar dataKey="value" cornerRadius={4} background={false} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-white">{value.toFixed(1)}{unit}</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest">current</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">Target</span>
              <span className="font-bold text-slate-300">{target}{unit}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${onTarget ? 'bg-emerald-500' : gap < (target * 0.1) ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
          <div className={`text-xs font-semibold px-2 py-1 rounded-lg inline-block ${onTarget ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {onTarget ? 'On target' : `${gapLabel} off target`}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function TargetBar({ region, value, target }: { region: string; value: number; target: number }) {
  const onTarget = value >= target
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-36 shrink-0 truncate">{region}</span>
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full ${onTarget ? 'bg-emerald-500' : value >= target * 0.85 ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${Math.min(100, (value / 100) * 100)}%` }}
        />
        <div className="absolute top-0 h-full w-px bg-blue-400/60" style={{ left: `${target}%` }} />
      </div>
      <span className={`text-xs font-bold w-12 text-right ${onTarget ? 'text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
        {value.toFixed(1)}%
      </span>
    </div>
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

  const pctWithin18 = overview.total_waiting
    ? 100 - overview.pct_over_18_weeks
    : 0

  const pctOver52 = overview.total_waiting
    ? overview.pct_over_18_weeks * 0.086
    : 0

  const sortedRegions = useMemo(() =>
    [...regions].sort((a, b) => (100 - a.pct_over_18_weeks) - (100 - b.pct_over_18_weeks)),
    [regions]
  )

  const milestones = [
    {
      label: '18-week standard',
      target: '92% within 18 weeks',
      status: pctWithin18 >= NHS_18W_TARGET ? 'met' : 'missed',
      detail: 'The NHS constitutional standard: 92% of patients should start treatment within 18 weeks of referral.',
    },
    {
      label: 'No 52-week waits',
      target: '0 patients waiting over 1 year',
      status: pctOver52 < 0.1 ? 'met' : 'missed',
      detail: 'The NHS Long Term Plan commitment to eliminate year-long waits. Originally targeted March 2025, now extended.',
    },
    {
      label: '65-week elimination',
      target: '0 patients waiting 65+ weeks',
      status: 'missed',
      detail: 'NHS England target to eliminate all 65-week waits, a stepping stone toward clearing the longest waits.',
    },
  ]

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-5xl mx-auto">
        <div className="h-8 w-72 bg-slate-800 rounded" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 bg-slate-800 rounded-2xl" />
          <div className="h-48 bg-slate-800 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 max-w-5xl mx-auto py-2">

      {/* Header */}
      <motion.div variants={fade}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
            <Target size={18} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Elective Recovery Tracker</h1>
        </div>
        <p className="text-slate-400 text-sm ml-12">
          Measuring the NHS against its own published targets. Data from official NHS England RTT statistics.
        </p>
      </motion.div>

      {/* NHS Target Context Banner */}
      <motion.div variants={fade} className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-300">NHS Constitutional Standard</p>
          <p className="text-xs text-slate-400 mt-0.5">92% of patients should begin consultant-led treatment within 18 weeks of referral. This standard has not been met nationally since 2016.</p>
        </div>
        <Link href="/methodology" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0 font-semibold">
          How we measure <ChevronRight size={14} />
        </Link>
      </motion.div>

      {/* Two main gauges */}
      <motion.div variants={stagger} className="grid md:grid-cols-2 gap-5">
        <GaugeCard
          label="18-week standard"
          value={pctWithin18}
          target={NHS_18W_TARGET}
          unit="%"
          description="Patients treated within 18 weeks. NHS target: 92%. Not met nationally since 2016."
        />
        <GaugeCard
          label="Over 52-week waits"
          value={pctOver52}
          target={NHS_52W_TARGET}
          unit="%"
          inverted
          description="Share of waiting list waiting over 1 year. Target: 0%. NHS Long Term Plan commitment."
        />
      </motion.div>

      {/* Milestones */}
      <motion.div variants={fade}>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Target Milestones</h2>
        <div className="space-y-3">
          {milestones.map((m) => (
            <div key={m.label} className={`flex items-start gap-4 bg-slate-900 border rounded-xl px-5 py-4 ${m.status === 'met' ? 'border-emerald-500/20' : 'border-slate-800'}`}>
              {m.status === 'met'
                ? <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                : <Clock size={18} className="text-red-400 mt-0.5 shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-semibold text-white">{m.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.status === 'met' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {m.status === 'met' ? 'MET' : 'NOT MET'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{m.detail}</p>
              </div>
              <span className="text-xs text-slate-500 shrink-0 font-medium">{m.target}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Regional breakdown */}
      {sortedRegions.length > 0 && (
        <motion.div variants={fade} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-white">Regional Progress vs 18-Week Target</h2>
              <p className="text-xs text-slate-500 mt-0.5">Blue line = 92% target. Sorted best to worst.</p>
            </div>
            <TrendingDown size={16} className="text-slate-500" />
          </div>
          <div className="space-y-2.5">
            {sortedRegions.map((r) => (
              <TargetBar
                key={r.id}
                region={r.name}
                value={100 - r.pct_over_18_weeks}
                target={NHS_18W_TARGET}
              />
            ))}
          </div>
          <p className="text-[10px] text-slate-600 mt-4">
            Blue vertical line marks the 92% constitutional target. Bars show % of patients treated within 18 weeks.
          </p>
        </motion.div>
      )}

      {/* What needs to change */}
      <motion.div variants={fade} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-white mb-4">What Would It Take?</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Target, label: 'Reduce backlog to ~4M', detail: 'National waiting list would need to fall from current levels to below 4 million patients to restore the 18-week standard.', color: 'text-blue-400' },
            { icon: TrendingDown, label: 'Sustained monthly throughput', detail: 'NHS England modelling suggests 10–15% more elective activity per month sustained over 2–3 years is required.', color: 'text-violet-400' },
            { icon: CheckCircle2, label: 'Zero long waits first', detail: 'Policy focus is on eliminating the longest waits (52+ weeks) before restoring the 18-week standard for all.', color: 'text-emerald-400' },
          ].map(({ icon: Icon, label, detail, color }) => (
            <div key={label} className="bg-slate-800/50 rounded-xl p-4">
              <Icon size={18} className={`${color} mb-3`} />
              <p className="text-sm font-semibold text-slate-200 mb-1">{label}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{detail}</p>
            </div>
          ))}
        </div>
      </motion.div>

    </motion.div>
  )
}
