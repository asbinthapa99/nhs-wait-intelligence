import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Globe, Lock, Sparkles, GitBranch, Heart, ChevronRight,
  Database, Scale, Users, BarChart2, ArrowUpRight
} from 'lucide-react'

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

const PILLARS = [
  { icon: Globe, title: 'Radical Transparency', body: "Every number traces back to a published NHS England file. The methodology, pipeline, and source code are all open.", accent: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  { icon: Lock, title: 'Zero Patient Data', body: 'We process only aggregated statistics. No patient-level records, no personally identifiable information — ever. UK GDPR compliant by design.', accent: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  { icon: Sparkles, title: 'AI That Admits Uncertainty', body: "Our AI insights are powered by Claude (Anthropic) and always cite their data source. When data isn't good enough, we say so.", accent: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
  { icon: GitBranch, title: 'Open Source, Forever', body: 'Published under the MIT Licence. Fork it, adapt it, run your own instance. NHS data belongs to the public — so should the tools built from it.', accent: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
]

const WHAT_WE_DO = [
  { icon: BarChart2, label: 'Inequality Scoring', detail: 'We correlate NHS RTT figures with ONS deprivation data to produce an inequality score no official source provides.' },
  { icon: Sparkles, label: 'Plain-English AI Summaries', detail: 'Dense statistical releases are turned into accessible, honest explanations for patients, journalists, and researchers.' },
  { icon: Scale, label: 'Recovery Target Tracking', detail: 'The NHS has constitutional standards (92% within 18 weeks, zero 52-week waits). No official dashboard shows how far reality is.' },
  { icon: Users, label: 'Patient Pathway Tools', detail: 'Helping people understand their rights under NHS choice, compare providers, and prepare for GP conversations — from open data.' },
  { icon: Globe, label: 'International Benchmarking', detail: "Where does the UK sit against France, Germany, the Netherlands? NHS England doesn't publish this. We will." },
  { icon: Database, label: 'Open Data API', detail: 'Researchers and journalists can query our processed dataset directly via a clean REST API. No portal, no CSV maze.' },
]

export default function AboutPage() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-3xl mx-auto space-y-12 py-4 pb-24">

      {/* Hero */}
      <motion.div variants={fade} className="space-y-5 border-b border-[#e5e5e5] pb-10">
        <div className="flex items-center gap-2">
          <span className="bg-emerald-600 rounded-md text-white font-black px-2 py-0.5 text-sm tracking-tight">NHS</span>
          <span className="font-bold text-[#111] text-xl tracking-tight">Wait Intelligence</span>
        </div>
        <h1 className="text-3xl font-black text-[#111] leading-tight tracking-tight">
          The analytics platform the NHS{' '}
          <span className="text-emerald-600">should</span> have built.
        </h1>
        <p className="text-[#666] leading-relaxed text-sm">
          NHS Wait Intelligence is an independent, non-profit open-source project. We take publicly available NHS England waiting list data and make it genuinely useful — for patients who need to understand their situation, researchers studying health inequality, commissioners planning services, and journalists holding the system to account.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/methodology"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#111] text-white text-sm font-semibold rounded-xl hover:bg-[#333] transition-colors">
            Read methodology <ArrowUpRight size={14} />
          </Link>
          <a href="https://github.com/asbinthapa99/nhs-wait-intelligence" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[#e5e5e5] text-[#555] text-sm font-semibold rounded-xl hover:border-[#bbb] transition-colors">
            <GitBranch size={14} /> View on GitHub
          </a>
        </div>
      </motion.div>

      {/* What we do that NHS doesn't */}
      <motion.div variants={fade}>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-sm font-bold text-[#111] whitespace-nowrap">What we do that NHS doesn't</h2>
          <div className="h-px bg-[#e5e5e5] flex-1" />
        </div>
        <div className="space-y-3">
          {WHAT_WE_DO.map(({ icon: Icon, label, detail }) => (
            <motion.div key={label} variants={fade}
              className="flex items-start gap-4 bg-white border border-[#e5e5e5] rounded-xl px-5 py-4 hover:border-[#bbb] hover:shadow-sm transition-all">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={14} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111] mb-0.5">{label}</p>
                <p className="text-sm text-[#666] leading-relaxed">{detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Four pillars */}
      <motion.div variants={fade}>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-sm font-bold text-[#111] whitespace-nowrap">Our principles</h2>
          <div className="h-px bg-[#e5e5e5] flex-1" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {PILLARS.map(({ icon: Icon, title, body, accent, bg, border }) => (
            <motion.div key={title} variants={fade}
              className={`${bg} border ${border} rounded-xl p-5 hover:shadow-sm transition-all`}>
              <div className={`w-8 h-8 rounded-lg bg-white border ${border} flex items-center justify-center mb-4`}>
                <Icon size={15} className={accent} />
              </div>
              <h3 className="text-sm font-bold text-[#111] mb-1.5">{title}</h3>
              <p className="text-xs text-[#666] leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Data sources */}
      <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[#111]">Where the data comes from</h2>
        <div className="space-y-4 text-sm text-[#666] leading-relaxed divide-y divide-[#f5f5f5]">
          {[
            { label: 'NHS England RTT Statistics', detail: 'Published monthly. Official Referral-to-Treatment waiting time files covering all NHS trusts. Open Government Licence v3.0.' },
            { label: 'ONS Index of Multiple Deprivation', detail: 'Used to calculate inequality scores by correlating local deprivation with waiting time distributions. OGL v3.0.' },
            { label: 'CQC Trust Ratings', detail: 'Care Quality Commission inspection ratings reproduced from publicly available publications for informational context only.' },
          ].map(s => (
            <div key={s.label} className="pt-4 first:pt-0">
              <p className="font-semibold text-[#333] mb-0.5">{s.label}</p>
              <p className="text-xs">{s.detail}</p>
            </div>
          ))}
        </div>
        <Link href="/methodology" className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline">
          Full methodology <ChevronRight size={14} />
        </Link>
      </motion.div>

      {/* Footer CTA */}
      <motion.div variants={fade} className="border-t border-[#e5e5e5] pt-8 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-start gap-3">
          <Heart size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-[#666]">
            Built and maintained voluntarily. No VC funding, no advertising, no data selling. If useful,{' '}
            <a href="https://github.com/asbinthapa99/nhs-wait-intelligence" target="_blank" rel="noopener noreferrer"
              className="text-emerald-600 hover:underline font-medium">contribute on GitHub</a>.
          </p>
        </div>
        <Link href="/governance"
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#e5e5e5] text-[#555] text-sm font-semibold rounded-xl hover:border-[#bbb] transition-colors shrink-0">
          Governance <ChevronRight size={13} />
        </Link>
      </motion.div>

    </motion.div>
  )
}
