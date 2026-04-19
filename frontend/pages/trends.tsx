import { useEffect, useMemo, useState } from 'react'

import AIInsightsPanel from '../components/AIInsightsPanel'
import DataStatusBanner from '../components/DataStatusBanner'
import EmptyStateCard from '../components/EmptyStateCard'
import { DataStatus, EMPTY_TRENDS, getApiUrl, getDataStatus, getTrends, TrendData } from '../lib/api'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts'

const REGION_COLORS = ['#e05252', '#1d4ed8', '#0f766e', '#d97706', '#7c3aed', '#15803d', '#475569']

function formatChange(series: { month: string; value: number }[]) {
  if (series.length < 2 || series[0].value === 0) return '0.0'
  return (((series[series.length - 1].value - series[0].value) / series[0].value) * 100).toFixed(1)
}

export default function TrendsPage() {
  const [data, setData] = useState<TrendData>(EMPTY_TRENDS)
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [showForecast, setShowForecast] = useState(true)
  const [activeRegion, setActiveRegion] = useState<'all' | string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTrends = async () => {
    setLoading(true)
    setError(null)

    const [trendsResult, statusResult] = await Promise.allSettled([getTrends(), getDataStatus()])

    if (trendsResult.status === 'fulfilled') {
      setData(trendsResult.value)
    } else {
      setData(EMPTY_TRENDS)
      setError('Trends API could not be reached. Check the backend connection and retry.')
    }

    if (statusResult.status === 'fulfilled') {
      setStatus(statusResult.value)
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadTrends()
  }, [])

  const colorByRegion = useMemo(
    () =>
      Object.fromEntries(
        data.regions.map((region, index) => [region, REGION_COLORS[index % REGION_COLORS.length]])
      ) as Record<string, string>,
    [data.regions]
  )

  const hasData = data.series.length > 0
  const visibleSeries = activeRegion === 'all'
    ? data.series
    : data.series.filter((series) => series.region === activeRegion)
  const visibleForecast = activeRegion === 'all'
    ? data.forecast
    : data.forecast.filter((series) => series.region === activeRegion)

  const latestActualMonth = data.series[0]?.data[data.series[0].data.length - 1]?.month
  const regionGrowth = data.series.map((series) => ({
    region: series.region,
    change: Number(formatChange(series.data)),
    latest: series.data[series.data.length - 1]?.value ?? 0,
  }))
  const fastestGrowth = regionGrowth.length
    ? regionGrowth.reduce((current, next) => (current.change > next.change ? current : next))
    : null
  const largestBacklog = regionGrowth.length
    ? regionGrowth.reduce((current, next) => (current.latest > next.latest ? current : next))
    : null
  const forecastPeak = data.forecast.length
    ? data.forecast.reduce(
        (current, next) => {
          const nextPeak = Math.max(...next.data.map((point) => point.predicted))
          return current.value > nextPeak ? current : { region: next.region, value: nextPeak }
        },
        {
          region: data.forecast[0].region,
          value: Math.max(...data.forecast[0].data.map((point) => point.predicted)),
        }
      )
    : null

  const focusRegion = activeRegion === 'all' ? data.regions[0] : activeRegion
  const focusForecast = focusRegion
    ? data.forecast.find((series) => series.region === focusRegion)?.data ?? []
    : []

  const handleDownload = () => {
    if (!hasData) return
    const query = activeRegion === 'all' ? '' : `?regions=${encodeURIComponent(activeRegion)}`
    window.location.assign(getApiUrl(`/api/export/trends.csv${query}`))
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Trends &amp; forecasting</h1>
          <p className="text-sm text-slate-500 mt-1">
            Regional backlog history with stored 6-month forecasts from the latest processed data.
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
          title="No trend series available yet"
          body="The API does not currently have processed regional history to chart or forecast. Run the data pipeline to populate trend and forecast tables."
          actionLabel="Retry"
          onAction={() => void loadTrends()}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Tracked regions</p>
              <p className="text-2xl font-bold text-slate-800">{data.regions.length}</p>
              <p className="text-xs text-slate-400">Latest month {latestActualMonth ?? 'n/a'}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Largest backlog</p>
              <p className="text-lg font-bold text-red-600 leading-tight">{largestBacklog?.region ?? 'N/A'}</p>
              <p className="text-xs text-slate-400">{largestBacklog ? `${largestBacklog.latest.toFixed(2)}M latest` : 'No data'}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Fastest growth</p>
              <p className="text-lg font-bold text-amber-600 leading-tight">{fastestGrowth?.region ?? 'N/A'}</p>
              <p className="text-xs text-slate-400">{fastestGrowth ? `+${fastestGrowth.change.toFixed(1)}% over series` : 'No data'}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Forecast peak</p>
              <p className="text-lg font-bold text-slate-800 leading-tight">{forecastPeak?.region ?? 'N/A'}</p>
              <p className="text-xs text-slate-400">{forecastPeak ? `${forecastPeak.value.toFixed(2)}M projected` : 'No data'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex flex-wrap gap-2">
              {(['all', ...data.regions] as const).map((region) => (
                <button
                  key={region}
                  onClick={() => setActiveRegion(region)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeRegion === region
                      ? 'bg-nhs-navy text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {region === 'all' ? 'All regions' : region}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowForecast((value) => !value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                showForecast
                  ? 'bg-slate-800 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {showForecast ? 'Hide forecast' : 'Show forecast'}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">
              Waiting list size (millions) - regional comparison
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  allowDuplicatedCategory={false}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${value}M`}
                />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number, name: string) => [`${value}M`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                {latestActualMonth ? (
                  <ReferenceLine x={latestActualMonth} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Latest actual', position: 'top', fontSize: 10, fill: '#94a3b8' }} />
                ) : null}

                {visibleSeries.map((series) => (
                  <Line
                    key={`actual-${series.region}`}
                    data={series.data}
                    type="monotone"
                    dataKey="value"
                    name={series.region}
                    stroke={colorByRegion[series.region]}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                ))}

                {showForecast && visibleForecast.map((series) => (
                  <Line
                    key={`forecast-${series.region}`}
                    data={series.data}
                    type="monotone"
                    dataKey="predicted"
                    name={`${series.region} forecast`}
                    stroke={colorByRegion[series.region]}
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {showForecast && focusForecast.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-base font-semibold text-slate-800 mb-1">
                {focusRegion} 6-month forecast with confidence interval
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Stored linear regression output from the pipeline. {loading ? 'Refreshing live series...' : 'Loaded from API.'}
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={focusForecast} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${value}M`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number, name: string) => [`${value}M`, name]}
                  />
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill="#dbeafe"
                    fillOpacity={0.8}
                    name="Upper bound"
                  />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="none"
                    fill="#fff"
                    fillOpacity={1}
                    name="Lower bound"
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke={focusRegion ? colorByRegion[focusRegion] ?? '#1d4ed8' : '#1d4ed8'}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: focusRegion ? colorByRegion[focusRegion] ?? '#1d4ed8' : '#1d4ed8' }}
                    name="Predicted"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}

          {status?.has_live_data ? (
            <div className="mt-5">
              <AIInsightsPanel
                topic="trends"
                askQuestion="What will happen to the North East backlog if current trends continue to 2026?"
              />
            </div>
          ) : null}

          <div className="mt-4 md:hidden">
            <button
              onClick={handleDownload}
              disabled={!hasData}
              className="w-full py-2 text-xs font-medium border border-slate-200 rounded-full text-slate-600 hover:bg-slate-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              Download CSV
            </button>
          </div>
        </>
      )}
    </>
  )
}
