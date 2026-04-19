from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ProcessedMetric, Region, Trust, WaitingList
from ..schemas.responses import (
    PatientAreaCompareResponse,
    PatientChoiceRightsResponse,
    PatientContactGuideRequest,
    PatientContactGuideResponse,
    PatientContactRoute,
    PatientGPHelperRequest,
    PatientGPHelperResponse,
    PatientGuidanceSource,
    PatientJourneyGuideResponse,
    PatientJourneyStep,
    PatientLocalSummaryResponse,
    PatientPreparationGuideResponse,
    PatientProviderOption,
    PatientProvidersResponse,
    PatientStaySwitchRequest,
    PatientStaySwitchResponse,
    PatientWaitEstimateRequest,
    PatientWaitEstimateResponse,
)

router = APIRouter()

RIGHTS_SOURCES = [
    PatientGuidanceSource(
        label="NHS England patient choice overview",
        url="https://www.england.nhs.uk/personalisedcare/choice/",
    ),
    PatientGuidanceSource(
        label="NHS England waiting-time rights",
        url="https://www.england.nhs.uk/rtt/",
    ),
    PatientGuidanceSource(
        label="NHS patient choices overview",
        url="https://www.nhs.uk/using-the-nhs/about-the-nhs/your-choices-in-the-nhs/",
    ),
]


def _load_latest_rows(db: Session) -> tuple[date | None, list[tuple[ProcessedMetric, Region]]]:
    latest_month = db.query(func.max(ProcessedMetric.snapshot_month)).scalar()
    if latest_month is None:
        return None, []

    rows = (
        db.query(ProcessedMetric, Region)
        .join(Region)
        .filter(ProcessedMetric.snapshot_month == latest_month)
        .all()
    )
    return latest_month, rows


def _confidence_for_snapshot(snapshot_month: date | None, region_count: int) -> tuple[str, str]:
    if snapshot_month is None:
        return "low", "No processed NHS regional snapshot is available yet."

    age_days = (date.today() - snapshot_month).days
    if age_days <= 45 and region_count >= 7:
        return "high", "Recent live data covers all NHS England regions in the latest snapshot."
    if age_days <= 90 and region_count >= 5:
        return "medium", "Live data is available, but coverage or freshness is not complete."
    return "low", "This summary is based on older or incomplete regional data, so treat it as directional."


def _find_region_row(
    rows: list[tuple[ProcessedMetric, Region]],
    region_name: str,
) -> tuple[ProcessedMetric, Region] | None:
    normalized = region_name.strip().lower()
    for metric, region in rows:
        if region.name.strip().lower() == normalized:
            return metric, region
    return None


def _empty_local_summary(region_name: str) -> PatientLocalSummaryResponse:
    return PatientLocalSummaryResponse(
        region=region_name,
        has_live_data=False,
        snapshot_month=None,
        last_updated=None,
        confidence="low",
        confidence_reason="No processed NHS regional snapshot is available yet.",
        total_waiting=0,
        pct_over_18_weeks=0.0,
        inequality_score=0.0,
        backlog_rate_per_100k=0.0,
        trend="unknown",
        plain_english_summary=f"We do not yet have a live regional summary for {region_name}.",
        what_this_means=[
            "Regional context is not available yet because the processed NHS snapshot has not been loaded.",
            "Once live data is present, this page will explain how your area compares with the England regional average.",
            "This view is designed for clarity, not for hospital-specific appointment predictions.",
        ],
        honest_note="This page shows regional context only. It is not yet a hospital-by-hospital patient estimate.",
    )


def _empty_area_compare(region_name: str) -> PatientAreaCompareResponse:
    return PatientAreaCompareResponse(
        region=region_name,
        has_live_data=False,
        snapshot_month=None,
        total_regions=0,
        regional_rank=None,
        local_pct_over_18_weeks=0.0,
        national_avg_pct_over_18_weeks=0.0,
        local_inequality_score=0.0,
        national_avg_inequality_score=0.0,
        pct_over_18_weeks_delta=0.0,
        inequality_score_delta=0.0,
        comparison_label="No live comparison available",
        inequality_indicator="unknown",
        plain_english_summary=f"We cannot compare {region_name} with the England regional average until live data is available.",
    )


