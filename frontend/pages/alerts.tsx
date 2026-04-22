import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, AlertTriangle, TrendingUp, Activity,
  RefreshCw, ShieldAlert, Info, Radio, ChevronRight, Mail, CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import { getAnomalies, AnomalyAlert, subscribeAlerts } from '../lib/api'

const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }

// ── Severity config ──────────────────────────────────────────────────────────
const SEV: Record<string, {
  bg: string; border: string; badge: string; badgeBg: string
  iconBg: string; iconColor: string; dot: string; label: string
}> = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'text-red-700',
    badgeBg: 'bg-red-100 border-red-200',
    iconBg: 'bg-red-100 border-red-200',
    iconColor: 'text-red-600',
    dot: 'bg-red-500',
    label: 'Critical',
  },
  high: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'text-amber-700',
    badgeBg: 'bg-amber-100 border-amber-200',
    iconBg: 'bg-amber-100 border-amber-200',
    iconColor: 'text-amber-600',
    dot: 'bg-amber-500',
    label: 'High',
  },
  medium: {
    bg: 'bg-[#fafafa]',
    border: 'border-[#e5e5e5]',
    badge: 'text-emerald-700',
    badgeBg: 'bg-emerald-50 border-emerald-100',
    iconBg: 'bg-emerald-50 border-emerald-100',
    iconColor: 'text-emerald-600',
    dot: 'bg-emerald-500',
    label: 'Medium',
  },
  low: {
    bg: 'bg-white',
    border: 'border-[#e5e5e5]',
    badge: 'text-[#666]',
    badgeBg: 'bg-[#f5f5f5] border-[#e5e5e5]',
    iconBg: 'bg-[#f5f5f5] border-[#e5e5e5]',
    iconColor: 'text-[#888]',
    dot: 'bg-[#ccc]',
    label: 'Low',
  },
}

const METRIC_ICON: Record<string, typeof TrendingUp> = {
  default: Activity,
  pct_over_18_weeks: TrendingUp,
  backlog_rate: TrendingUp,
  total_waiting: TrendingUp,
  inequality_score: AlertTriangle,
}

