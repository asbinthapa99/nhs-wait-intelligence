import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Info, Activity } from 'lucide-react'

import DataStatusBanner from '../components/DataStatusBanner'
import EmptyStateCard from '../components/EmptyStateCard'
import { DataStatus, getDataStatus, getRegions, RegionDetail } from '../lib/api'

const RegionMap = dynamic(() => import('../components/RegionMap'), { ssr: false })

const TREND_PILL: Record<string, string> = {
  deteriorating: 'text-red-700 bg-red-50 border border-red-100',
  stable: 'text-amber-700 bg-amber-50 border border-amber-100',
  improving: 'text-emerald-700 bg-emerald-50 border border-emerald-100',
}

function scoreColor(score: number) {
  if (score >= 75) return 'bg-red-500'
  if (score >= 55) return 'bg-amber-500'
  if (score >= 40) return 'bg-yellow-400'
  return 'bg-emerald-500'
}

function scoreBadgeColor(score: number) {
  if (score >= 75) return 'text-red-600'
  if (score >= 55) return 'text-amber-600'
  if (score >= 40) return 'text-yellow-600'
  return 'text-emerald-600'
}

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

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
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* ── Header ── */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <MapPin size={17} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">Regional Inequality Map</h1>
            <p className="text-xs text-[#999] mt-0.5">Interactive spatial analysis of NHS elective backlogs across England</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadRegions()} disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-[#e5e5e5] rounded-lg text-[#666] hover:text-[#111] hover:border-[#bbb] bg-white transition-colors disabled:opacity-50">
            <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} /> Refresh Map
          </button>
        </div>
      </motion.div>

      <DataStatusBanner status={status} loading={isLoading && !status} />

      {error && (
        <motion.div variants={fade} className="flex items-center gap-3 border border-red-200 bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="shrink-0" /> {error}
        </motion.div>
      )}

      {!regions.length && !isLoading ? (
        <EmptyStateCard
          title="No regional map data available"
          body="Run the pipeline to populate regions and boundary metadata."
          actionLabel="Retry" onAction={() => void loadRegions()}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* ── Map Container ── */}
          <motion.div variants={fade} className="lg:col-span-2 relative rounded-2xl overflow-hidden border border-[#e5e5e5] shadow-sm bg-white h-[400px] sm:h-[500px] lg:h-[600px]">
            <RegionMap
              regions={regions}
              selectedRegionId={selected?.id ?? null}
              onSelectRegion={setSelected}
            />
            {isLoading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-[1000]">
                <div className="flex items-center gap-2 text-[#333] text-xs font-semibold bg-white px-4 py-2 rounded-full border border-[#e5e5e5] shadow-sm">
                  <RefreshCw size={12} className="animate-spin text-blue-600" />
                  Loading spatial data...
                </div>
              </div>
            )}

            {/* Map Overlay Popup */}
            <AnimatePresence>
              {selected && (
                <motion.div
                  initial={{ opacity: 0, x: -20, y: 0 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="absolute bottom-6 left-6 right-6 sm:left-6 sm:right-auto sm:w-80 bg-white/95 backdrop-blur-xl border border-[#e5e5e5] rounded-2xl p-5 shadow-2xl z-[1000]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold text-[#111] leading-tight">{selected.name}</p>
                      <p className="text-[10px] text-[#bbb] font-bold uppercase tracking-widest mt-0.5">{selected.region_code}</p>
                    </div>
                    <button onClick={() => setSelected(null)} className="w-6 h-6 flex items-center justify-center text-[#bbb] hover:text-[#111] transition-colors">&times;</button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Waiting', value: `${(selected.total_waiting / 1e6).toFixed(2)}M`, sub: 'Total list' },
                      { label: 'Over 18w', value: `${selected.pct_over_18_weeks}%`, sub: 'Breach rate', color: scoreBadgeColor(selected.inequality_score) },
                      { label: 'Deprivation', value: `${(selected.deprivation_index * 100).toFixed(0)}`, sub: 'Score /100' },
                      { label: 'Backlog', value: `${selected.backlog_rate_per_100k}`, sub: 'Per 100k' },
                    ].map(item => (
                      <div key={item.label} className="bg-[#fafafa] border border-[#f0f0f0] rounded-xl p-3">
                        <p className="text-[10px] text-[#aaa] font-bold uppercase tracking-wider">{item.label}</p>
                        <p className={`text-lg font-black mt-0.5 ${item.color ?? 'text-[#111]'}`}>{item.value}</p>
                        <p className="text-[9px] text-[#ccc] mt-0.5">{item.sub}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[#f0f0f0] pt-4">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest ${TREND_PILL[selected.trend] ?? TREND_PILL.stable}`}>
                      {selected.trend}
                    </span>
                    <div className="text-right">
                      <p className="text-[9px] text-[#bbb] uppercase font-bold tracking-widest">Inequality Score</p>
                      <p className={`text-xl font-black ${scoreBadgeColor(selected.inequality_score)}`}>{selected.inequality_score}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Region List Panel ── */}
          <motion.div variants={fade} className="flex flex-col bg-white border border-[#e5e5e5] rounded-2xl shadow-sm overflow-hidden h-fit">
            <button
              onClick={() => setListOpen(v => !v)}
              className="lg:hidden flex items-center justify-between w-full p-4 text-left border-b border-[#e5e5e5]"
            >
              <h2 className="text-sm font-bold text-[#111]">Regional Rankings ({sortedRegions.length})</h2>
              {listOpen ? <ChevronUp size={16} className="text-[#bbb]" /> : <ChevronDown size={16} className="text-[#bbb]" />}
            </button>
            <div className={`lg:block ${listOpen ? 'block' : 'hidden'} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="hidden lg:block text-sm font-bold text-[#111]">Regional Rankings</h2>
                <span className="text-[10px] font-bold text-[#bbb] uppercase tracking-widest">Sorted by score</span>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                {sortedRegions.map((r, i) => (
                  <motion.button
                    key={r.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelected(selected?.id === r.id ? null : r)}
                    className={`w-full text-left rounded-xl border p-4 transition-all flex flex-col gap-3 ${
                      selected?.id === r.id
                        ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500/20'
                        : 'border-[#f0f0f0] hover:border-[#bbb] hover:bg-[#fafafa]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-black text-[#ccc] w-4 shrink-0">{i + 1}</span>
                        <span className="text-sm font-bold text-[#111] truncate">{r.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className={`text-sm font-black ${scoreBadgeColor(r.inequality_score)}`}>{r.inequality_score}</span>
                        <div className={`w-2 h-2 rounded-full ${scoreColor(r.inequality_score)}`} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${TREND_PILL[r.trend] ?? TREND_PILL.stable}`}>
                        {r.trend}
                      </span>
                      <span className="text-[10px] text-[#bbb] font-medium italic">{r.pct_over_18_weeks}% breach rate</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Legend & Methodology ── */}
      <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Info size={14} className="text-[#aaa]" />
              <p className="text-[11px] font-bold text-[#999] uppercase tracking-widest">Inequality Score Legend</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { dot: 'bg-red-500', label: '75–100', status: 'Critical', text: 'text-red-600' },
                { dot: 'bg-amber-500', label: '55–74', status: 'High', text: 'text-amber-600' },
                { dot: 'bg-yellow-400', label: '40–54', status: 'Moderate', text: 'text-yellow-600' },
                { dot: 'bg-emerald-500', label: '0–39', status: 'Low', text: 'text-emerald-600' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 bg-[#fafafa] px-3 py-2 rounded-xl border border-[#f0f0f0]">
                  <div className={`w-2.5 h-2.5 rounded-sm ${item.dot}`} />
                  <span className="text-xs font-bold text-[#444]">{item.label}</span>
                  <span className={`text-[10px] font-black uppercase tracking-tight ${item.text}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="max-w-md sm:text-right">
            <p className="text-[10px] text-[#aaa] font-bold uppercase tracking-widest mb-1">Methodology</p>
            <p className="text-xs text-[#888] leading-relaxed">
              Weighted composite: <strong className="text-[#666]">40% Breach Rate</strong> (18w), <strong className="text-[#666]">35% Backlog Growth</strong> (YoY), and <strong className="text-[#666]">25% Structural Deprivation</strong> (IMD).
              Spatial data updated monthly on pipeline execution.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
