import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Sparkles, ChevronRight } from 'lucide-react'

interface Bullet {
  heading: string
  detail: string
}

interface AIInsightsPanelProps {
  topic: 'overview' | 'inequality' | 'specialties' | 'trends'
  askQuestion?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function AIInsightsPanel({ topic, askQuestion }: AIInsightsPanelProps) {
  const router = useRouter()
  const [bullets, setBullets] = useState<Bullet[]>([])
  const [loading, setLoading] = useState(true)
  const [cached, setCached] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/api/ai-insights?topic=${topic}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setBullets(data.bullets ?? [])
        setCached(data.cached ?? false)
      })
      .catch(() => {
        setBullets([])
        setError('AI insights could not be loaded.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [topic])

  const handleAsk = () => {
    const q = askQuestion ?? `Tell me more about the ${topic} data`
    router.push(`/ai?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-100">AI Insights</h2>
        </div>
        <div className="flex items-center gap-3">
          {!loading && (
            <span className="text-[11px] text-slate-500">
              {cached ? '⚡ cached' : '🤖 live'}
            </span>
          )}
          <button
            onClick={handleAsk}
            className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            Ask AI <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Bullets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-slate-800 rounded-lg p-3 space-y-2 animate-pulse">
                <div className="h-2.5 bg-slate-700 rounded w-2/3" />
                <div className="h-2 bg-slate-700 rounded w-full" />
                <div className="h-2 bg-slate-700 rounded w-3/4" />
              </div>
            ))
          : bullets.slice(0, 3).map((b, i) => (
              <div key={i} className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-400 mb-1">{b.heading}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{b.detail}</p>
              </div>
            ))}
        {!loading && !bullets.length && (
          <div className="col-span-3 text-xs text-slate-500 py-2">
            {error ?? 'No AI insights available yet.'}
          </div>
        )}
      </div>
    </div>
  )
}
