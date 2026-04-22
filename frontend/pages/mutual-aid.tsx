import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Network, ArrowRightLeft, ShieldCheck, Activity, MapPin, Zap, ExternalLink, Filter, TrendingDown, Clock } from 'lucide-react'

import DataStatusBanner from '../components/DataStatusBanner'
import { DataStatus, getDataStatus, getMutualAid, MutualAidPairing } from '../lib/api'

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

export default function MutualAidPage() {
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [activeSpecialty, setActiveSpecialty] = useState('All')
  const [pairings, setPairings] = useState<MutualAidPairing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDataStatus().then(setStatus).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    getMutualAid(activeSpecialty).then(data => {
      setPairings(data.pairings)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [activeSpecialty])

  const totalPatients = pairings.reduce((sum, p) => sum + p.patientsToMove, 0)
  const totalWeeksSaved = pairings.reduce((sum, p) => sum + (p.patientsToMove * p.weeksSavedPerPatient), 0)
  const totalCostSaved = pairings.reduce((sum, p) => sum + p.costSavedEst, 0)

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Network className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">Mutual Aid Routing Engine</h1>
            <p className="text-xs text-[#999] mt-0.5">AI-driven patient transfer opportunities between Trusts.</p>
          </div>
        </div>
      </motion.div>

      <DataStatusBanner status={status} />

      {/* Top Metrics Area */}
      <motion.div variants={fade} className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-[#e5e5e5] p-5 rounded-2xl shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
           <p className="text-[10px] font-bold text-[#bbb] uppercase tracking-widest mb-1 relative z-10">Optimal Transfers Found</p>
           <p className="text-3xl font-black text-[#111] tabular-nums relative z-10">{totalPatients}</p>
           <p className="text-xs text-[#888] mt-2 relative z-10">Patients safely re-routable</p>
        </div>
        <div className="bg-white border border-[#e5e5e5] p-5 rounded-2xl shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
           <p className="text-[10px] font-bold text-[#bbb] uppercase tracking-widest mb-1 relative z-10">Total Wait Time Reduced</p>
           <p className="text-3xl font-black text-emerald-600 tabular-nums relative z-10">{totalWeeksSaved.toLocaleString()}</p>
           <p className="text-xs text-[#888] mt-2 relative z-10">Patient-weeks saved across system</p>
        </div>
        <div className="bg-white border border-[#e5e5e5] p-5 rounded-2xl shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-violet-500/10 transition-colors" />
           <p className="text-[10px] font-bold text-[#bbb] uppercase tracking-widest mb-1 relative z-10">Emergency Cost Avoided</p>
           <p className="text-3xl font-black text-violet-600 tabular-nums relative z-10">£{(totalCostSaved / 1000).toFixed(0)}k</p>
           <p className="text-xs text-[#888] mt-2 relative z-10">Estimated ROI from interventions</p>
        </div>
      </motion.div>

      {/* Main Board */}
      <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#f0f0f0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#fafafa]">
          <div>
            <h2 className="text-sm font-bold text-[#111]">Recommended Action Pairings</h2>
            <p className="text-xs text-[#bbb] mt-0.5">High-confidence matches balancing wait reduction and travel distance</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
             <span className="text-[10px] text-[#bbb] font-bold uppercase tracking-widest mr-1 flex items-center gap-1"><Filter size={12}/> Specialty</span>
             {['All', 'Orthopaedics', 'Ophthalmology', 'Cardiology', 'General Surgery'].map(f => (
               <button key={f} onClick={() => setActiveSpecialty(f)}
                 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                   activeSpecialty === f
                     ? 'bg-[#111] text-white shadow-sm'
                     : 'bg-white border border-[#e5e5e5] text-[#666] hover:bg-[#f0f0f0] hover:text-[#111]'
                 }`}>
                 {f}
               </button>
             ))}
          </div>
        </div>

        <div className="divide-y divide-[#f5f5f5]">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-3" />
                <p className="text-sm font-bold text-[#111]">Routing Engine Calculating...</p>
              </div>
            ) : pairings.map((pair) => (
              <motion.div 
                key={pair.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-5 md:p-6 hover:bg-[#fcfcfc] transition-colors relative group"
              >
                {/* Impact Badge */}
                <div className="absolute top-6 right-6 flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-[10px] font-black tracking-wide uppercase ${pair.impact === 'High' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    {pair.impact} Priority
                  </span>
                </div>

                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                    <Activity size={12} /> {pair.specialty}
                  </span>
                </div>

                <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-12">
                  
                  {/* Source */}
                  <div className="flex-1 w-full p-4 rounded-xl border border-red-100 bg-red-50/30">
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1 flex items-center gap-1"><MapPin size={10}/> Source (Over-capacity)</p>
                    <p className="text-sm font-bold text-[#111]">{pair.source.name}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <div>
                        <p className="text-[10px] text-[#888]">Avg Wait</p>
                        <p className="text-xs font-black text-red-600">{pair.source.wait} weeks</p>
                      </div>
                      <div className="w-px h-6 bg-red-200" />
                      <div>
                        <p className="text-[10px] text-[#888]">Status</p>
                        <p className="text-xs font-black text-red-600">{pair.source.load}</p>
                      </div>
                    </div>
                  </div>

                  {/* Transfer graphic */}
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <div className="text-[10px] font-bold text-[#888] mb-1 bg-white px-2 rounded-full border border-[#e5e5e5] shadow-sm">{pair.distanceMiles} miles</div>
                    <div className="flex items-center gap-2 text-blue-500">
                       <div className="w-8 h-px bg-gradient-to-r from-transparent to-blue-500" />
                       <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                         <ArrowRightLeft size={18} className="text-blue-600" />
                       </div>
                       <div className="w-8 h-px bg-gradient-to-l from-transparent to-blue-500" />
                    </div>
                    <div className="text-[10px] font-bold text-blue-600 mt-1">Move {pair.patientsToMove} patients</div>
                  </div>

                  {/* Destination */}
                  <div className="flex-1 w-full p-4 rounded-xl border border-emerald-100 bg-emerald-50/30">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1"><ShieldCheck size={10}/> Destination (Spare Capacity)</p>
                    <p className="text-sm font-bold text-[#111]">{pair.dest.name}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <div>
                        <p className="text-[10px] text-[#888]">Avg Wait</p>
                        <p className="text-xs font-black text-emerald-600">{pair.dest.wait} weeks</p>
                      </div>
                      <div className="w-px h-6 bg-emerald-200" />
                      <div>
                        <p className="text-[10px] text-[#888]">Status</p>
                        <p className="text-xs font-black text-emerald-600">{pair.dest.load}</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Footer Metrics */}
                <div className="mt-6 pt-4 border-t border-[#f0f0f0] flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-[#888]" />
                    <div>
                      <p className="text-[10px] text-[#888] font-bold uppercase tracking-wider">Time Saved</p>
                      <p className="text-xs font-black text-emerald-600">{pair.weeksSavedPerPatient} weeks / patient</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingDown size={16} className="text-[#888]" />
                    <div>
                      <p className="text-[10px] text-[#888] font-bold uppercase tracking-wider">Est ROI</p>
                      <p className="text-xs font-black text-violet-600">£{(pair.costSavedEst / 1000).toFixed(0)}k emergency cost avoided</p>
                    </div>
                  </div>
                  
                  <div className="ml-auto flex items-center gap-3">
                    <button className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
                      View Pathway <ExternalLink size={12} />
                    </button>
                    <button className="px-4 py-2 bg-[#111] hover:bg-[#333] text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
                      Execute Transfer
                    </button>
                  </div>
                </div>

              </motion.div>
            ))}
          </AnimatePresence>
          {!loading && pairings.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center justify-center">
               <Network size={32} className="text-[#ddd] mb-3" />
               <p className="text-sm font-bold text-[#111]">No pairings found</p>
               <p className="text-xs text-[#888] mt-1">Try selecting a different clinical specialty.</p>
            </div>
          )}
        </div>
      </motion.div>

    </motion.div>
  )
}
