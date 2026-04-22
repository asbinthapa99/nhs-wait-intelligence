import { useState } from 'react'
import { motion } from 'framer-motion'
import { Newspaper, PoundSterling, Radio, ExternalLink, ArrowUpRight } from 'lucide-react'

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.22 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }

const MOCK_NEWS = [
  { id: 1, live: true,  date: '2 hours ago', title: '£1.5 Billion Allocated for Surgical Hubs',             excerpt: 'New regional surgical hubs projected to drastically reduce wait times for routine elective procedures, targeting the 52+ week backlog in Orthopaedics.',          tags: ['Funding','High Relevance','Midlands'],      amount: '£1.5B', featured: true  },
  { id: 2, live: false, date: 'Feb 2026',    title: 'Ophthalmology Prioritization Budget Shift',            excerpt: 'NHS England approved a £250M budget shift for high-volume ophthalmology clinics across the South East, supporting weekend hours and independent sector use.',   tags: ['Policy Change','Medium Relevance','South East'], amount: '£250M', featured: false },
  { id: 3, live: false, date: 'Jan 2026',    title: '10,000 New Nursing Placements Announced',              excerpt: 'DHSC announced funding for 10,000 new nursing training placements targeting regions with the highest clinical vacancy rates and worst RTT metrics.',           tags: ['Workforce','High Relevance','National'],    amount: null,    featured: false },
  { id: 4, live: false, date: 'Dec 2025',    title: 'Winter Pressures Fund Distribution Finalized',        excerpt: 'Emergency £800M winter pressures fund fully distributed to ICS, weighted towards trusts with highest A&E diversion rates to protect elective beds.',          tags: ['Funding','Medium Relevance','National'],    amount: '£800M', featured: false },
  { id: 5, live: false, date: 'Nov 2025',    title: '£200M Diagnostic Centre Expansion',                   excerpt: '40 new Community Diagnostic Centres funded across North West and Yorkshire to clear the hidden backlog of undiagnosed patients.',                            tags: ['Infrastructure','High Relevance','North West'], amount: '£200M', featured: false },
  { id: 6, live: false, date: 'Oct 2025',    title: 'AI Technology Fund: £50M for Radiology',              excerpt: '£50M ring-fenced fund for AI software in chest X-ray and MRI reading. Early pilots show 20% reduction in turnaround times.',                                tags: ['Technology','Medium Relevance','Funding'],   amount: '£50M',  featured: false },
  { id: 7, live: false, date: 'Sep 2025',    title: 'Independent Sector Outsourcing Caps Lifted',          excerpt: 'NHS England lifted regional caps on outsourcing orthopaedic and cataract surgeries, backed by a £400M financial guarantee for the year.',                    tags: ['Policy Change','High Relevance','National'], amount: '£400M', featured: false },
  { id: 8, live: false, date: 'Aug 2025',    title: 'Mental Health Services: £150M Capacity Boost',        excerpt: '£150M announced to employ 500 new crisis counselors and expand digital therapy offerings for unprecedented youth mental health wait times.',                 tags: ['Funding','Medium Relevance','Clinical'],    amount: '£150M', featured: false },
]

const TAG_COLORS: Record<string,string> = {
  'High Relevance':'bg-red-50 text-red-700 border-red-200',
  'Medium Relevance':'bg-amber-50 text-amber-700 border-amber-200',
  'Funding':'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Policy Change':'bg-violet-50 text-violet-700 border-violet-200',
  'Workforce':'bg-blue-50 text-blue-700 border-blue-200',
  'Infrastructure':'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  'Technology':'bg-cyan-50 text-cyan-700 border-cyan-200',
  'National':'bg-[#f5f5f5] text-[#666] border-[#e5e5e5]',
  'Midlands':'bg-orange-50 text-orange-700 border-orange-200',
  'South East':'bg-sky-50 text-sky-700 border-sky-200',
  'North West':'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Clinical':'bg-pink-50 text-pink-700 border-pink-200',
}

const FILTERS = ['All','Funding','Policy Change','Workforce','High Relevance','Technology','Infrastructure']

