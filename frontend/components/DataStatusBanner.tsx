import { AlertTriangle, CheckCircle, Clock, Database } from 'lucide-react'
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
    return <div className="mb-4 h-12 animate-pulse rounded-lg bg-[#f5f5f5]" />
  }

  if (!status) return null

  const stale = status.refresh_recommended
  const hasLiveData = status.has_live_data
  const days = status.days_since_latest_snapshot

  if (!hasLiveData) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-3">
        <Database className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#999]" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#555]">No processed data yet</p>
          <p className="mt-0.5 text-xs text-[#888]">
            Run the pipeline to populate the dashboard:{' '}
            <code className="rounded bg-[#f0f0f0] px-1 py-0.5 text-[10px]">cd pipeline &amp;&amp; python run_pipeline.py</code>
          </p>
        </div>
      </div>
    )
  }

  if (stale) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-amber-700">
            Data is {days != null ? `${days} days` : 'more than 45 days'} old — refresh recommended
          </p>
          <p className="mt-0.5 text-xs text-amber-600">
            Snapshot: {formatMonth(status.latest_processed_month)}
            {' · '}
            {status.regions_in_latest_snapshot} regions, {status.specialties_in_latest_snapshot} specialties
            {' · '}
            Trigger via GitHub Actions → Daily Data Refresh → Run workflow
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#e5e5e5] bg-[#f9fafb] px-4 py-3">
      <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-500" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
        <p className="text-xs font-semibold text-emerald-700">Live NHS data loaded</p>
        <span className="hidden text-[#ccc] sm:block">·</span>
        <p className="text-xs text-[#666]">
          Snapshot: <span className="text-[#333]">{formatMonth(status.latest_processed_month)}</span>
          {' · '}
          {status.regions_in_latest_snapshot} regions, {status.specialties_in_latest_snapshot} specialties
          {days != null && (
            <>
              {' · '}
              <Clock className="mb-0.5 inline h-3 w-3" /> {days}d ago
            </>
          )}
        </p>
      </div>
    </div>
  )
}
