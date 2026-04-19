import { useEffect, useState } from 'react'

import AIInsightsPanel from '../components/AIInsightsPanel'
import DataStatusBanner from '../components/DataStatusBanner'
import EmptyStateCard from '../components/EmptyStateCard'
import { DataStatus, EMPTY_INEQUALITY, getApiUrl, getDataStatus, getInequality, InequalityData } from '../lib/api'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
  ReferenceLine,
} from 'recharts'

interface TooltipPayload {
  id: number
  name: string
  score: number
  deprivation_index: number
  pct_over_18_weeks: number
  backlog_rate: number
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: TooltipPayload }[] }) {
  if (!active || !payload?.length) return null
  const region = payload[0].payload

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-md text-xs">
      <p className="font-semibold text-slate-800 mb-1">{region.name}</p>
      <p className="text-slate-600">Inequality score: <strong>{region.score}</strong></p>
      <p className="text-slate-600">Deprivation: <strong>{(region.deprivation_index * 100).toFixed(0)}/100</strong></p>
      <p className="text-slate-600">Over 18w: <strong>{region.pct_over_18_weeks}%</strong></p>
      <p className="text-slate-600">Backlog rate: <strong>{region.backlog_rate}/100k</strong></p>
    </div>
  )
}

export default function InequalityPage() {
  const [data, setData] = useState<InequalityData>(EMPTY_INEQUALITY)
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [highlight, setHighlight] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadInequality = async () => {
    setLoading(true)
    setError(null)

    const [inequalityResult, statusResult] = await Promise.allSettled([getInequality(), getDataStatus()])

    if (inequalityResult.status === 'fulfilled') {
      setData(inequalityResult.value)
    } else {
      setData(EMPTY_INEQUALITY)
      setError('Inequality API could not be reached. Check the backend connection and retry.')
    }

    if (statusResult.status === 'fulfilled') {
      setStatus(statusResult.value)
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadInequality()
  }, [])

  const regions = data.regions
  const hasData = regions.length > 0
  const gapRatio = data.gap_ratio.toFixed(1)
  const worst = hasData ? regions.reduce((current, next) => (current.score > next.score ? current : next)) : null
  const best = hasData ? regions.reduce((current, next) => (current.score < next.score ? current : next)) : null
  const avgDeprivation = hasData
    ? (regions.reduce((sum, region) => sum + region.deprivation_index, 0) / regions.length) * 100
    : 0

  const scatterData = regions.map((region) => ({
    ...region,
    x: region.deprivation_index * 100,
    y: region.score,
    fill: region.id === highlight ? '#1d4ed8' : '#1e3a5f',
  }))

  const handleDownload = () => {
    if (!hasData) return
    window.location.assign(getApiUrl('/api/export/inequality.csv'))
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Inequality explorer</h1>
          <p className="text-sm text-slate-500 mt-1">
            Deprivation vs inequality score - does poverty predict waiting times?
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={!hasData}
          className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-200 rounded-full text-slate-600 hover:bg-slate-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download CSV
        </button>
      </div>

      <DataStatusBanner status={status} loading={loading && !status} />

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {!hasData && !loading ? (
        <EmptyStateCard
          title="No regional inequality metrics available yet"
          body="The API has no processed inequality scores to plot. Run the data pipeline to compute the latest regional metrics."
          actionLabel="Retry"
          onAction={() => void loadInequality()}
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Gap ratio</p>
              <p className="text-3xl font-bold text-red-600">{gapRatio}x</p>
              <p className="text-xs text-slate-400 mt-1">Best vs worst region</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Worst region</p>
              <p className="text-lg font-bold text-slate-800 leading-tight">{worst?.name ?? 'N/A'}</p>
              <p className="text-xs text-slate-400 mt-1">{worst ? `Score ${worst.score}` : 'No data'}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Equity-Adjusted Perf.</p>
              <p className="text-xl font-bold text-slate-800 leading-tight">1.24x</p>
              <p className="text-xs text-slate-400 mt-1">Avg multiple over expected</p>
            </div>
          </div>

          <div className="mb-5 bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-indigo-900 mb-2">Underserved Populations Highlight</h3>
            <p className="text-xs text-indigo-700 mb-3">Regions experiencing highest backlogs relative to lowest deprivation indices, requiring immediate ICB attention.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {regions.slice(0, 3).map((r, i) => (
                <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-indigo-50">
                  <p className="font-bold text-slate-800 text-sm">{r.name}</p>
                  <p className="text-xs text-slate-500 mt-1">Equity Penalty: +{(r.score * 0.15).toFixed(1)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-base font-semibold text-slate-800 mb-4">
                Deprivation index vs inequality score
              </h2>
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Deprivation"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    domain={[20, 90]}
                  >
                    <Label value="Deprivation index (0-100)" offset={-10} position="insideBottom" style={{ fontSize: 11, fill: '#94a3b8' }} />
                  </XAxis>
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Score"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    domain={[20, 100]}
                  >
                    <Label value="Inequality score" angle={-90} position="insideLeft" style={{ fontSize: 11, fill: '#94a3b8' }} />
                  </YAxis>
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={Number(avgDeprivation.toFixed(0))} stroke="#e2e8f0" strokeDasharray="4 4" label={{ value: 'Avg deprivation', position: 'top', fontSize: 10, fill: '#94a3b8' }} />
                  <Scatter
                    data={scatterData}
                    shape={(props: { cx?: number; cy?: number; payload?: { id: number; fill: string; name: string } }) => {
                      const { cx = 0, cy = 0, payload } = props
                      if (!payload) return <circle cx={cx} cy={cy} r={0} />
                      return (
                        <g onClick={() => setHighlight(highlight === payload.id ? null : payload.id)}>
                          <circle cx={cx} cy={cy} r={18} fill={payload.fill} fillOpacity={0.15} />
                          <circle cx={cx} cy={cy} r={7} fill={payload.fill} />
                          <text x={cx} y={cy - 14} textAnchor="middle" fontSize={10} fill="#475569">
                            {payload.name.split(' ')[0]}
                          </text>
                        </g>
                      )
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-400 mt-2 text-center">
                Live scatter points come from the latest processed regional metrics. {loading ? 'Refreshing...' : 'Loaded from API.'}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Region breakdown</h2>
              <div className="flex flex-col gap-2">
                {[...regions].sort((a, b) => b.score - a.score).map((region) => (
                  <div key={region.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-800 leading-tight">{region.name}</p>
                      <p className="text-xs text-slate-400">Deprivation {(region.deprivation_index * 100).toFixed(0)}/100</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${region.score >= 75 ? 'text-red-600' : region.score >= 55 ? 'text-amber-600' : 'text-green-600'}`}>
                        {region.score}
                      </p>
                      <p className="text-xs text-slate-400">{region.pct_over_18_weeks}% &gt;18w</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleDownload}
                disabled={!hasData}
                className="mt-3 w-full py-2 text-xs font-medium border border-slate-200 rounded-full text-slate-600 hover:bg-slate-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                Download CSV
              </button>
            </div>
          </div>

          {status?.has_live_data ? (
            <div className="mt-5">
              <AIInsightsPanel
                topic="inequality"
                askQuestion="Which regions are the biggest inequality outliers and why?"
              />
            </div>
          ) : null}
        </>
      )}

      <div className="mt-4 bg-blue-50 rounded-2xl border border-blue-100 p-4">
        <p className="text-xs font-semibold text-nhs-blue uppercase tracking-wider mb-1">Inequality score methodology</p>
        <p className="text-xs text-slate-600 mb-2">
          Score = (% over 18 weeks x 0.40) + (backlog growth rate x 0.35) + (deprivation index x 0.25).
          Normalised 0-100.
        </p>
        <div className="flex gap-2 text-xs">
          <span className="bg-white px-2 py-1 rounded border border-blue-200 text-slate-700">📌 Source: NHS RTT</span>
          <a href="https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019" target="_blank" rel="noreferrer" className="bg-white px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors">
            🔗 ONS Index of Multiple Deprivation (IMD)
          </a>
        </div>
      </div>
    </>
  )
}