def _comparison_label(local_value: float, average_value: float, tolerance: float) -> tuple[str, str]:
    delta = local_value - average_value
    if delta > tolerance:
        return "Higher pressure than the England regional average", "higher-than-average"
    if delta < -tolerance:
        return "Lower pressure than the England regional average", "lower-than-average"
    return "Close to the England regional average", "near-average"


def _estimate_wait_windows(total_waiting: int, waiting_over_18: int, waiting_over_52: int) -> tuple[float, float, float, float]:
    if total_waiting <= 0:
        return 0.0, 0.0, 0.0, 0.0

    over_18_share = waiting_over_18 / total_waiting
    over_52_share = waiting_over_52 / total_waiting
    pressure_bonus = min(total_waiting / 20000, 6.0)

    likely_weeks = 6.0 + (over_18_share * 18.0) + (over_52_share * 18.0) + pressure_bonus
    best_case_weeks = max(2.0, likely_weeks - (4.0 + over_18_share * 3.0))
    worst_case_weeks = likely_weeks + 6.0 + (over_52_share * 10.0)
    probability_within_18 = max(5.0, min(95.0, (1.0 - over_18_share) * 100.0))

    return (
        round(likely_weeks, 1),
        round(best_case_weeks, 1),
        round(worst_case_weeks, 1),
        round(probability_within_18, 1),
    )


def _rating_adjustment(cqc_rating: str | None) -> float:
    if not cqc_rating:
        return 0.0

    normalized = cqc_rating.strip().lower()
    if normalized == "outstanding":
        return -3.0
    if normalized == "good":
        return -1.5
    if normalized == "requires improvement":
        return 1.5
    if normalized == "inadequate":
        return 3.0
    return 0.0


def _provider_note(pct_over_18: float) -> str:
    if pct_over_18 <= 35:
        return "Lower long-wait pressure than most providers in this comparison set."
    if pct_over_18 <= 55:
        return "Mid-range pressure in this comparison set."
    return "Higher long-wait pressure than most providers in this comparison set."


def _find_provider(
    providers: list[PatientProviderOption],
    trust_code: str | None,
) -> PatientProviderOption | None:
    if not trust_code:
        return None
    return next((provider for provider in providers if provider.trust_code == trust_code), None)


def _load_provider_options(
    db: Session,
    specialty: str,
    region_filter: str | None,
) -> tuple[date | None, list[PatientProviderOption]]:
    latest_month = db.query(func.max(WaitingList.snapshot_month)).scalar()
    if latest_month is None:
        return None, []

    query = (
        db.query(
            Trust.id.label("trust_id"),
            Trust.name.label("trust_name"),
            Trust.trust_code.label("trust_code"),
            Region.name.label("region_name"),
            Trust.cqc_rating.label("cqc_rating"),
            func.sum(WaitingList.total_waiting).label("total_waiting"),
            func.sum(WaitingList.waiting_over_18_weeks).label("waiting_over_18_weeks"),
            func.sum(WaitingList.waiting_over_52_weeks).label("waiting_over_52_weeks"),
        )
        .join(Trust, WaitingList.trust_id == Trust.id)
        .join(Region, Trust.region_id == Region.id)
        .filter(
            WaitingList.snapshot_month == latest_month,
            func.lower(WaitingList.specialty) == specialty.strip().lower(),
        )
        .group_by(Trust.id, Trust.name, Trust.trust_code, Region.name, Trust.cqc_rating)
    )

    if region_filter:
        query = query.filter(func.lower(Region.name) == region_filter.strip().lower())

    rows = query.all()
    providers: list[PatientProviderOption] = []
    for row in rows:
        total_waiting = int(row.total_waiting or 0)
        waiting_over_18 = int(row.waiting_over_18_weeks or 0)
        waiting_over_52 = int(row.waiting_over_52_weeks or 0)
        pct_over_18 = round((waiting_over_18 / total_waiting) * 100.0, 1) if total_waiting else 0.0
        likely_weeks, _, _, probability_within_18 = _estimate_wait_windows(
            total_waiting,
            waiting_over_18,
            waiting_over_52,
        )
        provider_score = round(
            pct_over_18 + min(total_waiting / 10000, 12.0) + _rating_adjustment(row.cqc_rating),
            1,
        )

        providers.append(
            PatientProviderOption(
                trust_id=int(row.trust_id),
                trust_name=row.trust_name,
                trust_code=row.trust_code,
                region=row.region_name,
                specialty=specialty,
                cqc_rating=row.cqc_rating,
                total_waiting=total_waiting,
                waiting_over_18_weeks=waiting_over_18,
                waiting_over_52_weeks=waiting_over_52,
                pct_over_18_weeks=pct_over_18,
                estimated_wait_weeks=likely_weeks,
                probability_within_18_weeks=probability_within_18,
                provider_score=provider_score,
                recommendation_note=_provider_note(pct_over_18),
            )
        )

    providers.sort(key=lambda provider: (provider.provider_score, provider.pct_over_18_weeks, provider.total_waiting))
    return latest_month, providers


