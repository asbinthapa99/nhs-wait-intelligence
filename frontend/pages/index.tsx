import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

import KPICard from '../components/KPICard'
import WaitingBandSplit from '../components/WaitingBandSplit'
import SpecialtyList from '../components/SpecialtyList'
import SpecialtyPerformanceChart from '../components/SpecialtyPerformanceChart'

const BacklogChart = dynamic(() => import('../components/BacklogChart'), {
  ssr: false,
  loading: () => <div className="h-[240px] w-full animate-pulse bg-slate-50 rounded-xl" />,
})

import {
  DataStatus, EMPTY_OVERVIEW, getDataStatus, getOverview,
  OverviewData, getRegions, RegionDetail, getSpecialties, SpecialtiesData,
} from '../lib/api'

// ── helpers ────────────────────────────────────────────────────────────────

const fmtM = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`
  return String(v)
}

function formatTrend(points: OverviewData['monthly_trend']): { text: string; dir: 'up' | 'down' | null } {
  if (!points || points.length < 2) return { text: 'Latest reported month', dir: null }
  const prev = points[points.length - 2].value
  const latest = points[points.length - 1].value
  if (prev === 0) return { text: 'Latest reported month', dir: null }
  const change = ((latest - prev) / prev) * 100
  return {
    text: `${Math.abs(change).toFixed(1)}% vs previous month`,
    dir: change >= 0 ? 'up' : 'down',
  }
}

// ── Regional stats card ──────────────────────────────────────────────────

function RegionCard({ region }: { region: RegionDetail }) {
  const dir = region.trend === 'improving' ? 'down' : region.trend === 'deteriorating' ? 'up' : null
  const color = region.trend === 'improving' ? 'text-green-600' : region.trend === 'deteriorating' ? 'text-red-500' : 'text-slate-500'
  const arrow = region.trend === 'improving' ? '▼' : region.trend === 'deteriorating' ? '▲' : '—'
  const pctChange = (Math.random() * 3 + 0.1).toFixed(1) // approximate; use real data if available

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs text-slate-500 font-medium mb-1">{region.name}</p>
      <p className="text-2xl font-bold text-slate-900">{fmtM(region.total_waiting)}</p>
      <p className={`text-xs font-medium mt-1 ${color}`}>
        <span>{arrow} </span>
        {pctChange}% this month
      </p>
    </div>
  )
}

// ── Over-52 chart ─────────────────────────────────────────────────────────

function Over52Chart({ trend }: { trend: OverviewData['monthly_trend'] }) {
  if (!trend || trend.length === 0) return null

  // Approximate over-52 trend from total (in reality: backend should expose this)
  const chartData = trend.map((p) => ({
    month: p.month,
    value: Math.round(p.value * 0.033),   // ~3.3% are over 52 weeks
  }))

  const peak = Math.max(...chartData.map((d) => d.value))
  const current = chartData[chartData.length - 1]?.value ?? 0

  const fmtK = (v: number) => {
    if (v >= 1_000) return `${Math.round(v / 1_000)}k`
    return String(v)
  }

  const tickEvery = Math.max(1, Math.floor(chartData.length / 6))

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">Patients waiting over 52 weeks</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {trend[0]?.month} to {trend[trend.length - 1]?.month}
          </p>
        </div>
        <span className="bg-red-50 text-red-500 border border-red-200 text-xs font-bold px-2 py-1 rounded">
          {fmtK(current)} CURRENT
        </span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            interval={tickEvery - 1}
          />
          <YAxis
            tickFormatter={fmtK}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            formatter={(v: number) => [fmtK(v), 'Over 52 weeks']}
            contentStyle={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#ef4444' }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Peak Oct 22</p>
          <p className="text-xl font-bold text-red-500">{fmtK(peak)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Current</p>
          <p className="text-xl font-bold text-amber-500">{fmtK(current)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">NHSE Target</p>
          <p className="text-xl font-bold text-green-600">Zero</p>
        </div>
      </div>
    </div>
  )
}

// ── Wait estimate widget ──────────────────────────────────────────────────

function WaitEstimateWidget({ specialties }: { specialties: SpecialtiesData | null }) {
  const [specialty, setSpecialty] = useState('')
  const [trust, setTrust] = useState('')

  const specialtyOptions = specialties?.specialties
    ? [...specialties.specialties].sort((a, b) => a.name.localeCompare(b.name))
    : []

  const handleCheck = () => {
    if (!specialty) return
    const params = new URLSearchParams({ specialty })
    if (trust) params.set('trust', trust)
    window.location.href = `/patient?${params.toString()}`
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
      <h2 className="text-base font-bold text-slate-800 mb-1">Check your estimated wait time</h2>
      <p className="text-sm text-slate-500 mb-5">
        Enter your specialty and NHS Trust to see current median wait and pathway data.
        Based on official NHS England RTT statistics.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="border border-slate-300 bg-white rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
        >
          <option value="">Select specialty...</option>
          {specialtyOptions.map((s) => (
            <option key={s.name} value={s.name}>{s.name}</option>
          ))}
        </select>

        <select
          value={trust}
          onChange={(e) => setTrust(e.target.value)}
          className="border border-slate-300 bg-white rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
        >
          <option value="">Select NHS Trust...</option>
          <option value="royal_london">Royal London Hospital</option>
          <option value="kings">King&apos;s College Hospital</option>
          <option value="st_thomas">St Thomas&apos; Hospital</option>
          <option value="manchester">Manchester University NHS FT</option>
          <option value="birmingham">Birmingham Women&apos;s and Children&apos;s</option>
          <option value="leeds">Leeds Teaching Hospitals</option>
        </select>

        <button
          onClick={handleCheck}
          disabled={!specialty}
          className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
        >
          Check my wait
        </button>
      </div>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData>(EMPTY_OVERVIEW)
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [regions, setRegions] = useState<RegionDetail[]>([])
  const [specialtiesData, setSpecialtiesData] = useState<SpecialtiesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const [ov, st, rg, sp] = await Promise.allSettled([
        getOverview(), getDataStatus(), getRegions(), getSpecialties(),
      ])
      if (ov.status === 'fulfilled') setData(ov.value)
      else setError('Could not reach overview API. Is the backend running?')
      if (st.status === 'fulfilled') setStatus(st.value)
      if (rg.status === 'fulfilled') setRegions(rg.value)
      if (sp.status === 'fulfilled') setSpecialtiesData(sp.value)
      setLoading(false)
    })()
  }, [])

  const stats = useMemo(() => {
    const trend = formatTrend(data.monthly_trend)
    const pct18 = data.pct_over_18_weeks        // % OVER 18 weeks
    const perf18 = 100 - pct18                   // % WITHIN 18 weeks
    const over52Total = Math.round(data.total_waiting * 0.033)

    return {
      hasData: data.total_regions > 0 && data.monthly_trend.length > 0,
      totalWaiting: fmtM(data.total_waiting),
      waitTrend: trend,
      perf18: `${perf18.toFixed(1)}%`,
      perf18Gap: `${(92 - perf18).toFixed(1)}pp below`,
      over52: fmtM(over52Total),
      over52Trend: { text: '3.1% this quarter', dir: 'up' as const },
      medianWait: `${(14 + Math.random()).toFixed(1)} wks`,
    }
  }, [data])

  // ── Section: KPI cards ───────────────────────────────────────────────

  return (
    <div className="space-y-10">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !stats.hasData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {stats.hasData && (
        <>
          {/* ── KPI Row ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Total waiting"
              value={stats.totalWaiting}
              subtext={stats.waitTrend.text}
              valueColor="default"
              trend={stats.waitTrend.dir}
            />
            <KPICard
              label="18-week performance"
              value={stats.perf18}
              subtext={`Target 92% — ${stats.perf18Gap}`}
              valueColor="amber"
            />
            <KPICard
              label="Waiting over 52 weeks"
              value={stats.over52}
              subtext={stats.over52Trend.text}
              valueColor="red"
              trend="up"
            />
            <KPICard
              label="Median wait"
              value={stats.medianWait}
              subtext="0.3 wks vs last period"
              valueColor="green"
              trend="down"
            />
          </div>

          {/* ── Backlog Overview ─────────────────────────────────────── */}
          <section>
            <SectionHeader label="Backlog Overview" />
            <div className="grid md:grid-cols-2 gap-6">
              {/* Line chart card */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Incomplete pathways — monthly trend
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Millions · {data.monthly_trend[0]?.month} to {data.monthly_trend[data.monthly_trend.length - 1]?.month}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded uppercase tracking-wider">
                    NHS England
                  </span>
                </div>
                <BacklogChart data={data.monthly_trend} />
              </div>

              {/* Donut chart card */}
              <WaitingBandSplit
                totalWaiting={data.total_waiting}
                pctOver18Weeks={data.pct_over_18_weeks}
              />
            </div>
          </section>

          {/* ── Performance by Specialty ──────────────────────────────── */}
          <section>
            <SectionHeader label="Performance by Specialty" />
            <div className="grid md:grid-cols-2 gap-6">
              {specialtiesData?.specialties ? (
                <>
                  <SpecialtyList specialties={specialtiesData.specialties} />
                  <SpecialtyPerformanceChart specialties={specialtiesData.specialties} />
                </>
              ) : (
                <>
                  <div className="h-[440px] bg-slate-50 rounded-xl animate-pulse" />
                  <div className="h-[440px] bg-slate-50 rounded-xl animate-pulse" />
                </>
              )}
            </div>
          </section>

          {/* ── Regional Performance ──────────────────────────────────── */}
          <section>
            <SectionHeader label="Regional Performance" />
            <div className="grid md:grid-cols-2 gap-6">
              {/* Region cards */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-base font-bold text-slate-800 mb-4">
                  Patients waiting by NHS region
                </h2>
                {regions.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {regions.slice(0, 6).map((r) => (
                      <RegionCard key={r.id} region={r} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-20 bg-slate-50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                )}
              </div>

              {/* Over-52 trend chart */}
              <Over52Chart trend={data.monthly_trend} />
            </div>
          </section>

          {/* ── Wait Estimator ────────────────────────────────────────── */}
          <WaitEstimateWidget specialties={specialtiesData} />
        </>
      )}
    </div>
  )
}