// ── Single Alert Card ────────────────────────────────────────────────────────
function AlertCard({ alert, index }: { alert: AnomalyAlert; index: number }) {
  const key = alert.severity?.toLowerCase() ?? 'low'
  const s = SEV[key] ?? SEV.low
  const Icon = METRIC_ICON[alert.metric] ?? METRIC_ICON.default
  const aboveExp = alert.value > alert.expected
  const zAbs = Math.abs(alert.z_score)

  return (
    <motion.div
      variants={fade}
      className={`${s.bg} border ${s.border} rounded-xl px-5 py-4 flex items-start gap-4 hover:shadow-sm transition-all`}
    >
      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg ${s.iconBg} border flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon size={15} className={s.iconColor} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className="text-sm font-bold text-[#111]">{alert.region}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${s.badgeBg} ${s.badge}`}>
            {s.label}
          </span>
          <span className="text-[10px] text-[#bbb] border border-[#e5e5e5] px-2 py-0.5 rounded-full font-medium capitalize">
            {alert.metric.replace(/_/g, ' ')}
          </span>
        </div>
        <p className="text-sm text-[#444] leading-snug mb-3">{alert.description}</p>

        {/* Stats strip */}
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#bbb]">Observed</span>
            <span className={`font-bold ${aboveExp ? 'text-red-600' : 'text-emerald-700'}`}>
              {alert.value.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#bbb]">Expected</span>
            <span className="font-semibold text-[#555]">{alert.expected.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#bbb]">Z-score</span>
            <span className={`font-bold ${zAbs > 3 ? 'text-red-600' : zAbs > 2 ? 'text-amber-600' : 'text-[#555]'}`}>
              {alert.z_score > 0 ? '+' : ''}{alert.z_score.toFixed(2)}σ
            </span>
          </div>
        </div>
      </div>

      {/* Ask AI */}
      <Link href={`/ai?q=Explain the ${alert.metric.replace(/_/g, ' ')} anomaly in ${alert.region}`}
        className="shrink-0 hidden sm:flex items-center gap-1 text-[10px] text-[#aaa] hover:text-emerald-600 transition-colors mt-0.5">
        Ask AI <ChevronRight size={11} />
      </Link>
    </motion.div>
  )
}

// ── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div variants={fade} className="text-center py-20 bg-white border border-[#e5e5e5] rounded-2xl">
      <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Bell size={22} className="text-emerald-600" />
      </div>
      <h2 className="text-base font-bold text-[#111] mb-2">No anomalies detected</h2>
      <p className="text-sm text-[#888] max-w-sm mx-auto leading-relaxed">
        All regions are within expected statistical ranges. The system checks for unusual deviations in waiting times, inequality scores, and backlog rates.
      </p>
    </motion.div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>('all')

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const data = await getAnomalies()
      setAlerts(data)
      setLastRefresh(new Date())
    } catch {
      setAlerts([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { void load() }, [])

  const bySev = (s: string) => alerts.filter(a => a.severity?.toLowerCase() === s)
  const critical = bySev('critical')
  const high = bySev('high')
  const medium = bySev('medium')
  const low = bySev('low')

  const filtered = activeFilter === 'all'
    ? alerts
    : alerts.filter(a => a.severity?.toLowerCase() === activeFilter)

  const groups = [
    { key: 'critical', label: 'Critical', alerts: critical },
    { key: 'high',     label: 'High',     alerts: high },
    { key: 'medium',   label: 'Medium',   alerts: medium },
    { key: 'low',      label: 'Low',      alerts: low },
  ].filter(g => g.alerts.length > 0)

  const displayGroups = activeFilter === 'all'
    ? groups
    : groups.filter(g => g.key === activeFilter)

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 max-w-3xl mx-auto py-4">
        <div className="h-6 w-52 bg-[#f0f0f0] rounded" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-[#f5f5f5] border border-[#e5e5e5] rounded-xl" />)}
        </div>
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[#f5f5f5] border border-[#e5e5e5] rounded-xl" />)}
      </div>
    )
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-3xl mx-auto py-2 pb-24">

      {/* ── Header ── */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e5e5] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center relative">
            <Bell size={17} className="text-amber-600" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {Math.min(alerts.length, 9)}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">Anomaly Alerts</h1>
            <p className="text-xs text-[#999] mt-0.5">Statistical outliers in NHS waiting time & inequality data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[10px] text-[#bbb] hidden sm:block">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button onClick={() => void load(true)} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-[#e5e5e5] rounded-lg text-[#666] hover:text-[#111] hover:border-[#bbb] bg-white transition-colors disabled:opacity-50">
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </motion.div>

      {/* ── Summary KPI Strip ── */}
      <motion.div variants={stagger} className="grid grid-cols-4 gap-3">
        {[
          { label: 'Critical', count: critical.length, key: 'critical', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
          { label: 'High',     count: high.length,     key: 'high',     color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
          { label: 'Medium',   count: medium.length,   key: 'medium',   color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
          { label: 'Total',    count: alerts.length,   key: 'all',      color: 'text-[#111]', bg: 'bg-white', border: 'border-[#e5e5e5]', dot: 'bg-[#ccc]' },
        ].map(item => (
          <motion.button key={item.key} variants={fade}
            onClick={() => setActiveFilter(item.key)}
            className={`border rounded-xl px-3 py-3 text-center transition-all hover:shadow-sm ${
              activeFilter === item.key
                ? `${item.bg} ${item.border} ring-2 ring-offset-1 ${item.border.replace('border-', 'ring-')}`
                : 'bg-white border-[#e5e5e5] hover:border-[#bbb]'
            }`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
            </div>
            <p className={`text-xl font-black ${item.color}`}>{item.count}</p>
            <p className="text-[10px] uppercase tracking-widest text-[#aaa] mt-0.5">{item.label}</p>
          </motion.button>
        ))}
      </motion.div>

      {/* ── Active filter bar ── */}
      {activeFilter !== 'all' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center justify-between bg-[#fafafa] border border-[#e5e5e5] rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs text-[#666]">
            <span className={`w-2 h-2 rounded-full ${SEV[activeFilter]?.dot ?? 'bg-[#ccc]'}`} />
            Showing <span className="font-semibold text-[#111] capitalize">{activeFilter}</span> alerts only
          </div>
          <button onClick={() => setActiveFilter('all')} className="text-[11px] text-emerald-600 font-semibold hover:underline">
            Show all
          </button>
        </motion.div>
      )}

      {/* ── How it works ── */}
      <motion.div variants={fade} className="flex items-start gap-3 bg-[#fafafa] border border-[#e5e5e5] rounded-xl px-4 py-3">
        <Info size={13} className="text-[#bbb] shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#888] leading-relaxed">
          <span className="font-semibold text-[#555]">Detection method: </span>
          Each metric is tracked across regions over time. When a value deviates more than
          <strong className="text-[#333]"> 2σ</strong> from its historical mean, an alert is raised.
          Critical alerts = z-score <strong className="text-red-600">&gt; 3σ</strong>.
        </p>
      </motion.div>

      {/* ── Alerts ── */}
      <AnimatePresence mode="wait">
        {alerts.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div key={activeFilter} variants={stagger} initial="hidden" animate="show" className="space-y-6">
            {displayGroups.map(({ key, label, alerts: groupAlerts }) => {
              const s = SEV[key] ?? SEV.low
              return (
                <motion.div key={key} variants={fade} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${s.dot} ${key === 'critical' ? 'animate-pulse' : ''}`} />
                      <h2 className="text-xs font-bold uppercase tracking-widest text-[#888]">
                        {label}
                      </h2>
                      <span className="text-[10px] text-[#bbb] border border-[#e5e5e5] px-2 py-0.5 rounded-full">
                        {groupAlerts.length} alert{groupAlerts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="h-px bg-[#f0f0f0] flex-1" />
                  </div>
                  {groupAlerts.map((alert, i) => (
                    <AlertCard key={`${alert.region}-${alert.metric}`} alert={alert} index={i} />
                  ))}
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Email subscription ── */}
      <SubscribePanel />

      {/* ── Live indicator ── */}
      {alerts.length > 0 && (
        <motion.div variants={fade} className="flex items-center justify-center gap-2 py-2">
          <Radio size={11} className="text-emerald-500 animate-pulse" />
          <span className="text-[11px] text-[#bbb]">Live detection — auto-updates on pipeline run</span>
        </motion.div>
      )}

    </motion.div>
  )
}

