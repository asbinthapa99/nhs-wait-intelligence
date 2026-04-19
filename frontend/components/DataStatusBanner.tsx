import { DataStatus } from '../lib/api'

interface DataStatusBannerProps {
  status: DataStatus | null
  loading?: boolean
}

function formatMonth(value: string | null) {
  if (!value) return 'No snapshot loaded'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(parsed)
}

export default function DataStatusBanner({ status, loading = false }: DataStatusBannerProps) {
  if (loading && !status) {
    return <div className="mb-4 h-12 animate-pulse rounded-lg bg-slate-800" />
  }

  if (!status) return null

  const stale = status.refresh_recommended
  const hasLiveData = status.has_live_data

  const dot = hasLiveData && !stale ? 'bg-emerald-500' : stale ? 'bg-amber-400' : 'bg-slate-500'
  const label = hasLiveData ? (stale ? 'Data may be stale' : 'Live NHS data loaded') : 'No processed data yet'
  const labelColor = hasLiveData && !stale ? 'text-emerald-400' : stale ? 'text-amber-400' : 'text-slate-400'

  return (
    <div className="mb-4 bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`w-2 h-2 rounded-full ${dot} animate-pulse`} />
        <span className={`text-xs font-semibold ${labelColor}`}>{label}</span>
      </div>
      <span className="hidden sm:block text-slate-700">·</span>
      <p className="text-xs text-slate-400 leading-relaxed">
        Snapshot: <span className="text-slate-300">{formatMonth(status.latest_processed_month)}</span>
        {' · '}
        {status.regions_in_latest_snapshot} regions, {status.specialties_in_latest_snapshot} specialties
        {stale ? ' · Refresh recommended' : ''}
      </p>
    </div>
  )
}
