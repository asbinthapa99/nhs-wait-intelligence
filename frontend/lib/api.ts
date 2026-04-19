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
  region_center_lat?: number
  region_center_lng?: number
  boundary_geojson?: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
}

export interface InequalityData {
  regions: InequalityRegion[]
  gap_ratio: number
  best_region: string
  worst_region: string
}

export interface InequalityRegion {
  id: number
  name: string
  score: number
  deprivation_index: number
  backlog_rate: number
  pct_over_18_weeks: number
  trend: 'improving' | 'stable' | 'deteriorating'
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
  region: string | null
  question: string
  response: string
  data_context: {
    inequality_score: number
    pct_over_18_weeks: number
    deprivation_index: number
    trend: string
  } | null
  cached: boolean
}

export interface AIHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface DataStatus {
  has_live_data: boolean
  latest_processed_month: string | null
  latest_waiting_month: string | null
  latest_forecast_month: string | null
  regions_in_latest_snapshot: number
  specialties_in_latest_snapshot: number
  forecast_regions: number
  processed_metric_rows: number
  waiting_list_rows: number
  forecast_rows: number
  days_since_latest_snapshot: number | null
  refresh_recommended: boolean
}

export interface RttArchiveItem {
  zip_filename: string
  csv_filenames?: string[] | null
  zip_size_bytes?: number | null
  downloaded_at: string | null
}

export interface RttArchiveData {
  total_archives: number
  latest_archive: RttArchiveItem | null
  archives: RttArchiveItem[]
}

export interface PatientGuidanceSource {
  label: string
  url: string
}

export interface PatientLocalSummary {
  region: string
  has_live_data: boolean
  snapshot_month: string | null
  last_updated: string | null
  confidence: 'high' | 'medium' | 'low' | string
  confidence_reason: string
  total_waiting: number
  pct_over_18_weeks: number
  inequality_score: number
  backlog_rate_per_100k: number
  trend: string
  plain_english_summary: string
  what_this_means: string[]
  honest_note: string
}

export interface PatientAreaCompare {
  region: string
  has_live_data: boolean
  snapshot_month: string | null
  total_regions: number
  regional_rank: number | null
  local_pct_over_18_weeks: number
  national_avg_pct_over_18_weeks: number
  local_inequality_score: number
  national_avg_inequality_score: number
  pct_over_18_weeks_delta: number
  inequality_score_delta: number
  comparison_label: string
  inequality_indicator: string
  plain_english_summary: string
}

export interface PatientChoiceRights {
  title: string
  summary: string
  rights: string[]
  next_steps: string[]
  sources: PatientGuidanceSource[]
}

export interface PatientJourneyStep {
  step: string
  title: string
  detail: string
}

export interface PatientJourneyGuide {
  title: string
  summary: string
  steps: PatientJourneyStep[]
  questions_for_gp: string[]
}

export interface PatientProviderOption {
  trust_id: number
  trust_name: string
  trust_code: string
  region: string
  specialty: string
  cqc_rating: string | null
  total_waiting: number
  waiting_over_18_weeks: number
  waiting_over_52_weeks: number
  pct_over_18_weeks: number
  estimated_wait_weeks: number
  probability_within_18_weeks: number
  provider_score: number
  recommendation_note: string
}

export interface PatientProvidersData {
  snapshot_month: string | null
  has_live_data: boolean
  specialty: string
  region_filter: string | null
  providers: PatientProviderOption[]
  honest_note: string
}

export interface PatientWaitEstimate {
  snapshot_month: string | null
  has_live_data: boolean
  specialty: string
  trust_name: string | null
  trust_code: string | null
  region: string | null
  confidence: string
  confidence_reason: string
  likely_wait_weeks: number
  best_case_weeks: number
  worst_case_weeks: number
  probability_within_18_weeks: number
  methodology: string
  honest_note: string
}

export interface PatientStaySwitch {
  snapshot_month: string | null
  has_live_data: boolean
  specialty: string
  region_filter: string | null
  current_provider: PatientProviderOption | null
  recommended_provider: PatientProviderOption | null
  recommended_action: 'stay' | 'switch' | 'consider-switch' | 'insufficient-data' | string
  estimated_weeks_saved: number
  reasoning: string[]
  honest_note: string
}

export interface PatientPreparationGuide {
  title: string
  summary: string
  document_checklist: string[]
  before_appointment: string[]
  while_waiting: string[]
  escalation_steps: string[]
}

export interface PatientGPHelper {
  specialty: string
  region: string | null
  trust_name: string | null
  summary: string
  suggested_questions: string[]
  talking_points: string[]
  honest_note: string
}

export interface PatientContactRoute {
  label: string
  detail: string
}

