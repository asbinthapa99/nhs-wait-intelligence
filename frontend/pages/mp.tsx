import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Search, MapPin, TrendingUp, TrendingDown, Minus, ExternalLink, AlertTriangle, Info } from 'lucide-react'

const fade = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

interface MPData {
  mp: {
    id: number
    name: string
    party: string
    constituency: string
    email: string | null
    thumbnail: string | null
    url: string
  }
  nhs: {
    region: string
    total_waiting: number
    pct_over_18_weeks: number
    inequality_score: number
    trend: 'improving' | 'stable' | 'deteriorating'
    backlog_rate_per_100k: number
  } | null
}

const TREND_COLOR = {
  improving: 'text-emerald-600',
  stable: 'text-amber-600',
  deteriorating: 'text-red-600',
}
const TREND_LABEL = {
  improving: 'Improving',
  stable: 'Stable',
  deteriorating: 'Worsening',
}
const TREND_ICON = {
  improving: TrendingUp,
  stable: Minus,
  deteriorating: TrendingDown,
}

const PARTY_COLORS: Record<string, string> = {
  'Labour': 'bg-red-50 text-red-700 border-red-200',
  'Conservative': 'bg-blue-50 text-blue-700 border-blue-200',
  'Liberal Democrat': 'bg-amber-50 text-amber-700 border-amber-200',
  'Scottish National Party': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Green Party': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Reform UK': 'bg-cyan-50 text-cyan-700 border-cyan-200',
}

function partyStyle(party: string) {
  for (const [key, cls] of Object.entries(PARTY_COLORS)) {
    if (party.toLowerCase().includes(key.toLowerCase())) return cls
  }
  return 'bg-[#f5f5f5] text-[#666] border-[#e5e5e5]'
}

function fmtM(v: number) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (v >= 1_000) return Math.round(v / 1_000) + 'k'
  return String(v)
}

