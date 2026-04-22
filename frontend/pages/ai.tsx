import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Send, RotateCcw, AlertTriangle, ChevronRight,
  Zap, User, BrainCircuit, Info, Radio
} from 'lucide-react'
import DataStatusBanner from '../components/DataStatusBanner'
import { DataStatus, getDataStatus, getRegions, RegionDetail, AnomalyAlert, getAnomalies } from '../lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  cached?: boolean
  agentic?: boolean
  streaming?: boolean
  animating?: boolean
}

// Inline markdown → JSX renderer (handles bold, italic, inline code, bullets, numbered lists, headings)
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  function parseInline(s: string): React.ReactNode {
    const parts: React.ReactNode[] = []
    const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g
    let last = 0, m: RegExpExecArray | null
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) parts.push(s.slice(last, m.index))
      if (m[2]) parts.push(<strong key={m.index} className="font-bold text-[#111]">{m[2]}</strong>)
      else if (m[3]) parts.push(<em key={m.index} className="italic">{m[3]}</em>)
      else if (m[4]) parts.push(<code key={m.index} className="px-1 py-0.5 bg-[#f0f0f0] rounded text-[11px] font-mono text-[#333]">{m[4]}</code>)
      last = m.index + m[0].length
    }
    if (last < s.length) parts.push(s.slice(last))
    return parts
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) { nodes.push(<div key={i} className="h-2" />); i++; continue }

    if (/^#{1,2}\s/.test(trimmed)) {
      const content = trimmed.replace(/^#{1,2}\s/, '')
      nodes.push(<p key={i} className="font-bold text-[#111] text-sm mt-3 mb-1">{parseInline(content)}</p>)
      i++; continue
    }
    if (/^###\s/.test(trimmed)) {
      const content = trimmed.replace(/^###\s/, '')
      nodes.push(<p key={i} className="font-semibold text-[#333] text-xs mt-2 mb-0.5">{parseInline(content)}</p>)
      i++; continue
    }

    // Collect consecutive bullet items
    if (/^[-•*]\s/.test(trimmed)) {
      const items: React.ReactNode[] = []
      while (i < lines.length && /^[-•*]\s/.test(lines[i].trim())) {
        const content = lines[i].trim().replace(/^[-•*]\s/, '')
        items.push(<li key={i} className="flex items-start gap-2 text-sm"><span className="text-emerald-600 mt-1 shrink-0">•</span><span>{parseInline(content)}</span></li>)
        i++
      }
      nodes.push(<ul key={`ul-${i}`} className="space-y-1.5 my-2">{items}</ul>)
      continue
    }

    // Collect consecutive numbered items
    if (/^\d+\.\s/.test(trimmed)) {
      const items: React.ReactNode[] = []
      let n = 1
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const content = lines[i].trim().replace(/^\d+\.\s/, '')
        items.push(
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="text-emerald-600 font-bold shrink-0 w-4 text-right">{n}.</span>
            <span>{parseInline(content)}</span>
          </li>
        )
        i++; n++
      }
      nodes.push(<ol key={`ol-${i}`} className="space-y-1.5 my-2">{items}</ol>)
      continue
    }

    nodes.push(<p key={i} className="text-sm leading-relaxed">{parseInline(trimmed)}</p>)
    i++
  }

  return <div className="space-y-1">{nodes}</div>
}

