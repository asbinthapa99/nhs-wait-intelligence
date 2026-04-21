import { useState } from 'react'
import { motion } from 'framer-motion'
import { Filter, ChevronDown, ChevronRight, PoundSterling, Activity, Zap, Newspaper } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
}

const MOCK_NEWS = [
  {
    id: 1,
    date: 'LIVE UPDATE • 2 HOURS AGO',
    title: '£1.5 Billion Funding Allocated for Surgical Hubs',
    excerpt: 'The newly allocated budget for regional surgical hubs is projected to drastically reduce wait times for routine elective procedures. This strategic financial engagement focuses on expanding capacity across the hardest hit regions, particularly targeting the 52+ week backlog in Orthopaedics.',
    tags: [{label: 'High Relevance', color: 'bg-red-500/10 text-red-400 border-red-500/20'}, {label: 'Funding', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}, {label: 'Midlands Region', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20'}]
  },
  {
    id: 2,
    date: 'FEBRUARY 2026',
    title: 'Operational Budget Shift: Ophthalmology Prioritization',
    excerpt: 'In response to the growing backlog in eye care, NHS England has approved a £250M budget shift to prioritize high-volume, low-complexity ophthalmology clinics across the South East. This funding will support weekend operational hours and independent sector utilization.',
    tags: [{label: 'Medium Relevance', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20'}, {label: 'Policy Change', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20'}, {label: 'South East', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20'}]
  },
  {
    id: 3,
    date: 'JANUARY 2026',
    title: 'Workforce Investment: 10,000 New Nursing Placements',
    excerpt: 'To support the expanding surgical capacity, the DHSC has announced specialized funding to support 10,000 new nursing training placements, directly targeting regions with the highest clinical vacancy rates and corresponding worst RTT metrics.',
    tags: [{label: 'High Relevance', color: 'bg-red-500/10 text-red-400 border-red-500/20'}, {label: 'Workforce', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}, {label: 'National', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20'}]
  },
  {
    id: 4,
    date: 'DECEMBER 2025',
    title: 'Winter Pressures Fund Distribution Finalized',
    excerpt: 'Emergency £800M winter pressures fund has been fully distributed to Integrated Care Systems (ICS). Analysis shows funding was heavily weighted towards trusts currently experiencing the highest A&E diversion rates, aiming to protect elective surgical beds.',
    tags: [{label: 'Medium Relevance', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20'}, {label: 'Funding', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}, {label: 'National', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20'}]
  },
  {
    id: 5,
    date: 'NOVEMBER 2025',
    title: '£200M Diagnostic Centre Expansion',
    excerpt: 'To clear the hidden backlog of undiagnosed patients, a £200M budget has been released to build 40 new Community Diagnostic Centres (CDCs) in high-footfall areas like shopping centers across the North West and Yorkshire.',
    tags: [{label: 'High Relevance', color: 'bg-red-500/10 text-red-400 border-red-500/20'}, {label: 'Infrastructure', color: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20'}, {label: 'North West', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20'}]
  },
  {
    id: 6,
    date: 'OCTOBER 2025',
    title: 'AI Technology Fund: £50M for Radiology',
    excerpt: 'The Department of Health has launched a £50M ring-fenced fund allowing trusts to procure AI software to assist in reading chest X-rays and MRI scans. Early pilots show a 20% reduction in reporting turnaround times.',
    tags: [{label: 'Medium Relevance', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20'}, {label: 'Technology', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}, {label: 'Funding', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}]
  },
  {
    id: 7,
    date: 'SEPTEMBER 2025',
    title: 'Independent Sector Outsourcing Budgets Increased',
    excerpt: 'NHS England has lifted the regional caps on outsourcing routine orthopaedic and cataract surgeries to the independent sector, backed by a £400M financial guarantee for the final two quarters of the financial year.',
    tags: [{label: 'High Relevance', color: 'bg-red-500/10 text-red-400 border-red-500/20'}, {label: 'Policy Change', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20'}, {label: 'National', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20'}]
  },
  {
    id: 8,
    date: 'AUGUST 2025',
    title: 'Mental Health Services: £150M Capacity Boost',
    excerpt: 'Responding to unprecedented wait times for youth mental health services, a £150M capacity boost has been announced. The funds will directly employ 500 new crisis counselors and expand digital therapy offerings.',
    tags: [{label: 'Medium Relevance', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20'}, {label: 'Funding', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}, {label: 'Clinical', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20'}]
  }
]

export default function NewsAndBudgetsPage() {
  const [activeFilter, setActiveFilter] = useState('All')

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-8">
      
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <PoundSterling size={18} />
            </div>
            Operational News & Budgets
          </h1>
          <p className="text-slate-400 text-sm mt-2">Track real-time funding allocations, policy changes, and financial shifts across the NHS.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* ── Left Content: News Feed ── */}
        <motion.div variants={containerVariants} className="lg:col-span-3 space-y-4">
          {MOCK_NEWS.filter(n => activeFilter === 'All' || n.tags.some(t => t.label.includes(activeFilter))).map(news => (
            <motion.div 
              key={news.id} 
              variants={itemVariants}
              className="bg-[#1e293b]/70 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] hover:bg-[#1e293b]/90 hover:border-blue-500/30 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-3">
                {news.date.includes('LIVE') && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                )}
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{news.date}</span>
              </div>
              
              <h2 className="text-xl font-bold text-slate-100 mb-3 group-hover:text-blue-400 transition-colors flex items-center justify-between">
                {news.title}
                <ChevronRight size={20} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
              </h2>
              
              <p className="text-sm text-slate-400 leading-relaxed mb-5 line-clamp-2">
                {news.excerpt}
              </p>
              
              <div className="flex flex-wrap items-center gap-2">
                {news.tags.map((tag, i) => (
                  <span key={i} className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${tag.color}`}>
                    {tag.label}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Right Content: Filters & Summary ── */}
        <motion.div variants={itemVariants} className="space-y-6">
          
          <div className="bg-[#1e293b]/70 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]">
            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Filter size={16} className="text-[#3b82f6]" /> Relevance Tags
            </h3>
            <div className="flex flex-col gap-2">
              {['All', 'Funding', 'Policy Change', 'Workforce', 'Midlands', 'High Relevance'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
                    activeFilter === filter 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                    : 'text-slate-400 hover:bg-[#0f172a] hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {filter}
                  {activeFilter === filter && <ChevronRight size={14} />}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/20 to-[#0f172a] border border-emerald-500/20 rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-emerald-500/20 transition-all"></div>
            <h3 className="text-sm font-bold text-white mb-1 relative z-10">Total Identified Funding</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3 relative z-10">FISCAL YEAR 2025/2026</p>
            <p className="text-3xl font-black text-emerald-400 tracking-tight relative z-10">£2.55B</p>
            <p className="text-xs text-slate-400 mt-2 relative z-10">Allocated directly towards elective backlog recovery initiatives.</p>
          </div>

        </motion.div>

      </div>
    </motion.div>
  )
}
