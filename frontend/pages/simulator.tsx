import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Settings2, GitBranch, RefreshCw, Play } from 'lucide-react'

import DataStatusBanner from '../components/DataStatusBanner'
import {
  DataStatus, getDataStatus, getRegions, RegionDetail,
  runSimulation, getOptimizedResources, runScenarios,
  ResourceAllocation, ScenarioComparison,
} from '../lib/api'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const tooltipStyle = {
  background: '#1e293b', border: '1px solid #334155',
  borderRadius: 10, fontSize: 12, color: '#e2e8f0',
}

const TABS = [
  { id: 'simulator', label: 'Intervention Simulator', icon: Play },
  { id: 'optimizer', label: 'Resource Allocator', icon: Settings2 },
  { id: 'scenarios', label: 'Policy Scenarios', icon: GitBranch },
] as const

type Tab = typeof TABS[number]['id']

export default function SimulatorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('simulator')
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [regions, setRegions] = useState<RegionDetail[]>([])

  const [simRegion, setSimRegion] = useState('')
  const [teamsAdded, setTeamsAdded] = useState(2)
  const [months, setMonths] = useState(6)
  const [simResult, setSimResult] = useState<any>(null)
  const [simLoading, setSimLoading] = useState(false)

  const [allocations, setAllocations] = useState<ResourceAllocation[]>([])
  const [optLoading, setOptLoading] = useState(false)

  const [scenarios, setScenarios] = useState<ScenarioComparison[]>([])
  const [scenLoading, setScenLoading] = useState(false)

  useEffect(() => {
    getDataStatus().then(setStatus).catch(() => {})
    getRegions().then(data => {
      setRegions(data)
      if (data.length > 0) setSimRegion(data[0].name)
    }).catch(() => {})
  }, [])

  const handleSimulate = async () => {
    if (!simRegion) return
    setSimLoading(true)
    try { setSimResult(await runSimulation(simRegion, teamsAdded, months)) }
    finally { setSimLoading(false) }
  }

  const loadOptimizer = async () => {
    setOptLoading(true)
    try { setAllocations(await getOptimizedResources()) }
    finally { setOptLoading(false) }
  }

  const loadScenarios = async () => {
    if (!simRegion) return
    setScenLoading(true)
    try { setScenarios(await runScenarios(simRegion)) }
    finally { setScenLoading(false) }
  }

  useEffect(() => {
    if (activeTab === 'optimizer' && allocations.length === 0) loadOptimizer()
    if (activeTab === 'scenarios' && scenarios.length === 0 && simRegion) loadScenarios()
  }, [activeTab, simRegion])

  const simChartData = simResult
    ? Array.from({ length: months + 1 }).map((_, i) => {
        const f = i / months
        return {
          month: `Month ${i}`,
          reduction: simResult.baseline_reduction * f,
          optimistic: simResult.optimistic_reduction * f,
          pessimistic: simResult.pessimistic_reduction * f,
        }
      })
    : []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Decision Engine</h1>
          <p className="text-sm text-slate-400 mt-0.5">Simulate interventions, optimize resources, and test policy scenarios.</p>
        </div>
      </div>

      <DataStatusBanner status={status} />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl border border-slate-700/50">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}>
              <Icon className="w-3.5 h-3.5 hidden sm:block" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          )
        })}
      </div>

      {/* Simulator */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="card p-5 space-y-5">
            <h2 className="text-sm font-semibold text-slate-200">Intervention parameters</h2>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Target region</label>
              <select value={simRegion} onChange={e => setSimRegion(e.target.value)}
                className="select select-bordered select-sm w-full bg-slate-800 border-slate-700 text-slate-200 text-sm">
                {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
                Surgical teams to add: <span className="text-blue-400 font-bold">{teamsAdded}</span>
              </label>
              <input type="range" min="1" max="10" value={teamsAdded}
                onChange={e => setTeamsAdded(Number(e.target.value))}
                className="range range-primary range-sm w-full" />
              <div className="flex justify-between text-[10px] text-slate-600 mt-1"><span>1</span><span>10</span></div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
                Time horizon: <span className="text-blue-400 font-bold">{months} months</span>
              </label>
              <input type="range" min="3" max="12" step="3" value={months}
                onChange={e => setMonths(Number(e.target.value))}
                className="range range-primary range-sm w-full" />
              <div className="flex justify-between text-[10px] text-slate-600 mt-1"><span>3m</span><span>12m</span></div>
            </div>

            <button onClick={handleSimulate} disabled={simLoading || !simRegion}
              className="btn btn-primary w-full gap-2">
              {simLoading
                ? <><span className="loading loading-spinner loading-xs" /> Running…</>
                : <><Play className="w-4 h-4" /> Run Simulation</>}
            </button>
          </div>

          <div className="md:col-span-2 card p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-4">Projected backlog reduction</h2>
            {simResult ? (
              <>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Expected', value: `-${simResult.baseline_reduction}`, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                    { label: 'Optimistic', value: `-${simResult.optimistic_reduction}`, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                    { label: 'Pessimistic', value: `-${simResult.pessimistic_reduction}`, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                  ].map(item => (
                    <div key={item.label} className={`rounded-xl p-3 border ${item.bg}`}>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{item.label}</p>
                      <p className={`text-xl font-bold ${item.color} mt-1`}>{item.value}</p>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={simChartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="optimistic" stroke="none" fill="#1e293b" />
                    <Area type="monotone" dataKey="reduction" stroke="#3b82f6" strokeWidth={2.5} fill="url(#simGrad)" name="Expected" />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 rounded-xl border border-dashed border-slate-700 bg-slate-800/30">
                <Play className="w-8 h-8 mb-3 text-slate-600" />
                <p className="text-sm">Run a simulation to see projected outcomes</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Optimizer */}
      {activeTab === 'optimizer' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-200">Optimal resource distribution</h2>
            <button onClick={loadOptimizer} disabled={optLoading}
              className="btn btn-xs btn-ghost text-blue-400 gap-1">
              <RefreshCw className={`w-3 h-3 ${optLoading ? 'animate-spin' : ''}`} /> Recalculate
            </button>
          </div>

          {optLoading ? (
            <div className="py-12 flex justify-center"><span className="loading loading-spinner text-blue-400" /></div>
          ) : allocations.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">No optimization data available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/50 text-[10px] text-slate-500 uppercase tracking-widest">
                    <th className="text-left px-4 py-3 font-medium">#</th>
                    <th className="text-left px-4 py-3 font-medium">Region</th>
                    <th className="text-right px-4 py-3 font-medium">Teams</th>
                    <th className="text-right px-4 py-3 font-medium">Est. reduction</th>
                    <th className="text-right px-4 py-3 font-medium">ROI score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {allocations.map((a, idx) => (
                    <motion.tr key={a.region} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 text-slate-600 text-sm">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-200">{a.region}</td>
                      <td className="px-4 py-3 text-right text-blue-400 font-bold">+{a.recommended_teams}</td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-bold">-{a.estimated_reduction}</td>
                      <td className="px-4 py-3 text-right text-amber-400 font-bold">{a.roi_score}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 text-xs text-slate-500">
            <strong className="text-slate-400">Model:</strong> Ranks regions by ROI score — expected backlog reduction per team relative to local deprivation burden.
          </div>
        </div>
      )}

      {/* Scenarios */}
      {activeTab === 'scenarios' && (
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="text-sm font-semibold text-slate-200">Policy scenario impacts — {simRegion}</h2>
            <select value={simRegion} onChange={e => { setSimRegion(e.target.value); setScenarios([]) }}
              className="select select-bordered select-sm bg-slate-800 border-slate-700 text-slate-200 text-sm">
              {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
          </div>

          {scenLoading ? (
            <div className="py-12 flex justify-center"><span className="loading loading-spinner text-blue-400" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {scenarios.map((s, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.07 }}
                  className="rounded-2xl border border-slate-700 overflow-hidden hover:border-blue-500/40 transition-colors">
                  <div className="bg-slate-800/60 p-4 border-b border-slate-700">
                    <h3 className="font-semibold text-white text-sm">{s.scenario}</h3>
                    <p className="text-xs text-slate-400 mt-1">{s.description}</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Projected impact</p>
                      <p className="text-xl font-bold text-blue-400 mt-0.5">-{s.projected_reduction} waiting</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Estimated cost</p>
                      <p className="text-lg font-bold text-white">£{s.cost_estimate}m</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Time to impact</p>
                      <p className="text-sm font-medium text-slate-300">{s.time_to_impact_months} months</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              {scenarios.length === 0 && (
                <div className="col-span-3 py-12 text-center text-slate-500 text-sm">No scenario data available.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