// Character-by-character typewriter component
function TypewriterText({ text, speed = 8 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const indexRef = useRef(0)

  useEffect(() => {
    indexRef.current = 0
    setDisplayed('')
    setDone(false)
    const interval = setInterval(() => {
      if (indexRef.current >= text.length) {
        clearInterval(interval)
        setDone(true)
        return
      }
      const chunk = text.slice(indexRef.current, indexRef.current + 3)
      setDisplayed(prev => prev + chunk)
      indexRef.current += 3
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  if (done) return <>{renderMarkdown(text)}</>

  return (
    <span className="whitespace-pre-line text-sm leading-relaxed">
      {displayed}
      <span className="inline-block w-0.5 h-3.5 bg-emerald-500 ml-0.5 animate-pulse rounded-sm align-middle" />
    </span>
  )
}

const ROLE_QUESTIONS: Record<string, string[]> = {
  policy: [
    'How does deprivation correlate with waiting times across England?',
    'Which regions should receive priority funding this quarter?',
    'What policy levers effectively reduced the gap in 2024?',
  ],
  operational: [
    'Which specialty has seen the fastest growth in waiting times?',
    'What is driving the inequality score in the Midlands?',
    'Compare outsourcing vs capacity increases for the North West.',
  ],
  clinical: [
    'Which clinical areas are at highest risk of missing the 18-week standard?',
    'How do staffing shortages correlate with wait times in cardiology?',
    'Is the delay in elective surgery affecting outcomes unevenly?',
  ],
}

const fade = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.2 } } }
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
  const inputRef = useRef<HTMLInputElement>(null)
  const prefillFiredRef = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    void (async () => {
      const [regRes, stRes] = await Promise.allSettled([getRegions(), getDataStatus()])
      if (regRes.status === 'fulfilled') setRegions(regRes.value)
      else setError('Could not load region data from the API.')
      if (stRes.status === 'fulfilled') setStatus(stRes.value)
      try { setAnomalies(await getAnomalies()) } catch { /* ignore */ }
    })()
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
    const userMsg: Message = { role: 'user', content: question }
    const history = messages.map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    if (deepMode) {
      try {
        const res = await fetch(`${API_BASE}/api/agent-explain`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, region: region || undefined }),
        })
        const data = res.ok ? await res.json() : null
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data?.response ?? 'Deep analysis endpoint unavailable.',
          agentic: true,
        }])
      } catch {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Deep analysis is unavailable. Check the backend agent configuration.', agentic: true }])
      } finally {
        setLoading(false)
      }
      return
    }

    // Try streaming first
    try {
      const res = await fetch(`${API_BASE}/api/ai-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, region: region || undefined, history }),
      })
      if (res.ok && res.body) {
        setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])
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
              if (event.done) setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, streaming: false } : m))
              else if (event.text) setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: m.content + event.text } : m))
            } catch { /* ignore malformed */ }
          }
        }
        setLoading(false)
        return
      }
    } catch { /* fall through to non-streaming */ }

    // Non-streaming fallback
    try {
      const res = await fetch(`${API_BASE}/api/ai-explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, region: region || undefined, history }),
      })
      const data = res.ok ? await res.json() : null
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data?.response ?? 'AI service is unavailable. Check backend connection.',
        cached: data?.cached,
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'AI service is unavailable right now. Check the backend connection.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); void sendQuestion(input) }
  const clearChat = () => setMessages([])

  return (
    <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
      className="max-w-7xl mx-auto pb-24 space-y-4">

      {/* ── Header ── */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e5e5] pb-5 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
            <BrainCircuit size={18} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">AI Insights</h1>
            <p className="text-xs text-[#999] mt-0.5">Ask anything about NHS waiting list data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button onClick={clearChat}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[#e5e5e5] rounded-lg text-[#888] hover:text-[#111] hover:border-[#bbb] transition-colors bg-white">
              <RotateCcw size={11} /> Clear chat
            </button>
          )}
          <button onClick={() => setDeepMode(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
              deepMode ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-[#e5e5e5] text-[#666] hover:text-[#111] hover:border-[#bbb]'
            }`}>
            <Zap size={11} /> {deepMode ? 'Deep Analysis ON' : 'Deep Analysis'}
          </button>
        </div>
      </motion.div>

      <DataStatusBanner status={status} />

      {error && (
        <motion.div variants={fade} className="flex items-center gap-3 border border-red-200 bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="shrink-0" /> {error}
        </motion.div>
      )}

      {deepMode && (
        <motion.div variants={fade} className="flex items-start gap-3 border border-violet-200 bg-violet-50 text-violet-800 text-xs rounded-xl px-4 py-3 leading-relaxed">
          <Info size={14} className="shrink-0 mt-0.5 text-violet-500" />
          <span><strong>Deep Analysis mode:</strong> The backend SQL agent explores the live NHS database directly. Responses are slower but more precise.</span>
        </motion.div>
      )}

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Chat Panel ── */}
        <motion.div variants={fade} className="lg:col-span-2 flex flex-col bg-white border border-[#e5e5e5] rounded-xl overflow-hidden" style={{ height: 'clamp(360px, 60vh, 680px)' }}>

          {/* Role tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-[#f0f0f0]">
            <span className="text-[10px] text-[#bbb] uppercase tracking-widest font-semibold mr-2">View as:</span>
            {(['policy', 'operational', 'clinical'] as const).map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold capitalize transition-colors ${
                  role === r ? 'bg-[#111] text-white' : 'text-[#888] hover:text-[#111] hover:bg-[#f5f5f5]'
                }`}>
                {r}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
                <div className="w-14 h-14 rounded-full bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center">
                  <Sparkles size={22} className="text-[#bbb]" />
                </div>
                <div>
                  <p className="text-[#333] font-semibold text-sm">Ask anything about NHS waiting lists</p>
                  <p className="text-xs text-[#aaa] mt-1.5 max-w-xs">Try asking about regions, specialties, growth trends, or policy comparisons.</p>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-sm">
                  {ROLE_QUESTIONS[role].map(q => (
                    <button key={q} onClick={() => void sendQuestion(q)} disabled={loading}
                      className="text-left text-xs text-[#555] px-3 py-2.5 rounded-lg border border-[#e5e5e5] hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-colors flex items-start gap-2">
                      <ChevronRight size={12} className="shrink-0 mt-0.5 text-[#bbb]" /> {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence>
              {messages.map((m, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                  className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${m.agentic ? 'bg-violet-100 text-violet-600' : 'bg-emerald-100 text-emerald-700'}`}>
                      <BrainCircuit size={14} />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#111] text-white rounded-tr-sm'
                      : 'bg-[#f9fafb] border border-[#efefef] text-[#1a1a1a] rounded-tl-sm'
                  }`}>
                    {m.role === 'assistant' && !m.streaming ? (
                      <TypewriterText text={m.content} speed={6} />
                    ) : (
                      <span className="whitespace-pre-line">{m.content}</span>
                    )}
                    {m.streaming && (
                      <span className="inline-block w-0.5 h-3.5 bg-emerald-500 ml-0.5 animate-pulse rounded-sm align-middle" />
                    )}
                    {m.role === 'assistant' && !m.streaming && m.content && (
                      <p className="text-[10px] mt-2 text-[#bbb]">
                        {m.agentic ? '⚡ Deep SQL analysis' : m.cached ? '💾 Cached response' : '✨ Generated by AI'}
                      </p>
                    )}
                  </div>
                  {m.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-[#111] flex items-center justify-center text-white shrink-0 mt-0.5">
                      <User size={13} />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {loading && !messages.some(m => m.streaming) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <BrainCircuit size={14} className="text-emerald-700" />
                </div>
                <div className="bg-[#f9fafb] border border-[#efefef] rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-2 h-2 bg-[#ccc] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-[#f0f0f0] px-2 py-1.5 flex gap-1.5 bg-white items-center">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={deepMode ? 'Deep question...' : 'Ask anything...'}
              className="flex-1 text-[11px] px-2.5 py-1.5 rounded-md border border-[#e5e5e5] focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 bg-[#fafafa] text-[#111] placeholder:text-[#ccc] transition-all min-w-0"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className={`shrink-0 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-white text-[11px] font-semibold disabled:opacity-40 transition-colors ${
                deepMode ? 'bg-violet-600 hover:bg-violet-500' : 'bg-[#111] hover:bg-[#333]'
              }`}>
              <Send size={10} />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </motion.div>

        {/* ── Sidebar ── */}
        <motion.div variants={fade} className="flex flex-col gap-4">

          {/* Region focus */}
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-4">
            <p className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-3">Focus on Region</p>
            <select value={region} onChange={e => setRegion(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-[#e5e5e5] focus:outline-none focus:border-emerald-400 bg-[#fafafa] text-[#1a1a1a] cursor-pointer">
              <option value="">All England</option>
              {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
          </div>

          {/* Live anomalies */}
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Radio size={12} className="text-red-500 animate-pulse" />
              <p className="text-[11px] font-semibold text-[#999] uppercase tracking-widest">Live Anomalies</p>
            </div>
            <div className="flex flex-col gap-2">
              {anomalies.length > 0 ? anomalies.slice(0, 3).map((a, i) => (
                <div key={i} className="p-3 rounded-lg border border-[#f0f0f0] bg-[#fafafa]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#111]">{a.region}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      a.severity === 'High' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                    }`}>{a.severity}</span>
                  </div>
                  <p className="text-[11px] text-[#888] leading-snug">{a.description}</p>
                </div>
              )) : (
                <p className="text-xs text-[#bbb] italic text-center py-3">No anomalies detected.</p>
              )}
            </div>
          </div>

          {/* Suggested questions */}
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-4">
            <p className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-3">
              Suggested — {role} view
            </p>
            <div className="flex flex-col gap-2">
              {ROLE_QUESTIONS[role].map(q => (
                <button key={q} onClick={() => void sendQuestion(q)} disabled={loading}
                  className="text-left text-xs text-[#555] px-3 py-2.5 rounded-lg border border-[#f0f0f0] hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-40 flex items-start gap-2">
                  <ChevronRight size={11} className="shrink-0 mt-0.5 text-[#ccc]" /> {q}
                </button>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-xl p-4">
            <p className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-2">How it works</p>
            <p className="text-[11px] text-[#888] leading-relaxed">
              {deepMode
                ? 'Deep Analysis uses a SQL agent to query the live NHS database directly. Slower but highly accurate.'
                : 'Standard mode uses NHS context data. Responses may stream token-by-token or return cached answers.'}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {['NHS England datasets', 'ONS Deprivation', 'RTT Pipeline'].map(s => (
                <span key={s} className="text-[10px] text-[#aaa] border border-[#e5e5e5] rounded px-2 py-0.5">{s}</span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
