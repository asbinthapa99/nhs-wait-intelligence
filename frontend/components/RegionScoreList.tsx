interface Region {
  name: string
  score: number
  trend?: 'improving' | 'stable' | 'deteriorating'
}

function scoreColor(score: number): string {
  if (score >= 70) return 'bg-score-red'
  if (score >= 50) return 'bg-score-amber'
  return 'bg-score-green'
}

function scoreTextColor(score: number): string {
  if (score >= 70) return 'text-red-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-green-700'
}

interface RegionScoreListProps {
  regions: Region[]
  showTrend?: boolean
}

export default function RegionScoreList({ regions, showTrend = false }: RegionScoreListProps) {
  const maxScore = Math.max(...regions.map((r) => r.score), 100)

  return (
    <div className="flex flex-col gap-3">
      {regions.map((region) => (
        <div key={region.name} className="flex items-center gap-3">
          <span className="text-sm text-slate-700 w-32 shrink-0">{region.name}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${scoreColor(region.score)}`}
              style={{ width: `${(region.score / maxScore) * 100}%` }}
            />
          </div>
          <span className={`text-sm font-bold w-8 text-right ${scoreTextColor(region.score)}`}>
            {region.score}
          </span>
          {showTrend && region.trend && (
            <span className="text-xs text-slate-400 w-16">
              {region.trend === 'improving' ? '↑ Better' : region.trend === 'deteriorating' ? '↓ Worse' : '→ Same'}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
