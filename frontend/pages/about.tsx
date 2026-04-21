import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Globe, Lock, Sparkles, GitBranch, Heart, ChevronRight,
  Database, Scale, Users, BarChart2
} from 'lucide-react'

const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }

const PILLARS = [
  {
    icon: Globe,
    title: 'Radical transparency',
    body: 'Every number on this platform traces back to a published NHS England file. The methodology, data pipeline, and source code are all open.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: Lock,
    title: 'Zero patient data',
    body: 'We process only aggregated statistics. No patient-level records, no personally identifiable information — ever. UK GDPR compliant by design.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: Sparkles,
    title: 'AI that admits uncertainty',
    body: "Our AI insights are powered by Claude (Anthropic) and always cite their data source. When the data isn't good enough to answer a question confidently, we say so.",
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    icon: GitBranch,
    title: 'Open source, forever',
    body: 'Published under the MIT Licence. Fork it, adapt it, run your own instance. NHS data belongs to the public — so should the tools built from it.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
]

const WHAT_NHS_DOESNT_DO = [
  { icon: BarChart2, label: 'Inequality scoring', detail: 'NHS England publishes raw RTT figures. We correlate them with ONS deprivation data to produce an inequality score no official source provides.' },
  { icon: Sparkles, label: 'Plain-English AI summaries', detail: 'Dense statistical releases are turned into accessible, honest explanations anyone can read — patients, journalists, researchers.' },
  { icon: Scale, label: 'Recovery target tracking', detail: 'The NHS has constitutional standards (92% within 18 weeks, zero 52-week waits). No official dashboard shows how far reality is from those targets.' },
  { icon: Users, label: 'Patient pathway tools', detail: 'Our patient section helps people understand their rights under NHS choice, compare providers, and prepare for GP conversations — all from open data.' },
  { icon: Globe, label: 'International benchmarking', detail: 'Where does the UK sit against France, Germany, the Netherlands? NHS England doesn\'t publish this. We will.' },
  { icon: Database, label: 'Open data API', detail: 'Researchers and journalists can query our processed dataset directly. NHS raw data is CSV files behind a portal. We offer a clean REST API.' },
]

export default function AboutPage() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-3xl mx-auto space-y-12 py-4">

      {/* Hero */}
      <motion.div variants={fade} className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="bg-[#005eb8] rounded text-white font-black px-2 py-0.5 text-sm italic">NHS</span>
          <span className="font-bold text-white text-xl tracking-tight">Wait Intelligence</span>
        </div>
        <h1 className="text-3xl font-black text-white leading-tight tracking-tight">
          The analytics platform the NHS <span className="text-blue-400">should</span> have built.
        </h1>
        <p className="text-slate-400 leading-relaxed">
          NHS Wait Intelligence is an independent, non-profit open-source project. We take publicly available NHS England waiting list data and make it genuinely useful — for patients who need to understand their situation, researchers studying health inequality, commissioners planning services, and journalists holding the system to account.
        </p>
      </motion.div>

      {/* What makes us different */}
      <motion.div variants={fade}>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">What we do that NHS doesn't</h2>
        <div className="space-y-4">
          {WHAT_NHS_DOESNT_DO.map(({ icon: Icon, label, detail }) => (
            <div key={label} className="flex items-start gap-4 bg-slate-900 border border-slate-800 rounded-xl px-5 py-4">
              <Icon size={18} className="text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white mb-0.5">{label}</p>
                <p className="text-sm text-slate-400 leading-relaxed">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Four pillars */}
      <motion.div variants={fade}>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">Our principles</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {PILLARS.map(({ icon: Icon, title, body, color, bg }) => (
            <div key={title} className={`border rounded-2xl p-5 ${bg}`}>
              <Icon size={20} className={`${color} mb-3`} />
              <h3 className="text-sm font-bold text-white mb-1.5">{title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Data pipeline */}
      <motion.div variants={fade} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white">Where the data comes from</h2>
        <div className="space-y-3 text-sm text-slate-400 leading-relaxed">
          <p>
            <span className="font-semibold text-slate-300">NHS England RTT statistics</span> — Published monthly, these are the official Referral-to-Treatment waiting time files covering all NHS trusts and commissioning bodies. Released under the Open Government Licence v3.0.
          </p>
          <p>
            <span className="font-semibold text-slate-300">ONS Index of Multiple Deprivation</span> — Used to calculate inequality scores by correlating local deprivation levels with waiting time distributions. Released under OGL v3.0.
          </p>
          <p>
            <span className="font-semibold text-slate-300">CQC Trust ratings</span> — Care Quality Commission inspection ratings reproduced from publicly available publications for informational context only.
          </p>
        </div>
        <Link href="/methodology" className="flex items-center gap-1 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
          Full methodology <ChevronRight size={14} />
        </Link>
      </motion.div>

      {/* Non-profit statement */}
      <motion.div variants={fade} className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Heart size={18} className="text-red-400 shrink-0" />
          <p className="text-sm text-slate-400">
            Built and maintained voluntarily. No VC funding, no advertising, no data selling.
            If this is useful, consider{' '}
            <a href="https://github.com/asbinthapa99/nhs-wait-intelligence" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              contributing on GitHub
            </a>.
          </p>
        </div>
        <Link href="/governance" className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-semibold rounded-lg transition-colors shrink-0">
          Governance <ChevronRight size={14} />
        </Link>
      </motion.div>

    </motion.div>
  )
}