function SubscribePanel() {
  const [email, setEmail] = useState('')
  const [region, setRegion] = useState('Any region')
  const [threshold] = useState(2)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const submit = async () => {
    if (!email.includes('@')) return
    setStatus('loading')
    try {
      await subscribeAlerts(email, region, threshold)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <motion.div variants={fade} className="bg-[#fafafa] border border-[#e5e5e5] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center">
          <Mail size={14} className="text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#111]">Get email alerts</p>
          <p className="text-[11px] text-[#999]">Notify me when anomalies are detected in my region</p>
        </div>
      </div>

      {status === 'done' ? (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle2 size={15} className="shrink-0" />
          Subscribed. You'll get an email when new anomalies are detected.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="flex-1 bg-white border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm text-[#111] placeholder-[#ccc] focus:outline-none focus:border-blue-400"
          />
          <select
            value={region}
            onChange={e => setRegion(e.target.value)}
            className="bg-white border border-[#e5e5e5] rounded-xl px-3 py-2.5 text-sm text-[#555] focus:outline-none sm:w-44"
          >
            {['Any region', 'North East', 'North West', 'Midlands', 'East of England', 'London', 'South East', 'South West'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            onClick={() => void submit()}
            disabled={!email.includes('@') || status === 'loading'}
            className="px-5 py-2.5 bg-[#111] hover:bg-[#333] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 flex items-center gap-2 justify-center shrink-0"
          >
            {status === 'loading' ? <span className="loading loading-spinner loading-xs" /> : <Bell size={13} />}
            Subscribe
          </button>
        </div>
      )}
      {status === 'error' && (
        <p className="text-xs text-red-500 mt-2">Could not subscribe — backend may be unavailable. Try again later.</p>
      )}
    </motion.div>
  )
}
