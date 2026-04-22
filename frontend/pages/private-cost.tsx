import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Search, ChevronRight, Info, AlertTriangle, ExternalLink, TrendingUp } from 'lucide-react'
import { getRegions, getSpecialties, RegionDetail, Specialty } from '../lib/api'

const fade = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

// Private cost ranges per specialty (Nuffield Health / Spire / BMI prices 2023/24)
const PRIVATE_COSTS: Record<string, { low: number; high: number; procedure: string; notes: string }> = {
  'Orthopaedics': { low: 11000, high: 18000, procedure: 'Hip/knee replacement', notes: 'Varies significantly by joint and complexity. Follow-up physio extra.' },
  'Ophthalmology': { low: 2500, high: 4500, procedure: 'Cataract surgery (per eye)', notes: 'Most common procedure. Lens type affects price.' },
  'General Surgery': { low: 5000, high: 12000, procedure: 'Hernia, cholecystectomy etc.', notes: 'Varies widely by procedure type and complexity.' },
  'Cardiology': { low: 3500, high: 9000, procedure: 'Angioplasty / ablation', notes: 'Excludes stents and device implants which add cost.' },
  'Gastroenterology': { low: 800, high: 2500, procedure: 'Colonoscopy / endoscopy', notes: 'Diagnostic procedures at lower end; therapeutic higher.' },
  'Dermatology': { low: 200, high: 600, procedure: 'Consultation + biopsy', notes: 'Per-appointment pricing. Surgical removal extra.' },
  'Urology': { low: 3000, high: 8500, procedure: 'TURP, cystoscopy etc.', notes: 'Depends on procedure; prostate procedures at higher end.' },
  'Neurology': { low: 4000, high: 11000, procedure: 'Diagnosis + initial management', notes: 'Complex neurosurgery significantly higher.' },
  'Gynaecology': { low: 2500, high: 7000, procedure: 'Hysteroscopy / laparoscopy', notes: 'Varies by procedure; fertility treatments not included.' },
  'Rheumatology': { low: 250, high: 800, procedure: 'Outpatient consultation', notes: 'Ongoing treatment costs additional.' },
  'Oncology': { low: 8000, high: 40000, procedure: 'Chemotherapy course', notes: 'Highly variable. Drug costs alone can exceed £20k per cycle.' },
  'Respiratory Medicine': { low: 300, high: 2000, procedure: 'Spirometry + consultation', notes: 'Bronchoscopy and sleep studies at higher end.' },
}

function estimateNHSWait(specialty: Specialty | undefined, region: RegionDetail | undefined): number {
  if (!specialty || !region) return 18
  const breach = specialty.pct_over_18_weeks / 100
  const regionMult = 1 + (region.pct_over_18_weeks - 35) / 100
  return Math.round((12 + breach * 30) * regionMult)
}

const fmt = (v: number) => `£${v.toLocaleString()}`

