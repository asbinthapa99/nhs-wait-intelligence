import dynamic from 'next/dynamic'
import { useState } from 'react'
import Layout from '../components/Layout'
import { MOCK_REGIONS, RegionDetail } from '../lib/api'

const RegionMap = dynamic(() => import('../components/RegionMap'), { ssr: false })

const TREND_COLORS = {
  deteriorating: 'text-red-600 bg-red-50',
  stable: 'text-amber-600 bg-amber-50',
  improving: 'text-green-600 bg-green-50',
}

function scoreColor(score: number) {
  if (score >= 75) return 'bg-red-500'
  if (score >= 55) return 'bg-amber-500'
  if (score >= 40) return 'bg-yellow-400'
  return 'bg-green-500'
}

export default function MapPage() {
  const [selected, setSelected] = useState<RegionDetail | null>(null)
  const regions = MOCK_REGIONS

  return (
    <Layout>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-800">Regional inequality map</h1>
        <p className="text-sm text-slate-500 mt-1">
          Circle size and colour indicate inequality score — larger / redder = worse.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Map */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ height: 480 }}>
          <RegionMap regions={regions} />
        </div>

        {/* Region list */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 480 }}>
          <h2 className="text-sm font-semibold text-slate-700 mb-1">All regions</h2>
          {[...regions].sort((a, b) => b.inequality_score - a.inequality_score).map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(selected?.id === r.id ? null : r)}
              className={`text-left rounded-xl border p-3 transition-all ${
                selected?.id === r.id
                  ? 'border-nhs-blue bg-blue-50'
                  : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-800">{r.name}</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${scoreColor(r.inequality_score)}`} />
                  <span className="text-sm font-bold text-slate-700">{r.inequality_score}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TREND_COLORS[r.trend]}`}>
                  {r.trend}
                </span>
                <span className="text-xs text-slate-400">{r.pct_over_18_weeks}% over 18w</span>
              </div>

              {selected?.id === r.id && (
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <p className="text-slate-400 uppercase tracking-wide text-[10px]">Waiting</p>
                    <p className="font-semibold text-slate-800">{(r.total_waiting / 1e6).toFixed(2)}M</p>
                  </div>
                  <div>
                    <p className="text-slate-400 uppercase tracking-wide text-[10px]">Deprivation</p>
                    <p className="font-semibold text-slate-800">{(r.deprivation_index * 100).toFixed(0)}/100</p>
                  </div>
                  <div>
                    <p className="text-slate-400 uppercase tracking-wide text-[10px]">Backlog rate</p>
                    <p className="font-semibold text-slate-800">{r.backlog_rate_per_100k}/100k</p>
                  </div>
                  <div>
                    <p className="text-slate-400 uppercase tracking-wide text-[10px]">Region code</p>
                    <p className="font-semibold text-slate-800">{r.region_code}</p>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Inequality score legend</p>
        <div className="flex flex-wrap gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span>75–100 Critical</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span>55–74 High</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-400" /><span>40–54 Moderate</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /><span>0–39 Low</span></div>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Score = (% over 18w × 0.40) + (backlog growth × 0.35) + (deprivation × 0.25). Normalised 0–100.
        </p>
      </div>
    </Layout>
  )
}
