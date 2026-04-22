from pydantic import BaseModel, Field
from datetime import date
from typing import Any


# ── Shared ─────────────────────────────────────────────────────────────────

class MonthlyPoint(BaseModel):
    month: str
    value: float


class RegionScore(BaseModel):
    name: str
    score: float
    trend: str


# ── Overview ───────────────────────────────────────────────────────────────

class OverviewResponse(BaseModel):
    total_waiting: int
    pct_over_18_weeks: float
    regional_gap: float
    improving_regions: int
    total_regions: int
    monthly_trend: list[MonthlyPoint]
    worst_regions: list[RegionScore]
    ai_summary: str


# ── Regions ────────────────────────────────────────────────────────────────

class RegionDetail(BaseModel):
    id: int
    name: str
    region_code: str
    inequality_score: float
    backlog_rate_per_100k: float
    deprivation_index: float
    trend: str
    total_waiting: int
    pct_over_18_weeks: float
    region_center_lat: float | None = None
    region_center_lng: float | None = None
    boundary_geojson: dict[str, Any] | None = None


# ── Inequality ─────────────────────────────────────────────────────────────

class InequalityRegion(BaseModel):
    id: int
    name: str
    score: float
    deprivation_index: float
    backlog_rate: float
    pct_over_18_weeks: float
    trend: str


class InequalityResponse(BaseModel):
    regions: list[InequalityRegion]
    gap_ratio: float
    best_region: str
    worst_region: str


# ── Specialties ────────────────────────────────────────────────────────────

class SpecialtyItem(BaseModel):
    name: str
    total_waiting: int
    pct_over_18_weeks: float
    yoy_change: float


class SpecialtiesResponse(BaseModel):
    specialties: list[SpecialtyItem]
    worst_specialty: str


# ── Trends ─────────────────────────────────────────────────────────────────

class TrendSeries(BaseModel):
    region: str
    data: list[MonthlyPoint]


class ForecastPoint(BaseModel):
    month: str
    predicted: float
    lower: float
    upper: float


class ForecastSeries(BaseModel):
    region: str
    data: list[ForecastPoint]


class TrendsResponse(BaseModel):
    regions: list[str]
    series: list[TrendSeries]
    forecast: list[ForecastSeries]


# ── AI ─────────────────────────────────────────────────────────────────────

class HistoryMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class AIRequest(BaseModel):
    question: str
    region: str | None = None
    history: list[HistoryMessage] = Field(default_factory=list)


class AIDataContext(BaseModel):
    inequality_score: float
    pct_over_18_weeks: float
    deprivation_index: float
    trend: str


class AIResponse(BaseModel):
    region: str | None
    question: str
    response: str
    data_context: AIDataContext | None
    cached: bool
    provider: str | None = None


class AIInsightBullet(BaseModel):
    heading: str
    detail: str


class AIInsightsResponse(BaseModel):
    topic: str
    bullets: list[AIInsightBullet]
    cached: bool


class BriefingSection(BaseModel):
    heading: str
    body: str


class AIBriefingResponse(BaseModel):
    sections: list[BriefingSection]
    cached: bool


# ── Patient ────────────────────────────────────────────────────────────────

class PatientGuidanceSource(BaseModel):
    label: str
    url: str


class PatientLocalSummaryResponse(BaseModel):
    region: str
    has_live_data: bool
    snapshot_month: date | None
    last_updated: date | None
    confidence: str
    confidence_reason: str
    total_waiting: int
    pct_over_18_weeks: float
    inequality_score: float
    backlog_rate_per_100k: float
    trend: str
    plain_english_summary: str
    what_this_means: list[str]
    honest_note: str


class PatientAreaCompareResponse(BaseModel):
    region: str
    has_live_data: bool
    snapshot_month: date | None
    total_regions: int
    regional_rank: int | None
    local_pct_over_18_weeks: float
    national_avg_pct_over_18_weeks: float
    local_inequality_score: float
    national_avg_inequality_score: float
    pct_over_18_weeks_delta: float
    inequality_score_delta: float
    comparison_label: str
    inequality_indicator: str
    plain_english_summary: str


