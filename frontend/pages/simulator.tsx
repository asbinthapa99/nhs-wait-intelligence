import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Settings2, GitBranch, RefreshCw, Play, ArrowRight } from 'lucide-react'

import DataStatusBanner from '../components/DataStatusBanner'
import {
  DataStatus, getDataStatus, getRegions, RegionDetail,
  runSimulation, getOptimizedResources, runScenarios,
  ResourceAllocation, ScenarioComparison,
} from '../lib/api'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

const tooltipStyle = {
  backgroundColor: '#fff', border: '1px solid #e5e5e5',
  borderRadius: 8, fontSize: 12, color: '#111',
  boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
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
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">Decision Engine</h1>
            <p className="text-xs text-[#999] mt-0.5">Simulate interventions, optimize resources, and test policy scenarios.</p>
          </div>
        </div>
      </motion.div>

      <DataStatusBanner status={status} />

      {/* Tabs */}
      <motion.div variants={fade} className="flex gap-1.5 p-1.5 bg-[#f5f5f5] rounded-xl border border-[#e5e5e5] w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all relative ${
                isActive ? 'text-[#111] shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white' : 'text-[#888] hover:text-[#111] hover:bg-[#ebebeb]'
              }`}>
              <Icon size={14} className={isActive ? 'text-violet-600' : 'text-[#aaa]'} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          )
        })}
      </motion.div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {/* Simulator */}
        {activeTab === 'simulator' && (
          <motion.div key="simulator" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-[#e5e5e5] rounded-2xl p-6 shadow-sm flex flex-col gap-6">
              <div>
                <h2 className="text-sm font-bold text-[#111] mb-1">Intervention Parameters</h2>
                <p className="text-[10px] text-[#bbb] uppercase tracking-widest">Configure scenario variables</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#666] mb-2">Target Region</label>
                <div className="relative">
                  <select value={simRegion} onChange={e => setSimRegion(e.target.value)}
                    className="w-full bg-[#fcfcfc] border border-[#e5e5e5] text-[#111] text-sm font-semibold px-3 py-2.5 rounded-xl appearance-none focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                    {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[#aaa]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-bold text-[#666] mb-2">
                  <span>Additional Surgical Teams</span>
                  <span className="text-violet-600 text-sm bg-violet-50 px-2 py-0.5 rounded-md">{teamsAdded}</span>
                </label>
                <input type="range" min="1" max="10" value={teamsAdded}
                  onChange={e => setTeamsAdded(Number(e.target.value))}
                  className="w-full accent-violet-600 h-1.5 bg-[#f0f0f0] rounded-lg appearance-none cursor-pointer" />
                <div className="flex justify-between text-[10px] text-[#bbb] font-bold mt-2"><span>1</span><span>10</span></div>
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-bold text-[#666] mb-2">
                  <span>Time Horizon (Months)</span>
                  <span className="text-violet-600 text-sm bg-violet-50 px-2 py-0.5 rounded-md">{months}m</span>
                </label>
                <input type="range" min="3" max="12" step="3" value={months}
                  onChange={e => setMonths(Number(e.target.value))}
                  className="w-full accent-violet-600 h-1.5 bg-[#f0f0f0] rounded-lg appearance-none cursor-pointer" />
                <div className="flex justify-between text-[10px] text-[#bbb] font-bold mt-2"><span>3</span><span>12</span></div>
              </div>

              <button onClick={handleSimulate} disabled={simLoading || !simRegion}
                className="mt-auto flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#111] text-white text-sm font-bold hover:bg-[#333] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {simLoading
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</>
                  : <><Play className="w-4 h-4" /> Run Simulation</>}
              </button>
            </div>

            <div className="md:col-span-2 bg-white border border-[#e5e5e5] rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-sm font-bold text-[#111]">Projected Backlog Reduction</h2>
                  <p className="text-[10px] text-[#bbb] uppercase tracking-widest mt-0.5">Estimated waiting list clearance over {months} months</p>
                </div>
              </div>
              
              {simResult ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Expected', value: `-${simResult.baseline_reduction}`, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100' },
                      { label: 'Optimistic', value: `-${simResult.optimistic_reduction}`, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
                      { label: 'Pessimistic', value: `-${simResult.pessimistic_reduction}`, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
                    ].map((item, idx) => (
                      <motion.div key={item.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.1 }}
                        className={`rounded-xl p-4 border ${item.bg}`}>
                        <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest">{item.label}</p>
                        <p className={`text-2xl font-black ${item.color} mt-1 tabular-nums`}>{item.value}</p>
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="h-[240px] pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={simChartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#bbb' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#bbb' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} itemStyle={{ fontWeight: 'bold' }} labelStyle={{ color: '#888', marginBottom: 4 }} />
                        <Area type="monotone" dataKey="optimistic" stroke="none" fill="#f8fafc" />
                        <Area type="monotone" dataKey="reduction" stroke="#7c3aed" strokeWidth={2.5} fill="url(#simGrad)" name="Expected Reduction" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-[#888] rounded-xl border border-dashed border-[#e5e5e5] bg-[#fafafa]">
                  <Play className="w-10 h-10 mb-3 text-[#ccc]" />
                  <p className="text-sm font-semibold text-[#111]">Awaiting Simulation</p>
                  <p className="text-xs text-[#888] mt-1">Configure parameters and hit run</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Optimizer */}
        {activeTab === 'optimizer' && (
          <motion.div key="optimizer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white border border-[#e5e5e5] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-bold text-[#111]">Optimal Resource Distribution</h2>
                <p className="text-[10px] text-[#bbb] uppercase tracking-widest mt-0.5">Algorithmic allocation based on ROI</p>
              </div>
              <button onClick={loadOptimizer} disabled={optLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors">
                <RefreshCw size={14} className={optLoading ? 'animate-spin' : ''} /> Recalculate
              </button>
            </div>

            {optLoading ? (
              <div className="py-20 flex justify-center"><RefreshCw className="w-6 h-6 text-violet-600 animate-spin" /></div>
            ) : allocations.length === 0 ? (
              <div className="py-20 text-center text-[#888] text-sm">No optimization data available.</div>
            ) : (
              <div className="overflow-x-auto border border-[#f0f0f0] rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-[#fafafa] text-[10px] text-[#bbb] uppercase tracking-widest border-b border-[#f0f0f0]">
                      <th className="px-5 py-3 font-bold w-12">#</th>
                      <th className="px-5 py-3 font-bold">Region</th>
                      <th className="text-right px-5 py-3 font-bold">Recommended Teams</th>
                      <th className="text-right px-5 py-3 font-bold">Est. Reduction</th>
                      <th className="text-right px-5 py-3 font-bold">ROI Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f5f5f5]">
                    {allocations.map((a, idx) => (
                      <motion.tr key={a.region} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                        className="hover:bg-[#fafafa] transition-colors">
                        <td className="px-5 py-4 text-xs font-bold text-[#ccc]">{idx + 1}</td>
                        <td className="px-5 py-4 font-bold text-[#111]">{a.region}</td>
                        <td className="px-5 py-4 text-right">
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-black">+{a.recommended_teams}</span>
                        </td>
                        <td className="px-5 py-4 text-right font-black text-emerald-600 tabular-nums">-{a.estimated_reduction}</td>
                        <td className="px-5 py-4 text-right font-black text-violet-600 tabular-nums">{a.roi_score}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-5 p-4 bg-[#f9fafb] rounded-xl border border-[#f0f0f0] flex gap-3">
              <Settings2 className="w-5 h-5 text-[#aaa] shrink-0" />
              <p className="text-xs text-[#666] leading-relaxed">
                <strong className="text-[#111]">Optimization Model:</strong> This allocation algorithm ranks regions by <strong className="text-violet-600">ROI score</strong> — a metric calculating the expected backlog reduction per additional team relative to the local deprivation index and current wait volume.
              </p>
            </div>
          </motion.div>
        )}

        {/* Scenarios */}
        {activeTab === 'scenarios' && (
          <motion.div key="scenarios" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white border border-[#e5e5e5] rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-sm font-bold text-[#111]">Policy Scenario Impacts</h2>
                <p className="text-[10px] text-[#bbb] uppercase tracking-widest mt-0.5">Projected outcomes for {simRegion}</p>
              </div>
              <div className="relative w-full sm:w-64">
                <select value={simRegion} onChange={e => { setSimRegion(e.target.value); setScenarios([]) }}
                  className="w-full bg-[#fcfcfc] border border-[#e5e5e5] text-[#111] text-sm font-semibold px-3 py-2 rounded-xl appearance-none focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                  {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[#aaa]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>
            </div>

            {scenLoading ? (
              <div className="py-20 flex justify-center"><RefreshCw className="w-6 h-6 text-violet-600 animate-spin" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {scenarios.map((s, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.07 }}
                    className="rounded-2xl border border-[#e5e5e5] overflow-hidden hover:border-violet-300 hover:shadow-md transition-all group cursor-default flex flex-col">
                    <div className="bg-[#fafafa] p-5 border-b border-[#e5e5e5]">
                      <h3 className="font-bold text-[#111] text-sm">{s.scenario}</h3>
                      <p className="text-xs text-[#888] mt-1.5 leading-relaxed">{s.description}</p>
                    </div>
                    <div className="p-5 flex-1 flex flex-col gap-4 bg-white">
                      <div>
                        <p className="text-[10px] text-[#bbb] font-bold uppercase tracking-widest mb-1">Projected Impact</p>
                        <p className="text-xl font-black text-emerald-600 tabular-nums">-{s.projected_reduction}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-auto">
                        <div>
                          <p className="text-[10px] text-[#bbb] font-bold uppercase tracking-widest mb-1">Est. Cost</p>
                          <p className="text-sm font-black text-[#111]">£{s.cost_estimate}m</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#bbb] font-bold uppercase tracking-widest mb-1">Time to Impact</p>
                          <p className="text-sm font-black text-[#111]">{s.time_to_impact_months} months</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {scenarios.length === 0 && (
                  <div className="col-span-3 py-20 text-center text-[#888] text-sm">No scenario data available.</div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
