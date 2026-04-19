from datetime import date

from app.models import Forecast, ProcessedMetric, Region, WaitingList


def seed_live_dataset(db):
    region_ne = Region(name="North East & Yorkshire", region_code="Y63", deprivation_index=0.78, population=5_500_000)
    region_sw = Region(name="South West", region_code="Y58", deprivation_index=0.31, population=5_700_000)
    db.add_all([region_ne, region_sw])
    db.flush()

    months = [
        date(2024, 1, 1), date(2024, 2, 1), date(2024, 3, 1), date(2024, 4, 1),
        date(2024, 5, 1), date(2024, 6, 1), date(2024, 7, 1), date(2024, 8, 1),
        date(2024, 9, 1), date(2024, 10, 1), date(2024, 11, 1), date(2024, 12, 1),
        date(2025, 1, 1),
    ]

    for index, month in enumerate(months):
        ne_total = 700_000 + (index * 20_000)
        sw_total = 280_000 + (index * 8_000)

        db.add_all(
            [
                WaitingList(
                    region_id=region_ne.id,
                    specialty="Orthopaedics",
                    snapshot_month=month,
                    total_waiting=ne_total,
                    waiting_under_18_weeks=int(ne_total * 0.35),
                    waiting_over_18_weeks=int(ne_total * 0.65),
                    waiting_over_52_weeks=int(ne_total * 0.08),
                    pct_over_18_weeks=65.0,
                ),
                WaitingList(
                    region_id=region_sw.id,
                    specialty="Orthopaedics",
                    snapshot_month=month,
                    total_waiting=sw_total,
                    waiting_under_18_weeks=int(sw_total * 0.62),
                    waiting_over_18_weeks=int(sw_total * 0.38),
                    waiting_over_52_weeks=int(sw_total * 0.03),
                    pct_over_18_weeks=38.0,
                ),
                ProcessedMetric(
                    region_id=region_ne.id,
                    snapshot_month=month,
                    inequality_score=85.0 - (0.2 * (12 - index)),
                    backlog_rate_per_100k=140.0 + index,
                    backlog_growth_rate=4.5,
                    total_waiting=ne_total,
                    pct_over_18_weeks=65.0,
                    trend="deteriorating",
                ),
                ProcessedMetric(
                    region_id=region_sw.id,
                    snapshot_month=month,
                    inequality_score=32.0 + (0.1 * index),
                    backlog_rate_per_100k=60.0 + index,
                    backlog_growth_rate=1.3,
                    total_waiting=sw_total,
                    pct_over_18_weeks=38.0,
                    trend="improving",
                ),
            ]
        )

    db.add_all(
        [
            Forecast(
                region_id=region_ne.id,
                forecast_month=date(2025, 2, 1),
                predicted_waiting=960_000,
                lower_bound=940_000,
                upper_bound=980_000,
                model="linear_regression",
                generated_at=date(2025, 1, 15),
            ),
            Forecast(
                region_id=region_ne.id,
                forecast_month=date(2025, 3, 1),
                predicted_waiting=980_000,
                lower_bound=955_000,
                upper_bound=1_005_000,
                model="linear_regression",
                generated_at=date(2025, 1, 15),
            ),
            Forecast(
                region_id=region_sw.id,
                forecast_month=date(2025, 2, 1),
                predicted_waiting=385_000,
                lower_bound=372_000,
                upper_bound=398_000,
                model="linear_regression",
                generated_at=date(2025, 1, 15),
            ),
        ]
    )

    db.commit()


def test_live_regions_include_geo_fields(client, db):
    seed_live_dataset(db)

    response = client.get("/api/regions")
    assert response.status_code == 200
    data = response.json()

    assert data[0]["region_center_lat"] is not None
    assert data[0]["region_center_lng"] is not None


def test_overview_uses_live_metrics(client, db):
    seed_live_dataset(db)

    response = client.get("/api/overview")
    assert response.status_code == 200
    data = response.json()

    assert data["total_regions"] == 2
    assert data["total_waiting"] == 1_236_000
    assert data["monthly_trend"][-1]["month"] == "Jan 25"


def test_specialties_live_data_has_yoy_change(client, db):
    seed_live_dataset(db)

    response = client.get("/api/specialties")
    assert response.status_code == 200
    data = response.json()

    orthopaedics = next(item for item in data["specialties"] if item["name"] == "Orthopaedics")
    assert orthopaedics["yoy_change"] > 0


def test_trends_use_persisted_forecasts_when_available(client, db):
    seed_live_dataset(db)

    response = client.get("/api/trends")
    assert response.status_code == 200
    data = response.json()

    ne_forecast = next(item for item in data["forecast"] if item["region"] == "North East & Yorkshire")
    assert ne_forecast["data"][0]["month"] == "Feb 25"
    assert ne_forecast["data"][0]["predicted"] == 0.96


def test_export_inequality_csv_uses_live_metrics(client, db):
    seed_live_dataset(db)

    response = client.get("/api/export/inequality.csv")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    body = response.text

    assert "North East & Yorkshire" in body
    assert "South West" in body
    assert "inequality_score" in body


def test_data_status_reports_live_snapshot(client, db):
    seed_live_dataset(db)

    response = client.get("/api/status/data")
    assert response.status_code == 200
    data = response.json()

    assert data["has_live_data"] is True
    assert data["regions_in_latest_snapshot"] == 2
    assert data["specialties_in_latest_snapshot"] == 1
    assert data["forecast_regions"] == 2
    assert data["latest_processed_month"] == "2025-01-01"
