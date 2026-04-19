"""Integration tests for live-data-only empty-database behaviour."""

import os

from datetime import date

from app.models import ProcessedMetric, Region, Trust, WaitingList


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"


def test_overview_returns_empty_live_state(client):
    r = client.get("/api/overview")
    assert r.status_code == 200
    data = r.json()
    assert data["total_regions"] == 0
    assert data["monthly_trend"] == []
    assert data["worst_regions"] == []


def test_regions_returns_empty_live_state(client):
    r = client.get("/api/regions")
    assert r.status_code == 200
    regions = r.json()
    assert regions == []


def test_regions_applies_dynamic_boundary_assets(client, db, monkeypatch):
    sentinel_boundary = {
        "type": "Polygon",
        "coordinates": [[[-1.0, 52.0], [-0.9, 52.0], [-0.9, 51.9], [-1.0, 51.9], [-1.0, 52.0]]],
    }

    def fake_asset_fields(_name):
        return {
            "region_center_lat": 52.01,
            "region_center_lng": -0.99,
            "boundary_geojson": sentinel_boundary,
        }

    db.add(
        Region(
            id=1,
            name="Sentinel Region",
            region_code="Y63",
            deprivation_index=0.42,
            population=100000,
        )
    )
    db.add(
        ProcessedMetric(
            region_id=1,
            snapshot_month=date(2026, 3, 1),
            inequality_score=61.0,
            backlog_rate_per_100k=144.0,
            backlog_growth_rate=3.5,
            total_waiting=250000,
            pct_over_18_weeks=72.0,
            trend="stable",
        )
    )
    db.commit()

    monkeypatch.setattr("app.routers.regions.get_region_asset_fields", fake_asset_fields)

    r = client.get("/api/regions")
    assert r.status_code == 200
    regions = r.json()
    assert len(regions) == 1
    assert regions[0]["region_center_lat"] == 52.01
    assert regions[0]["region_center_lng"] == -0.99
    assert regions[0]["boundary_geojson"] == sentinel_boundary


def test_region_not_found(client):
    r = client.get("/api/regions/99999")
    assert r.status_code == 404


def test_inequality_returns_empty_live_state(client):
    r = client.get("/api/inequality")
    assert r.status_code == 200
    data = r.json()
    assert data["regions"] == []
    assert data["gap_ratio"] == 0
    assert data["best_region"] == ""
    assert data["worst_region"] == ""


def test_specialties_returns_empty_live_state(client):
    r = client.get("/api/specialties")
    assert r.status_code == 200
    data = r.json()
    assert data["specialties"] == []
    assert data["worst_specialty"] == ""


def test_trends_returns_empty_live_state(client):
    r = client.get("/api/trends")
    assert r.status_code == 200
    data = r.json()
    assert data["regions"] == []
    assert data["series"] == []
    assert data["forecast"] == []


def test_data_status_empty(client):
    r = client.get("/api/status/data")
    assert r.status_code == 200
    data = r.json()
    assert data["has_live_data"] is False
    assert data["processed_metric_rows"] == 0
    assert data["waiting_list_rows"] == 0
    assert data["forecast_rows"] == 0


def test_rtt_archive_empty(client):
    r = client.get("/api/status/rtt-archive")
    assert r.status_code == 200
    data = r.json()
    assert data["total_archives"] == 0
    assert data["latest_archive"] is None
    assert data["archives"] == []