@router.get("/patient/local-summary", response_model=PatientLocalSummaryResponse)
def get_patient_local_summary(
    region: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
) -> PatientLocalSummaryResponse:
    latest_month, rows = _load_latest_rows(db)
    if latest_month is None or not rows:
        return _empty_local_summary(region)

    selected = _find_region_row(rows, region)
    if selected is None:
        raise HTTPException(status_code=404, detail="Region not found in latest snapshot")

    metric, selected_region = selected
    avg_pct = sum(row_metric.pct_over_18_weeks for row_metric, _ in rows) / len(rows)
    avg_score = sum(row_metric.inequality_score for row_metric, _ in rows) / len(rows)
    confidence, confidence_reason = _confidence_for_snapshot(latest_month, len(rows))
    pressure_label, _ = _comparison_label(metric.pct_over_18_weeks, avg_pct, tolerance=3.0)

    if metric.trend == "deteriorating":
        trend_message = "The latest month suggests pressure is worsening rather than easing."
    elif metric.trend == "improving":
        trend_message = "The latest month suggests pressure is easing rather than worsening."
    else:
        trend_message = "The latest month suggests pressure is broadly steady."

    score_gap = metric.inequality_score - avg_score
    if score_gap > 5:
        score_message = "Inequality pressure in this region is above the tracked regional average."
    elif score_gap < -5:
        score_message = "Inequality pressure in this region is below the tracked regional average."
    else:
        score_message = "Inequality pressure here is close to the tracked regional average."

    return PatientLocalSummaryResponse(
        region=selected_region.name,
        has_live_data=True,
        snapshot_month=latest_month,
        last_updated=latest_month,
        confidence=confidence,
        confidence_reason=confidence_reason,
        total_waiting=metric.total_waiting,
        pct_over_18_weeks=round(metric.pct_over_18_weeks, 1),
        inequality_score=round(metric.inequality_score, 1),
        backlog_rate_per_100k=round(metric.backlog_rate_per_100k, 1),
        trend=metric.trend,
        plain_english_summary=(
            f"{selected_region.name} is currently {pressure_label.lower()}. "
            f"{metric.pct_over_18_weeks:.1f}% of patients are waiting over 18 weeks in the latest regional snapshot."
        ),
        what_this_means=[
            score_message,
            trend_message,
            "This signal describes regional pressure, not your exact hospital or specialty queue.",
        ],
        honest_note=(
            "This is a regional summary only. Your actual wait can move faster or slower depending on the hospital, "
            "specialty, referral route, and any later provider switch."
        ),
    )


