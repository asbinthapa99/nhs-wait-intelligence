import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import {
  Newspaper, RefreshCw, ExternalLink, Sparkles, Clock, AlertCircle, Radio,
} from 'lucide-react'

interface Article {
  title: string
  url: string
  summary: string
  published: string
  source: string
  tag: string
  relevance: number
  comment: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// RSS feeds via rss2json proxy — works without a backend
const RSS_FEEDS = [
  { url: 'https://www.england.nhs.uk/feed/', source: 'NHS England' },
  { url: 'https://feeds.bbci.co.uk/news/health/rss.xml', source: 'BBC Health' },
  { url: 'https://www.theguardian.com/society/nhs/rss', source: 'Guardian NHS' },
  { url: 'https://www.pulsetoday.co.uk/feed/', source: 'Pulse Today' },
]

const RSS2JSON = 'https://api.rss2json.com/v1/api.json?count=15&rss_url='

function tagFromTitle(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('wait') || t.includes('backlog') || t.includes('list') || t.includes('elective')) return 'waiting_lists'
  if (t.includes('fund') || t.includes('budget') || t.includes('spend') || t.includes('billion')) return 'funding'
  if (t.includes('staff') || t.includes('nurse') || t.includes('doctor') || t.includes('workforce')) return 'workforce'
  if (t.includes('inequal') || t.includes('deprivat') || t.includes('dispar')) return 'inequality'
  if (t.includes('policy') || t.includes('government') || t.includes('minister') || t.includes('reform')) return 'policy'
  if (t.includes('digital') || t.includes('ai') || t.includes('tech') || t.includes('data')) return 'digital'
  return 'general'
}

async function fetchRssFeed(feed: typeof RSS_FEEDS[0]): Promise<Article[]> {
  const res = await fetch(`${RSS2JSON}${encodeURIComponent(feed.url)}`)
  if (!res.ok) return []
  const data = await res.json()
  if (data.status !== 'ok' || !Array.isArray(data.items)) return []
  return data.items.slice(0, 12).map((item: Record<string, string>) => ({
    title: item.title ?? '',
    url: item.link ?? '',
    summary: item.description?.replace(/<[^>]+>/g, '').slice(0, 200) ?? '',
    published: item.pubDate ?? '',
    source: feed.source,
    tag: tagFromTitle(item.title ?? ''),
    relevance: 0,
    comment: '',
  }))
}

const TAG_STYLES: Record<string, string> = {
  waiting_lists: 'bg-red-100 text-red-700 border-red-200',
  funding: 'bg-amber-100 text-amber-700 border-amber-200',
  workforce: 'bg-blue-100 text-blue-700 border-blue-200',
  inequality: 'bg-purple-100 text-purple-700 border-purple-200',
  policy: 'bg-slate-100 text-slate-700 border-slate-200',
  digital: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  general: 'bg-slate-100 text-slate-500 border-slate-200',
}

const TAG_LABELS: Record<string, string> = {
  waiting_lists: 'Waiting Lists',
  funding: 'Funding',
  workforce: 'Workforce',
  inequality: 'Inequality',
  policy: 'Policy',
  digital: 'Digital',
  general: 'General',
}

const ALL_TAGS = ['all', 'waiting_lists', 'funding', 'workforce', 'inequality', 'policy', 'digital']

const SOURCE_COLORS: Record<string, string> = {
  'NHS England': 'text-nhs-blue',
  'BBC Health': 'text-red-600',
  'Guardian NHS': 'text-blue-800',
  'Pulse Today': 'text-teal-700',
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  return `${days}d ago`
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-20 bg-slate-100 rounded-full" />
        <div className="h-5 w-16 bg-slate-100 rounded-full" />
      </div>
      <div className="h-4 bg-slate-100 rounded w-full mb-2" />
      <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
      <div className="h-3 bg-slate-100 rounded w-full mb-1" />
      <div className="h-3 bg-slate-100 rounded w-5/6" />
    </div>
  )
}

