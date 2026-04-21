import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, AlertTriangle, TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react'
import { getAnomalies, AnomalyAlert } from '../lib/api'

const fade = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }

const SEVERITY_STYLES: Record<string, { bg: string; border: string; badge: string; icon: string }> = {
  critical: {
    bg: 'bg-red-500/5',
    border: 'border-red-500/30',
    badge: 'bg-red-500/10 text-red-400',
    icon: 'text-red-400',
  },
  high: {
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-400',
    icon: 'text-amber-400',
  },
  medium: {
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/20',
    badge: 'bg-blue-500/10 text-blue-400',
    icon: 'text-blue-400',
  },
  low: {
    bg: '',
    border: 'border-slate-800',
    badge: 'bg-slate-800 text-slate-400',
    icon: 'text-slate-400',
  },
}

const METRIC_ICON: Record<string, typeof TrendingUp> = {
  default: Activity,
  pct_over_18_weeks: TrendingUp,
  backlog_rate: TrendingUp,
  total_waiting: TrendingUp,
  inequality_score: AlertTriangle,
}

function AlertCard({ alert, index }: { alert: AnomalyAlert; index: number }) {
  const s = SEVERITY_STYLES[alert.severity?.toLowerCase()] ?? SEVERITY_STYLES.low
  const Icon = METRIC_ICON[alert.metric] ?? METRIC_ICON.default

  return (
    <motion.div
      variants={fade}
      transition={{ delay: index * 0.04 }}
      className={`${s.bg} border ${s.border} rounded-2xl px-5 py-4 flex items-start gap-4`}
    >
      <div className={`mt-0.5 shrink-0 ${s.icon}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-sm font-bold text-white">{alert.region}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${s.badge}`}>
            {alert.severity}
          </span>
          <span className="text-[10px] text-slate-600 font-medium">{alert.metric.replace(/_/g, ' ')}</span>
        </div>
        <p className="text-sm text-slate-300 leading-snug">{alert.description}</p>
        <div className="flex flex-wrap gap-4 mt-2">
          <span className="text-xs text-slate-500">
            Observed: <span className="text-slate-300 font-semibold">{alert.value.toFixed(2)}</span>
          </span>
          <span className="text-xs text-slate-500">
            Expected: <span className="text-slate-300 font-semibold">{alert.expected.toFixed(2)}</span>
          </span>
          <span className="text-xs text-slate-500">
            Z-score: <span className={`font-semibold ${Math.abs(alert.z_score) > 3 ? 'text-red-400' : 'text-amber-400'}`}>
              {alert.z_score > 0 ? '+' : ''}{alert.z_score.toFixed(2)}σ
            </span>
          </span>
        </div>
      </div>
    </motion.div>
  )
}

function EmptyState() {
  return (
    <motion.div variants={fade} className="text-center py-20">
      <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Bell size={28} className="text-emerald-400" />
      </div>
      <h2 className="text-lg font-bold text-white mb-2">No anomalies detected</h2>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        All regions are within expected statistical ranges. The system checks for unusual spikes in waiting times, inequality scores, and backlog rates.
      </p>
    </motion.div>
  )
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

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

  const bySeverity = (s: string) => alerts.filter(a => a.severity?.toLowerCase() === s)
  const critical = bySeverity('critical')
  const high = bySeverity('high')
  const medium = bySeverity('medium')
  const low = bySeverity('low')

  const groups = [
    { label: 'Critical', alerts: critical, dotClass: 'bg-red-500' },
    { label: 'High', alerts: high, dotClass: 'bg-amber-500' },
    { label: 'Medium', alerts: medium, dotClass: 'bg-blue-500' },
    { label: 'Low', alerts: low, dotClass: 'bg-slate-500' },
  ].filter(g => g.alerts.length > 0)

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 max-w-3xl mx-auto">
        <div className="h-8 w-56 bg-slate-800 rounded" />
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-800 rounded-2xl" />)}
      </div>
    )
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 max-w-3xl mx-auto py-2">

      {/* Header */}
      <motion.div variants={fade} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
              <Bell size={18} className="text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Anomaly Alerts</h1>
          </div>
          <p className="text-slate-400 text-sm ml-12">
            Statistical outliers detected in NHS waiting time and inequality data. Regions showing unexpected deviations from historical patterns.
          </p>
        </div>
        <button
          onClick={() => void load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors shrink-0 mt-1 disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </motion.div>

      {/* Summary row */}
      <motion.div variants={fade} className="grid grid-cols-4 gap-3">
        {[
          { label: 'Critical', count: critical.length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'High', count: high.length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Medium', count: medium.length, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Total', count: alerts.length, color: 'text-slate-300', bg: 'bg-slate-800 border-slate-700' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`border rounded-xl px-4 py-3 text-center ${bg}`}>
            <p className={`text-2xl font-black ${color}`}>{count}</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </motion.div>

      {/* How it works */}
      <motion.div variants={fade} className="bg-slate-900/60 border border-slate-800 rounded-xl px-5 py-4 text-xs text-slate-500 leading-relaxed">
        <span className="font-semibold text-slate-400">How anomalies are detected: </span>
        Each metric is tracked across regions over time. When a value deviates more than 2 standard deviations (z-score &gt; 2) from its historical mean, an alert is raised. Critical alerts indicate z-scores above 3σ.
      </motion.div>

      {/* Alerts grouped by severity */}
      {alerts.length === 0 ? (
        <EmptyState />
      ) : (
        groups.map(({ label, alerts: groupAlerts, dotClass }) => (
          <motion.div key={label} variants={fade} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${dotClass}`} />
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                {label} ({groupAlerts.length})
              </h2>
            </div>
            {groupAlerts.map((alert, i) => (
              <AlertCard key={`${alert.region}-${alert.metric}`} alert={alert} index={i} />
            ))}
          </motion.div>
        ))
      )}

      {lastRefresh && (
        <motion.p variants={fade} className="text-xs text-slate-700 text-center">
          Last refreshed {lastRefresh.toLocaleTimeString()}
        </motion.p>
      )}

    </motion.div>
  )
}