@router.get("/patient/area-compare", response_model=PatientAreaCompareResponse)
def get_patient_area_compare(
    region: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
) -> PatientAreaCompareResponse:
    latest_month, rows = _load_latest_rows(db)
    if latest_month is None or not rows:
        return _empty_area_compare(region)

    selected = _find_region_row(rows, region)
    if selected is None:
        raise HTTPException(status_code=404, detail="Region not found in latest snapshot")

    metric, selected_region = selected
    avg_pct = sum(row_metric.pct_over_18_weeks for row_metric, _ in rows) / len(rows)
    avg_score = sum(row_metric.inequality_score for row_metric, _ in rows) / len(rows)
    sorted_regions = sorted(rows, key=lambda row: row[0].inequality_score, reverse=True)
    regional_rank = next(
        (index + 1 for index, (_, row_region) in enumerate(sorted_regions) if row_region.id == selected_region.id),
        None,
    )
    comparison_label, indicator = _comparison_label(metric.pct_over_18_weeks, avg_pct, tolerance=3.0)

    return PatientAreaCompareResponse(
        region=selected_region.name,
        has_live_data=True,
        snapshot_month=latest_month,
        total_regions=len(rows),
        regional_rank=regional_rank,
        local_pct_over_18_weeks=round(metric.pct_over_18_weeks, 1),
        national_avg_pct_over_18_weeks=round(avg_pct, 1),
        local_inequality_score=round(metric.inequality_score, 1),
        national_avg_inequality_score=round(avg_score, 1),
        pct_over_18_weeks_delta=round(metric.pct_over_18_weeks - avg_pct, 1),
        inequality_score_delta=round(metric.inequality_score - avg_score, 1),
        comparison_label=comparison_label,
        inequality_indicator=indicator,
        plain_english_summary=(
            f"{selected_region.name} has {metric.pct_over_18_weeks:.1f}% of patients waiting over 18 weeks, "
            f"compared with {avg_pct:.1f}% across tracked NHS England regions."
        ),
    )


@router.get("/patient/choice-rights", response_model=PatientChoiceRightsResponse)
def get_patient_choice_rights() -> PatientChoiceRightsResponse:
    return PatientChoiceRightsResponse(
        title="Your NHS choice rights",
        summary=(
            "In many non-emergency cases, you have the right to choose where you go for your first outpatient appointment "
            "and to ask about alternatives if waits are too long."
        ),
        rights=[
            "If a GP refers you for many physical or mental health services, you can usually choose which hospital or service to attend for your first outpatient appointment.",
            "If maximum waiting times are exceeded, the NHS should take reasonable steps to offer suitable alternatives.",
            "If choice is not offered and you believe it should have been, you can ask why and raise it with your local integrated care board.",
        ],
        next_steps=[
            "Ask your referrer whether patient choice applies to your referral.",
            "Compare options using official NHS information and ask about travel and waiting-time trade-offs.",
            "If you are not offered a choice, ask for the reason and where to raise the issue locally.",
        ],
        sources=RIGHTS_SOURCES,
    )


@router.get("/patient/journey-guide", response_model=PatientJourneyGuideResponse)
def get_patient_journey_guide() -> PatientJourneyGuideResponse:
    return PatientJourneyGuideResponse(
        title="Simple NHS waiting-list journey",
        summary=(
            "This is a simplified guide to the usual elective pathway from referral to treatment. "
            "Local processes can vary by specialty and provider."
        ),
        steps=[
            PatientJourneyStep(
                step="1",
                title="Referral starts the pathway",
                detail="Your GP, dentist, or optometrist refers you if specialist care is appropriate.",
            ),
            PatientJourneyStep(
                step="2",
                title="First outpatient appointment",
                detail="You are offered an appointment with a provider or team, and this is often the point where choice matters most.",
            ),
            PatientJourneyStep(
                step="3",
                title="Tests, follow-up, or treatment planning",
                detail="Some pathways include diagnostics or review appointments before treatment is agreed.",
            ),
            PatientJourneyStep(
                step="4",
                title="Treatment or next decision",
                detail="Treatment starts, or you are given the next planned step if further assessment is needed.",
            ),
        ],
        questions_for_gp=[
            "Does patient choice apply to my referral?",
            "Are there other providers with shorter waits for this specialty?",
            "What should I do if my wait becomes much longer than expected?",
        ],
    )


