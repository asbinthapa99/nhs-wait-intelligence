import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

import { getInequality, InequalityRegion, EMPTY_INEQUALITY } from '../lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface CompareMetric {
  key: keyof InequalityRegion
  label: string
  format: (v: number) => string
  higherIsBetter: boolean
}

const METRICS: CompareMetric[] = [
  { key: 'score', label: 'Inequality score', format: (v) => `${v}/100`, higherIsBetter: false },
  { key: 'pct_over_18_weeks', label: '% over 18 weeks', format: (v) => `${v}%`, higherIsBetter: false },
  { key: 'deprivation_index', label: 'Deprivation index', format: (v) => `${(v * 100).toFixed(0)}/100`, higherIsBetter: false },
  { key: 'backlog_rate', label: 'Backlog per 100k', format: (v) => `${v}`, higherIsBetter: false },
]

const TREND_COLORS: Record<string, string> = {
  improving: 'text-green-600 bg-green-50',
  stable: 'text-amber-600 bg-amber-50',
  deteriorating: 'text-red-600 bg-red-50',
}

function GapBar({ a, b, metric }: { a: number; b: number; metric: CompareMetric }) {
  const max = Math.max(a, b, 1)
  const pctA = (a / max) * 100
  const pctB = (b / max) * 100
  const aWorse = metric.higherIsBetter ? a < b : a > b
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-sm bg-nhs-navy flex-shrink-0" />
        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${aWorse ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${pctA}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-700 w-16 text-right">{metric.format(a)}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-sm bg-blue-500 flex-shrink-0" />
        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${!aWorse ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${pctB}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-700 w-16 text-right">{metric.format(b)}</span>
      </div>
    </div>
  )
}

export default function ComparePage() {
  const router = useRouter()
  const [regions, setRegions] = useState<InequalityRegion[]>([])
  const [regionA, setRegionA] = useState('')
  const [regionB, setRegionB] = useState('')
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getInequality()
      .then((d) => {
        setRegions(d.regions)
        if (d.regions.length >= 2) {
          const worst = d.regions.reduce((a, b) => a.score > b.score ? a : b)
          const best = d.regions.reduce((a, b) => a.score < b.score ? a : b)
          setRegionA(worst.name)
          setRegionB(best.name)
        }
      })
      .catch(() => setRegions(EMPTY_INEQUALITY.regions))
      .finally(() => setLoading(false))
  }, [])

  const dataA = regions.find((r) => r.name === regionA)
  const dataB = regions.find((r) => r.name === regionB)

  const runAIAnalysis = async () => {
    if (!dataA || !dataB || aiLoading) return
    setAiLoading(true)
    setAiAnalysis('')
    setStreaming(false)

    const question = `Compare ${regionA} (inequality score ${dataA.score}/100, deprivation ${(dataA.deprivation_index * 100).toFixed(0)}/100, ${dataA.pct_over_18_weeks}% over 18 weeks) with ${regionB} (inequality score ${dataB.score}/100, deprivation ${(dataB.deprivation_index * 100).toFixed(0)}/100, ${dataB.pct_over_18_weeks}% over 18 weeks). What explains the gap? What are the key drivers and what policy interventions would most effectively help ${dataA.score > dataB.score ? regionA : regionB}?`

    try {
      const res = await fetch(`${API_BASE}/api/ai-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history: [] }),
      })
      if (res.ok && res.body) {
        setStreaming(true)
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6))
              if (event.done) setStreaming(false)
              else if (event.text) setAiAnalysis((prev) => prev + event.text)
            } catch { /* skip malformed */ }
          }
        }
        setAiLoading(false)
        return
      }
    } catch { /* fall through */ }

    // Non-streaming fallback
    try {
      const res = await fetch(`${API_BASE}/api/ai-explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history: [] }),
      })
      const data = res.ok ? await res.json() : null
      setAiAnalysis(data?.response ?? 'AI analysis unavailable — check backend connection.')
    } catch {
      setAiAnalysis('AI analysis unavailable — check backend connection.')
    } finally {
      setAiLoading(false)
      setStreaming(false)
    }
  }

  const askFollowUp = () => {
    if (!dataA || !dataB) return
    const q = `Tell me more about the inequality gap between ${regionA} and ${regionB}`
    router.push(`/ai?q=${encodeURIComponent(q)}`)
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Region Comparator</h1>
        <p className="text-sm text-slate-500 mt-1">
          Select any two NHS regions for a side-by-side analysis with AI-powered gap explanation.
        </p>
      </div>

      {/* Region selectors */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-white rounded-2xl border-2 border-nhs-navy p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Region A</p>
          <select
            value={regionA}
            onChange={(e) => { setRegionA(e.target.value); setAiAnalysis('') }}
            className="w-full text-sm font-semibold text-slate-800 bg-transparent border-none outline-none"
            disabled={loading}
          >
            <option value="">Select region...</option>
            {regions.map((r) => (
              <option key={r.id} value={r.name} disabled={r.name === regionB}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="bg-white rounded-2xl border-2 border-blue-500 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Region B</p>
          <select
            value={regionB}
            onChange={(e) => { setRegionB(e.target.value); setAiAnalysis('') }}
            className="w-full text-sm font-semibold text-slate-800 bg-transparent border-none outline-none"
            disabled={loading}
          >
            <option value="">Select region...</option>
            {regions.map((r) => (
              <option key={r.id} value={r.name} disabled={r.name === regionA}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {dataA && dataB ? (
        <>
          {/* Side-by-side KPI cards */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            {[dataA, dataB].map((d, idx) => (
              <div key={d.name} className={`bg-white rounded-2xl border-2 p-5 ${idx === 0 ? 'border-nhs-navy' : 'border-blue-500'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-nhs-navy' : 'bg-blue-500'}`} />
                  <p className="text-sm font-bold text-slate-800">{d.name}</p>
                </div>
                <p className={`text-4xl font-bold mb-1 ${d.score >= 70 ? 'text-red-600' : d.score >= 50 ? 'text-amber-600' : 'text-green-600'}`}>
                  {d.score}
                  <span className="text-base font-medium text-slate-400">/100</span>
                </p>
                <p className="text-xs text-slate-500 mb-3">Inequality score</p>
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Over 18 weeks</span>
                    <span className="font-semibold text-slate-800">{d.pct_over_18_weeks}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Deprivation</span>
                    <span className="font-semibold text-slate-800">{(d.deprivation_index * 100).toFixed(0)}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Backlog / 100k</span>
                    <span className="font-semibold text-slate-800">{d.backlog_rate}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-slate-500">Trend</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TREND_COLORS[d.trend] ?? 'bg-slate-100 text-slate-600'}`}>
                      {d.trend}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Gap summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Metric comparison</h2>
            <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-nhs-navy" />{regionA}</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500" />{regionB}</div>
              <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center gap-1"><div className="w-3 h-2 rounded-full bg-red-500" />Worse</div>
                <div className="flex items-center gap-1"><div className="w-3 h-2 rounded-full bg-green-500" />Better</div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {METRICS.map((m) => (
                <div key={m.key}>
                  <p className="text-xs font-medium text-slate-600 mb-1.5">{m.label}</p>
                  <GapBar
                    a={dataA[m.key] as number}
                    b={dataB[m.key] as number}
                    metric={m}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Gap: {Math.abs((dataA[m.key] as number) - (dataB[m.key] as number)).toFixed(1)}
                    {m.key === 'deprivation_index'
                      ? ' (×100)'
                      : m.key === 'pct_over_18_weeks' ? '%' : ''}
                    {' '}({dataA.score > dataB.score ? regionA : regionB} is{' '}
                    {(
                      Math.abs(((dataA[m.key] as number) - (dataB[m.key] as number)) /
                        Math.max(dataB[m.key] as number, 0.01)) * 100
                    ).toFixed(0)}% higher)
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* AI analysis */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800">AI gap analysis</h2>
              {!aiAnalysis && (
                <button
                  onClick={runAIAnalysis}
                  disabled={aiLoading}
                  className="px-4 py-2 bg-nhs-navy text-white text-xs font-semibold rounded-full hover:bg-nhs-blue transition-colors disabled:opacity-50"
                >
                  {aiLoading ? 'Analysing...' : 'Analyse gap with AI'}
                </button>
              )}
            </div>

            {!aiAnalysis && !aiLoading && (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-xl">✨</div>
                <p className="text-sm text-slate-500">
                  Click &ldquo;Analyse gap with AI&rdquo; to get a Claude-powered explanation of what drives the
                  inequality gap between these two regions and what policy interventions could help.
                </p>
              </div>
            )}

            {aiLoading && !aiAnalysis && (
              <div className="flex gap-2 items-center py-4">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}

            {aiAnalysis && (
              <>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {aiAnalysis}
                  {streaming && <span className="inline-block w-1.5 h-4 bg-slate-400 ml-0.5 animate-pulse rounded-sm align-middle" />}
                </p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={askFollowUp}
                    className="flex-1 py-2.5 border-2 border-nhs-blue text-nhs-blue rounded-full text-sm font-semibold hover:bg-blue-50 transition-colors"
                  >
                    Continue in AI chat
                  </button>
                  <button
                    onClick={() => { setAiAnalysis(''); runAIAnalysis() }}
                    disabled={aiLoading}
                    className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-full text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-40"
                  >
                    Regenerate
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        !loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            Select two regions above to begin the comparison.
          </div>
        )
      )}
    </>
  )
}
