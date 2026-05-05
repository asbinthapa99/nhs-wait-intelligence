import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, AlertTriangle, CheckCircle, Clock,
  Database, RefreshCw, XCircle,
} from 'lucide-react'
import { getDataStatus, getPipelineStatus, DataStatus, PipelineStatus } from '../lib/api'
import SEO from '../components/SEO'

const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <motion.div variants={fade} className="rounded-xl border border-[#e5e5e5] bg-white p-5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#999]">{label}</p>
      <p className="text-2xl font-bold text-[#111]">{value.toLocaleString()}</p>
      {sub && <p className="mt-1 text-[11px] text-[#aaa]">{sub}</p>}
    </motion.div>
  )
}

function StatusBadge({ healthy, stale, hasData }: { healthy: boolean; stale: boolean; hasData: boolean }) {
  if (!hasData) return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f0f0] px-3 py-1 text-xs font-semibold text-[#666]">
      <Database className="h-3.5 w-3.5" /> No data
    </span>
  )
  if (healthy) return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
      <CheckCircle className="h-3.5 w-3.5" /> Healthy
    </span>
  )
  if (stale) return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
      <AlertTriangle className="h-3.5 w-3.5" /> Stale data
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
      <XCircle className="h-3.5 w-3.5" /> Unhealthy
    </span>
  )
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(d)
}

export default function PipelineStatusPage() {
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null)
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const load = async () => {
    setLoading(true)
    const [p, d] = await Promise.allSettled([getPipelineStatus(), getDataStatus()])
    if (p.status === 'fulfilled') setPipeline(p.value)
    if (d.status === 'fulfilled') setDataStatus(d.value)
    setLastChecked(new Date())
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const healthy = pipeline?.healthy ?? false
  const stale = pipeline?.stale ?? true
  const hasData = (pipeline?.processed_metric_rows ?? 0) > 0

  return (
    <>
      <SEO title="Pipeline Status — NHS Intelligence" description="Data pipeline health and freshness status." />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <Activity className="h-6 w-6 text-[#333]" />
              <h1 className="text-2xl font-bold text-[#111]">Pipeline Status</h1>
              {!loading && <StatusBadge healthy={healthy} stale={stale} hasData={hasData} />}
            </div>
            <p className="text-sm text-[#666]">
              Real-time health of the NHS data ingestion pipeline.
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-xs font-medium text-[#555] hover:border-[#bbb] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading && !pipeline ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-[#f5f5f5]" />
            ))}
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Waiting List Rows" value={pipeline?.waiting_list_rows ?? 0} sub="from RTT ingestion" />
              <StatCard label="Processed Metrics" value={pipeline?.processed_metric_rows ?? 0} sub="inequality scores" />
              <StatCard label="Forecast Records" value={pipeline?.forecast_rows ?? 0} sub="6-month forecasts" />
              <StatCard
                label="Days Since Snapshot"
                value={pipeline?.days_since_snapshot != null ? pipeline.days_since_snapshot : '—'}
                sub={`threshold: ${pipeline?.stale_threshold_days ?? 45} days`}
              />
            </div>

            <motion.div variants={fade} className="rounded-xl border border-[#e5e5e5] bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-[#333]">Data Snapshot</h2>
              <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                <div>
                  <p className="mb-1 text-[#999]">Latest processed month</p>
                  <p className="font-medium text-[#111]">{formatDate(pipeline?.latest_snapshot_month ?? null)}</p>
                </div>
                <div>
                  <p className="mb-1 text-[#999]">Regions in snapshot</p>
                  <p className="font-medium text-[#111]">{dataStatus?.regions_in_latest_snapshot ?? '—'}</p>
                </div>
                <div>
                  <p className="mb-1 text-[#999]">Specialties in snapshot</p>
                  <p className="font-medium text-[#111]">{dataStatus?.specialties_in_latest_snapshot ?? '—'}</p>
                </div>
              </div>
            </motion.div>

            {pipeline?.message && (
              <motion.div
                variants={fade}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  healthy
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : stale
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-[#e5e5e5] bg-[#fafafa] text-[#555]'
                }`}
              >
                {pipeline.message}
              </motion.div>
            )}

            {lastChecked && (
              <motion.p variants={fade} className="flex items-center gap-1.5 text-[11px] text-[#bbb]">
                <Clock className="h-3 w-3" />
                Last checked: {lastChecked.toLocaleTimeString('en-GB')}
              </motion.p>
            )}
          </motion.div>
        )}
      </div>
    </>
  )
}
