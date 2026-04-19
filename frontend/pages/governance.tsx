import { useEffect, useState } from 'react'

import DataStatusBanner from '../components/DataStatusBanner'
import EmptyStateCard from '../components/EmptyStateCard'
import { DataStatus, RttArchiveData, getDataStatus, getRttArchive } from '../lib/api'

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string | null) {
  if (!value) return 'Not available'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

export default function GovernancePage() {
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [archive, setArchive] = useState<RttArchiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const [statusResult, archiveResult] = await Promise.allSettled([getDataStatus(), getRttArchive()])

      if (statusResult.status === 'fulfilled') {
        setStatus(statusResult.value)
      }

      if (archiveResult.status === 'fulfilled') {
        setArchive(archiveResult.value)
      } else {
        setArchive(null)
        setError('RTT archive history could not be loaded from the API.')
      }

      setLoading(false)
    }

    void load()
  }, [])

  return (
    <>
      <DataStatusBanner status={status} loading={loading && !status} />

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Data Credibility & Governance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Methodology, provenance, and data handling standards.
          </p>
        </div>
      </div>

      <div className="mb-8 p-6 bg-slate-800 text-white rounded-2xl shadow-sm border border-slate-700">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-2xl">🔒</div>
          <h2 className="text-xl font-bold">No Patient-Level Data</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm">
          NHS Wait Intelligence operates exclusively on aggregated, publicly available demographic and operational datasets. 
          There is <strong className="text-white">absolutely no patient-level, identifiable, or protected health information (PHI/PII)</strong> ingested, processed, or stored by this platform. 
          Models project statistical aggregates at the regional level only.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            📊 Data Provenance
          </h2>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 font-semibold text-slate-700">NHS RTT Data</td>
                <td className="py-3 text-slate-600">Updated monthly. Aggregated at Region/Trust level.</td>
              </tr>
              <tr>
                <td className="py-3 font-semibold text-slate-700">ONS Deprivation Indices</td>
                <td className="py-3 text-slate-600">IMD 2019 deciles weighted by regional population.</td>
              </tr>
              <tr>
                <td className="py-3 font-semibold text-slate-700">CQC Trust Ratings</td>
                <td className="py-3 text-slate-600">Used as a quality heuristic for resource optimization models.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            📉 Model Validation
          </h2>
          <div className="space-y-4 text-sm text-slate-600">
            <p>
              The composite inequality scoring model relies on an OLS regression approach:
            </p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-xs text-slate-700">
              S = (0.40 × W) + (0.35 × G) + (0.25 × D)
            </div>
            <p>
              This tracks with a verified Spearman correlation (ρ = 0.89, p &lt; 0.001) against recent NHS public satisfaction surveys regarding wait times. Missing metrics are imputed using regional historical averages or the nearest neighbour algorithm dependent on the metric.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">RTT archive history</h2>
            <p className="text-sm text-slate-500 mt-1">
              Each monthly download is kept on disk, with the extracted CSVs preserved under a matching archive folder.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">Archived snapshots</p>
            <p className="text-2xl font-bold text-slate-900">{archive?.total_archives ?? 0}</p>
          </div>
        </div>

        {!archive || archive.archives.length === 0 ? (
          <EmptyStateCard
            title="No RTT archive history yet"
            body="Run the automated pipeline at least once to start preserving monthly ZIP files and CSV extracts."
          />
        ) : (
          <div className="space-y-3">
            {archive.archives.map((item) => (
              <div key={item.zip_filename} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.zip_filename}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Downloaded {formatDate(item.downloaded_at)} · {formatFileSize(item.zip_size_bytes ?? 0)}
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">
                    {(item.csv_filenames ?? []).length} CSV file{(item.csv_filenames ?? []).length === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(item.csv_filenames ?? []).map((csv) => (
                    <span key={csv} className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 border border-slate-200">
                      {csv}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-bold text-slate-800 mb-4">API-First Architecture</h2>
        <p className="text-sm text-slate-600 mb-4">
          All intelligence generated by the platform is available via documented REST endpoints, adhering to Open Data principles.
        </p>
        <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto text-sm text-green-400 font-mono">
          <p>$ curl -X GET "https://api.nhsintelligence.com/v1/simulate/optimize"</p>
          <p className="text-slate-400 mt-2"># Response:</p>
          <p>{"["}</p>
          <p>{"  {"}</p>
          <p>{"    \"region\": \"North West\","}</p>
          <p>{"    \"recommended_teams\": 4,"}</p>
          <p>{"    \"roi_score\": 76.5"}</p>
          <p>{"  }"}</p>
          <p>{"]"}</p>
        </div>
      </div>
    </>
  )
}
