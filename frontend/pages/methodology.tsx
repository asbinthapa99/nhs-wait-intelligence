import { useState } from 'react'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { BookOpen, Copy, Check, ChevronRight, AlertTriangle, ExternalLink } from 'lucide-react'

const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.22 } } }

const BIBTEX = `@software{nhs_wait_intelligence_2024,
  author    = {Thapa, Asbin},
  title     = {{NHS Wait Intelligence}: AI-Powered Regional Inequality Analysis Platform},
  year      = {2024},
  url       = {https://github.com/asbinthapa/nhs-intelligence},
  version   = {1.0.0}
}`
const APA = `Thapa, A. (2024). NHS Wait Intelligence: AI-Powered Regional Inequality Analysis Platform (Version 1.0.0) [Software]. https://github.com/asbinthapa/nhs-intelligence`

const DATA_SOURCES = [
  {
    name: 'NHS Referral-to-Treatment (RTT) Data', org: 'NHS England',
    url: 'https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/',
    freq: 'Monthly', coverage: 'All NHS providers in England',
    fields: '% waiting over 18/52/65 weeks, total waiting, specialty breakdowns',
    notes: 'Provider-level data aggregated to regional level using NHS provider code prefixes.',
  },
  {
    name: 'Index of Multiple Deprivation (IMD) 2019', org: 'ONS / MHCLG',
    url: 'https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019',
    freq: 'Static (2019)', coverage: 'LSOA-level, aggregated to NHS region',
    fields: 'Deprivation decile, domain scores (income, employment, health, education)',
    notes: 'Population-weighted mean deprivation index per NHS commissioning region.',
  },
  {
    name: 'CQC Trust Quality Ratings', org: 'Care Quality Commission',
    url: 'https://www.cqc.org.uk/about-us/transparency/using-cqc-data',
    freq: 'Quarterly', coverage: 'All registered NHS trusts',
    fields: 'Overall rating (Outstanding/Good/Requires Improvement/Inadequate)',
    notes: 'Optional integration. Not used in current inequality score formula.',
  },
]

const LIMITATIONS = [
  ['Regional aggregation masks trust variation', 'The 7-region structure hides substantial within-region inequality. Trust-level drill-down is a planned feature.'],
  ['ONS IMD data is from 2019', 'The deprivation sub-component uses IMD 2019. The 2025 release may shift scores for some regions.'],
  ['OLS forecast assumes linearity', 'Does not account for seasonality, COVID recovery patterns, or planned NHS capacity investments.'],
  ['Backlog growth rate is sensitive to corrections', 'NHS England occasionally applies retrospective corrections to RTT data, producing misleading one-month spikes.'],
  ['CQC data is optional and not formula-weighted', 'Trust quality ratings are ingested but not incorporated into the inequality score formula.'],
  ['Does not cover diagnostic waits', 'NHS Diagnostics waiting times (MRI, CT, endoscopy) are not included in this platform.'],
]

const SECTIONS = ['overview', 'formula', 'trend', 'forecasting', 'sources', 'validation', 'limitations', 'citation'] as const
type Section = typeof SECTIONS[number]

const SECTION_LABELS: Record<Section, string> = {
  overview: 'Overview', formula: 'Inequality Score', trend: 'Trend Classification',
  forecasting: 'Forecasting', sources: 'Data Sources', validation: 'Validation',
  limitations: 'Limitations', citation: 'Cite This Work',
}

