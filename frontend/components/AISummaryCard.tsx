import { useRouter } from 'next/router'

interface AISummaryCardProps {
  summary: string
  loading?: boolean
}

export default function AISummaryCard({ summary, loading = false }: AISummaryCardProps) {
  const router = useRouter()

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-4">
      <h2 className="text-base font-semibold text-slate-800">AI summary</h2>

      <div className="bg-blue-50 rounded-xl p-4">
        <p className="text-xs font-semibold text-nhs-blue uppercase tracking-wider mb-2">
          Generated from live data
        </p>
        {loading ? (
          <div className="space-y-2">
            <div className="h-3 bg-blue-100 rounded animate-pulse w-full" />
            <div className="h-3 bg-blue-100 rounded animate-pulse w-5/6" />
            <div className="h-3 bg-blue-100 rounded animate-pulse w-4/6" />
          </div>
        ) : (
          <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => router.push('/ai')}
          className="w-full py-3 border-2 border-nhs-blue text-nhs-blue rounded-full text-sm font-semibold hover:bg-blue-50 transition-colors"
        >
          Ask AI a question
        </button>
        <button
          onClick={() => router.push('/inequality')}
          className="w-full py-3 border border-slate-200 text-slate-600 rounded-full text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          See full inequality report
        </button>
      </div>
    </div>
  )
}
