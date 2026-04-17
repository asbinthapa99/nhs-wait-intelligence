import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
})

// ── Types ──────────────────────────────────────────────────────────────────

export interface MonthlyPoint {
  month: string
  value: number
}

export interface RegionScore {
  name: string
  score: number
  trend: 'improving' | 'stable' | 'deteriorating'
}

export interface OverviewData {
  total_waiting: number
  pct_over_18_weeks: number
  regional_gap: number
  improving_regions: number
  total_regions: number
  monthly_trend: MonthlyPoint[]
  worst_regions: RegionScore[]
  ai_summary: string
}

export interface RegionDetail {
  id: number
  name: string
  region_code: string
  inequality_score: number
  backlog_rate_per_100k: number
  deprivation_index: number
  trend: 'improving' | 'stable' | 'deteriorating'
  total_waiting: number
  pct_over_18_weeks: number
}

export interface InequalityData {
  regions: {
    name: string
    score: number
    deprivation_index: number
    backlog_rate: number
  }[]
  gap_ratio: number
  best_region: string
  worst_region: string
}

export interface Specialty {
  name: string
  total_waiting: number
  pct_over_18_weeks: number
  yoy_change: number
}

export interface SpecialtiesData {
  specialties: Specialty[]
  worst_specialty: string
}

export interface TrendData {
  regions: string[]
  series: {
    region: string
    data: MonthlyPoint[]
  }[]
  forecast: {
    region: string
    data: { month: string; predicted: number; lower: number; upper: number }[]
  }[]
}

export interface AIResponse {
  region: string
  question: string
  response: string
  data_context: {
    inequality_score: number
    pct_over_18_weeks: number
    deprivation_index: number
    trend: string
  }
  cached: boolean
}

// ── API calls ──────────────────────────────────────────────────────────────

export async function getOverview(): Promise<OverviewData> {
  const { data } = await client.get('/api/overview')
  return data
}

export async function getRegions(): Promise<RegionDetail[]> {
  const { data } = await client.get('/api/regions')
  return data
}

export async function getInequality(): Promise<InequalityData> {
  const { data } = await client.get('/api/inequality')
  return data
}

export async function getSpecialties(): Promise<SpecialtiesData> {
  const { data } = await client.get('/api/specialties')
  return data
}

export async function getTrends(regions?: string[]): Promise<TrendData> {
  const params = regions ? { regions: regions.join(',') } : {}
  const { data } = await client.get('/api/trends', { params })
  return data
}

export async function askAI(question: string, region?: string): Promise<AIResponse> {
  const { data } = await client.post('/api/ai-explain', { question, region })
  return data
}

// ── Mock data (used until backend is live) ────────────────────────────────

export const MOCK_OVERVIEW: OverviewData = {
  total_waiting: 7620000,
  pct_over_18_weeks: 38.4,
  regional_gap: 2.4,
  improving_regions: 3,
  total_regions: 7,
  monthly_trend: [
    { month: 'Apr 22', value: 6.1 }, { month: 'Jul 22', value: 6.3 },
    { month: 'Oct 22', value: 6.6 }, { month: 'Jan 23', value: 6.8 },
    { month: 'Apr 23', value: 7.0 }, { month: 'Jul 23', value: 7.1 },
    { month: 'Oct 23', value: 7.3 }, { month: 'Jan 24', value: 7.5 },
    { month: 'Apr 24', value: 7.6 }, { month: 'Jul 24', value: 7.7 },
    { month: 'Oct 24', value: 7.8 },
  ],
  worst_regions: [
    { name: 'North East', score: 87, trend: 'deteriorating' },
    { name: 'Midlands', score: 74, trend: 'stable' },
    { name: 'North West', score: 68, trend: 'stable' },
    { name: 'East of England', score: 55, trend: 'improving' },
    { name: 'South West', score: 31, trend: 'improving' },
  ],
  ai_summary:
    "Regional inequality persists. North East reports 87% waiting over 18 weeks vs 31% in South West — a 2.4x gap. National backlog at 7.62M, up 2.3% this month.",
}

