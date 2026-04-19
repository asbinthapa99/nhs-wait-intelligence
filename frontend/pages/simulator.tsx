import { useEffect, useState } from 'react'

import DataStatusBanner from '../components/DataStatusBanner'
import {
  DataStatus,
  getDataStatus,
  getRegions,
  RegionDetail,
  runSimulation,
  getOptimizedResources,
  runScenarios,
  ResourceAllocation,
  ScenarioComparison
} from '../lib/api'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function SimulatorPage() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'optimizer' | 'scenarios'>('simulator')
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [regions, setRegions] = useState<RegionDetail[]>([])
  
  // Simulator State
  const [simRegion, setSimRegion] = useState('')
  const [teamsAdded, setTeamsAdded] = useState(2)
  const [months, setMonths] = useState(6)
  const [simResult, setSimResult] = useState<any>(null)
  const [simLoading, setSimLoading] = useState(false)
  
  // Optimizer State
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([])
  const [optLoading, setOptLoading] = useState(false)
  
  // Scenarios State
  const [scenarios, setScenarios] = useState<ScenarioComparison[]>([])
  const [scenLoading, setScenLoading] = useState(false)

  useEffect(() => {
    getDataStatus().then(setStatus).catch(() => {})
    getRegions().then((data) => {
      setRegions(data)
      if (data.length > 0) setSimRegion(data[0].name)
    }).catch(() => {})
  }, [])

  const handleSimulate = async () => {
    if (!simRegion) return
    setSimLoading(true)
    try {
      const result = await runSimulation(simRegion, teamsAdded, months)
      setSimResult(result)
    } finally {
      setSimLoading(false)
    }
  }

  const loadOptimizer = async () => {
    setOptLoading(true)
    try {
      const result = await getOptimizedResources()
      setAllocations(result)
    } finally {
      setOptLoading(false)
    }
  }

  const loadScenarios = async () => {
    if (!simRegion) return
    setScenLoading(true)
    try {
      const result = await runScenarios(simRegion)
      setScenarios(result)
    } finally {
      setScenLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'optimizer' && allocations.length === 0) loadOptimizer()
    if (activeTab === 'scenarios' && scenarios.length === 0 && simRegion) loadScenarios()
  }, [activeTab, simRegion])

  // Mock chart data for simulator area chart
  const simChartData = simResult ? Array.from({length: months + 1}).map((_, i) => {
    const fraction = i / months
    const base = simResult.baseline_reduction * fraction
    return {
      month: `Month ${i}`,
      reduction: base,
      range: [simResult.pessimistic_reduction * fraction, simResult.optimistic_reduction * fraction]
    }
  }) : []

  return (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="text-amber-500">⚡</span> Decision Engine
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Simulate interventions, optimize resources, and test policy scenarios.
          </p>
        </div>
      </div>

      <DataStatusBanner status={status} />

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {(['simulator', 'optimizer', 'scenarios'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-semibold capitalize border-b-2 transition-colors ${
              activeTab === tab 
                ? 'border-nhs-blue text-nhs-blue' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.replace('simulator', 'Intervention Simulator').replace('optimizer', 'Resource Allocator').replace('scenarios', 'Policy Scenarios')}
          </button>
        ))}
      </div>

      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-6">
            <h2 className="text-sm font-bold text-slate-800">Intervention parameters</h2>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Target Region</label>
              <select 
                value={simRegion} 
                onChange={e => setSimRegion(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:border-nhs-blue focus:outline-none"
              >
                {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                Add Surgical Teams: {teamsAdded}
              </label>
              <input 
                type="range" min="1" max="10" 
                value={teamsAdded} 
                onChange={e => setTeamsAdded(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                Time Horizon: {months} months
              </label>
              <input 
                type="range" min="3" max="12" step="3"
                value={months} 
                onChange={e => setMonths(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <button 
              onClick={handleSimulate}
              disabled={simLoading}
              className="mt-4 w-full py-3 bg-nhs-navy text-white rounded-full text-sm font-bold hover:bg-nhs-blue transition-colors disabled:opacity-50"
            >
              {simLoading ? 'Running Simulation...' : 'Run Simulation'}
            </button>
          </div>

          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Projected Backlog Reduction</h2>
            {simResult ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Expected Reduction</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">-{simResult.baseline_reduction}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Optimistic (95% CI)</p>
                    <p className="text-xl font-bold text-slate-700 mt-1">-{simResult.optimistic_reduction}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Pessimistic (5% CI)</p>
                    <p className="text-xl font-bold text-slate-700 mt-1">-{simResult.pessimistic_reduction}</p>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={simChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="range" stroke="none" fill="#e2e8f0" />
                      <Area type="monotone" dataKey="reduction" stroke="#1d4ed8" strokeWidth={3} fill="#dbeafe" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <span className="text-2xl mb-2">📊</span>
                <p className="text-sm">Run a simulation to see projected outcomes</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'optimizer' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-slate-800">Optimal Resource Distribution</h2>
            <button onClick={loadOptimizer} className="text-xs font-semibold text-nhs-blue hover:underline">Recalculate</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 font-semibold uppercase tracking-wider text-xs">Region</th>
                  <th className="pb-3 text-right font-semibold uppercase tracking-wider text-xs">Recommended Teams</th>
                  <th className="pb-3 text-right font-semibold uppercase tracking-wider text-xs">Est. 6mo Reduction</th>
                  <th className="pb-3 text-right font-semibold uppercase tracking-wider text-xs">ROI Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocations.map((alloc, idx) => (
                  <tr key={alloc.region} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs">{idx + 1}</span>
                      {alloc.region}
                    </td>
                    <td className="py-4 text-right font-medium text-slate-700">+{alloc.recommended_teams}</td>
                    <td className="py-4 text-right text-nhs-blue font-bold">-{alloc.estimated_reduction}</td>
                    <td className="py-4 text-right text-green-600 font-bold">{alloc.roi_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {allocations.length === 0 && !optLoading && (
              <div className="py-8 text-center text-slate-500">No data available for optimization.</div>
            )}
            {optLoading && <div className="py-8 text-center text-slate-500">Optimizing...</div>}
          </div>
          <p className="text-xs text-slate-400 mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <strong>Model context:</strong> Allocation ranks regions by highest return on investment (ROI score), calculated as expected backlog reduction per team relative to local deprivation burden.
          </p>
        </div>
      )}

      {activeTab === 'scenarios' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800">Policy Scenario Impacts for {simRegion}</h2>
            <select 
              value={simRegion} 
              onChange={e => {
                setSimRegion(e.target.value)
                setScenarios([]) // Force reload
              }}
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:border-nhs-blue focus:outline-none"
            >
              {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
          </div>

          {scenLoading && <div className="py-12 text-center text-slate-500">Evaluating scenarios...</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {!scenLoading && scenarios.map((scen, idx) => (
              <div key={idx} className="flex flex-col border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="bg-slate-50 p-4 border-b border-slate-200">
                  <h3 className="font-bold text-slate-800">{scen.scenario}</h3>
                  <p className="text-xs text-slate-500 mt-1 h-8">{scen.description}</p>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase">Impact</p>
                      <p className="text-xl font-bold text-nhs-blue">-{scen.projected_reduction} waiting</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase">Est. Cost</p>
                      <p className="text-lg font-bold text-slate-700">£{scen.cost_estimate}m</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">Time to Impact</p>
                    <p className="text-sm font-medium text-slate-700">{scen.time_to_impact_months} months</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
