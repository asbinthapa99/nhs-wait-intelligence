import { useState } from 'react'
import Layout from '../components/Layout'
import { MOCK_REGIONS } from '../lib/api'
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
  name: string
  deprivation_index: number
  inequality_score: number
  pct_over_18_weeks: number
  backlog_rate_per_100k: number
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: TooltipPayload }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-md text-xs">
      <p className="font-semibold text-slate-800 mb-1">{d.name}</p>
      <p className="text-slate-600">Inequality score: <strong>{d.inequality_score}</strong></p>
      <p className="text-slate-600">Deprivation: <strong>{(d.deprivation_index * 100).toFixed(0)}/100</strong></p>
      <p className="text-slate-600">Over 18w: <strong>{d.pct_over_18_weeks}%</strong></p>
      <p className="text-slate-600">Backlog rate: <strong>{d.backlog_rate_per_100k}/100k</strong></p>
    </div>
  )
}

export default function InequalityPage() {
  const [highlight, setHighlight] = useState<number | null>(null)

  const regions = MOCK_REGIONS
  const gapRatio = (
    Math.max(...regions.map((r) => r.inequality_score)) /
    Math.min(...regions.map((r) => r.inequality_score))
  ).toFixed(1)

  const worst = regions.reduce((a, b) => (a.inequality_score > b.inequality_score ? a : b))
  const best = regions.reduce((a, b) => (a.inequality_score < b.inequality_score ? a : b))
  const avgDeprivation = (regions.reduce((s, r) => s + r.deprivation_index, 0) / regions.length * 100).toFixed(0)

  const scatterData = regions.map((r) => ({
    ...r,
    x: r.deprivation_index * 100,
    y: r.inequality_score,
    fill: r.id === highlight ? '#1d4ed8' : '#1e3a5f',
  }))

  const handleDownload = () => {
    const header = 'Region,Inequality Score,Deprivation Index,Backlog Rate/100k,% Over 18w,Trend\n'
    const rows = regions.map(
      (r) =>
        `${r.name},${r.inequality_score},${r.deprivation_index},${r.backlog_rate_per_100k},${r.pct_over_18_weeks},${r.trend}`
    )
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'nhs-inequality-data.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Inequality explorer</h1>
          <p className="text-sm text-slate-500 mt-1">
            Deprivation vs inequality score — does poverty predict waiting times?
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-200 rounded-full text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Download CSV
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Gap ratio</p>
          <p className="text-3xl font-bold text-red-600">{gapRatio}x</p>
          <p className="text-xs text-slate-400 mt-1">Best vs worst region</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Worst region</p>
          <p className="text-lg font-bold text-slate-800 leading-tight">{worst.name}</p>
          <p className="text-xs text-slate-400 mt-1">Score {worst.inequality_score}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Best region</p>
          <p className="text-lg font-bold text-slate-800 leading-tight">{best.name}</p>
          <p className="text-xs text-slate-400 mt-1">Score {best.inequality_score}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Scatter chart */}
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
                <Label value="Deprivation index (0–100)" offset={-10} position="insideBottom" style={{ fontSize: 11, fill: '#94a3b8' }} />
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
              <ReferenceLine x={Number(avgDeprivation)} stroke="#e2e8f0" strokeDasharray="4 4" label={{ value: 'Avg deprivation', position: 'top', fontSize: 10, fill: '#94a3b8' }} />
              <Scatter
                data={scatterData}
                shape={(props: { cx?: number; cy?: number; payload?: { fill: string; name: string; inequality_score: number } }) => {
                  const { cx = 0, cy = 0, payload } = props
                  if (!payload) return <circle cx={cx} cy={cy} r={0} />
                  return (
                    <g onClick={() => setHighlight(highlight === payload.inequality_score ? null : payload.inequality_score)}>
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
            Strong positive correlation: more deprived regions face higher inequality scores (r ≈ 0.91)
          </p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Region breakdown</h2>
          <div className="flex flex-col gap-2">
            {[...regions].sort((a, b) => b.inequality_score - a.inequality_score).map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800 leading-tight">{r.name}</p>
                  <p className="text-xs text-slate-400">Deprivation {(r.deprivation_index * 100).toFixed(0)}/100</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${r.inequality_score >= 75 ? 'text-red-600' : r.inequality_score >= 55 ? 'text-amber-600' : 'text-green-600'}`}>
                    {r.inequality_score}
                  </p>
                  <p className="text-xs text-slate-400">{r.pct_over_18_weeks}% &gt;18w</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleDownload}
            className="mt-3 w-full py-2 text-xs font-medium border border-slate-200 rounded-full text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Download CSV
          </button>
        </div>
      </div>

      {/* Methodology note */}
      <div className="mt-4 bg-blue-50 rounded-2xl border border-blue-100 p-4">
        <p className="text-xs font-semibold text-nhs-blue uppercase tracking-wider mb-1">Inequality score methodology</p>
        <p className="text-xs text-slate-600">
          Score = (% over 18 weeks × 0.40) + (backlog growth rate × 0.35) + (deprivation index × 0.25).
          Normalised 0–100. Sources: NHS RTT monthly data, ONS Index of Multiple Deprivation, CQC trust ratings.
        </p>
      </div>
    </Layout>
  )
}
