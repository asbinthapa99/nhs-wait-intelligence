import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Search, ChevronRight, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import Link from 'next/link'
import { getRegions, getSpecialties, RegionDetail, Specialty } from '../lib/api'

const fade = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

const NHS_18W = 92

function estimateWait(specialty: Specialty | undefined, region: RegionDetail | undefined): {
  likely: number
  best: number
  worst: number
  within18wPct: number
  confidence: 'high' | 'medium' | 'low'
} {
  if (!specialty || !region) return { likely: 18, best: 8, worst: 52, within18wPct: 60, confidence: 'low' }
  const breach = specialty.pct_over_18_weeks / 100
  const regionMult = 1 + (region.pct_over_18_weeks - 35) / 100
  const medianBase = 12 + (breach * 30)
  const likely = Math.round(medianBase * regionMult)
  const best = Math.max(4, Math.round(likely * 0.45))
  const worst = Math.round(likely * 2.1)
  const within18wPct = Math.max(5, Math.min(95, Math.round(100 - specialty.pct_over_18_weeks * regionMult)))
  const confidence: 'high' | 'medium' | 'low' = specialty.total_waiting > 100000 ? 'medium' : 'low'
  return { likely, best, worst, within18wPct, confidence }
}

const CONFIDENCE_STYLE = {
  high: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  low: 'text-[#888] bg-[#f5f5f5] border-[#e5e5e5]',
}

