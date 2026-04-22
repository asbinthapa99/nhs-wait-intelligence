import { useState } from 'react'
import { motion } from 'framer-motion'
import { Code2, Copy, CheckCircle2, Terminal, ExternalLink, Key, ChevronDown, ChevronUp } from 'lucide-react'

const fade = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://nhs-wait-intelligence-production.up.railway.app'

const ENDPOINTS = [
  { method: 'GET', path: '/health', desc: 'Service health check. Returns database connectivity status.', example: `curl ${BASE}/health`, response: `{ "status": "ok", "db": "ok" }` },
  { method: 'GET', path: '/api/overview', desc: 'National overview — total waiting list, % over 18 weeks, trend, and worst regions.', example: `curl ${BASE}/api/overview`, response: `{\n  "total_waiting": 7600000,\n  "pct_over_18_weeks": 38.4,\n  "regional_gap": 2.4,\n  "monthly_trend": [...]\n}` },
  { method: 'GET', path: '/api/regions', desc: 'All 7 NHS England regions with inequality scores, deprivation index, and waiting list metrics.', example: `curl ${BASE}/api/regions`, response: `[\n  {\n    "id": 1,\n    "name": "North East and Yorkshire",\n    "inequality_score": 74,\n    "pct_over_18_weeks": 41.2,\n    "trend": "deteriorating"\n  }\n]` },
  { method: 'GET', path: '/api/regions/{id}', desc: 'Single region detail by numeric ID.', example: `curl ${BASE}/api/regions/1`, response: `{ "id": 1, "name": "...", "total_waiting": 1200000 }` },
  { method: 'GET', path: '/api/specialties', desc: 'Clinical specialty breakdown — backlog size, breach rate, and year-on-year change.', example: `curl ${BASE}/api/specialties`, response: `{\n  "specialties": [\n    { "name": "Orthopaedics", "total_waiting": 680000, "pct_over_18_weeks": 48.1 }\n  ]\n}` },
  { method: 'GET', path: '/api/trends', desc: 'Monthly backlog time series per region plus 6-month ML forecasts.', example: `curl "${BASE}/api/trends?regions=North+East"`, response: `{ "series": [...], "forecast": [...] }` },
  { method: 'GET', path: '/api/inequality', desc: 'Inequality analysis — gap ratio between best and worst region, scatter data.', example: `curl ${BASE}/api/inequality`, response: `{ "gap_ratio": 2.4, "best_region": "...", "worst_region": "..." }` },
  { method: 'GET', path: '/api/anomalies', desc: 'Statistical outlier detection — regions deviating from expected range (z-score).', example: `curl ${BASE}/api/anomalies`, response: `[{ "region": "...", "metric": "pct_over_18_weeks", "z_score": 2.8, "severity": "high" }]` },
  { method: 'GET', path: '/api/status/data', desc: 'Data pipeline status — last processed month, staleness, row counts.', example: `curl ${BASE}/api/status/data`, response: `{ "has_live_data": true, "latest_processed_month": "2024-12", "days_since_latest_snapshot": 14 }` },
  { method: 'GET', path: '/api/export/inequality.csv', desc: 'Download inequality dataset as CSV.', example: `curl -o inequality.csv ${BASE}/api/export/inequality.csv`, response: `region,score,deprivation_index,pct_over_18_weeks,...` },
  { method: 'GET', path: '/api/export/specialties.csv', desc: 'Download specialty breakdown as CSV.', example: `curl -o specialties.csv ${BASE}/api/export/specialties.csv`, response: `specialty,total_waiting,pct_over_18_weeks,yoy_change` },
  { method: 'GET', path: '/api/export/trends.csv', desc: 'Download monthly trend data as CSV.', example: `curl -o trends.csv "${BASE}/api/export/trends.csv?regions=London"`, response: `region,month,value` },
  { method: 'POST', path: '/api/ai-explain', desc: 'Ask Claude an NHS analytics question. Returns structured response with data context.', example: `curl -X POST ${BASE}/api/ai-explain \\\n  -H "Content-Type: application/json" \\\n  -d '{"question": "Which region is worst?", "region": "North East"}'`, response: `{ "response": "...", "data_context": { "inequality_score": 74 }, "cached": false }` },
]

