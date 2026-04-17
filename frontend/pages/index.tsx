import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import KPICard from '../components/KPICard'
import BacklogChart from '../components/BacklogChart'
import RegionScoreList from '../components/RegionScoreList'
import AISummaryCard from '../components/AISummaryCard'
import { getOverview, MOCK_OVERVIEW, OverviewData } from '../lib/api'

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData>(MOCK_OVERVIEW)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // TODO: replace mock with live API when backend is ready
    setLoading(true)
    getOverview()
      .then(setData)
      .catch(() => setData(MOCK_OVERVIEW))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Layout>
      {/* Desktop KPI row */}
      <div className="hidden md:grid grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Total waiting"
          value="7.62M"
          subtext="+2.3% this month"
          valueColor="red"
        />
        <KPICard
          label="Over 18 weeks"
          value="38.4%"
          subtext="+1pp vs last month"
          valueColor="red"
        />
        <KPICard
          label="Regional gap"
          value="2.4x"
          subtext="Best vs worst ICB"
        />
        <KPICard
          label="Improving regions"
          value={`${data.improving_regions} / ${data.total_regions}`}
          subtext="Month on month"
        />
      </div>

      {/* Desktop two-column layout */}
      <div className="hidden md:grid grid-cols-3 gap-6">
        {/* Chart — 2/3 width */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            National backlog — monthly trend 2022–2024
          </h2>
          <BacklogChart data={data.monthly_trend} />
        </div>

        {/* Worst regions — 1/3 width */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            Worst performing regions
          </h2>
          <RegionScoreList regions={data.worst_regions} showTrend />
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden flex flex-col gap-4">
        {/* Mobile KPI 2x2 */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard label="Total waiting" value="7.62M" subtext="+2.3% this month" valueColor="red" />
          <KPICard label="Over 18 weeks" value="38.4%" subtext="+1pp vs last month" valueColor="red" />
          <KPICard label="Regional gap" value="2.4x" subtext="Best vs worst ICB" />
          <KPICard label="Improving" value={`${data.improving_regions}/${data.total_regions}`} subtext="Month on month" />
        </div>

        {/* Mobile chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="text-base font-semibold text-slate-800 mb-3">
            National backlog trend
          </h2>
          <BacklogChart data={data.monthly_trend} />
        </div>

        {/* Mobile worst regions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            Worst performing regions
          </h2>
          <RegionScoreList regions={data.worst_regions} />
        </div>

        {/* Mobile AI summary */}
        <AISummaryCard summary={data.ai_summary} loading={loading} />
      </div>

      {/* Desktop AI summary row */}
      <div className="hidden md:grid grid-cols-3 gap-6 mt-6">
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-3">AI summary</h2>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-nhs-blue uppercase tracking-wider mb-2">
              Generated from live data
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{data.ai_summary}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3 justify-center">
          <button
            onClick={() => (window.location.href = '/ai')}
            className="w-full py-3 border-2 border-nhs-blue text-nhs-blue rounded-full text-sm font-semibold hover:bg-blue-50 transition-colors"
          >
            Ask AI a question
          </button>
          <button
            onClick={() => (window.location.href = '/inequality')}
            className="w-full py-3 border border-slate-200 text-slate-600 rounded-full text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            See full inequality report
          </button>
        </div>
      </div>
    </Layout>
  )
}
