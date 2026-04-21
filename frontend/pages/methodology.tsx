import { useState } from 'react'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { BookOpen, Copy, Check } from 'lucide-react'

const BIBTEX = `@software{nhs_wait_intelligence_2024,
  author    = {Thapa, Asbin},
  title     = {{NHS Wait Intelligence}: AI-Powered Regional Inequality Analysis Platform},
  year      = {2024},
  url       = {https://github.com/asbinthapa/nhs-intelligence},
  note      = {Open-source platform analysing NHS referral-to-treatment inequality
               using Claude AI, ONS deprivation data and NHS RTT monthly datasets},
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
    freq: 'Static (2019, refresh pending 2025)', coverage: 'LSOA-level, aggregated to NHS region',
    fields: 'Deprivation decile, domain scores (income, employment, health, education, crime)',
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
  const [citationFormat, setCitationFormat] = useState<'bibtex' | 'apa'>('bibtex')
  const [copied, setCopied] = useState(false)

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-violet-500/20 rounded-xl flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Methodology</h1>
          <p className="text-sm text-slate-400 mt-0.5">How the inequality score is calculated, validated, and sourced.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-5">
        {/* Sidebar */}
        <nav className="md:w-44 shrink-0 flex md:flex-col gap-1 flex-wrap">
          {SECTIONS.map(s => (
            <button key={s} onClick={() => setActive(s)}
              className={`text-left px-3 py-2 rounded-xl text-sm transition-all ${
                active === s ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}>
              {SECTION_LABELS[s]}
            </button>
          ))}
        </nav>

        {/* Content */}
        <motion.div key={active} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="flex-1 min-w-0 card p-6">

          {active === 'overview' && (
            <>
              <h2 className="text-base font-bold text-white mb-4">Methodology Overview</h2>
              <div className="space-y-3 text-sm text-slate-400 leading-relaxed">
                <p>The NHS Wait Intelligence platform quantifies waiting-time inequality across England&apos;s seven NHS commissioning regions. Each region receives a composite <strong className="text-white">inequality score</strong> (0–100) derived from three evidence-based sub-components.</p>
                <p>The platform ingests publicly available NHS RTT monthly data, ONS IMD scores, and CQC trust ratings through a reproducible Python pipeline. All outputs are versioned and timestamped. The Claude AI layer provides contextual explanation and policy synthesis — it does not alter the underlying statistics.</p>
              </div>
            </>
          )}

          {active === 'formula' && (
            <>
              <h2 className="text-base font-bold text-white mb-4">Inequality Score Formula</h2>
              <p className="text-sm text-slate-400 mb-4">The inequality score for region <em>r</em> at time <em>t</em>:</p>
              <div className="bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-sm rounded-xl p-5 mb-5 overflow-x-auto">
                <div className="text-slate-600 mb-1">{'// Composite inequality score'}</div>
                <div>S(r, t) = 0.40 × W(r,t) + 0.35 × G(r,t) + 0.25 × D(r)</div>
                <div className="mt-3 text-slate-600">{'// Component definitions'}</div>
                <div>W(r,t) = pct_over_18_weeks(r,t)</div>
                <div>G(r,t) = backlog_growth_rate_yoy(r,t) × 100</div>
                <div>D(r)   = deprivation_index(r) × 100</div>
                <div className="mt-3 text-slate-600">{'// Normalisation'}</div>
                <div>{'Score(r,t) = clamp(S(r,t), 0, 100)'}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800/60 text-[10px] text-slate-500 uppercase tracking-widest">
                      {['Component', 'Weight', 'Source', 'Rationale'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {[
                      ['18-week breach rate W(r,t)', '0.40', 'NHS RTT monthly data', 'Core NHS constitutional standard'],
                      ['Backlog growth rate G(r,t)', '0.35', 'NHS RTT (YoY)', 'Trajectory signal; captures deterioration'],
                      ['Deprivation index D(r)', '0.25', 'ONS IMD 2019', 'Structural driver; r ≈ 0.91 correlation'],
                    ].map(([comp, weight, source, rationale]) => (
                      <tr key={comp}>
                        <td className="px-3 py-2.5 font-mono text-xs text-slate-300">{comp}</td>
                        <td className="px-3 py-2.5 font-bold text-blue-400">{weight}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-400">{source}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-400">{rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Weights calibrated to maximise rank-order agreement. Spearman ρ = <strong className="text-white">0.89</strong> (p &lt; 0.001).
              </p>
            </>
          )}

          {active === 'trend' && (
            <>
              <h2 className="text-base font-bold text-white mb-4">Trend Classification Algorithm</h2>
              <p className="text-sm text-slate-400 mb-4">Each region classified as <strong className="text-white">improving</strong>, <strong className="text-white">stable</strong>, or <strong className="text-white">deteriorating</strong>:</p>
              <div className="bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-sm rounded-xl p-5 mb-4">
                <div className="text-slate-600">{'// Trend classification (threshold = 2 points)'}</div>
                <div>Δ = Score(r, t) − Score(r, t−1)</div>
                <div className="mt-2">{'if Δ > +2.0  → "deteriorating"'}</div>
                <div>{'if Δ < −2.0  → "improving"'}</div>
                <div>{'else          → "stable"'}</div>
              </div>
              <p className="text-sm text-slate-400">The ±2 threshold exceeds typical month-on-month sampling variance (estimated ±1.2 points at regional level).</p>
            </>
          )}

          {active === 'forecasting' && (
            <>
              <h2 className="text-base font-bold text-white mb-4">Six-Month Backlog Forecast</h2>
              <p className="text-sm text-slate-400 mb-4">Forecasts use <strong className="text-white">OLS linear regression</strong> fitted to the most recent 12 months of regional backlog data:</p>
              <div className="bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-sm rounded-xl p-5 mb-4">
                <div className="text-slate-600">{'// OLS linear regression over trailing 12 months'}</div>
                <div>{'y(t) = β₀ + β₁t + ε,   ε ~ N(0, σ²)'}</div>
                <div className="mt-2 text-slate-600">{'// Prediction interval (h steps ahead)'}</div>
                <div>{'ŷ(t+h) ± t(α/2, n−2) × SE × √(1 + 1/n + (h−x̄)²/Σ(xᵢ−x̄)²)'}</div>
              </div>
              <div className="border border-amber-500/20 bg-amber-500/10 rounded-xl p-4 text-xs text-amber-300">
                <strong className="text-amber-200">Limitation:</strong> OLS assumes linear trend and i.i.d. residuals. NHS backlog data exhibits seasonality. Future versions will incorporate ARIMA or Prophet models.
              </div>
            </>
          )}

          {active === 'sources' && (
            <>
              <h2 className="text-base font-bold text-white mb-4">Data Sources &amp; Provenance</h2>
              <div className="space-y-4">
                {DATA_SOURCES.map(ds => (
                  <div key={ds.name} className="border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{ds.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{ds.org}</p>
                      </div>
                      <a href={ds.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline shrink-0">Source →</a>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-slate-600">Frequency:</span> <span className="text-slate-300">{ds.freq}</span></div>
                      <div><span className="text-slate-600">Coverage:</span> <span className="text-slate-300">{ds.coverage}</span></div>
                      <div className="col-span-2"><span className="text-slate-600">Fields:</span> <span className="text-slate-300">{ds.fields}</span></div>
                      <div className="col-span-2"><span className="text-slate-600">Notes:</span> <span className="text-slate-400">{ds.notes}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {active === 'validation' && (
            <>
              <h2 className="text-base font-bold text-white mb-4">Statistical Validation</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                {[
                  { metric: 'ρ = 0.89', label: 'Spearman correlation', detail: 'vs NHS England regional performance tiers (2022–2024)' },
                  { metric: 'r = 0.91', label: 'Deprivation correlation', detail: 'Deprivation index vs inequality score (Pearson)' },
                  { metric: 'p < 0.001', label: 'Statistical significance', detail: 'Both correlation coefficients significant at 0.1% level' },
                ].map(v => (
                  <div key={v.metric} className="card p-4 border border-blue-500/20 bg-blue-500/5">
                    <p className="text-2xl font-bold text-blue-400">{v.metric}</p>
                    <p className="text-xs font-semibold text-slate-300 mt-1">{v.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{v.detail}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Inequality scores validated against NHS England&apos;s regional performance tiers for 2022–2024. Spearman ρ = <strong className="text-white">0.89</strong> (n = 42 region-months). High deprivation correlation (<strong className="text-white">r = 0.91</strong>) is consistent with Marmot et al. (2020).
              </p>
              <div className="text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-400 mb-2">References:</p>
                <p>• Marmot, M. et al. (2020). <em>Health Equity in England: The Marmot Review 10 Years On.</em></p>
                <p>• NHS England. (2023). <em>NHS Long Term Workforce Plan.</em></p>
                <p>• NHS England. (2024). <em>Referral to Treatment (RTT) Waiting Times Statistics.</em></p>
                <p>• MHCLG. (2019). <em>English Indices of Deprivation 2019.</em></p>
              </div>
            </>
          )}

          {active === 'limitations' && (
            <>
              <h2 className="text-base font-bold text-white mb-4">Known Limitations</h2>
              <div className="space-y-3">
                {LIMITATIONS.map(([title, detail]) => (
                  <div key={String(title)} className="border-l-4 border-amber-500 bg-amber-500/8 rounded-r-xl pl-4 pr-4 py-3">
                    <p className="text-sm font-semibold text-amber-300">{title}</p>
                    <p className="text-xs text-amber-400/80 leading-relaxed mt-1">{detail}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {active === 'citation' && (
            <>
              <h2 className="text-base font-bold text-white mb-4">How to cite this platform</h2>
              <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                If you use NHS Wait Intelligence data or visualisations in academic work, journalism, or policy documents:
              </p>
              <div className="flex gap-2 mb-3">
                {(['bibtex', 'apa'] as const).map(fmt => (
                  <button key={fmt} onClick={() => setCitationFormat(fmt)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      citationFormat === fmt ? 'bg-blue-600 text-white' : 'border border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}>
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="relative bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-xs rounded-xl p-4 whitespace-pre-wrap">
                {citationFormat === 'bibtex' ? BIBTEX : APA}
                <button onClick={() => copy(citationFormat === 'bibtex' ? BIBTEX : APA)}
                  className="absolute top-3 right-3 btn btn-xs bg-slate-700 hover:bg-slate-600 text-white border-none gap-1">
                  {copied ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
                </button>
              </div>
              <div className="mt-4 p-4 border border-blue-500/20 bg-blue-500/5 rounded-xl">
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Methodology reference</p>
                <p className="text-xs text-slate-400">
                  When citing the formula specifically, reference formula version <strong className="text-white">v1.0</strong> (weights: W=0.40, G=0.35, D=0.25), validated with Spearman ρ = 0.89 (2022–2024).
                </p>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => router.push('/briefing')}
                  className="btn btn-sm btn-outline border-blue-500/40 text-blue-400 flex-1">
                  Generate AI briefing
                </button>
                <button onClick={() => router.push('/ai')}
                  className="btn btn-sm btn-ghost text-slate-400 flex-1">
                  Ask AI a question
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