export default function NewsAndBudgetsPage() {
  const [activeFilter, setActiveFilter] = useState('All')
  const filtered = MOCK_NEWS.filter(n => activeFilter === 'All' || n.tags.includes(activeFilter))
  const featured = filtered.find(n => n.featured) ?? filtered[0]
  const rest = filtered.filter(n => n.id !== (featured?.id ?? -1))

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-7xl mx-auto pb-24 space-y-6">

      {/* Header */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <Newspaper size={17} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">Operational News & Budgets</h1>
            <p className="text-xs text-[#999] mt-0.5">Real-time funding allocations and policy shifts across the NHS</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#111] text-white rounded-xl px-4 py-2.5 shrink-0">
          <PoundSterling size={14} className="text-emerald-400" />
          <div>
            <p className="text-sm font-black text-emerald-400 leading-none">£2.55B</p>
            <p className="text-[10px] text-white/50 mt-0.5">FY 2025/26 identified</p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fade} className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeFilter === f ? 'bg-[#111] text-white' : 'bg-white border border-[#e5e5e5] text-[#666] hover:border-[#bbb] hover:text-[#111]'}`}>
            {f}
          </button>
        ))}
      </motion.div>

      {/* Featured hero */}
      {featured && (
        <motion.div variants={fade} className="bg-[#111] rounded-2xl p-6 sm:p-8 relative overflow-hidden group cursor-pointer hover:bg-[#1a1a1a] transition-colors">
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2 mb-4 relative z-10">
            {featured.live && <Radio size={11} className="text-red-400 animate-pulse" />}
            <span className={`text-[10px] font-bold uppercase tracking-widest ${featured.live ? 'text-red-400' : 'text-white/40'}`}>{featured.live ? 'Live · ' : ''}{featured.date}</span>
            {featured.amount && <span className="ml-auto text-sm font-black text-emerald-400">{featured.amount}</span>}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3 relative z-10 group-hover:text-emerald-400 transition-colors flex items-start gap-3">
            {featured.title}
            <ArrowUpRight size={20} className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h2>
          <p className="text-sm text-white/50 leading-relaxed mb-5 relative z-10 max-w-2xl">{featured.excerpt}</p>
          <div className="flex flex-wrap gap-2 relative z-10">
            {featured.tags.map(tag => (
              <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/20 text-white/60 uppercase tracking-wider">{tag}</span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Grid */}
      <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rest.map(news => (
          <motion.article key={news.id} variants={fade}
            className="bg-white border border-[#e5e5e5] rounded-xl p-5 hover:border-[#bbb] hover:shadow-sm transition-all group cursor-pointer flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              {news.live && <Radio size={10} className="text-red-500 animate-pulse" />}
              <span className={`text-[10px] font-bold uppercase tracking-widest ${news.live ? 'text-red-500' : 'text-[#ccc]'}`}>{news.date}</span>
              {news.amount && <span className="ml-auto text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">{news.amount}</span>}
            </div>
            <h2 className="text-sm font-bold text-[#111] mb-2 group-hover:text-emerald-700 transition-colors leading-snug">{news.title}</h2>
            <p className="text-xs text-[#888] leading-relaxed mb-4 line-clamp-3 flex-1">{news.excerpt}</p>
            <div className="flex flex-wrap gap-1.5 mt-auto">
              {news.tags.map(tag => (
                <span key={tag} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${TAG_COLORS[tag] ?? 'bg-[#f5f5f5] text-[#888] border-[#e5e5e5]'}`}>{tag}</span>
              ))}
            </div>
          </motion.article>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 bg-white border border-[#e5e5e5] rounded-xl">
            <p className="text-[#bbb] text-sm">No articles match this filter.</p>
          </div>
        )}
      </motion.div>

      {/* Footer */}
      <motion.div variants={fade} className="flex items-center justify-between border-t border-[#e5e5e5] pt-5">
        <p className="text-xs text-[#bbb]">Sourced from NHS England announcements and DHSC press releases.</p>
        <a href="https://www.england.nhs.uk/news/" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline">
          NHS England newsroom <ExternalLink size={11} />
        </a>
      </motion.div>

    </motion.div>
  )
}