const METHOD_STYLE: Record<string, string> = {
  GET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-50 text-blue-700 border-blue-200',
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group">
      <pre className="bg-[#f5f5f5] border border-[#e5e5e5] rounded-xl p-4 text-xs text-[#333] overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap break-all">
        {code}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white border border-[#e5e5e5] hover:border-[#bbb] text-[#999] hover:text-[#111] transition-colors opacity-0 group-hover:opacity-100"
      >
        {copied ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />}
      </button>
    </div>
  )
}

export default function APIDocsPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 max-w-4xl mx-auto py-2 pb-24">

      {/* Header */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Code2 size={18} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">Public API</h1>
            <p className="text-xs text-[#999] mt-0.5">Free, open access to processed NHS waiting list data. No API key required.</p>
          </div>
        </div>
        <a
          href="https://github.com/asbinthapa99/nhs-wait-intelligence"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-[#666] border border-[#e5e5e5] bg-white px-3 py-2 rounded-lg hover:border-[#bbb] transition-colors shrink-0"
        >
          GitHub <ExternalLink size={12} />
        </a>
      </motion.div>

      {/* Base URL */}
      <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl p-5 hover:border-[#bbb] hover:shadow-sm transition-all">
        <div className="flex items-center gap-2 mb-3">
          <Terminal size={14} className="text-[#bbb]" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#999]">Base URL</p>
        </div>
        <CodeBlock code={BASE} />
        <p className="text-xs text-[#aaa] mt-3 leading-relaxed">
          All responses are JSON. Rate limited to <strong className="text-[#666]">60 requests / minute</strong> per IP.
          Data refreshes monthly from official NHS England RTT statistics.
        </p>
      </motion.div>

      {/* Quick start */}
      <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl p-5 hover:border-[#bbb] hover:shadow-sm transition-all">
        <div className="flex items-center gap-2 mb-3">
          <Key size={14} className="text-[#bbb]" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#999]">Quick Start</p>
        </div>
        <CodeBlock code={`# Get the national overview\ncurl ${BASE}/api/overview\n\n# Get all NHS regions with inequality scores\ncurl ${BASE}/api/regions\n\n# Ask the AI a question\ncurl -X POST ${BASE}/api/ai-explain \\\n  -H "Content-Type: application/json" \\\n  -d '{"question": "Which region has the worst inequality?"}'`} />
      </motion.div>

      {/* Endpoint list */}
      <motion.div variants={fade}>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#999] mb-4">Endpoints ({ENDPOINTS.length})</p>
        <div className="space-y-2">
          {ENDPOINTS.map((ep, idx) => (
            <div key={ep.path} className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden hover:border-[#bbb] transition-colors">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#fafafa] transition-colors"
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              >
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border shrink-0 ${METHOD_STYLE[ep.method]}`}>
                  {ep.method}
                </span>
                <code className="text-sm text-[#111] font-mono">{ep.path}</code>
                <span className="text-xs text-[#bbb] flex-1 truncate hidden sm:block ml-2">{ep.desc}</span>
                {openIdx === idx
                  ? <ChevronUp size={14} className="text-[#bbb] shrink-0" />
                  : <ChevronDown size={14} className="text-[#bbb] shrink-0" />}
              </button>

              {openIdx === idx && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="border-t border-[#f0f0f0] px-4 pb-4 pt-3 space-y-3"
                >
                  <p className="text-xs text-[#888] leading-relaxed">{ep.desc}</p>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-1.5">Example request</p>
                    <CodeBlock code={ep.example} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-1.5">Example response</p>
                    <CodeBlock code={ep.response} />
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Rate limits + attribution */}
      <motion.div variants={fade} className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 hover:border-[#bbb] transition-all">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#999] mb-3">Rate limits</p>
          <ul className="text-xs text-[#888] space-y-1.5 leading-relaxed">
            <li>• 60 requests / minute per IP (unauthenticated)</li>
            <li>• CSV exports count as 5 requests</li>
            <li>• AI endpoints: 10 requests / minute</li>
            <li>• Exceeding limits returns HTTP 429</li>
          </ul>
        </div>
        <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 hover:border-[#bbb] transition-all">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#999] mb-3">Attribution</p>
          <p className="text-xs text-[#888] leading-relaxed">
            Data sourced from NHS England RTT statistics and ONS deprivation indices. If you publish work using this API, please credit{' '}
            <a href="https://nhs-wait-intelligence.vercel.app" className="text-emerald-700 hover:text-emerald-600 font-medium" target="_blank" rel="noopener noreferrer">
              NHS Wait Intelligence
            </a>.
          </p>
        </div>
      </motion.div>

    </motion.div>
  )
}