export default function EstimatePage() {
  const [regions, setRegions] = useState<RegionDetail[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedSpecialty, setSelectedSpecialty] = useState('')
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const [rg, sp] = await Promise.allSettled([getRegions(), getSpecialties()])
      if (rg.status === 'fulfilled') setRegions(rg.value)
      if (sp.status === 'fulfilled') {
        setSpecialties(sp.value.specialties)
        if (sp.value.specialties.length) setSelectedSpecialty(sp.value.specialties[0].name)
      }
      setLoading(false)
    })()
  }, [])

  const region = regions.find(r => r.name === selectedRegion)
  const specialty = specialties.find(s => s.name === selectedSpecialty)
  const est = searched ? estimateWait(specialty, region) : null

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 max-w-3xl mx-auto py-2 pb-24">

      {/* Header */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <Clock size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">Wait Time Estimator</h1>
            <p className="text-xs text-[#999] mt-0.5">Estimated wait based on current NHS RTT statistics</p>
          </div>
        </div>
      </motion.div>

      {/* Disclaimer */}
      <motion.div variants={fade} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <Info size={14} className="shrink-0 mt-0.5 text-amber-600" />
        <p className="text-xs text-amber-700 leading-relaxed">
          Estimates are derived from official NHS England RTT statistics and regional averages — not your personal referral.
          Your actual wait depends on your specific Trust and clinical priority. Always check with your GP or hospital.
        </p>
      </motion.div>

      {/* Selectors */}
      <motion.div variants={fade} className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-widest text-[#999] mb-2">Your NHS Region</label>
          <select
            className="w-full bg-white border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm text-[#111] focus:outline-none focus:border-[#999] transition-colors"
            value={selectedRegion}
            onChange={e => { setSelectedRegion(e.target.value); setSearched(false) }}
            disabled={loading}
          >
            <option value="">Select region…</option>
            {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-widest text-[#999] mb-2">Clinical Specialty</label>
          <select
            className="w-full bg-white border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm text-[#111] focus:outline-none focus:border-[#999] transition-colors"
            value={selectedSpecialty}
            onChange={e => { setSelectedSpecialty(e.target.value); setSearched(false) }}
            disabled={loading}
          >
            <option value="">Select specialty…</option>
            {specialties.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      </motion.div>

      <motion.div variants={fade}>
        <button
          disabled={!selectedRegion || !selectedSpecialty || loading}
          onClick={() => setSearched(true)}
          className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Search size={15} /> Estimate my wait
        </button>
      </motion.div>

      {/* No data state */}
      {!loading && regions.length === 0 && (
        <motion.div variants={fade} className="bg-[#fafafa] border border-[#e5e5e5] rounded-2xl p-6 text-sm text-[#888] text-center">
          <AlertTriangle size={20} className="mx-auto mb-2 text-amber-500" />
          No NHS data loaded yet. The estimate tool requires the data pipeline to have run at least once.
        </motion.div>
      )}

      {/* Results */}
      {est && region && specialty && (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">

          {/* Main estimate card */}
          <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl p-6 hover:border-[#bbb] hover:shadow-sm transition-all">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-1">
                  {specialty.name} · {region.name.replace('NHS England ', '')}
                </p>
                <h2 className="text-4xl font-black text-[#111] tracking-tight">~{est.likely} weeks</h2>
                <p className="text-sm text-[#888] mt-1">estimated likely wait from referral to treatment</p>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${CONFIDENCE_STYLE[est.confidence]}`}>
                {est.confidence} confidence
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Best case', value: `${est.best}w`, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
                { label: 'Likely', value: `${est.likely}w`, color: 'text-[#111]', bg: 'bg-[#f5f5f5] border-[#e5e5e5]' },
                { label: 'Worst case', value: `${est.worst}w`, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
              ].map(item => (
                <div key={item.label} className={`${item.bg} border rounded-xl p-3 text-center`}>
                  <p className="text-[10px] uppercase tracking-widest text-[#999] mb-1">{item.label}</p>
                  <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Within 18w probability bar */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#888]">Chance of being seen within 18 weeks</span>
                <span className={`font-bold ${est.within18wPct >= NHS_18W ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {est.within18wPct}%
                </span>
              </div>
              <div className="h-2.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${est.within18wPct}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className={`h-full rounded-full ${est.within18wPct >= NHS_18W ? 'bg-emerald-500' : est.within18wPct >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#bbb] mt-1">
                <span>0%</span>
                <span className="text-blue-500">NHS target: 92%</span>
                <span>100%</span>
              </div>
            </div>
          </motion.div>

          {/* Regional + specialty context */}
          <motion.div variants={stagger} className="grid sm:grid-cols-2 gap-4">
            <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-xl p-4 hover:border-[#bbb] transition-all">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-3">Regional context</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Total waiting in region', value: region.total_waiting >= 1e6 ? (region.total_waiting / 1e6).toFixed(2) + 'M' : Math.round(region.total_waiting / 1000) + 'k', color: 'text-[#111]' },
                  { label: '% over 18 weeks', value: region.pct_over_18_weeks.toFixed(1) + '%', color: region.pct_over_18_weeks > 40 ? 'text-red-600' : 'text-amber-600' },
                  { label: 'Trend', value: region.trend.charAt(0).toUpperCase() + region.trend.slice(1), color: region.trend === 'improving' ? 'text-emerald-600' : region.trend === 'deteriorating' ? 'text-red-600' : 'text-amber-600' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center text-xs">
                    <span className="text-[#888]">{row.label}</span>
                    <span className={`font-semibold ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-xl p-4 hover:border-[#bbb] transition-all">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-3">Specialty context</p>
              <div className="space-y-2.5">
                {[
                  { label: 'National waiting', value: specialty.total_waiting >= 1e6 ? (specialty.total_waiting / 1e6).toFixed(2) + 'M' : Math.round(specialty.total_waiting / 1000) + 'k', color: 'text-[#111]' },
                  { label: '% over 18 weeks', value: specialty.pct_over_18_weeks + '%', color: specialty.pct_over_18_weeks > 40 ? 'text-red-600' : 'text-amber-600' },
                  { label: 'YoY change', value: (specialty.yoy_change > 0 ? '+' : '') + specialty.yoy_change.toFixed(1) + '%', color: specialty.yoy_change > 0 ? 'text-red-600' : 'text-emerald-600' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center text-xs">
                    <span className="text-[#888]">{row.label}</span>
                    <span className={`font-semibold ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* What you can do */}
          <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl p-5 hover:border-[#bbb] hover:shadow-sm transition-all">
            <h3 className="text-sm font-bold text-[#111] mb-4 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600" /> What you can do
            </h3>
            <ul className="space-y-2.5">
              {[
                { text: 'Ask your GP if you can be referred to a faster Trust under NHS Patient Choice', link: null },
                { text: 'Check NHS e-Referral Service (e-RS) for available appointment slots', link: 'https://www.nhs.uk/nhs-services/hospitals/book-an-appointment/' },
                { text: 'Contact your GP if your condition worsens — you may be prioritised', link: null },
                { text: 'Write to your MP about waiting times in your region', link: '/mp' },
              ].map(item => (
                <li key={item.text} className="flex items-start gap-2 text-xs text-[#888]">
                  <ChevronRight size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                  {item.link ? (
                    <Link href={item.link} className="hover:text-[#111] transition-colors underline underline-offset-2"
                      target={item.link.startsWith('http') ? '_blank' : undefined}
                      rel={item.link.startsWith('http') ? 'noopener noreferrer' : undefined}>
                      {item.text}
                    </Link>
                  ) : (
                    <span>{item.text}</span>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}

    </motion.div>
  )
}