def test_rtt_archive_lists_preserved_snapshots(client, monkeypatch, tmp_path):
    zip_dir = tmp_path / "zips"
    csv_dir = tmp_path / "csv"
    zip_dir.mkdir()
    csv_dir.mkdir()

    first_zip = zip_dir / "Full-CSV-data-file-Feb26-ZIP-4M-9j03fJT.zip"
    second_zip = zip_dir / "Full-CSV-data-file-Jan26-ZIP-4M-WL5BiP.zip"
    first_zip.write_bytes(b"first-zip")
    second_zip.write_bytes(b"second-zip")
    os.utime(first_zip, (1_700_000_000, 1_700_000_000))
    os.utime(second_zip, (1_800_000_000, 1_800_000_000))

    first_csv_dir = csv_dir / first_zip.stem
    second_csv_dir = csv_dir / second_zip.stem
    first_csv_dir.mkdir()
    second_csv_dir.mkdir()
    (first_csv_dir / "20260228-RTT-February-2026-full-extract.csv").write_text("period,provider_code\n2026-02,RFH12\n")
    (second_csv_dir / "20260131-RTT-January-2026-full-extract.csv").write_text("period,provider_code\n2026-01,RFH12\n")

    monkeypatch.setattr("app.routers.status.RTT_ARCHIVE_ZIP_DIR", zip_dir)
    monkeypatch.setattr("app.routers.status.RTT_ARCHIVE_CSV_DIR", csv_dir)

    r = client.get("/api/status/rtt-archive")
    assert r.status_code == 200
    data = r.json()
    assert data["total_archives"] == 2
    assert data["latest_archive"]["zip_filename"] == second_zip.name
    assert data["latest_archive"]["downloaded_at"] == date.fromtimestamp(1_800_000_000).isoformat()
    assert data["latest_archive"]["zip_size_bytes"] == len(b"second-zip")
    assert data["archives"][0]["zip_filename"] == second_zip.name
    assert data["archives"][1]["zip_filename"] == first_zip.name
    assert len(data["archives"][0]["csv_filenames"]) == 1


def test_patient_choice_rights(client):
    r = client.get("/api/patient/choice-rights")
    assert r.status_code == 200
    data = r.json()
    assert "choice" in data["title"].lower()
    assert len(data["rights"]) >= 2
    assert len(data["sources"]) >= 2


def test_patient_journey_guide(client):
    r = client.get("/api/patient/journey-guide")
    assert r.status_code == 200
    data = r.json()
    assert len(data["steps"]) >= 4
    assert len(data["questions_for_gp"]) >= 2


def test_patient_preparation_guide(client):
    r = client.get("/api/patient/preparation-guide")
    assert r.status_code == 200
    data = r.json()
    assert len(data["document_checklist"]) >= 4
    assert len(data["while_waiting"]) >= 3
    assert len(data["escalation_steps"]) >= 3


def test_patient_local_summary_empty(client):
    r = client.get("/api/patient/local-summary", params={"region": "London"})
    assert r.status_code == 200
    data = r.json()
    assert data["has_live_data"] is False
    assert data["confidence"] == "low"
    assert data["total_waiting"] == 0


def test_patient_local_summary_and_compare_live(client, db):
    snapshot_month = date.today().replace(day=1)

    db.add_all([
        Region(id=1, name="London", region_code="Y56", deprivation_index=0.55, population=9000000),
        Region(id=2, name="Midlands", region_code="Y60", deprivation_index=0.65, population=10800000),
    ])
    db.add_all([
        ProcessedMetric(
            region_id=1,
            snapshot_month=snapshot_month,
            inequality_score=42.0,
            backlog_rate_per_100k=88.0,
            backlog_growth_rate=-1.0,
            total_waiting=340000,
            pct_over_18_weeks=49.0,
            trend="improving",
        ),
        ProcessedMetric(
            region_id=2,
            snapshot_month=snapshot_month,
            inequality_score=71.0,
            backlog_rate_per_100k=140.0,
            backlog_growth_rate=4.2,
            total_waiting=460000,
            pct_over_18_weeks=74.0,
            trend="deteriorating",
        ),
    ])
    db.commit()

    summary = client.get("/api/patient/local-summary", params={"region": "London"})
    assert summary.status_code == 200
    summary_data = summary.json()
    assert summary_data["has_live_data"] is True
    assert summary_data["region"] == "London"
    assert summary_data["total_waiting"] == 340000
    assert summary_data["trend"] == "improving"

    compare = client.get("/api/patient/area-compare", params={"region": "London"})
    assert compare.status_code == 200
    compare_data = compare.json()
    assert compare_data["has_live_data"] is True
    assert compare_data["region"] == "London"
    assert compare_data["total_regions"] == 2
    assert compare_data["regional_rank"] == 2
    assert compare_data["pct_over_18_weeks_delta"] < 0
    assert compare_data["inequality_score_delta"] < 0


