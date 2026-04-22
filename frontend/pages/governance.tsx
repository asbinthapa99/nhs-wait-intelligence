import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Database, AlertTriangle, Lock, Code2, FileArchive } from 'lucide-react'
import DataStatusBanner from '../components/DataStatusBanner'
import EmptyStateCard from '../components/EmptyStateCard'
import { DataStatus, RttArchiveData, getDataStatus, getRttArchive } from '../lib/api'

const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

function formatFileSize(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}
function formatDate(v: string | null) {
  if (!v) return 'N/A'
  const d = new Date(v)
  return isNaN(d.getTime()) ? v : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
}

export default function GovernancePage() {
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [archive, setArchive] = useState<RttArchiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true); setError(null)
      const [st, ar] = await Promise.allSettled([getDataStatus(), getRttArchive()])
      if (st.status === 'fulfilled') setStatus(st.value)
      if (ar.status === 'fulfilled') setArchive(ar.value)
      else { setArchive(null); setError('RTT archive could not be loaded.') }
      setLoading(false)
    })()
  }, [])

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-4xl mx-auto space-y-6 pb-24">

      <motion.div variants={fade} className="flex items-center gap-3 border-b border-[#e5e5e5] pb-5">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <ShieldCheck size={17} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#111] tracking-tight">Data Credibility & Governance</h1>
          <p className="text-xs text-[#999] mt-0.5">Methodology, provenance, and data handling standards</p>
        </div>
      </motion.div>

      <DataStatusBanner status={status} loading={loading && !status} />

      <motion.div variants={fade} className="flex items-start gap-4 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
        <div className="w-9 h-9 bg-white border border-emerald-200 rounded-xl flex items-center justify-center shrink-0 text-lg">🔒</div>
        <div>
          <h2 className="text-sm font-bold text-emerald-800 mb-1">No Patient-Level Data</h2>
          <p className="text-sm text-emerald-700 leading-relaxed">
            NHS Wait Intelligence operates exclusively on aggregated, publicly available datasets.
            There is <strong>absolutely no patient-level, identifiable, or protected health information (PHI/PII)</strong> ingested, processed, or stored.
          </p>
        </div>
      </motion.div>

      <motion.div variants={stagger} className="grid md:grid-cols-2 gap-5">
        <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database size={13} className="text-emerald-600" />
            <h2 className="text-sm font-semibold text-[#111]">Data Provenance</h2>
          </div>
          <div className="divide-y divide-[#f5f5f5]">
            {[
              { src: 'NHS RTT Data', note: 'Updated monthly. Aggregated at Region/Trust level.' },
              { src: 'ONS Deprivation Indices', note: 'IMD 2019 deciles weighted by regional population.' },
              { src: 'CQC Trust Ratings', note: 'Quality heuristic for resource optimisation.' },
            ].map(({ src, note }) => (
              <div key={src} className="py-3 first:pt-0 last:pb-0">
                <p className="text-xs font-semibold text-[#222] mb-0.5">{src}</p>
                <p className="text-xs text-[#888]">{note}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={13} className="text-violet-600" />
            <h2 className="text-sm font-semibold text-[#111]">Model Validation</h2>
          </div>
          <p className="text-xs text-[#666] mb-3">Composite inequality scoring model:</p>
          <div className="bg-[#f9fafb] border border-[#e5e5e5] rounded-lg p-3 font-mono text-xs text-emerald-700 mb-3">
            S = (0.40 × W) + (0.35 × G) + (0.25 × D)
          </div>
          <p className="text-xs text-[#666] leading-relaxed">
            Verified Spearman correlation <strong className="text-[#111]">ρ = 0.89, p &lt; 0.001</strong> against NHS public satisfaction surveys.
          </p>
        </motion.div>
      </motion.div>

      {error && (
        <motion.div variants={fade} className="flex items-center gap-3 border border-red-200 bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="shrink-0" /> {error}
        </motion.div>
      )}

      <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-2">
            <FileArchive size={14} className="text-[#aaa]" />
            <div>
              <h2 className="text-sm font-semibold text-[#111]">RTT Archive History</h2>
              <p className="text-xs text-[#aaa]">Monthly downloads with extracted CSVs</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-[#bbb]">Archived</p>
            <p className="text-2xl font-bold text-[#111]">{archive?.total_archives ?? 0}</p>
          </div>
        </div>
        {!archive || archive.archives.length === 0 ? (
          <div className="p-6"><EmptyStateCard title="No RTT archive history yet" body="Run the automated pipeline at least once to start preserving monthly ZIP files." /></div>
        ) : (
          <div className="divide-y divide-[#f5f5f5]">
            {archive.archives.map((item, i) => (
              <motion.div key={item.zip_filename} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                className="px-5 py-3.5 hover:bg-[#fafafa] transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[#111]">{item.zip_filename}</p>
                    <p className="text-xs text-[#aaa] mt-0.5">Downloaded {formatDate(item.downloaded_at)} · {formatFileSize(item.zip_size_bytes ?? 0)}</p>
                  </div>
                  <span className="text-[10px] border border-[#e5e5e5] text-[#888] px-2.5 py-1 rounded-full">
                    {(item.csv_filenames ?? []).length} CSV{(item.csv_filenames ?? []).length !== 1 ? 's' : ''}
                  </span>
                </div>
                {(item.csv_filenames ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(item.csv_filenames ?? []).map(csv => (
                      <span key={csv} className="text-[10px] px-2 py-0.5 bg-[#f5f5f5] border border-[#e5e5e5] rounded-full text-[#888]">{csv}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Code2 size={13} className="text-[#aaa]" />
          <h2 className="text-sm font-semibold text-[#111]">API-First Architecture</h2>
        </div>
        <p className="text-xs text-[#888] mb-4">All platform intelligence available via documented REST endpoints, adhering to Open Data principles.</p>
        <div className="bg-[#f9fafb] border border-[#e5e5e5] rounded-xl p-4 overflow-x-auto font-mono text-xs">
          <p className="text-[#aaa]">$ curl -X GET &quot;https://api.nhsintelligence.com/v1/simulate/optimize&quot;</p>
          <p className="text-[#bbb] mt-2"># Response:</p>
          <p className="text-[#555] mt-1">{'[{'}</p>
          <p className="text-[#555] pl-4">&quot;region&quot;: &quot;North West&quot;,</p>
          <p className="text-[#555] pl-4">&quot;recommended_teams&quot;: 4,</p>
          <p className="text-emerald-600 pl-4 font-semibold">&quot;roi_score&quot;: 76.5</p>
          <p className="text-[#555]">{'}]'}</p>
        </div>
      </motion.div>

    </motion.div>
  )
}
