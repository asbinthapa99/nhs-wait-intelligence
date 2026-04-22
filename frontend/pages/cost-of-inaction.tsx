import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PoundSterling, Siren, Briefcase, Calculator, TrendingUp, AlertTriangle, Info, Calendar } from 'lucide-react'

import DataStatusBanner from '../components/DataStatusBanner'
import { DataStatus, getDataStatus } from '../lib/api'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

const tooltipStyle = {
  backgroundColor: '#fff', border: '1px solid #e5e5e5',
  borderRadius: 8, fontSize: 12, color: '#111',
  boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
}

export default function CostOfInactionPage() {
  const [status, setStatus] = useState<DataStatus | null>(null)
  
  // Calculator State
  const [backlogSize, setBacklogSize] = useState(7600000)
  const [avgWaitMonths, setAvgWaitMonths] = useState(14)
  const [emergencyConversionRate, setEmergencyConversionRate] = useState(3.5) // % that end up in A&E
  
  useEffect(() => {
    getDataStatus().then(setStatus).catch(() => {})
  }, [])

  // Derived Metrics
  // Elective knee replacement costs ~£7,000. Emergency admission for same issue costs ~£14,000.
  const emergencyAdmissions = Math.floor((backlogSize * (emergencyConversionRate / 100)) * (avgWaitMonths / 12))
  const excessEmergencyCost = emergencyAdmissions * 8500 // Excess cost of emergency over elective
  
  // Lost economic output (Assume 40% are working age, losing £1500/month in productivity)
  const workingAgePatients = backlogSize * 0.4
  const economicLoss = workingAgePatients * 1500 * avgWaitMonths

  const totalCostOfInaction = excessEmergencyCost + economicLoss

  const chartData = Array.from({ length: 6 }).map((_, i) => {
    const year = new Date().getFullYear() + i
    // Compounding effect
    const factor = 1 + (i * 0.15)
    return {
      year: year.toString(),
      emergencyCost: (excessEmergencyCost * factor) / 1000000000, // in Billions
      economicLoss: (economicLoss * factor) / 1000000000
    }
  })

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
            <Calculator className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">Cost of Inaction Model</h1>
            <p className="text-xs text-[#999] mt-0.5">Quantifying the financial penalty of delayed elective care.</p>
          </div>
        </div>
      </motion.div>

      <DataStatusBanner status={status} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Controls */}
        <motion.div variants={fade} className="lg:col-span-4 bg-white border border-[#e5e5e5] rounded-2xl p-6 shadow-sm flex flex-col gap-6 h-fit">
          <div>
            <h2 className="text-sm font-bold text-[#111] mb-1">Model Parameters</h2>
            <p className="text-[10px] text-[#bbb] uppercase tracking-widest">Adjust assumptions</p>
          </div>

          <div>
            <label className="flex items-center justify-between text-xs font-bold text-[#666] mb-2">
              <span>National Backlog Size</span>
              <span className="text-rose-600 font-black">{(backlogSize / 1000000).toFixed(1)}M</span>
            </label>
            <input type="range" min="3000000" max="12000000" step="100000" value={backlogSize}
              onChange={e => setBacklogSize(Number(e.target.value))}
              className="w-full accent-rose-600 h-1.5 bg-[#f0f0f0] rounded-lg appearance-none cursor-pointer" />
          </div>

          <div>
            <label className="flex items-center justify-between text-xs font-bold text-[#666] mb-2">
              <span>Average Wait Time</span>
              <span className="text-rose-600 font-black">{avgWaitMonths} months</span>
            </label>
            <input type="range" min="3" max="24" step="1" value={avgWaitMonths}
              onChange={e => setAvgWaitMonths(Number(e.target.value))}
              className="w-full accent-rose-600 h-1.5 bg-[#f0f0f0] rounded-lg appearance-none cursor-pointer" />
          </div>

          <div>
            <label className="flex items-center justify-between text-xs font-bold text-[#666] mb-2">
              <span>Emergency Conversion Rate</span>
              <span className="text-rose-600 font-black">{emergencyConversionRate}%</span>
            </label>
            <input type="range" min="0.5" max="10" step="0.5" value={emergencyConversionRate}
              onChange={e => setEmergencyConversionRate(Number(e.target.value))}
              className="w-full accent-rose-600 h-1.5 bg-[#f0f0f0] rounded-lg appearance-none cursor-pointer" />
            <p className="text-[10px] text-[#888] mt-2 leading-relaxed">Percentage of patients whose condition deteriorates into an emergency A&E admission while waiting.</p>
          </div>

          <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl">
             <div className="flex gap-2">
                <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                   <p className="text-xs font-bold text-rose-900 mb-1">Key Insight</p>
                   <p className="text-[11px] text-rose-700 leading-relaxed">
                     Treating patients is viewed as a cost. However, delaying treatment shifts the cost onto emergency services and welfare, ultimately costing the public purse significantly more.
                   </p>
                </div>
             </div>
          </div>
        </motion.div>

        {/* Right Column: Output Metrics & Chart */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Top Metrics Box */}
          <motion.div variants={fade} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* NHS Burden */}
            <div className="bg-[#111] text-white p-6 rounded-2xl relative overflow-hidden group shadow-lg">
               <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none transition-all group-hover:bg-rose-500/30" />
               <div className="flex items-center gap-2 mb-4 relative z-10">
                 <Siren size={18} className="text-rose-400" />
                 <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Excess NHS Burden</h3>
               </div>
               <div className="relative z-10">
                 <p className="text-4xl font-black tabular-nums">£{(excessEmergencyCost / 1000000000).toFixed(2)}B</p>
                 <p className="text-xs text-gray-400 mt-2 font-medium">Extra spent on emergency care vs elective intervention</p>
                 <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center text-[10px] text-gray-400">
                    <span>{emergencyAdmissions.toLocaleString()} projected emergency admissions</span>
                 </div>
               </div>
            </div>

            {/* Economic Loss */}
            <div className="bg-white border border-[#e5e5e5] p-6 rounded-2xl relative overflow-hidden shadow-sm">
               <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
               <div className="flex items-center gap-2 mb-4 relative z-10">
                 <Briefcase size={18} className="text-emerald-600" />
                 <h3 className="text-xs font-bold text-[#888] uppercase tracking-wider">Lost GDP & Productivity</h3>
               </div>
               <div className="relative z-10">
                 <p className="text-4xl font-black text-[#111] tabular-nums">£{(economicLoss / 1000000000).toFixed(2)}B</p>
                 <p className="text-xs text-[#888] mt-2 font-medium">Lost economic output from working-age patients</p>
                 <div className="mt-4 pt-4 border-t border-[#f0f0f0] flex justify-between items-center text-[10px] text-[#aaa] font-bold uppercase">
                    <span>{(workingAgePatients / 1000000).toFixed(1)}M workers affected</span>
                 </div>
               </div>
            </div>

          </motion.div>

          {/* Chart Area */}
          <motion.div variants={fade} className="bg-white border border-[#e5e5e5] p-6 rounded-2xl shadow-sm flex-1 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-sm font-bold text-[#111]">5-Year Cumulative Impact Forecast</h2>
                <p className="text-[10px] text-[#bbb] uppercase tracking-widest mt-0.5">Projected cost trajectory if backlog is maintained</p>
              </div>
              <div className="bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 flex items-center gap-2">
                <TrendingUp size={14} className="text-rose-600" />
                <span className="text-xs font-black text-rose-700">Total Penalty: £{(totalCostOfInaction / 1000000000).toFixed(1)}B / yr</span>
              </div>
            </div>

            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEmergency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEconomic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#bbb' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#bbb' }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v}B`} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ fontWeight: 'bold' }} formatter={(v: number) => [`£${v.toFixed(2)} Billion`, '']} />
                  <Area type="monotone" dataKey="economicLoss" name="Economic Loss" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEconomic)" />
                  <Area type="monotone" dataKey="emergencyCost" name="NHS Emergency Cost" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorEmergency)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 pt-4 border-t border-[#f0f0f0]">
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-rose-500" />
                  <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider">NHS Emergency Cost</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-500" />
                  <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Lost GDP (Economic)</span>
               </div>
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  )
}