@router.get("/patient/preparation-guide", response_model=PatientPreparationGuideResponse)
def get_patient_preparation_guide() -> PatientPreparationGuideResponse:
    return PatientPreparationGuideResponse(
        title="How to prepare while you wait",
        summary=(
            "This guide is non-clinical. It helps you stay organised, know what paperwork to keep handy, "
            "and understand what to ask when chasing a referral or appointment."
        ),
        document_checklist=[
            "Your NHS number if you have it available.",
            "Referral date and the name of the specialty you were referred to.",
            "Letters, appointment texts, or portal screenshots from your trust or GP practice.",
            "A short timeline of any calls, cancellations, or rescheduled appointments.",
            "A list of medicines, access needs, and practical constraints you may need to mention.",
        ],
        before_appointment=[
            "Write down the main symptoms, questions, and practical concerns you want to raise.",
            "Check the location, travel plan, and any accessibility support you may need.",
            "Bring any letters, test results, or forms you were told to keep.",
            "If you may need time off work or support with transport, plan that early rather than on the day.",
        ],
        while_waiting=[
            "Keep copies of referral and booking messages so you can quote them if you need an update.",
            "Use official NHS or trust channels for status checks rather than relying on informal advice.",
            "If your circumstances or contact details change, update the provider or GP practice promptly.",
            "If your symptoms worsen, use the appropriate NHS advice route instead of waiting for a routine booking update.",
        ],
        escalation_steps=[
            "Ask your GP practice or original referrer to confirm the referral is active and where it was sent.",
            "If you already have a provider, contact the appointments team or outpatient booking office for an update.",
            "If communication breaks down, ask the provider's Patient Advice and Liaison Service (PALS) how to raise a non-clinical concern.",
            "If your wait appears to breach expectations, ask whether patient choice or an alternative provider is available.",
        ],
    )