def test_patient_provider_tools_live(client, db):
    snapshot_month = date.today().replace(day=1)

    db.add_all([
        Region(id=10, name="London", region_code="Y56", deprivation_index=0.55, population=9000000),
        Trust(id=10, name="River NHS Trust", trust_code="RIV1", region_id=10, cqc_rating="Good"),
        Trust(id=11, name="Central NHS Trust", trust_code="CEN1", region_id=10, cqc_rating="Outstanding"),
    ])
    db.add_all([
        WaitingList(
            region_id=10,
            trust_id=10,
            specialty="Cardiology",
            snapshot_month=snapshot_month,
            total_waiting=240,
            waiting_under_18_weeks=120,
            waiting_over_18_weeks=120,
            waiting_over_52_weeks=30,
            pct_over_18_weeks=50.0,
        ),
        WaitingList(
            region_id=10,
            trust_id=11,
            specialty="Cardiology",
            snapshot_month=snapshot_month,
            total_waiting=190,
            waiting_under_18_weeks=130,
            waiting_over_18_weeks=60,
            waiting_over_52_weeks=10,
            pct_over_18_weeks=31.6,
        ),
    ])
    db.commit()

    providers = client.get("/api/patient/providers", params={"region": "London", "specialty": "Cardiology"})
    assert providers.status_code == 200
    provider_data = providers.json()
    assert provider_data["has_live_data"] is True
    assert len(provider_data["providers"]) == 2
    assert provider_data["providers"][0]["trust_code"] == "CEN1"

    estimate = client.post("/api/patient/estimate", json={
        "region": "London",
        "specialty": "Cardiology",
        "trust_code": "RIV1",
    })
    assert estimate.status_code == 200
    estimate_data = estimate.json()
    assert estimate_data["has_live_data"] is True
    assert estimate_data["trust_code"] == "RIV1"
    assert estimate_data["likely_wait_weeks"] > 0
    assert estimate_data["best_case_weeks"] < estimate_data["worst_case_weeks"]

    stay_switch = client.post("/api/patient/stay-switch", json={
        "region": "London",
        "specialty": "Cardiology",
        "current_trust_code": "RIV1",
    })
    assert stay_switch.status_code == 200
    stay_switch_data = stay_switch.json()
    assert stay_switch_data["has_live_data"] is True
    assert stay_switch_data["current_provider"]["trust_code"] == "RIV1"
    assert stay_switch_data["recommended_provider"]["trust_code"] == "CEN1"
    assert stay_switch_data["recommended_action"] in {"switch", "consider-switch"}
    assert stay_switch_data["estimated_weeks_saved"] > 0

    gp_helper = client.post("/api/patient/gp-helper", json={
        "region": "London",
        "specialty": "Cardiology",
        "trust_code": "RIV1",
    })
    assert gp_helper.status_code == 200
    gp_helper_data = gp_helper.json()
    assert gp_helper_data["trust_name"] == "River NHS Trust"
    assert any("River NHS Trust" in question for question in gp_helper_data["suggested_questions"])
    assert len(gp_helper_data["talking_points"]) >= 3

    contact_guide = client.post("/api/patient/contact-guide", json={
        "region": "London",
        "specialty": "Cardiology",
        "trust_code": "RIV1",
    })
    assert contact_guide.status_code == 200
    contact_guide_data = contact_guide.json()
    assert contact_guide_data["trust_name"] == "River NHS Trust"
    assert any(route["label"] == "PALS for non-clinical problems" for route in contact_guide_data["routes"])
    assert len(contact_guide_data["checklist_before_contact"]) >= 3


def test_ai_explain_no_key(client):
    r = client.post("/api/ai-explain", json={"question": "Why is North East worst?"})
    assert r.status_code == 200
    data = r.json()
    assert "no processed nhs data" in data["response"].lower()


def test_ai_explain_empty_question(client):
    r = client.post("/api/ai-explain", json={"question": "  "})
    assert r.status_code == 422


def test_ai_explain_too_long(client):
    r = client.post("/api/ai-explain", json={"question": "x" * 501})
    assert r.status_code == 422


def test_inequality_service():
    from app.services.inequality import compute_score, classify_trend

    score = compute_score(pct_over_18_weeks=80.0, backlog_growth_rate=20.0, deprivation_index=0.8)
    assert 0 <= score <= 100

    assert classify_trend(current=75.0, previous=70.0) == "deteriorating"
    assert classify_trend(current=65.0, previous=70.0) == "improving"
    assert classify_trend(current=70.5, previous=70.0) == "stable"


def test_forecasting_service():
    from app.services.forecasting import linear_forecast

    values = [6.0, 6.2, 6.4, 6.6, 6.8, 7.0, 7.2, 7.4, 7.6, 7.8, 8.0, 8.2]
    fc = linear_forecast(values, steps=6)
    assert len(fc) == 6
    for point in fc:
        assert point.lower <= point.predicted <= point.upper
