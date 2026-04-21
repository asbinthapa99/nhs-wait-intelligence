import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'

import DataStatusBanner from '../components/DataStatusBanner'
import { DataStatus, getDataStatus, getRegions, RegionDetail, AnomalyAlert, getAnomalies } from '../lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  cached?: boolean
  agentic?: boolean
  streaming?: boolean
}

const SUGGESTED_QUESTIONS = [
  'Why is the North East performing so much worse than the South West?',
  'Which specialty has seen the fastest growth in waiting times?',
  'What is driving the inequality score in the Midlands?',
  'How does deprivation correlate with waiting times across England?',
  'What would it take to close the regional gap by 2026?',
]

const ROLE_QUESTIONS = {
  policy: [
    'How does deprivation correlate with waiting times across England?',
    'Which regions should receive priority funding this quarter?',
    'What policy levers effectively reduced the gap in 2024?'
  ],
  operational: [
    'Which specialty has seen the fastest growth in waiting times?',
    'What is driving the inequality score in the Midlands?',
    'Compare outsourcing vs capacity increases for the North West.'
  ],
  clinical: [
    'What clinical areas show the highest risk of missing the 18-week standard?',
    'How do staffing shortages correlate with wait times in cardiology?',
    'Is the delay in elective surgery affecting clinical outcomes unevenly across regions?'
  ]
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function AIInsightsPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [region, setRegion] = useState('')
  const [regions, setRegions] = useState<RegionDetail[]>([])
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [deepMode, setDeepMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([])
  const [role, setRole] = useState<'policy' | 'operational' | 'clinical'>('policy')

  const bottomRef = useRef<HTMLDivElement>(null)
  const prefillFiredRef = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const loadContext = async () => {
      const [regionsResult, statusResult] = await Promise.allSettled([getRegions(), getDataStatus()])

      if (regionsResult.status === 'fulfilled') {
        setRegions(regionsResult.value)
      } else {
        setRegions([])
        setError('AI page could not load region metadata from the API.')
      }

      if (statusResult.status === 'fulfilled') {
        setStatus(statusResult.value)
      }
      
      try {
        const anomalyData = await getAnomalies()
        setAnomalies(anomalyData)
      } catch {
        // Ignore anomaly failure
      }
    }

    void loadContext()
  }, [])

  useEffect(() => {
    if (!router.isReady || prefillFiredRef.current) return
    const q = router.query.q
    if (typeof q === 'string' && q.trim()) {
      prefillFiredRef.current = true
      void sendQuestion(q.trim())
      void router.replace('/ai', undefined, { shallow: true })
    }
  }, [router, router.isReady, router.query.q])

  const sendQuestion = async (question: string) => {
    if (!question.trim() || loading) return

    const userMessage: Message = { role: 'user', content: question }
    const history = messages.map((m) => ({ role: m.role, content: m.content }))

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    if (deepMode) {
      await sendAgentQuestion(question)
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/ai-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, region: region || undefined, history }),
      })

      if (res.ok && res.body) {
        setMessages((prev) => [...prev, { role: 'assistant', content: '', streaming: true }])

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
              if (event.done) {
                setMessages((prev) =>
                  prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, streaming: false } : m
                  )
                )
              } else if (event.text) {
                setMessages((prev) =>
                  prev.map((m, i) =>
                    i === prev.length - 1
                      ? { ...m, content: m.content + event.text }
                      : m
                  )
                )
              }
            } catch {
              // Ignore malformed SSE payloads.
            }
          }
        }
        setLoading(false)
        return
      }
    } catch {
      // Fall through to the non-streaming request.
    }

    try {
      const res = await fetch(`${API_BASE}/api/ai-explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, region: region || undefined, history }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.response, cached: data.cached },
        ])
      } else {
        throw new Error('API unavailable')
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'AI service is unavailable right now. Check the backend connection and try again.',
          cached: false,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const sendAgentQuestion = async (question: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/agent-explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, region: region || undefined }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.response, agentic: true },
        ])
      } else {
        throw new Error('Agent API unavailable')
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Deep analysis is unavailable right now. Check the backend connection and agent configuration.',
          agentic: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void sendQuestion(input)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-violet-400 font-bold text-sm">AI</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Insights</h1>
            <p className="text-sm text-slate-400 mt-0.5">Ask questions about NHS waiting list data. Powered by Claude.</p>
          </div>
        </div>
        <button
          onClick={() => setDeepMode((value) => !value)}
          className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border transition-colors ${
            deepMode
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-slate-100'
          }`}
        >
          {deepMode ? 'Deep Analysis ON' : 'Deep Analysis'}
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['policy', 'operational', 'clinical'] as const).map(r => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors capitalize ${
              role === r 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            {r} View
          </button>
        ))}
      </div>

      <DataStatusBanner status={status} />

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-900/50 bg-rose-950/20 p-3 text-sm text-rose-400">
          {error}
        </div>
      ) : null}

      {deepMode ? (
        <div className="mb-4 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 leading-relaxed">
          <strong className="text-slate-100">Deep Analysis mode:</strong> the backend SQL agent explores the live NHS database directly. Responses are slower and depend on the agent endpoint being configured correctly.
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden h-[60vh] min-h-[500px] max-h-[700px]">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 text-sm font-bold">
                  AI
                </div>
                <div>
                  <p className="text-slate-300 font-semibold">
                    Ask me anything about NHS waiting lists!
                  </p>
                  <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
                    Try asking about specific hospitals, why wait times are growing, or how your area compares to others.
                  </p>
                </div>
              </div>
            ) : null}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' ? (
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1 ${
                      m.agentic ? 'bg-slate-800' : 'bg-[#005eb8]'
                    }`}
                  >
                    AI
                  </div>
                ) : null}
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 border border-slate-700 text-slate-200'
                  }`}
                >
                  {m.content}
                  
                  {m.role === 'assistant' && !m.streaming && m.content.length > 50 && (
                    <div className="mt-3 p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
                      <div className="text-xs font-bold text-slate-300 mb-1">Helpful Suggestions:</div>
                      <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1">
                        <li>Consider comparing these numbers to last year's data.</li>
                        <li>Look into how staffing shortages might be affecting this.</li>
                      </ul>
                    </div>
                  )}

                  {m.streaming ? (
                    <span className="inline-block w-1.5 h-4 bg-slate-500 ml-0.5 animate-pulse rounded-sm align-middle" />
                  ) : null}
                  {m.role === 'assistant' && !m.streaming ? (
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-slate-500">
                        {m.agentic
                          ? 'Deep search through database'
                          : m.cached
                          ? 'Saved answer'
                          : 'Generated by AI'}
                      </p>
                    </div>
                  ) : null}
                </div>
                {m.role === 'user' ? (
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold flex-shrink-0 mt-1">
                    You
                  </div>
                ) : null}
              </div>
            ))}

            {loading && !messages.some((m) => m.streaming) ? (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-slate-700">
                  AI
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-slate-800 p-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={deepMode ? 'Ask a deep data question...' : 'Ask about wait times, regions, or care...'}
              className="flex-1 text-sm px-4 py-2.5 rounded-full border border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-800 text-slate-100 placeholder:text-slate-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className={`px-5 py-2.5 text-white text-sm font-bold rounded-full disabled:opacity-40 transition-colors ${
                deepMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              Send
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Focus on region</p>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500 bg-slate-800 text-slate-200"
            >
              <option value="">All England</option>
              {regions.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-900 border border-rose-900/40 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10 text-rose-500 text-4xl">⚠</div>
            <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Live Anomalies
            </p>
            <div className="flex flex-col gap-2">
              {anomalies.length > 0 ? anomalies.slice(0, 3).map((anomaly, idx) => (
                <div key={idx} className="bg-slate-800 border border-slate-700 rounded-lg p-2.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-200 text-xs">{anomaly.region}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      anomaly.severity === 'High' ? 'bg-rose-900/60 text-rose-400' : 'bg-amber-900/60 text-amber-400'
                    }`}>{anomaly.severity}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-tight">{anomaly.description}</p>
                </div>
              )) : (
                <p className="text-xs text-slate-500 italic">No statistical anomalies detected.</p>
              )}
            </div>
          </div>

          <div className="card p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Suggested for {role} role</p>
            <div className="flex flex-col gap-2">
              {ROLE_QUESTIONS[role].map((q) => (
                <button
                  key={q}
                  onClick={() => void sendQuestion(q)}
                  disabled={loading}
                  className="text-left text-xs text-slate-300 px-3 py-2.5 rounded-lg border border-slate-700 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-500/5 transition-colors disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${
            deepMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-800/60 border-slate-700'
          }`}>
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">How it works</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              {deepMode
                ? 'Deep Analysis calls the backend SQL agent directly. Responses are not cached and depend on the agent endpoint and database being available.'
                : 'Standard questions call the Claude-backed AI endpoints and may stream or return cached responses depending on backend configuration.'}
            </p>
          </div>

          <div className="text-center flex flex-col gap-1 items-center justify-center text-[10px] text-slate-600">
            <div className="flex gap-2">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-700" />NHS England datasets</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-700" />ONS Deprivation Index</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