class PatientChoiceRightsResponse(BaseModel):
    title: str
    summary: str
    rights: list[str]
    next_steps: list[str]
    sources: list[PatientGuidanceSource]


class PatientJourneyStep(BaseModel):
    step: str
    title: str
    detail: str


class PatientJourneyGuideResponse(BaseModel):
    title: str
    summary: str
    steps: list[PatientJourneyStep]
    questions_for_gp: list[str]


class PatientProviderOption(BaseModel):
    trust_id: int
    trust_name: str
    trust_code: str
    region: str
    specialty: str
    cqc_rating: str | None
    total_waiting: int
    waiting_over_18_weeks: int
    waiting_over_52_weeks: int
    pct_over_18_weeks: float
    estimated_wait_weeks: float
    probability_within_18_weeks: float
    provider_score: float
    recommendation_note: str


class PatientProvidersResponse(BaseModel):
    snapshot_month: date | None
    has_live_data: bool
    specialty: str
    region_filter: str | None
    providers: list[PatientProviderOption]
    honest_note: str


class PatientWaitEstimateRequest(BaseModel):
    specialty: str
    trust_code: str
    region: str | None = None


class PatientWaitEstimateResponse(BaseModel):
    snapshot_month: date | None
    has_live_data: bool
    specialty: str
    trust_name: str | None
    trust_code: str | None
    region: str | None
    confidence: str
    confidence_reason: str
    likely_wait_weeks: float
    best_case_weeks: float
    worst_case_weeks: float
    probability_within_18_weeks: float
    methodology: str
    honest_note: str


class PatientStaySwitchRequest(BaseModel):
    specialty: str
    current_trust_code: str
    region: str | None = None


class PatientStaySwitchResponse(BaseModel):
    snapshot_month: date | None
    has_live_data: bool
    specialty: str
    region_filter: str | None
    current_provider: PatientProviderOption | None
    recommended_provider: PatientProviderOption | None
    recommended_action: str
    estimated_weeks_saved: float
    reasoning: list[str]
    honest_note: str


class PatientPreparationGuideResponse(BaseModel):
    title: str
    summary: str
    document_checklist: list[str]
    before_appointment: list[str]
    while_waiting: list[str]
    escalation_steps: list[str]


class PatientGPHelperRequest(BaseModel):
    specialty: str
    region: str | None = None
    trust_code: str | None = None


class PatientGPHelperResponse(BaseModel):
    specialty: str
    region: str | None
    trust_name: str | None
    summary: str
    suggested_questions: list[str]
    talking_points: list[str]
    honest_note: str


class PatientContactRoute(BaseModel):
    label: str
    detail: str


class PatientContactGuideRequest(BaseModel):
    specialty: str | None = None
    region: str | None = None
    trust_code: str | None = None


class PatientContactGuideResponse(BaseModel):
    specialty: str | None
    region: str | None
    trust_name: str | None
    trust_code: str | None
    routes: list[PatientContactRoute]
    checklist_before_contact: list[str]
    honest_note: str


# ── Export ─────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    db: str
    version: str = "1.0.0"


class DataStatusResponse(BaseModel):
    has_live_data: bool
    latest_processed_month: date | None
    latest_waiting_month: date | None
    latest_forecast_month: date | None
    regions_in_latest_snapshot: int
    specialties_in_latest_snapshot: int
    forecast_regions: int
    processed_metric_rows: int
    waiting_list_rows: int
    forecast_rows: int
    days_since_latest_snapshot: int | None
    refresh_recommended: bool


class RttArchiveItem(BaseModel):
    zip_filename: str
    csv_filenames: list[str]
    zip_size_bytes: int
    downloaded_at: date | None


class RttArchiveResponse(BaseModel):
    total_archives: int
    latest_archive: RttArchiveItem | None
    archives: list[RttArchiveItem]