@router.get("/patient/providers", response_model=PatientProvidersResponse)
def get_patient_providers(
    specialty: str = Query(..., min_length=2),
    region: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> PatientProvidersResponse:
    latest_month, providers = _load_provider_options(db, specialty, region)
    return PatientProvidersResponse(
        snapshot_month=latest_month,
        has_live_data=bool(latest_month and providers),
        specialty=specialty,
        region_filter=region,
        providers=providers,
        honest_note=(
            "Provider options are ranked from current trust-level RTT pressure only. "
            "Travel time, slot availability, and clinical suitability are not modelled yet."
        ),
    )


@router.post("/patient/gp-helper", response_model=PatientGPHelperResponse)
def get_patient_gp_helper(
    request: PatientGPHelperRequest,
    db: Session = Depends(get_db),
) -> PatientGPHelperResponse:
    _, providers = _load_provider_options(db, request.specialty, request.region)
    selected = _find_provider(providers, request.trust_code)
    alternative = next(
        (
            provider
            for provider in providers
            if selected is not None and provider.trust_code != selected.trust_code
        ),
        None,
    )

    if selected is not None:
        summary = (
            f"{selected.trust_name} currently shows an estimated wait of about "
            f"{selected.estimated_wait_weeks:.1f} weeks for {request.specialty.lower()} in this comparison set."
        )
    else:
        summary = (
            f"Use these questions to talk through your {request.specialty.lower()} referral, current wait, "
            "and whether alternative providers should be considered."
        )

    suggested_questions = [
        "Can you confirm that my referral is active and tell me which provider currently holds it?",
        f"Does patient choice apply to my {request.specialty.lower()} referral, and if so can we review the available providers?",
        "Based on my symptoms and pathway, is there any reason I should not consider a faster provider if one is available?",
        "Who should I contact for routine booking updates, and when would you expect me to chase this again if I hear nothing?",
        "If my symptoms worsen or my situation changes, what is the right NHS route to use instead of waiting silently?",
    ]

    if selected is not None:
        suggested_questions.insert(
            2,
            f"This tool shows about {selected.estimated_wait_weeks:.1f} weeks at {selected.trust_name}; does that broadly fit what you can see from the referral pathway?",
        )

    if alternative is not None:
        suggested_questions.append(
            f"I can see {alternative.trust_name} looks faster in the current dataset. Is that a clinically and practically suitable alternative for me?"
        )

    talking_points = [
        "Quote your referral date, specialty, and any booking messages you have already received.",
        "Ask about practical constraints early, including travel, accessibility, caring responsibilities, or work commitments.",
        "Keep the discussion non-clinical unless your GP or NHS clinician is advising on symptoms or treatment.",
    ]

    if selected is not None:
        talking_points.insert(
            1,
            f"Current provider pressure: {selected.pct_over_18_weeks:.1f}% over 18 weeks at {selected.trust_name} in the latest provider snapshot.",
        )

    return PatientGPHelperResponse(
        specialty=request.specialty,
        region=request.region,
        trust_name=selected.trust_name if selected is not None else None,
        summary=summary,
        suggested_questions=suggested_questions,
        talking_points=talking_points,
        honest_note=(
            "This helper suggests practical questions only. It does not replace clinical advice, "
            "and it cannot see your personal referral record."
        ),
    )


@router.post("/patient/estimate", response_model=PatientWaitEstimateResponse)
def estimate_patient_wait(
    request: PatientWaitEstimateRequest,
    db: Session = Depends(get_db),
) -> PatientWaitEstimateResponse:
    latest_month, providers = _load_provider_options(db, request.specialty, request.region)
    if latest_month is None or not providers:
        return PatientWaitEstimateResponse(
            snapshot_month=None,
            has_live_data=False,
            specialty=request.specialty,
            trust_name=None,
            trust_code=request.trust_code,
            region=request.region,
            confidence="low",
            confidence_reason="No live provider-level waiting data is available for this specialty yet.",
            likely_wait_weeks=0.0,
            best_case_weeks=0.0,
            worst_case_weeks=0.0,
            probability_within_18_weeks=0.0,
            methodology="No estimate could be produced because provider-level RTT data is missing.",
            honest_note="This estimator only works when the current provider-level RTT specialty data is available.",
        )

    selected = next((provider for provider in providers if provider.trust_code == request.trust_code), None)
    if selected is None:
        raise HTTPException(status_code=404, detail="Provider not found for the selected specialty")

    likely_case, best_case, worst_case, probability = _estimate_wait_windows(
        selected.total_waiting,
        selected.waiting_over_18_weeks,
        selected.waiting_over_52_weeks,
    )
    confidence, confidence_reason = _confidence_for_snapshot(latest_month, len(providers))

    return PatientWaitEstimateResponse(
        snapshot_month=latest_month,
        has_live_data=True,
        specialty=request.specialty,
        trust_name=selected.trust_name,
        trust_code=selected.trust_code,
        region=selected.region,
        confidence=confidence,
        confidence_reason=confidence_reason,
        likely_wait_weeks=likely_case,
        best_case_weeks=best_case,
        worst_case_weeks=worst_case,
        probability_within_18_weeks=probability,
        methodology=(
            "Estimate derived from the latest provider RTT specialty backlog using over-18-week share, "
            "very-long-wait share, and current queue size. This is a directional heuristic, not slot-level scheduling data."
        ),
        honest_note=(
            "This estimate does not yet use your referral date, travel time, clinical urgency, or live appointment slots."
        ),
    )


@router.post("/patient/contact-guide", response_model=PatientContactGuideResponse)
def get_patient_contact_guide(
    request: PatientContactGuideRequest,
    db: Session = Depends(get_db),
) -> PatientContactGuideResponse:
    trust = None
    if request.trust_code:
        trust = (
            db.query(Trust, Region)
            .join(Region, Trust.region_id == Region.id)
            .filter(Trust.trust_code == request.trust_code)
            .first()
        )

    trust_name = trust[0].name if trust is not None else None
    region_name = request.region or (trust[1].name if trust is not None else None)

    routes = [
        PatientContactRoute(
            label="Referrer or GP practice",
            detail=(
                "Ask them to confirm the referral date, the specialty, whether the referral is active, "
                "and which provider currently holds it."
            ),
        ),
        PatientContactRoute(
            label="Appointments or outpatient booking team",
            detail=(
                f"If you are already under {trust_name}, ask the provider's appointments team for booking progress, "
                "cancellations, or whether you are on a waiting list."
                if trust_name
                else "If a provider has already accepted the referral, ask its appointments or outpatient booking team for booking progress."
            ),
        ),
        PatientContactRoute(
            label="PALS for non-clinical problems",
            detail=(
                f"If {trust_name} is not responding or you cannot resolve an administrative issue, ask the provider's PALS team how to raise a concern."
                if trust_name
                else "If communication breaks down, contact the provider's Patient Advice and Liaison Service (PALS) for non-clinical support."
            ),
        ),
        PatientContactRoute(
            label="NHS 111 or urgent care route if symptoms change",
            detail=(
                "If your symptoms worsen or the situation becomes urgent, use the appropriate NHS urgent advice route rather than waiting for a routine booking update."
            ),
        ),
    ]

    checklist_before_contact = [
        "Keep your NHS number, referral date, and specialty name in front of you.",
        "Have the trust name or trust code ready if you already know where the referral went.",
        "Keep a note of the dates of any letters, texts, or portal messages you have received.",
        "Write down the exact update you need: referral confirmation, booking status, cancellation list, or provider choice discussion.",
    ]

    return PatientContactGuideResponse(
        specialty=request.specialty,
        region=region_name,
        trust_name=trust_name,
        trust_code=request.trust_code,
        routes=routes,
        checklist_before_contact=checklist_before_contact,
        honest_note=(
            "This app does not store direct department phone numbers or patient records. "
            "It points you to the right type of contact route only."
        ),
    )


@router.post("/patient/stay-switch", response_model=PatientStaySwitchResponse)
def get_patient_stay_switch(
    request: PatientStaySwitchRequest,
    db: Session = Depends(get_db),
) -> PatientStaySwitchResponse:
    latest_month, providers = _load_provider_options(db, request.specialty, request.region)
    if latest_month is None or not providers:
        return PatientStaySwitchResponse(
            snapshot_month=None,
            has_live_data=False,
            specialty=request.specialty,
            region_filter=request.region,
            current_provider=None,
            recommended_provider=None,
            recommended_action="insufficient-data",
            estimated_weeks_saved=0.0,
            reasoning=["No live provider-level RTT specialty data is available for this recommendation yet."],
            honest_note="Travel burden and clinical suitability are not modelled yet.",
        )

    current = next((provider for provider in providers if provider.trust_code == request.current_trust_code), None)
    if current is None:
        raise HTTPException(status_code=404, detail="Current provider not found for the selected specialty")

    alternative = next((provider for provider in providers if provider.trust_code != request.current_trust_code), None)
    if alternative is None:
        return PatientStaySwitchResponse(
            snapshot_month=latest_month,
            has_live_data=True,
            specialty=request.specialty,
            region_filter=request.region,
            current_provider=current,
            recommended_provider=None,
            recommended_action="stay",
            estimated_weeks_saved=0.0,
            reasoning=["No alternative provider was available in the current comparison set."],
            honest_note="Travel burden and clinical suitability are not modelled yet.",
        )

    weeks_saved = round(max(0.0, current.estimated_wait_weeks - alternative.estimated_wait_weeks), 1)
    over_18_improvement = current.pct_over_18_weeks - alternative.pct_over_18_weeks

    if weeks_saved >= 4.0 or over_18_improvement >= 8.0:
        action = "switch"
    elif weeks_saved >= 1.5 or over_18_improvement >= 4.0:
        action = "consider-switch"
    else:
        action = "stay"

    reasoning = [
        f"Current provider estimate: about {current.estimated_wait_weeks:.1f} weeks with {current.pct_over_18_weeks:.1f}% over 18 weeks.",
        f"Best alternative estimate: about {alternative.estimated_wait_weeks:.1f} weeks with {alternative.pct_over_18_weeks:.1f}% over 18 weeks.",
        "This comparison is based on provider RTT backlog pressure only and does not yet include travel, availability of appointment slots, or clinical fit.",
    ]

    return PatientStaySwitchResponse(
        snapshot_month=latest_month,
        has_live_data=True,
        specialty=request.specialty,
        region_filter=request.region,
        current_provider=current,
        recommended_provider=alternative,
        recommended_action=action,
        estimated_weeks_saved=weeks_saved,
        reasoning=reasoning,
        honest_note="Switch recommendations are directional only until travel burden, referral rules, and slot availability are modelled.",
    )
