import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import {
  Sparkles, Send, RotateCcw, AlertTriangle, ChevronRight,
  Zap, User, BrainCircuit, Info, Radio, Copy, Check,
  Square, RefreshCw
} from 'lucide-react'
import DataStatusBanner from '../components/DataStatusBanner'
import { DataStatus, getDataStatus, getRegions, RegionDetail, AnomalyAlert, getAnomalies } from '../lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  cached?: boolean
  agentic?: boolean
  streaming?: boolean
  provider?: string
  ts: number
}

// ── Markdown renderer ──────────────────────────────────────────────────────────
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
      if (m[2]) parts.push(<strong key={m.index} className="font-semibold text-[#111]">{m[2]}</strong>)
      else if (m[3]) parts.push(<em key={m.index} className="italic">{m[3]}</em>)
      else if (m[4]) parts.push(<code key={m.index} className="px-1 py-0.5 bg-[#eee] rounded text-[11px] font-mono text-[#333]">{m[4]}</code>)
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
      nodes.push(<p key={i} className="font-semibold text-[#111] text-sm mt-3 mb-1">{parseInline(trimmed.replace(/^#{1,2}\s/, ''))}</p>)
      i++; continue
    }
    if (/^###\s/.test(trimmed)) {
      nodes.push(<p key={i} className="font-medium text-[#333] text-xs mt-2 mb-0.5">{parseInline(trimmed.replace(/^###\s/, ''))}</p>)
      i++; continue
    }
    if (/^[-•*]\s/.test(trimmed)) {
      const items: React.ReactNode[] = []
      while (i < lines.length && /^[-•*]\s/.test(lines[i].trim())) {
        items.push(<li key={i} className="flex items-start gap-2 text-sm"><span className="text-emerald-600 mt-1 shrink-0 text-xs">•</span><span>{parseInline(lines[i].trim().replace(/^[-•*]\s/, ''))}</span></li>)
        i++
      }
      nodes.push(<ul key={`ul-${i}`} className="space-y-1 my-2 ml-1">{items}</ul>)
      continue
    }
    if (/^\d+\.\s/.test(trimmed)) {
      const items: React.ReactNode[] = []
      let n = 1
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(<li key={i} className="flex items-start gap-2 text-sm"><span className="text-emerald-600 font-semibold shrink-0 w-4 text-right text-xs">{n}.</span><span>{parseInline(lines[i].trim().replace(/^\d+\.\s/, ''))}</span></li>)
        i++; n++
      }
      nodes.push(<ol key={`ol-${i}`} className="space-y-1 my-2 ml-1">{items}</ol>)
      continue
    }
    nodes.push(<p key={i} className="text-sm leading-relaxed">{parseInline(trimmed)}</p>)
    i++
  }
  return <div className="space-y-1">{nodes}</div>
}

// ── Typewriter ────────────────────────────────────────────────────────────────
function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const idxRef = useRef(0)

  useEffect(() => {
    idxRef.current = 0
    setDisplayed('')
    setDone(false)
    const t = setInterval(() => {
      if (idxRef.current >= text.length) { clearInterval(t); setDone(true); return }
      setDisplayed(p => p + text.slice(idxRef.current, idxRef.current + 4))
      idxRef.current += 4
    }, 12)
    return () => clearInterval(t)
  }, [text])

  if (done) return <>{renderMarkdown(text)}</>
  return <span className="whitespace-pre-line text-sm leading-relaxed">{displayed}<span className="inline-block w-0.5 h-3.5 bg-emerald-500 ml-0.5 animate-pulse rounded-sm align-middle" /></span>
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button onClick={copy} title="Copy" className="p-1 rounded hover:bg-[#f0f0f0] text-[#bbb] hover:text-[#666]">
      {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
    </button>
  )
}

// ── Time format ───────────────────────────────────────────────────────────────
function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ── Suggested questions ───────────────────────────────────────────────────────
const ROLE_QUESTIONS: Record<string, string[]> = {
  policy: [
    'How does deprivation correlate with waiting times?',
    'Which regions need priority funding this quarter?',
    'What policy levers cut the gap in 2024?',
  ],
  operational: [
    'Which specialty has the fastest-growing backlog?',
    'What is driving inequality in the Midlands?',
    'Compare outsourcing vs capacity for the North West.',
  ],
  clinical: [
    'Which specialties are at highest risk of missing 18-week standard?',
    'How do staffing shortages correlate with wait times?',
    'Are surgical delays affecting outcomes unevenly?',
  ],
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
  const abortRef = useRef<AbortController | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prefillFiredRef = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

  useEffect(() => {
    void (async () => {
      const [regRes, stRes] = await Promise.allSettled([getRegions(), getDataStatus()])
      if (regRes.status === 'fulfilled') setRegions(regRes.value)
      else setError('Could not load region data.')
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

  const stopGeneration = () => {
    abortRef.current?.abort()
    setLoading(false)
    setMessages(prev => prev.map((m, i) =>
      i === prev.length - 1 && m.streaming ? { ...m, streaming: false } : m
    ))
  }

  const sendQuestion = useCallback(async (question: string) => {
    if (!question.trim() || loading) return
    const history = messages.map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [...prev, { role: 'user', content: question, ts: Date.now() }])
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
        setMessages(prev => [...prev, { role: 'assistant', content: data?.response ?? 'Deep analysis endpoint unavailable.', agentic: true, ts: Date.now() }])
      } catch {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Deep analysis is unavailable right now.', agentic: true, ts: Date.now() }])
      } finally { setLoading(false) }
      return
    }

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch(`${API_BASE}/api/ai-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, region: region || undefined, history }),
        signal: ctrl.signal,
      })
      if (res.ok && res.body) {
        setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true, ts: Date.now() }])
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n\n')
          buf = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const ev = JSON.parse(line.slice(6))
              if (ev.done) setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, streaming: false, provider: ev.provider ?? m.provider } : m))
              else if (ev.text) setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: m.content + ev.text } : m))
            } catch { /* ignore */ }
          }
        }
        setLoading(false)
        return
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') { setLoading(false); return }
    }

    // Non-streaming fallback
    try {
      const res = await fetch(`${API_BASE}/api/ai-explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, region: region || undefined, history }),
      })
      const data = res.ok ? await res.json() : null
      setMessages(prev => [...prev, { role: 'assistant', content: data?.response ?? 'Could not reach the AI service.', cached: data?.cached, provider: data?.provider, ts: Date.now() }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Unable to reach the backend. Make sure the server is running.', ts: Date.now() }])
    } finally { setLoading(false) }
  }, [loading, messages, region, deepMode])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendQuestion(input)
    }
  }

  const regenerate = () => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (lastUser) {
      setMessages(prev => prev.slice(0, -1))
      void sendQuestion(lastUser.content)
    }
  }

  const clearChat = () => setMessages([])

  const charCount = input.length
  const charLimit = 500

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e5e5] pb-5 pt-1">
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
            <button onClick={clearChat} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[#e5e5e5] rounded-lg text-[#888] hover:text-[#111] hover:border-[#bbb] bg-white">
              <RotateCcw size={11} /> New chat
            </button>
          )}
          <button onClick={() => setDeepMode(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border ${deepMode ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-[#e5e5e5] text-[#666] hover:text-[#111] hover:border-[#bbb]'}`}>
            <Zap size={11} /> {deepMode ? 'Deep ON' : 'Deep Analysis'}
          </button>
        </div>
      </div>

      <DataStatusBanner status={status} />

      {error && (
        <div className="flex items-center gap-3 border border-red-200 bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="shrink-0" /> {error}
        </div>
      )}

      {deepMode && (
        <div className="flex items-start gap-3 border border-violet-200 bg-violet-50 text-violet-800 text-xs rounded-xl px-4 py-3 leading-relaxed">
          <Info size={14} className="shrink-0 mt-0.5 text-violet-500" />
          <span><strong>Deep Analysis:</strong> Queries the live NHS database directly via a SQL agent. Slower but precise.</span>
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Chat panel */}
        <div className="lg:col-span-2 flex flex-col bg-white border border-[#e5e5e5] rounded-xl overflow-hidden" style={{ height: 'clamp(480px, 68vh, 760px)' }}>

          {/* Role tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-[#f0f0f0]">
            <span className="text-[10px] text-[#bbb] uppercase tracking-widest font-semibold mr-2">Role:</span>
            {(['policy', 'operational', 'clinical'] as const).map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold capitalize ${role === r ? 'bg-[#111] text-white' : 'text-[#888] hover:text-[#111] hover:bg-[#f5f5f5]'}`}>
                {r}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-emerald-100 border border-[#e5e5e5] flex items-center justify-center">
                  <Sparkles size={20} className="text-violet-500" />
                </div>
                <div>
                  <p className="text-[#222] font-semibold text-base">How can I help you today?</p>
                  <p className="text-xs text-[#aaa] mt-1.5 max-w-xs leading-relaxed">Ask me anything — NHS data, regional inequality, specialty trends, or policy analysis.</p>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                  {ROLE_QUESTIONS[role].map(q => (
                    <button key={q} onClick={() => void sendQuestion(q)} disabled={loading}
                      className="text-left text-xs text-[#555] px-3.5 py-3 rounded-xl border border-[#e5e5e5] hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 flex items-start gap-2.5">
                      <ChevronRight size={12} className="shrink-0 mt-0.5 text-[#ccc]" /> {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${m.agentic ? 'bg-violet-100 text-violet-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    <BrainCircuit size={15} />
                  </div>
                )}

                <div className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#111] text-white rounded-tr-sm'
                      : 'bg-[#f8f9fa] border border-[#ebebeb] text-[#1a1a1a] rounded-tl-sm'
                  }`}>
                    {m.role === 'assistant' && !m.streaming
                      ? <TypewriterText text={m.content} />
                      : <span className="whitespace-pre-line">{m.content}</span>
                    }
                    {m.streaming && (
                      <span className="inline-block w-0.5 h-3.5 bg-emerald-500 ml-0.5 animate-pulse rounded-sm align-middle" />
                    )}
                  </div>

                  {/* Message meta */}
                  <div className={`flex items-center gap-2 px-1 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-[10px] text-[#ccc]">{fmtTime(m.ts)}</span>
                    {m.role === 'assistant' && !m.streaming && m.content && (
                      <>
                        <CopyButton text={m.content} />
                        {m.provider && m.provider !== 'cached' && m.provider !== 'local' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f0f0f0] text-[#999] font-medium">{m.provider}</span>
                        )}
                        {m.provider === 'local' && (
                          <span className="text-[10px] text-[#ccc]">local</span>
                        )}
                        {m.cached && <span className="text-[10px] text-[#ccc]">cached</span>}
                        {/* Regenerate on last assistant message */}
                        {i === messages.length - 1 && !loading && (
                          <button onClick={regenerate} title="Regenerate" className="p-1 rounded hover:bg-[#f0f0f0] text-[#ccc] hover:text-[#666]">
                            <RefreshCw size={11} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-[#111] flex items-center justify-center text-white shrink-0 mt-0.5">
                    <User size={13} />
                  </div>
                )}
              </div>
            ))}

            {/* Thinking dots */}
            {loading && !messages.some(m => m.streaming) && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <BrainCircuit size={15} />
                </div>
                <div className="bg-[#f8f9fa] border border-[#ebebeb] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#ccc] rounded-full" style={{ animation: 'pulse 1.2s ease-in-out 0s infinite' }} />
                  <span className="w-1.5 h-1.5 bg-[#ccc] rounded-full" style={{ animation: 'pulse 1.2s ease-in-out 0.4s infinite' }} />
                  <span className="w-1.5 h-1.5 bg-[#ccc] rounded-full" style={{ animation: 'pulse 1.2s ease-in-out 0.8s infinite' }} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-[#f0f0f0] px-3 py-2.5 bg-white">
            <div className={`flex gap-2 items-end rounded-xl border ${loading ? 'border-[#e5e5e5]' : 'border-[#ddd] focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-50'} bg-[#fafafa] px-3 py-2`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={deepMode ? 'Ask a deep data question...' : 'Message NHS AI...'}
                rows={1}
                maxLength={charLimit}
                disabled={loading}
                className="flex-1 resize-none bg-transparent text-sm text-[#111] placeholder:text-[#bbb] focus:outline-none min-w-0 leading-relaxed"
                style={{ maxHeight: 120 }}
              />
              <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
                {charCount > 380 && (
                  <span className={`text-[10px] font-medium ${charCount > 470 ? 'text-red-400' : 'text-[#bbb]'}`}>{charLimit - charCount}</span>
                )}
                {loading ? (
                  <button onClick={stopGeneration} title="Stop" className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-100 text-red-500 hover:bg-red-200">
                    <Square size={11} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    onClick={() => void sendQuestion(input)}
                    disabled={!input.trim()}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-white disabled:opacity-30 ${deepMode ? 'bg-violet-600 hover:bg-violet-500' : 'bg-[#111] hover:bg-[#333]'}`}>
                    <Send size={12} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-[10px] text-[#ccc] mt-1.5 px-1">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">

          {/* Region */}
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-4">
            <p className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-3">Focus Region</p>
            <select value={region} onChange={e => setRegion(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-[#e5e5e5] focus:outline-none focus:border-emerald-400 bg-[#fafafa] text-[#1a1a1a] cursor-pointer">
              <option value="">All England</option>
              {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
          </div>

          {/* Live anomalies */}
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Radio size={11} className="text-red-400" />
              <p className="text-[11px] font-semibold text-[#999] uppercase tracking-widest">Live Anomalies</p>
            </div>
            <div className="flex flex-col gap-2">
              {anomalies.length > 0 ? anomalies.slice(0, 3).map((a, i) => (
                <button key={i} onClick={() => void sendQuestion(`Tell me about the ${a.region} anomaly: ${a.description}`)}
                  className="text-left p-3 rounded-lg border border-[#f0f0f0] bg-[#fafafa] hover:border-emerald-200 hover:bg-emerald-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#111]">{a.region}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${a.severity === 'High' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>{a.severity}</span>
                  </div>
                  <p className="text-[11px] text-[#888] leading-snug">{a.description}</p>
                </button>
              )) : (
                <p className="text-xs text-[#bbb] italic text-center py-3">No anomalies detected.</p>
              )}
            </div>
          </div>

          {/* Suggested */}
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-4">
            <p className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-3">Suggested</p>
            <div className="flex flex-col gap-2">
              {ROLE_QUESTIONS[role].map(q => (
                <button key={q} onClick={() => void sendQuestion(q)} disabled={loading}
                  className="text-left text-xs text-[#555] px-3 py-2.5 rounded-lg border border-[#f0f0f0] hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 flex items-start gap-2">
                  <ChevronRight size={11} className="shrink-0 mt-0.5 text-[#ccc]" /> {q}
                </button>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-[#fafafa] border border-[#eee] rounded-xl p-4 space-y-2">
            <p className="text-[11px] font-semibold text-[#999] uppercase tracking-widest">Tips</p>
            {[
              'Ask follow-up questions to dig deeper',
              'Select a region to get local data',
              'Use Deep Analysis for precise SQL queries',
            ].map(t => (
              <p key={t} className="text-[11px] text-[#aaa] flex items-start gap-1.5 leading-relaxed">
                <span className="text-emerald-400 shrink-0 mt-0.5">·</span> {t}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
