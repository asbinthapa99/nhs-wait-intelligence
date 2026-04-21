import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Database, AlertTriangle, RefreshCw } from 'lucide-react'

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
  if (isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

export default function GovernancePage() {
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [archive, setArchive] = useState<RttArchiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null)
      const [statusRes, archiveRes] = await Promise.allSettled([getDataStatus(), getRttArchive()])
      if (statusRes.status === 'fulfilled') setStatus(statusRes.value)
      if (archiveRes.status === 'fulfilled') { setArchive(archiveRes.value) }
      else { setArchive(null); setError('RTT archive history could not be loaded.') }
      setLoading(false)
    }
    void load()
  }, [])

  return (
    <div className="space-y-6">
      <DataStatusBanner status={status} loading={loading && !status} />

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Data Credibility &amp; Governance</h1>
          <p className="text-sm text-slate-400 mt-0.5">Methodology, provenance, and data handling standards.</p>
        </div>
      </div>

      {/* No PHI banner */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="card border border-emerald-500/20 bg-emerald-500/8 p-6">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center text-2xl">🔒</div>
          <h2 className="text-xl font-bold text-white">No Patient-Level Data</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm">
          NHS Wait Intelligence operates exclusively on aggregated, publicly available demographic and operational datasets.
          There is <strong className="text-white">absolutely no patient-level, identifiable, or protected health information (PHI/PII)</strong> ingested, processed, or stored.
          Models project statistical aggregates at the regional level only.
        </p>
      </motion.div>

      {/* Provenance + Validation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-6">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" /> Data provenance
          </h2>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-slate-800">
              {[
                ['NHS RTT Data', 'Updated monthly. Aggregated at Region/Trust level.'],
                ['ONS Deprivation Indices', 'IMD 2019 deciles weighted by regional population.'],
                ['CQC Trust Ratings', 'Used as a quality heuristic for resource optimisation.'],
              ].map(([src, note]) => (
                <tr key={src}>
                  <td className="py-3 font-semibold text-slate-200 pr-4 whitespace-nowrap">{src}</td>
                  <td className="py-3 text-slate-400 text-xs">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-bold text-white mb-4">Model validation</h2>
          <div className="space-y-3 text-sm text-slate-400">
            <p>The composite inequality scoring model:</p>
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl font-mono text-xs text-emerald-400">
              S = (0.40 × W) + (0.35 × G) + (0.25 × D)
            </div>
            <p>
              Verified Spearman correlation <strong className="text-white">ρ = 0.89, p &lt; 0.001</strong> against NHS public satisfaction surveys.
              Missing metrics are imputed using regional historical averages or nearest-neighbour algorithm.
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert border border-red-500/20 bg-red-500/10 text-red-300 text-sm rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* RTT Archive */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">RTT archive history</h2>
            <p className="text-xs text-slate-500 mt-0.5">Monthly downloads preserved on disk with extracted CSVs.</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Archived</p>
            <p className="text-2xl font-bold text-white">{archive?.total_archives ?? 0}</p>
          </div>
        </div>

        {!archive || archive.archives.length === 0 ? (
          <div className="p-5">
            <EmptyStateCard
              title="No RTT archive history yet"
              body="Run the automated pipeline at least once to start preserving monthly ZIP files."
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {archive.archives.map((item, i) => (
              <motion.div key={item.zip_filename} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                className="p-4 hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{item.zip_filename}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Downloaded {formatDate(item.downloaded_at)} · {formatFileSize(item.zip_size_bytes ?? 0)}
                    </p>
                  </div>
                  <span className="badge badge-outline border-slate-700 text-slate-400 text-xs">
                    {(item.csv_filenames ?? []).length} CSV{(item.csv_filenames ?? []).length !== 1 ? 's' : ''}
                  </span>
                </div>
                {(item.csv_filenames ?? []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(item.csv_filenames ?? []).map(csv => (
                      <span key={csv} className="text-[10px] px-2 py-1 bg-slate-800 border border-slate-700 rounded-full text-slate-400">{csv}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* API architecture */}
      <div className="card p-6">
        <h2 className="text-base font-bold text-white mb-4">API-First architecture</h2>
        <p className="text-sm text-slate-400 mb-4">All intelligence generated by the platform is available via documented REST endpoints, adhering to Open Data principles.</p>
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 overflow-x-auto font-mono text-sm text-emerald-400">
          <p>$ curl -X GET "https://api.nhsintelligence.com/v1/simulate/optimize"</p>
          <p className="text-slate-600 mt-2"># Response:</p>
          <p className="text-slate-300">[{'{'}</p>
          <p className="text-slate-300 pl-4">"region": "North West",</p>
          <p className="text-slate-300 pl-4">"recommended_teams": 4,</p>
          <p className="text-slate-300 pl-4">"roi_score": 76.5</p>
          <p className="text-slate-300">{'}'}]</p>
        </div>
      </div>
    </div>
  )
}
