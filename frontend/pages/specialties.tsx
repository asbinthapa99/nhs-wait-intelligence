import { useEffect, useState } from 'react'

import AIInsightsPanel from '../components/AIInsightsPanel'
import DataStatusBanner from '../components/DataStatusBanner'
import EmptyStateCard from '../components/EmptyStateCard'
import { DataStatus, getApiUrl, getDataStatus, getSpecialties, Specialty } from '../lib/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

function formatWaiting(value: number) {
  return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(2)}M` : `${(value / 1_000).toFixed(0)}k`
}

function formatSignedPercent(value: number) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function changeColor(value: number) {
  if (value >= 15) return 'text-red-600'
  if (value >= 10) return 'text-amber-600'
  if (value <= 0) return 'text-green-700'
  return 'text-green-600'
}

function barColor(pct: number) {
  if (pct >= 50) return '#e05252'
  if (pct >= 40) return '#d97706'
  if (pct >= 30) return '#eab308'
  return '#16a34a'
}

export default function SpecialtiesPage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSpecialties = async () => {
    setLoading(true)
    setError(null)

    const [specialtiesResult, statusResult] = await Promise.allSettled([getSpecialties(), getDataStatus()])

    if (specialtiesResult.status === 'fulfilled') {
      setSpecialties(specialtiesResult.value.specialties)
    } else {
      setSpecialties([])
      setError('Specialties API could not be reached. Check the backend connection and retry.')
    }

    if (statusResult.status === 'fulfilled') {
      setStatus(statusResult.value)
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadSpecialties()
  }, [])

  const sortedByWaits = [...specialties].sort((a, b) => b.pct_over_18_weeks - a.pct_over_18_weeks)
  const sortedByGrowth = [...specialties].sort((a, b) => b.yoy_change - a.yoy_change)
  const worst = sortedByWaits[0]
  const hasData = specialties.length > 0

  const handleDownload = () => {
    if (!hasData) return
    window.location.assign(getApiUrl('/api/export/specialties.csv'))
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Specialty deep-dive</h1>
          <p className="text-sm text-slate-500 mt-1">
            Which specialties are under most pressure? Sorted by % waiting over 18 weeks.
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
          title="No specialty backlog data available yet"
          body="The API does not currently have waiting list rows grouped by specialty. Run the data pipeline to populate specialty analysis."
          actionLabel="Retry"
          onAction={() => void loadSpecialties()}
        />
      ) : (
        <>
          {worst ? (
            <div className="mb-5 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
              <div className="text-2xl">!</div>
              <div>
                <p className="text-sm font-semibold text-red-700">
                  {worst.name} is the worst-performing specialty
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  {worst.pct_over_18_weeks}% waiting over 18 weeks with {formatSignedPercent(worst.yoy_change)} year-on-year backlog change.
                  {' '}{formatWaiting(worst.total_waiting)} patients affected.
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-base font-semibold text-slate-800 mb-4">% waiting over 18 weeks</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={sortedByWaits}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 100, bottom: 4 }}
                  barSize={18}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 60]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={false}
                    tickLine={false}
                    width={95}
                  />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [`${value}%`, 'Over 18 weeks']}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="pct_over_18_weeks" radius={[0, 4, 4, 0]}>
                    {sortedByWaits.map((specialty) => (
                      <Cell key={specialty.name} fill={barColor(specialty.pct_over_18_weeks)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-base font-semibold text-slate-800 mb-4">Year-on-year growth (%)</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={sortedByGrowth}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 100, bottom: 4 }}
                  barSize={18}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={false}
                    tickLine={false}
                    width={95}
                  />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [formatSignedPercent(value), 'YoY growth']}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="yoy_change" fill="#1e3a5f" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {status?.has_live_data ? (
            <div className="mt-5 mb-5">
              <AIInsightsPanel
                topic="specialties"
                askQuestion="Which specialty needs the most urgent intervention and why?"
              />
            </div>
          ) : null}

          <div className="mt-0 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-800">Full specialty breakdown</h2>
              <p className="text-xs text-slate-400">{loading ? 'Refreshing live data...' : 'Latest processed snapshot'}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-medium">Specialty</th>
                    <th className="text-right px-4 py-3 font-medium">Total waiting</th>
                    <th className="text-right px-4 py-3 font-medium">% over 18w</th>
                    <th className="text-right px-4 py-3 font-medium">YoY change</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedByWaits.map((specialty, index) => (
                    <tr key={specialty.name} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="px-4 py-3 font-medium text-slate-800">{specialty.name}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatWaiting(specialty.total_waiting)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${barColor(specialty.pct_over_18_weeks) === '#e05252' ? 'text-red-600' : barColor(specialty.pct_over_18_weeks) === '#d97706' ? 'text-amber-600' : 'text-slate-700'}`}>
                          {specialty.pct_over_18_weeks}%
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${changeColor(specialty.yoy_change)}`}>
                        {formatSignedPercent(specialty.yoy_change)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 md:hidden">
              <button
                onClick={handleDownload}
                disabled={!hasData}
                className="w-full py-2 text-xs font-medium border border-slate-200 rounded-full text-slate-600 hover:bg-slate-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                Download CSV
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