export interface PatientContactGuide {
  specialty: string | null
  region: string | null
  trust_name: string | null
  trust_code: string | null
  routes: PatientContactRoute[]
  checklist_before_contact: string[]
  honest_note: string
}

export interface AnomalyAlert {
  region: string
  metric: string
  value: number
  expected: number
  z_score: number
  description: string
  severity: string
}

export interface ScenarioComparison {
  scenario: string
  description: string
  projected_reduction: number
  cost_estimate: number
  time_to_impact_months: number
}

export interface ResourceAllocation {
  region: string
  recommended_teams: number
  estimated_reduction: number
  roi_score: number
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

export async function askAI(question: string, region?: string, history: AIHistoryMessage[] = []): Promise<AIResponse> {
  const { data } = await client.post('/api/ai-explain', { question, region, history })
  return data
}

export async function getDataStatus(): Promise<DataStatus> {
  const { data } = await client.get('/api/status/data')
  return data
}

export async function getRttArchive(): Promise<RttArchiveData> {
  const { data } = await client.get('/api/status/rtt-archive')
  return data
}

export async function getPatientLocalSummary(region: string): Promise<PatientLocalSummary> {
  const { data } = await client.get('/api/patient/local-summary', { params: { region } })
  return data
}

export async function getPatientAreaCompare(region: string): Promise<PatientAreaCompare> {
  const { data } = await client.get('/api/patient/area-compare', { params: { region } })
  return data
}

export async function getPatientChoiceRights(): Promise<PatientChoiceRights> {
  const { data } = await client.get('/api/patient/choice-rights')
  return data
}

export async function getPatientJourneyGuide(): Promise<PatientJourneyGuide> {
  const { data } = await client.get('/api/patient/journey-guide')
  return data
}

export async function getPatientPreparationGuide(): Promise<PatientPreparationGuide> {
  const { data } = await client.get('/api/patient/preparation-guide')
  return data
}

export async function getPatientProviders(specialty: string, region?: string): Promise<PatientProvidersData> {
  const params = region ? { specialty, region } : { specialty }
  const { data } = await client.get('/api/patient/providers', { params })
  return data
}

export async function getPatientGPHelper(
  specialty: string,
  region?: string,
  trustCode?: string
): Promise<PatientGPHelper> {
  const { data } = await client.post('/api/patient/gp-helper', {
    specialty,
    region,
    trust_code: trustCode,
  })
  return data
}

export async function estimatePatientWait(specialty: string, trustCode: string, region?: string): Promise<PatientWaitEstimate> {
  const { data } = await client.post('/api/patient/estimate', {
    specialty,
    trust_code: trustCode,
    region,
  })
  return data
}

export async function getPatientContactGuide(
  specialty?: string,
  region?: string,
  trustCode?: string
): Promise<PatientContactGuide> {
  const { data } = await client.post('/api/patient/contact-guide', {
    specialty,
    region,
    trust_code: trustCode,
  })
  return data
}

export async function getPatientStaySwitch(specialty: string, currentTrustCode: string, region?: string): Promise<PatientStaySwitch> {
  const { data } = await client.post('/api/patient/stay-switch', {
    specialty,
    current_trust_code: currentTrustCode,
    region,
  })
  return data
}

export async function getAnomalies(): Promise<AnomalyAlert[]> {
  const { data } = await client.get('/api/anomalies')
  return data
}

export async function runSimulation(region: string, teamsAdded: number, months: number): Promise<any> {
  const { data } = await client.post('/api/simulate/intervention', {
    region,
    teams_added: teamsAdded,
    months
  })
  return data
}

export async function getOptimizedResources(): Promise<ResourceAllocation[]> {
  const { data } = await client.get('/api/simulate/optimize')
  return data
}

export async function runScenarios(region: string): Promise<ScenarioComparison[]> {
  const { data } = await client.post('/api/simulate/scenarios', { region })
  return data
}

export function getApiUrl(path: string): string {
  return `${BASE_URL}${path}`
}

// ── Empty data states ──────────────────────────────────────────────────────

export const EMPTY_OVERVIEW: OverviewData = {
  total_waiting: 0,
  pct_over_18_weeks: 0,
  regional_gap: 0,
  improving_regions: 0,
  total_regions: 0,
  monthly_trend: [],
  worst_regions: [],
  ai_summary: 'No processed NHS data is available yet.',
}

export const EMPTY_INEQUALITY: InequalityData = {
  regions: [],
  gap_ratio: 0,
  best_region: '',
  worst_region: '',
}

export const EMPTY_TRENDS: TrendData = {
  regions: [],
  series: [],
  forecast: [],
}