export default function PrivateCostPage() {
  const [regions, setRegions] = useState<RegionDetail[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedSpecialty, setSelectedSpecialty] = useState('')
  const [loading, setLoading] = useState(true)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    void (async () => {
      const [rg, sp] = await Promise.allSettled([getRegions(), getSpecialties()])
      if (rg.status === 'fulfilled') setRegions(rg.value)
      if (sp.status === 'fulfilled') setSpecialties(sp.value.specialties)
      setLoading(false)
    })()
  }, [])

  const region = regions.find(r => r.name === selectedRegion)
  const specialty = specialties.find(s => s.name === selectedSpecialty)
  const privateCost = selectedSpecialty ? PRIVATE_COSTS[selectedSpecialty] : null
  const nhsWaitWeeks = searched ? estimateNHSWait(specialty, region) : null

  const allCostData = useMemo(() =>
    Object.entries(PRIVATE_COSTS)
      .map(([name, c]) => ({ name, midpoint: Math.round((c.low + c.high) / 2), low: c.low, high: c.high }))
      .sort((a, b) => b.midpoint - a.midpoint),
    []
  )

  const availableSpecialties = useMemo(() =>
    specialties.filter(s => PRIVATE_COSTS[s.name]),
    [specialties]
  )

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 max-w-4xl mx-auto py-2 pb-24">

      {/* Header */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
            <Wallet size={18} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">NHS Wait vs Private Cost</h1>
            <p className="text-xs text-[#999] mt-0.5">What you'd pay to skip the queue — and what the two-tier system really costs</p>
          </div>
        </div>
      </motion.div>

      {/* Disclaimer */}
      <motion.div variants={fade} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Indicative private costs only.</strong> Prices sourced from Nuffield Health, Spire, and BMI Healthcare published price lists (2023/24).
          Actual costs depend on your specific procedure, surgeon, anaesthetist, and facility.
          Always get a written quote before proceeding. NHS wait estimates are statistical averages, not personal predictions.
        </p>
      </motion.div>

      {/* Selectors */}
      <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl p-5 hover:border-[#bbb] transition-all">
        <h2 className="text-sm font-semibold text-[#111] mb-4">Calculate your situation</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
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
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[#999] mb-2">Treatment Type</label>
            <select
              className="w-full bg-white border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm text-[#111] focus:outline-none focus:border-[#999] transition-colors"
              value={selectedSpecialty}
              onChange={e => { setSelectedSpecialty(e.target.value); setSearched(false) }}
              disabled={loading}
            >
              <option value="">Select specialty…</option>
              {availableSpecialties.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <button
          disabled={!selectedRegion || !selectedSpecialty || loading}
          onClick={() => setSearched(true)}
          className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center gap-2 text-sm"
        >
          <Search size={15} /> Compare NHS vs private
        </button>
      </motion.div>

      {/* Results */}
      {searched && privateCost && nhsWaitWeeks !== null && (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">

          {/* Main comparison */}
          <motion.div variants={fade} className="grid sm:grid-cols-2 gap-4">
            {/* NHS */}
            <div className="bg-white border border-[#e5e5e5] rounded-2xl p-5 hover:border-[#bbb] transition-all">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#999]">NHS route</p>
              </div>
              <p className="text-4xl font-black text-[#111] tracking-tight mb-1">~{nhsWaitWeeks}w</p>
              <p className="text-sm text-[#888]">estimated wait from referral</p>
              <div className="mt-4 pt-4 border-t border-[#f0f0f0]">
                <p className="text-3xl font-black text-emerald-600 mb-1">Free</p>
                <p className="text-xs text-[#aaa]">No cost to you at point of care</p>
              </div>
              {region && (
                <p className="text-xs text-[#bbb] mt-3">
                  Based on {region.name.replace('NHS England ', '')} regional data.
                  {region.pct_over_18_weeks > 40 && ' Above-average breach rate in your region.'}
                </p>
              )}
            </div>

            {/* Private */}
            <div className="bg-white border border-[#e5e5e5] rounded-2xl p-5 hover:border-[#bbb] transition-all">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#999]">Private route</p>
              </div>
              <p className="text-4xl font-black text-[#111] tracking-tight mb-1">1–3w</p>
              <p className="text-sm text-[#888]">typical wait for private treatment</p>
              <div className="mt-4 pt-4 border-t border-[#f0f0f0]">
                <p className="text-3xl font-black text-blue-600 mb-1">
                  {fmt(privateCost.low)}–{fmt(privateCost.high)}
                </p>
                <p className="text-xs text-[#aaa]">{privateCost.procedure}</p>
              </div>
              <p className="text-xs text-[#bbb] mt-3">{privateCost.notes}</p>
            </div>
          </motion.div>

          {/* Context card */}
          <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl p-5 hover:border-[#bbb] transition-all">
            <h3 className="text-sm font-bold text-[#111] mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-amber-600" /> What this means
            </h3>
            <div className="space-y-3">
              {[
                {
                  text: nhsWaitWeeks > 26
                    ? `A ${nhsWaitWeeks}-week wait could mean significant impact on your quality of life and ability to work. Many patients pay privately to avoid prolonged pain or disability.`
                    : `A ${nhsWaitWeeks}-week NHS wait is close to the national average. You may decide the free NHS route is worth the wait.`,
                  strong: false,
                },
                {
                  text: `The two-tier reality: those who can afford ${fmt(privateCost.low)}+ pay to jump the queue; those who cannot wait. This inequality compounds the NHS's own inequality problem.`,
                  strong: true,
                },
                {
                  text: 'Check if your employer provides private health insurance — many do, and it may cover this treatment.',
                  strong: false,
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[#888]">
                  <ChevronRight size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                  <p className={item.strong ? 'font-medium text-[#555]' : ''}>{item.text}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Before going private */}
          <motion.div variants={fade} className="bg-[#fafafa] border border-[#e5e5e5] rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-3">Before going private, try these free NHS options first</p>
            <div className="space-y-2">
              {[
                { text: 'Request a referral to a different Trust with shorter waits (NHS Patient Choice)', link: 'https://www.nhs.uk/nhs-services/hospitals/your-right-to-choose-your-nhs-consultant-led-treatment/' },
                { text: 'Ask your GP to expedite your referral if your condition has worsened', link: null },
                { text: 'Check NHS e-Referral Service for Trust wait times before accepting first offer', link: 'https://www.nhs.uk/nhs-services/hospitals/book-an-appointment/' },
                { text: 'Write to your MP — political pressure has historically moved individual cases', link: '/mp' },
              ].map(item => (
                <div key={item.text} className="flex items-start gap-2 text-xs text-[#888]">
                  <ChevronRight size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                  {item.link ? (
                    <a href={item.link} target={item.link.startsWith('http') ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      className="hover:text-[#111] underline underline-offset-2 transition-colors">{item.text}</a>
                  ) : <span>{item.text}</span>}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* All costs table (always visible) */}
      <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#f0f0f0]">
          <h2 className="text-sm font-semibold text-[#111]">Private Cost Guide — All Specialties</h2>
          <p className="text-xs text-[#aaa] mt-0.5">Typical UK private hospital prices 2023/24</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#fafafa] text-[10px] text-[#999] uppercase tracking-widest border-b border-[#e5e5e5]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Specialty</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Typical procedure</th>
                <th className="px-4 py-3 text-right font-medium">From</th>
                <th className="px-4 py-3 text-right font-medium">To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {allCostData.map(row => (
                <tr key={row.name} className={`hover:bg-[#fafafa] transition-colors ${selectedSpecialty === row.name ? 'bg-emerald-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-[#111]">{row.name}</td>
                  <td className="px-4 py-3 text-xs text-[#aaa] hidden sm:table-cell">{PRIVATE_COSTS[row.name].procedure}</td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-emerald-700">{fmt(row.low)}</td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-red-600">{fmt(row.high)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-[#fafafa] border-t border-[#f0f0f0] flex items-center gap-2 text-xs text-[#aaa]">
          <Info size={12} className="shrink-0" />
          Prices exclude anaesthetist fees, follow-up appointments, medication, and physiotherapy.
          Source: Nuffield Health, Spire Healthcare, BMI Healthcare published price lists.
        </div>
      </motion.div>

    </motion.div>
  )
}