export default function MPPage() {
  const [postcode, setPostcode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MPData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const lookup = async () => {
    const pc = postcode.trim().toUpperCase().replace(/\s+/g, '')
    if (!pc) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/mp-lookup?postcode=${encodeURIComponent(pc)}`)
      const json = await res.json() as { error?: string } & MPData
      if (!res.ok || json.error) {
        setError(json.error ?? 'Could not find an MP for that postcode.')
      } else {
        setResult(json as MPData)
      }
    } catch {
      setError('Request failed — check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const nhs = result?.nhs
  const TrendIcon = nhs ? TREND_ICON[nhs.trend] : null

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 max-w-3xl mx-auto py-2 pb-24">

      {/* Header */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
            <Users size={18} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">Your MP's NHS Performance</h1>
            <p className="text-xs text-[#999] mt-0.5">Postcode → your MP + NHS waiting times in your region</p>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={fade} className="flex gap-3">
        <div className="flex-1 relative">
          <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#bbb]" />
          <input
            type="text"
            placeholder="e.g. SW1A 1AA or LS1 4AP"
            value={postcode}
            onChange={e => setPostcode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void lookup()}
            className="w-full bg-white border border-[#e5e5e5] rounded-xl px-4 py-3 pl-10 text-sm text-[#111] placeholder-[#ccc] focus:outline-none focus:border-[#999] transition-colors"
          />
        </div>
        <button
          onClick={() => void lookup()}
          disabled={loading || !postcode.trim()}
          className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 shrink-0"
        >
          <Search size={15} />
          {loading ? 'Looking up…' : 'Look up'}
        </button>
      </motion.div>

      {error && (
        <motion.div variants={fade} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </motion.div>
      )}

      {result && (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">

          {/* MP Card */}
          <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl p-5 hover:border-[#bbb] hover:shadow-sm transition-all">
            <div className="flex items-start gap-4">
              {result.mp.thumbnail && (
                <img
                  src={result.mp.thumbnail}
                  alt={result.mp.name}
                  className="w-16 h-16 rounded-xl object-cover bg-[#f5f5f5] shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-[#111]">{result.mp.name}</h2>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${partyStyle(result.mp.party)}`}>
                    {result.mp.party}
                  </span>
                </div>
                <p className="text-sm text-[#888] mb-3">{result.mp.constituency}</p>
                <a
                  href={result.mp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-600 transition-colors font-semibold"
                >
                  Parliament profile <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </motion.div>

          {/* NHS Data */}
          {nhs ? (
            <>
              <motion.div variants={fade}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-3">
                  NHS performance in your region — {nhs.region}
                </p>
              </motion.div>

              <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total waiting', value: fmtM(nhs.total_waiting), color: 'text-[#111]' },
                  { label: '% over 18 weeks', value: nhs.pct_over_18_weeks.toFixed(1) + '%', color: nhs.pct_over_18_weeks > 40 ? 'text-red-600' : 'text-amber-600' },
                  { label: 'Inequality score', value: nhs.inequality_score.toFixed(0), color: nhs.inequality_score > 65 ? 'text-red-600' : 'text-[#111]' },
                  { label: 'Backlog / 100k', value: nhs.backlog_rate_per_100k.toFixed(0), color: 'text-blue-700' },
                ].map((kpi) => (
                  <motion.div key={kpi.label} variants={fade} className="bg-white border border-[#e5e5e5] rounded-xl p-4 hover:border-[#bbb] transition-all">
                    <p className="text-[10px] uppercase tracking-widest text-[#999] mb-1">{kpi.label}</p>
                    <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Trend + context */}
              <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-[#bbb] transition-all">
                <div className="flex items-center gap-2 shrink-0">
                  {TrendIcon && <TrendIcon size={18} className={TREND_COLOR[nhs.trend]} />}
                  <span className={`text-sm font-bold ${TREND_COLOR[nhs.trend]}`}>{TREND_LABEL[nhs.trend]}</span>
                </div>
                <p className="text-xs text-[#888] flex-1 leading-relaxed">
                  The waiting list in <strong className="text-[#111]">{nhs.region}</strong> is currently{' '}
                  <strong className={TREND_COLOR[nhs.trend]}>{TREND_LABEL[nhs.trend].toLowerCase()}</strong>.{' '}
                  {nhs.pct_over_18_weeks > 40
                    ? `${nhs.pct_over_18_weeks.toFixed(1)}% of patients are waiting more than 18 weeks — above the NHS 92% standard.`
                    : `${(100 - nhs.pct_over_18_weeks).toFixed(1)}% of patients are seen within 18 weeks.`}
                </p>
              </motion.div>

              {/* Write to MP CTA */}
              <motion.div variants={fade} className="bg-violet-50 border border-violet-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                <div>
                  <p className="text-sm font-semibold text-violet-800 mb-1">Hold your MP accountable</p>
                  <p className="text-xs text-[#888]">
                    Write to {result.mp.name} about NHS waiting times in {nhs.region} via WriteToThem.
                  </p>
                </div>
                <a
                  href={`https://www.writetothem.com/?a=W${encodeURIComponent(result.mp.constituency)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  Write to {result.mp.name.split(' ').slice(-1)[0]} <ExternalLink size={13} />
                </a>
              </motion.div>
            </>
          ) : (
            <motion.div variants={fade} className="bg-[#fafafa] border border-[#e5e5e5] rounded-2xl p-5 text-sm text-[#888]">
              NHS regional data is not yet available — run the data pipeline to populate regional metrics.
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Info banner */}
      {!result && !loading && !error && (
        <motion.div variants={fade} className="flex items-start gap-3 bg-[#fafafa] border border-[#e5e5e5] rounded-2xl p-5">
          <Info size={15} className="text-[#bbb] shrink-0 mt-0.5" />
          <div className="text-sm text-[#888] space-y-2 leading-relaxed">
            <p><strong className="text-[#555]">How it works:</strong> Enter any UK postcode. We look up your MP via the official UK Parliament Members API, then match your constituency to the closest NHS England region to show waiting time data.</p>
            <p className="text-xs text-[#bbb]">MP data from members-api.parliament.uk · NHS data from official NHS England RTT statistics.</p>
          </div>
        </motion.div>
      )}

    </motion.div>
  )
}
