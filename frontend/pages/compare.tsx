import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'
import { GitCompare, ChevronDown, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getRegions, RegionDetail } from '../lib/api'

const fade = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }

const TREND_ICON = {
  improving: <TrendingUp size={14} className="text-emerald-400" />,
  stable: <Minus size={14} className="text-slate-400" />,
  deteriorating: <TrendingDown size={14} className="text-red-400" />,
}
const TREND_COLOR = {
  improving: 'text-emerald-400',
  stable: 'text-slate-400',
  deteriorating: 'text-red-400',
}

function RegionSelect({
  regions, value, onChange, accentClass
}: {
  regions: RegionDetail[]
  value: RegionDetail | null
  onChange: (r: RegionDetail) => void
  accentClass: string
}) {
  return (
    <div className={`relative bg-slate-900 border rounded-xl overflow-hidden ${accentClass}`}>
      <select
        className="w-full bg-transparent text-slate-200 text-sm font-semibold px-4 py-3 pr-10 appearance-none cursor-pointer focus:outline-none"
        value={value?.id ?? ''}
        onChange={(e) => {
          const r = regions.find(r => r.id === Number(e.target.value))
          if (r) onChange(r)
        }}
      >
        <option value="">Select a region…</option>
        {regions.map(r => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
    </div>
  )
}

function KPIRow({ label, a, b, format = (v: number) => v.toFixed(1), lowerIsBetter = false }: {
  label: string
  a: number
  b: number
  format?: (v: number) => string
  lowerIsBetter?: boolean
}) {
  const aWins = lowerIsBetter ? a < b : a > b
  const bWins = lowerIsBetter ? b < a : b > a
  const tied = Math.abs(a - b) < 0.01

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-3 border-b border-slate-800/60 last:border-0">
      <div className={`text-right text-sm font-bold ${!tied && aWins ? 'text-white' : 'text-slate-400'}`}>
        <span className={`${!tied && aWins ? 'bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-lg' : ''}`}>
          {format(a)}
        </span>
      </div>
      <div className="text-center text-[10px] uppercase tracking-widest text-slate-600 font-bold whitespace-nowrap">
        {label}
      </div>
      <div className={`text-left text-sm font-bold ${!tied && bWins ? 'text-white' : 'text-slate-400'}`}>
        <span className={`${!tied && bWins ? 'bg-violet-500/10 text-violet-300 px-2 py-0.5 rounded-lg' : ''}`}>
          {format(b)}
        </span>
      </div>
    </div>
  )
}

export default function ComparePage() {
  const [regions, setRegions] = useState<RegionDetail[]>([])
  const [regionA, setRegionA] = useState<RegionDetail | null>(null)
  const [regionB, setRegionB] = useState<RegionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void getRegions().then(data => {
      setRegions(data)
      if (data.length >= 2) {
        setRegionA(data[0])
        setRegionB(data[1])
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const radarData = useMemo(() => {
    if (!regionA || !regionB) return []
    const maxBacklog = Math.max(regionA.backlog_rate_per_100k, regionB.backlog_rate_per_100k, 1)
    const maxIneq = Math.max(regionA.inequality_score, regionB.inequality_score, 1)
    return [
      {
        metric: '% Within 18w',
        A: Math.round(100 - regionA.pct_over_18_weeks),
        B: Math.round(100 - regionB.pct_over_18_weeks),
      },
      {
        metric: 'Low Inequality',
        A: Math.round(100 - (regionA.inequality_score / maxIneq) * 100),
        B: Math.round(100 - (regionB.inequality_score / maxIneq) * 100),
      },
      {
        metric: 'Low Backlog',
        A: Math.round(100 - (regionA.backlog_rate_per_100k / maxBacklog) * 100),
        B: Math.round(100 - (regionB.backlog_rate_per_100k / maxBacklog) * 100),
      },
      {
        metric: 'Deprivation',
        A: Math.round(100 - regionA.deprivation_index),
        B: Math.round(100 - regionB.deprivation_index),
      },
    ]
  }, [regionA, regionB])

  const barData = useMemo(() => {
    if (!regionA || !regionB) return []
    return [
      { name: '% Over 18w', A: regionA.pct_over_18_weeks, B: regionB.pct_over_18_weeks },
      { name: 'Inequality', A: regionA.inequality_score, B: regionB.inequality_score },
    ]
  }, [regionA, regionB])

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-5xl mx-auto">
        <div className="h-8 w-64 bg-slate-800 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-12 bg-slate-800 rounded-xl" />
          <div className="h-12 bg-slate-800 rounded-xl" />
        </div>
        <div className="h-72 bg-slate-800 rounded-2xl" />
      </div>
    )
  }

  if (regions.length === 0) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center">
        <p className="text-slate-400">No regional data available. Check the backend is running.</p>
      </div>
    )
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 max-w-5xl mx-auto py-2">

      {/* Header */}
      <motion.div variants={fade}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center">
            <GitCompare size={18} className="text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Region Comparison</h1>
        </div>
        <p className="text-slate-400 text-sm ml-12">
          Select any two NHS regions to compare waiting times, inequality scores, and backlog rates side by side.
        </p>
      </motion.div>

      {/* Selectors */}
      <motion.div variants={fade} className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2 ml-1">Region A</p>
          <RegionSelect regions={regions} value={regionA} onChange={setRegionA} accentClass="border-blue-500/30" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-2 ml-1">Region B</p>
          <RegionSelect regions={regions} value={regionB} onChange={setRegionB} accentClass="border-violet-500/30" />
        </div>
      </motion.div>

      {regionA && regionB && (
        <>
          {/* KPI head-to-head */}
          <motion.div variants={fade} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="grid grid-cols-[1fr_auto_1fr] mb-4">
              <div className="text-right">
                <p className="text-sm font-bold text-blue-300">{regionA.name}</p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  {TREND_ICON[regionA.trend as keyof typeof TREND_ICON]}
                  <span className={`text-xs capitalize ${TREND_COLOR[regionA.trend as keyof typeof TREND_COLOR]}`}>{regionA.trend}</span>
                </div>
              </div>
              <div className="text-center px-4 text-xs text-slate-600 font-bold uppercase tracking-widest self-center">vs</div>
              <div className="text-left">
                <p className="text-sm font-bold text-violet-300">{regionB.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {TREND_ICON[regionB.trend as keyof typeof TREND_ICON]}
                  <span className={`text-xs capitalize ${TREND_COLOR[regionB.trend as keyof typeof TREND_COLOR]}`}>{regionB.trend}</span>
                </div>
              </div>
            </div>

            <KPIRow
              label="% over 18 weeks"
              a={regionA.pct_over_18_weeks}
              b={regionB.pct_over_18_weeks}
              format={v => v.toFixed(1) + '%'}
              lowerIsBetter
            />
            <KPIRow
              label="Inequality score"
              a={regionA.inequality_score}
              b={regionB.inequality_score}
              format={v => v.toFixed(1)}
              lowerIsBetter
            />
            <KPIRow
              label="Backlog / 100k"
              a={regionA.backlog_rate_per_100k}
              b={regionB.backlog_rate_per_100k}
              format={v => v.toFixed(0)}
              lowerIsBetter
            />
            <KPIRow
              label="Deprivation index"
              a={regionA.deprivation_index}
              b={regionB.deprivation_index}
              format={v => v.toFixed(1)}
              lowerIsBetter
            />
            <KPIRow
              label="Total waiting"
              a={regionA.total_waiting}
              b={regionB.total_waiting}
              format={v => v >= 1_000_000 ? (v / 1_000_000).toFixed(2) + 'M' : Math.round(v / 1000) + 'k'}
              lowerIsBetter
            />
            <p className="text-[10px] text-slate-600 mt-3">Highlighted value is better. Lower is better for all metrics except where noted.</p>
          </motion.div>

          {/* Radar chart */}
          {radarData.length > 0 && (
            <motion.div variants={fade} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-white mb-1">Performance Profile</h2>
              <p className="text-xs text-slate-500 mb-5">Higher = better on all axes. Scores normalised relative to each other.</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Radar name={regionA.name} dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                    <Radar name={regionB.name} dataKey="B" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* Bar comparison */}
          <motion.div variants={fade} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-white mb-5">Key Metrics Bar Comparison</h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="A" name={regionA.name} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="B" name={regionB.name} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </>
      )}

    </motion.div>
  )
}
