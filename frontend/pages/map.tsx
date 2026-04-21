import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, RefreshCw, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

import DataStatusBanner from '../components/DataStatusBanner'
import EmptyStateCard from '../components/EmptyStateCard'
import { DataStatus, getDataStatus, getRegions, RegionDetail } from '../lib/api'

const RegionMap = dynamic(() => import('../components/RegionMap'), { ssr: false })

const TREND_PILL: Record<string, string> = {
  deteriorating: 'text-red-400 bg-red-500/10 border border-red-500/20',
  stable: 'text-amber-400 bg-amber-500/10 border border-amber-500/20',
  improving: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
}

function scoreColor(score: number) {
  if (score >= 75) return 'bg-red-500'
  if (score >= 55) return 'bg-amber-500'
  if (score >= 40) return 'bg-yellow-400'
  return 'bg-emerald-500'
}

function scoreBadgeColor(score: number) {
  if (score >= 75) return 'text-red-400'
  if (score >= 55) return 'text-amber-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-emerald-400'
}

export default function MapPage() {
  const [selected, setSelected] = useState<RegionDetail | null>(null)
  const [regions, setRegions] = useState<RegionDetail[]>([])
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [listOpen, setListOpen] = useState(false)

  const loadRegions = async () => {
    setIsLoading(true); setError(null)
    const [regRes, statusRes] = await Promise.allSettled([getRegions(), getDataStatus()])
    setRegions(regRes.status === 'fulfilled' ? regRes.value : [])
    if (regRes.status === 'rejected') setError('Map data could not be loaded from the API.')
    if (statusRes.status === 'fulfilled') setStatus(statusRes.value)
    setIsLoading(false)
  }

  useEffect(() => { void loadRegions() }, [])

  useEffect(() => {
    if (!selected) return
    const synced = regions.find(r => r.id === selected.id) || null
    setSelected(synced)
  }, [regions, selected?.id])

  const sortedRegions = useMemo(
    () => [...regions].sort((a, b) => b.inequality_score - a.inequality_score),
    [regions]
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Regional Inequality Map</h1>
        <p className="text-sm text-slate-400 mt-1">Pinch, scroll, or double-click to zoom. Select a region for details.</p>
      </div>

      <DataStatusBanner status={status} loading={isLoading && !status} />

      {error && (
        <div className="alert border border-red-500/20 bg-red-500/10 text-red-300 text-sm rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => void loadRegions()} className="btn btn-xs btn-ghost ml-auto gap-1">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {!regions.length && !isLoading ? (
        <EmptyStateCard
          title="No regional map data available"
          body="Run the pipeline to populate regions and boundary metadata."
          actionLabel="Retry" onAction={() => void loadRegions()}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Map */}
            <div className="relative md:col-span-2 rounded-2xl overflow-hidden border border-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] bg-[#1e293b]/70 backdrop-blur-xl" style={{ height: 500 }}>
              <RegionMap
                regions={regions}
                selectedRegionId={selected?.id ?? null}
                onSelectRegion={setSelected}
              />
              {isLoading && (
                <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <span className="loading loading-spinner loading-sm" />
                    Loading map data…
                  </div>
                </div>
              )}
              {selected && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-72 bg-[#0f172a]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-white">{selected.name}</p>
                      <p className="text-xs text-slate-400 tracking-wider">{selected.region_code}</p>
                    </div>
                    <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white text-lg leading-none transition-colors">&times;</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: 'Waiting', value: `${(selected.total_waiting / 1e6).toFixed(2)}M` },
                      { label: 'Over 18w', value: `${selected.pct_over_18_weeks}%`, color: 'text-amber-400' },
                      { label: 'Deprivation', value: `${(selected.deprivation_index * 100).toFixed(0)}/100` },
                      { label: 'Backlog rate', value: `${selected.backlog_rate_per_100k}/100k` },
                    ].map(item => (
                      <div key={item.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-2.5">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{item.label}</p>
                        <p className={`font-bold text-sm mt-0.5 ${item.color ?? 'text-white'}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-700/50 pt-3">
                    <span className={`text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${TREND_PILL[selected.trend] ?? TREND_PILL.stable}`}>
                      {selected.trend}
                    </span>
                    <span className={`text-sm font-bold bg-[#1e293b] px-3 py-1 rounded-lg border border-slate-700 ${scoreBadgeColor(selected.inequality_score)}`}>
                      Score {selected.inequality_score}
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Region list — collapsible on mobile */}
            <div className="flex flex-col bg-[#1e293b]/70 backdrop-blur-xl border border-white/5 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]">
              <button
                onClick={() => setListOpen(v => !v)}
                className="md:hidden flex items-center justify-between w-full p-4 text-left border-b border-white/5"
              >
                <h2 className="text-sm font-semibold text-slate-200">All regions ({sortedRegions.length})</h2>
                {listOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              <div className={`md:block ${listOpen ? 'block' : 'hidden'} p-4 pt-0 md:pt-4 overflow-y-auto`} style={{ maxHeight: 452 }}>
                <h2 className="hidden md:block text-sm font-semibold text-slate-200 mb-3 tracking-wide">All regions</h2>
                <div className="space-y-2">
                  {sortedRegions.map(r => (
                    <motion.button
                      key={r.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelected(selected?.id === r.id ? null : r)}
                      className={`w-full text-left rounded-xl border p-3 transition-all ${
                        selected?.id === r.id
                          ? 'border-blue-500/40 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                          : 'border-slate-700/50 hover:border-slate-500/50 hover:bg-[#0f172a]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-100 truncate">{r.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <div className={`w-2.5 h-2.5 rounded-sm ${scoreColor(r.inequality_score)}`} />
                          <span className={`text-sm font-black ${scoreBadgeColor(r.inequality_score)}`}>{r.inequality_score}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ${TREND_PILL[r.trend] ?? TREND_PILL.stable}`}>
                          {r.trend}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{r.pct_over_18_weeks}% over 18w</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-[#1e293b]/70 backdrop-blur-xl border border-white/5 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-slate-400" />
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Inequality score legend</p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-300 mb-3">
              {[
                { dot: 'bg-red-500', label: '75–100 Critical' },
                { dot: 'bg-amber-500', label: '55–74 High' },
                { dot: 'bg-yellow-400', label: '40–54 Moderate' },
                { dot: 'bg-emerald-500', label: '0–39 Low' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 bg-[#0f172a] px-3 py-1.5 rounded-lg border border-slate-700/50">
                  <div className={`w-2.5 h-2.5 rounded-sm ${item.dot}`} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
              Score = (% over 18w × 0.40) + (backlog growth × 0.35) + (deprivation × 0.25). Normalised 0–100.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