export const MOCK_REGIONS: RegionDetail[] = [
  { id: 1, name: 'North East & Yorkshire', region_code: 'Y63', inequality_score: 87, backlog_rate_per_100k: 142, deprivation_index: 0.78, trend: 'deteriorating', total_waiting: 1240000, pct_over_18_weeks: 87 },
  { id: 2, name: 'Midlands', region_code: 'Y60', inequality_score: 74, backlog_rate_per_100k: 118, deprivation_index: 0.65, trend: 'stable', total_waiting: 1680000, pct_over_18_weeks: 74 },
  { id: 3, name: 'North West', region_code: 'Y62', inequality_score: 68, backlog_rate_per_100k: 109, deprivation_index: 0.61, trend: 'stable', total_waiting: 1120000, pct_over_18_weeks: 68 },
  { id: 4, name: 'East of England', region_code: 'Y61', inequality_score: 55, backlog_rate_per_100k: 94, deprivation_index: 0.48, trend: 'improving', total_waiting: 890000, pct_over_18_weeks: 55 },
  { id: 5, name: 'London', region_code: 'Y56', inequality_score: 48, backlog_rate_per_100k: 88, deprivation_index: 0.55, trend: 'improving', total_waiting: 1340000, pct_over_18_weeks: 48 },
  { id: 6, name: 'South East', region_code: 'Y59', inequality_score: 40, backlog_rate_per_100k: 76, deprivation_index: 0.38, trend: 'improving', total_waiting: 980000, pct_over_18_weeks: 40 },
  { id: 7, name: 'South West', region_code: 'Y58', inequality_score: 31, backlog_rate_per_100k: 60, deprivation_index: 0.31, trend: 'improving', total_waiting: 370000, pct_over_18_weeks: 31 },
]

export const MOCK_SPECIALTIES = [
  { name: 'Orthopaedics', total_waiting: 680000, pct_over_18_weeks: 52, yoy_change: 18.4 },
  { name: 'Ophthalmology', total_waiting: 520000, pct_over_18_weeks: 48, yoy_change: 14.2 },
  { name: 'Cardiology', total_waiting: 390000, pct_over_18_weeks: 41, yoy_change: 9.8 },
  { name: 'Mental Health', total_waiting: 340000, pct_over_18_weeks: 38, yoy_change: 22.1 },
  { name: 'Gastroenterology', total_waiting: 310000, pct_over_18_weeks: 35, yoy_change: 7.3 },
  { name: 'Neurology', total_waiting: 280000, pct_over_18_weeks: 44, yoy_change: 11.6 },
  { name: 'Dermatology', total_waiting: 240000, pct_over_18_weeks: 29, yoy_change: 5.1 },
]

export const MOCK_TRENDS = [
  { month: 'Jan 22', northeast: 5.8, southwest: 2.4 },
  { month: 'Apr 22', northeast: 6.1, southwest: 2.5 },
  { month: 'Jul 22', northeast: 6.4, southwest: 2.5 },
  { month: 'Oct 22', northeast: 6.7, southwest: 2.6 },
  { month: 'Jan 23', northeast: 7.0, southwest: 2.6 },
  { month: 'Apr 23', northeast: 7.2, southwest: 2.7 },
  { month: 'Jul 23', northeast: 7.4, southwest: 2.7 },
  { month: 'Oct 23', northeast: 7.6, southwest: 2.8 },
  { month: 'Jan 24', northeast: 7.8, southwest: 2.8 },
  { month: 'Apr 24', northeast: 8.0, southwest: 2.9 },
  { month: 'Jul 24', northeast: 8.1, southwest: 2.9 },
  { month: 'Oct 24', northeast: 8.3, southwest: 3.0 },
]