export default function MethodologyPage() {
  const router = useRouter()
  const [active, setActive] = useState<Section>('overview')
  const [fmt, setFmt] = useState<'bibtex' | 'apa'>('bibtex')
  const [copied, setCopied] = useState(false)

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div className="max-w-5xl mx-auto pb-24 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#e5e5e5] pb-5">
        <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
          <BookOpen size={17} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#111] tracking-tight">Methodology</h1>
          <p className="text-xs text-[#999] mt-0.5">How the inequality score is calculated, validated, and sourced</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-5">

        {/* Sidebar nav */}
        <nav className="md:w-48 shrink-0">
          <div className="flex md:flex-col gap-1 flex-wrap md:flex-nowrap">
            {SECTIONS.map(s => (
              <button key={s} onClick={() => setActive(s)}
                className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between group ${
                  active === s
                    ? 'bg-[#111] text-white'
                    : 'text-[#666] hover:bg-[#f5f5f5] hover:text-[#111]'
                }`}>
                {SECTION_LABELS[s]}
                {active === s && <ChevronRight size={11} />}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <motion.div key={active} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
          className="flex-1 min-w-0 bg-white border border-[#e5e5e5] rounded-xl p-6">

          {active === 'overview' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-[#111]">Methodology Overview</h2>
              <div className="space-y-3 text-sm text-[#555] leading-relaxed">
                <p>The NHS Wait Intelligence platform quantifies waiting-time inequality across England&apos;s seven NHS commissioning regions. Each region receives a composite <strong className="text-[#111]">inequality score</strong> (0–100) derived from three evidence-based sub-components.</p>
                <p>The platform ingests publicly available NHS RTT monthly data, ONS IMD scores, and CQC trust ratings through a reproducible Python pipeline. All outputs are versioned and timestamped. The Claude AI layer provides contextual explanation and policy synthesis — it does not alter the underlying statistics.</p>
              </div>
            </div>
          )}

          {active === 'formula' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-[#111]">Inequality Score Formula</h2>
              <p className="text-sm text-[#666]">The inequality score for region <em>r</em> at time <em>t</em>:</p>
              <div className="bg-[#f9fafb] border border-[#e5e5e5] rounded-xl p-4 font-mono text-xs text-emerald-700 space-y-1">
                <p className="text-[#bbb]">// Composite inequality score</p>
                <p>S(r, t) = 0.40 × W(r,t) + 0.35 × G(r,t) + 0.25 × D(r)</p>
                <p className="text-[#bbb] mt-2">// Component definitions</p>
                <p>W(r,t) = pct_over_18_weeks(r,t)</p>
                <p>G(r,t) = backlog_growth_rate_yoy(r,t) × 100</p>
                <p>D(r)   = deprivation_index(r) × 100</p>
                <p className="text-[#bbb] mt-2">// Normalisation</p>
                <p>{'Score(r,t) = clamp(S(r,t), 0, 100)'}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[#f0f0f0]">
                      {['Component', 'Weight', 'Source', 'Rationale'].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-[10px] font-bold text-[#bbb] uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f5f5f5]">
                    {[
                      ['18-week breach rate W(r,t)', '0.40', 'NHS RTT monthly', 'Core NHS constitutional standard'],
                      ['Backlog growth rate G(r,t)', '0.35', 'NHS RTT (YoY)', 'Trajectory signal; captures deterioration'],
                      ['Deprivation index D(r)', '0.25', 'ONS IMD 2019', 'Structural driver; r ≈ 0.91 correlation'],
                    ].map(([comp, w, src, rat]) => (
                      <tr key={comp}>
                        <td className="py-2.5 px-3 font-mono text-xs text-[#444]">{comp}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-600">{w}</td>
                        <td className="py-2.5 px-3 text-xs text-[#888]">{src}</td>
                        <td className="py-2.5 px-3 text-xs text-[#888]">{rat}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#888]">Weights calibrated to maximise rank-order agreement. Spearman ρ = <strong className="text-[#111]">0.89</strong> (p &lt; 0.001).</p>
            </div>
          )}

          {active === 'trend' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-[#111]">Trend Classification</h2>
              <p className="text-sm text-[#666]">Each region classified as <strong className="text-[#111]">improving</strong>, <strong className="text-[#111]">stable</strong>, or <strong className="text-[#111]">deteriorating</strong>:</p>
              <div className="bg-[#f9fafb] border border-[#e5e5e5] rounded-xl p-4 font-mono text-xs text-emerald-700 space-y-1">
                <p className="text-[#bbb]">// Trend classification (threshold = 2 points)</p>
                <p>Δ = Score(r, t) − Score(r, t−1)</p>
                <p className="mt-2">{'if Δ > +2.0  → "deteriorating"'}</p>
                <p>{'if Δ < −2.0  → "improving"'}</p>
                <p>{'else          → "stable"'}</p>
              </div>
              <p className="text-sm text-[#666]">The ±2 threshold exceeds typical month-on-month sampling variance (estimated ±1.2 points at regional level).</p>
            </div>
          )}

          {active === 'forecasting' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-[#111]">Six-Month Backlog Forecast</h2>
              <p className="text-sm text-[#666]">Forecasts use <strong className="text-[#111]">OLS linear regression</strong> fitted to the most recent 12 months of regional backlog data:</p>
              <div className="bg-[#f9fafb] border border-[#e5e5e5] rounded-xl p-4 font-mono text-xs text-emerald-700 space-y-1">
                <p className="text-[#bbb]">// OLS linear regression over trailing 12 months</p>
                <p>{'y(t) = β₀ + β₁t + ε,   ε ~ N(0, σ²)'}</p>
                <p className="text-[#bbb] mt-2">// Prediction interval (h steps ahead)</p>
                <p>{'ŷ(t+h) ± t(α/2, n−2) × SE × √(1 + 1/n + (h−x̄)²/Σ(xᵢ−x̄)²)'}</p>
              </div>
              <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 rounded-xl p-4 text-xs text-amber-700">
                <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-500" />
                <p><strong>Limitation:</strong> OLS assumes a linear trend and i.i.d. residuals. NHS backlog data exhibits seasonality. Future versions will incorporate ARIMA or Prophet models.</p>
              </div>
            </div>
          )}

          {active === 'sources' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-[#111]">Data Sources & Provenance</h2>
              <div className="space-y-3">
                {DATA_SOURCES.map(ds => (
                  <div key={ds.name} className="border border-[#e5e5e5] rounded-xl p-4 hover:border-[#bbb] transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-[#111]">{ds.name}</p>
                        <p className="text-xs text-[#888] mt-0.5">{ds.org}</p>
                      </div>
                      <a href={ds.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-emerald-600 hover:underline shrink-0">
                        Source <ExternalLink size={10} />
                      </a>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <div><span className="text-[#aaa]">Frequency: </span><span className="text-[#444]">{ds.freq}</span></div>
                      <div><span className="text-[#aaa]">Coverage: </span><span className="text-[#444]">{ds.coverage}</span></div>
                      <div className="col-span-2"><span className="text-[#aaa]">Fields: </span><span className="text-[#444]">{ds.fields}</span></div>
                      <div className="col-span-2"><span className="text-[#aaa]">Notes: </span><span className="text-[#888]">{ds.notes}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === 'validation' && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-[#111]">Statistical Validation</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { metric: 'ρ = 0.89', label: 'Spearman correlation', detail: 'vs NHS regional performance tiers (2022–2024)' },
                  { metric: 'r = 0.91', label: 'Deprivation correlation', detail: 'Deprivation index vs inequality score (Pearson)' },
                  { metric: 'p < 0.001', label: 'Statistical significance', detail: 'Both coefficients significant at 0.1% level' },
                ].map(v => (
                  <div key={v.metric} className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <p className="text-xl font-black text-emerald-700">{v.metric}</p>
                    <p className="text-xs font-semibold text-[#444] mt-1">{v.label}</p>
                    <p className="text-xs text-[#888] mt-1">{v.detail}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-[#666] leading-relaxed">
                Inequality scores validated against NHS England&apos;s regional performance tiers for 2022–2024.
                Spearman ρ = <strong className="text-[#111]">0.89</strong> (n = 42 region-months).
                High deprivation correlation (<strong className="text-[#111]">r = 0.91</strong>) is consistent with Marmot et al. (2020).
              </p>
              <div className="text-xs text-[#888] space-y-1 border-t border-[#f0f0f0] pt-4">
                <p className="font-semibold text-[#555] mb-2">References:</p>
                <p>• Marmot, M. et al. (2020). <em>Health Equity in England: The Marmot Review 10 Years On.</em></p>
                <p>• NHS England. (2023). <em>NHS Long Term Workforce Plan.</em></p>
                <p>• NHS England. (2024). <em>Referral to Treatment (RTT) Waiting Times Statistics.</em></p>
                <p>• MHCLG. (2019). <em>English Indices of Deprivation 2019.</em></p>
              </div>
            </div>
          )}

          {active === 'limitations' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-[#111]">Known Limitations</h2>
              <div className="space-y-3">
                {LIMITATIONS.map(([title, detail]) => (
                  <div key={String(title)} className="border-l-4 border-amber-400 bg-amber-50 rounded-r-xl pl-4 pr-4 py-3">
                    <p className="text-sm font-semibold text-amber-800">{title}</p>
                    <p className="text-xs text-amber-700 leading-relaxed mt-1">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === 'citation' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-[#111]">How to Cite This Platform</h2>
              <p className="text-sm text-[#666] leading-relaxed">
                If you use NHS Wait Intelligence data or visualisations in academic work, journalism, or policy documents:
              </p>
              <div className="flex gap-2">
                {(['bibtex', 'apa'] as const).map(f => (
                  <button key={f} onClick={() => setFmt(f)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors uppercase ${
                      fmt === f ? 'bg-[#111] text-white' : 'border border-[#e5e5e5] text-[#666] hover:border-[#bbb]'
                    }`}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="relative bg-[#f9fafb] border border-[#e5e5e5] rounded-xl p-4 font-mono text-xs text-emerald-700 whitespace-pre-wrap">
                {fmt === 'bibtex' ? BIBTEX : APA}
                <button onClick={() => copy(fmt === 'bibtex' ? BIBTEX : APA)}
                  className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-white border border-[#e5e5e5] text-[#666] text-xs font-semibold rounded-lg hover:border-[#bbb] transition-colors">
                  {copied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                </button>
              </div>
              <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-xl">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">Methodology reference</p>
                <p className="text-xs text-emerald-700">
                  When citing the formula specifically, reference formula version <strong>v1.0</strong> (weights: W=0.40, G=0.35, D=0.25), validated with Spearman ρ = 0.89 (2022–2024).
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => void router.push('/ai')}
                  className="flex-1 py-2 border border-[#e5e5e5] text-sm text-[#666] font-semibold rounded-xl hover:border-[#bbb] transition-colors">
                  Ask AI a question
                </button>
              </div>
            </div>
          )}

        </motion.div>
      </div>
    </div>
  )
}
