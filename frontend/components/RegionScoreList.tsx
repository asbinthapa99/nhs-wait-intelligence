import { motion } from 'framer-motion'

interface Region {
  name: string
  score: number
  trend?: 'improving' | 'stable' | 'deteriorating'
}

function scoreColor(score: number): string {
  if (score >= 75) return 'bg-red-500'
  if (score >= 55) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function scoreTextColor(score: number): string {
  if (score >= 75) return 'text-red-600'
  if (score >= 55) return 'text-amber-600'
  return 'text-emerald-700'
}

interface RegionScoreListProps {
  regions: Region[]
  showTrend?: boolean
}

export default function RegionScoreList({ regions, showTrend = false }: RegionScoreListProps) {
  const maxScore = Math.max(...regions.map((r) => r.score), 100)

  return (
    <div className="space-y-3">
      {regions.map((region, i) => (
        <motion.div key={region.name} 
          initial={{ opacity: 0, x: -10 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-4"
        >
          <span className="text-[11px] font-bold text-[#111] w-24 shrink-0 truncate uppercase tracking-tight">{region.name}</span>
          <div className="flex-1 bg-[#f0f0f0] rounded-full h-1.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(region.score / maxScore) * 100}%` }}
              className={`h-full rounded-full transition-all duration-700 ease-out ${scoreColor(region.score)}`}
            />
          </div>
          <span className={`text-xs font-black w-8 text-right tabular-nums ${scoreTextColor(region.score)}`}>
            {region.score}
          </span>
          {showTrend && region.trend && (
            <span className={`text-[9px] font-bold uppercase tracking-widest w-16 text-right ${
              region.trend === 'improving' ? 'text-emerald-600' : region.trend === 'deteriorating' ? 'text-red-600' : 'text-[#bbb]'
            }`}>
              {region.trend === 'improving' ? 'Improving' : region.trend === 'deteriorating' ? 'Worsening' : 'Stable'}
            </span>
          )}
        </motion.div>
      ))}
    </div>
  )
}