export default function NewsPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeTag, setActiveTag] = useState('all')
  const [activeSource, setActiveSource] = useState('all')
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const [dataSource, setDataSource] = useState<'backend' | 'rss'>('rss')

  const fetchNews = useCallback(async () => {
    setLoading(true)
    setError(false)

    // Try backend first
    try {
      const res = await fetch(`${API_BASE}/api/news`, { signal: AbortSignal.timeout(4000) })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.articles) && data.articles.length > 0) {
          setArticles(data.articles)
          setDataSource('backend')
          setLastFetched(new Date())
          setLoading(false)
          return
        }
      }
    } catch {
      // Backend not available — fall through to RSS
    }

    // Fallback: fetch RSS feeds directly
    try {
      const results = await Promise.allSettled(RSS_FEEDS.map(fetchRssFeed))
      const merged: Article[] = results
        .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
        .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())

      if (merged.length === 0) {
        setError(true)
      } else {
        setArticles(merged)
        setDataSource('rss')
        setLastFetched(new Date())
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchNews() }, [fetchNews])

  const sources = ['all', ...Array.from(new Set(articles.map((a) => a.source)))]

  const filtered = articles.filter((a) => {
    const tagMatch = activeTag === 'all' || a.tag === activeTag
    const srcMatch = activeSource === 'all' || a.source === activeSource
    return tagMatch && srcMatch
  })

  const tagCounts = ALL_TAGS.slice(1).reduce<Record<string, number>>((acc, t) => {
    acc[t] = articles.filter((a) => a.tag === t).length
    return acc
  }, {})

  const featured = filtered[0]
  const rest = filtered.slice(1)

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center justify-center w-9 h-9 bg-nhs-navy rounded-xl">
              <Newspaper size={17} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">NHS News</h1>
          </div>
          <p className="text-sm text-slate-500 ml-11">
            Live health headlines from NHS England, BBC Health, The Guardian and more.
          </p>
        </div>
        <button
          onClick={fetchNews}
          disabled={loading}
          className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-200 rounded-full text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Status row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-5 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
        {!loading && lastFetched ? (
          <>
            <span className="flex items-center gap-1.5 font-medium text-green-700">
              <Radio size={11} className="animate-pulse" />
              {dataSource === 'backend' ? 'AI-triaged via backend' : 'Live RSS — direct feeds'}
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1.5">
              <Clock size={11} />
              Updated {lastFetched.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-slate-300">|</span>
            <span>{articles.length} articles</span>
            {dataSource === 'backend' && (
              <>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1">
                  <Sparkles size={11} className="text-nhs-blue" />
                  AI relevance scores by Claude Haiku
                </span>
              </>
            )}
          </>
        ) : (
          <span className="flex items-center gap-1.5">
            <RefreshCw size={11} className="animate-spin text-slate-400" />
            Fetching latest headlines…
          </span>
        )}
      </div>

      {/* Tag filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {ALL_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              activeTag === tag
                ? 'bg-nhs-navy text-white border-nhs-navy'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            {tag === 'all' ? 'All' : TAG_LABELS[tag]}
            {tag !== 'all' && tagCounts[tag] > 0 && (
              <span className={`ml-1.5 font-normal ${activeTag === tag ? 'opacity-70' : 'text-slate-400'}`}>
                {tagCounts[tag]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Source filters */}
      {sources.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {sources.map((src) => (
            <button
              key={src}
              onClick={() => setActiveSource(src)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeSource === src
                  ? 'bg-slate-800 text-white'
                  : `text-slate-500 hover:text-slate-700 hover:bg-slate-100 ${src !== 'all' ? SOURCE_COLORS[src] ?? '' : ''}`
              }`}
            >
              {src === 'all' ? 'All sources' : src}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-start gap-4 bg-red-50 border border-red-200 rounded-2xl p-6">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800 mb-1">Could not load news</p>
            <p className="text-sm text-red-600 mb-3">
              RSS feeds may be rate-limited or unreachable. Please try again in a moment.
            </p>
            <button
              onClick={fetchNews}
              className="text-sm font-medium text-red-700 underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500 text-sm">
          No articles found for this filter combination.
        </div>
      )}

      {/* Featured article */}
      {!loading && !error && featured && (
        <div className="mb-6">
          <a
            href={featured.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-white rounded-2xl border border-slate-200 hover:border-nhs-blue/40 transition-all hover:shadow-lg hover:shadow-blue-50 p-6"
          >
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${TAG_STYLES[featured.tag] ?? TAG_STYLES.general}`}>
                {TAG_LABELS[featured.tag] ?? featured.tag}
              </span>
              <span className={`text-xs font-semibold ${SOURCE_COLORS[featured.source] ?? 'text-slate-600'}`}>
                {featured.source}
              </span>
              <span className="text-xs text-slate-400">{timeAgo(featured.published)}</span>
              <span className="ml-auto text-xs text-slate-300 flex items-center gap-1 group-hover:text-nhs-blue transition-colors">
                Read article <ExternalLink size={11} />
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-nhs-blue transition-colors leading-snug mb-2">
              {featured.title}
            </h2>
            {featured.summary && (
              <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                {featured.summary}
              </p>
            )}
            {featured.comment && (
              <div className="mt-3 bg-blue-50 rounded-xl px-4 py-2.5">
                <p className="text-xs text-nhs-blue leading-relaxed">
                  <span className="font-bold">AI analysis:</span> {featured.comment}
                </p>
              </div>
            )}
          </a>
        </div>
      )}

      {/* Article grid */}
      {!loading && !error && rest.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rest.map((article, i) => (
            <a
              key={i}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white rounded-2xl border border-slate-200 hover:border-nhs-blue/40 transition-all hover:shadow-md hover:shadow-blue-50 p-4 flex flex-col"
            >
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${TAG_STYLES[article.tag] ?? TAG_STYLES.general}`}>
                  {TAG_LABELS[article.tag] ?? article.tag}
                </span>
                <span className={`text-xs font-semibold ${SOURCE_COLORS[article.source] ?? 'text-slate-500'}`}>
                  {article.source}
                </span>
                <span className="ml-auto text-xs text-slate-400">{timeAgo(article.published)}</span>
              </div>

              <h3 className="text-sm font-semibold text-slate-800 group-hover:text-nhs-blue transition-colors leading-snug mb-2 flex-1 line-clamp-3">
                {article.title}
              </h3>

              {article.summary && (
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">
                  {article.summary}
                </p>
              )}

              {article.comment && (
                <div className="bg-blue-50 rounded-lg px-3 py-2 mb-2">
                  <p className="text-xs text-nhs-blue leading-relaxed line-clamp-2">
                    <span className="font-semibold">AI:</span> {article.comment}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                {article.relevance > 0 ? (
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div
                        key={j}
                        className={`w-1.5 h-1.5 rounded-full ${
                          j < Math.ceil(article.relevance / 2)
                            ? article.relevance >= 8 ? 'bg-red-500' : article.relevance >= 5 ? 'bg-amber-400' : 'bg-slate-300'
                            : 'bg-slate-100'
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-xs text-slate-400">{article.relevance}/10</span>
                  </div>
                ) : (
                  <span />
                )}
                <span className="text-xs text-nhs-blue flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Read <ExternalLink size={10} />
                </span>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Footer note */}
      {!loading && !error && articles.length > 0 && (
        <p className="text-xs text-slate-400 text-center mt-8 pb-4">
          Headlines from NHS England, BBC Health, The Guardian & Pulse Today.
          {dataSource === 'backend' && ' AI relevance scores generated by Claude Haiku.'}
          {' '}Refreshes automatically.
        </p>
      )}
    </>
  )
}
