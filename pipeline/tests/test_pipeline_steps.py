import json

from ingest_boundaries import build_region_assets
from ingest_rtt import map_trust_to_region


def test_map_trust_to_region_uses_prefix_map():
    assert map_trust_to_region("RFH12") == "London"
    assert map_trust_to_region("RDZ99") == "South West"
    assert map_trust_to_region("UNKNOWN") == "Unknown"


def test_build_region_assets_writes_processed_geojson(monkeypatch, tmp_path):
    source = tmp_path / "nhs_regions.geojson"
    output = tmp_path / "region_assets.json"

    source.write_text(
        json.dumps(
            {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "properties": {"name": "North East and Yorkshire"},
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [[[-2.0, 55.0], [-1.0, 55.0], [-1.0, 54.0], [-2.0, 54.0], [-2.0, 55.0]]],
                        },
                    }
                ],
            }
        )
    )

    monkeypatch.setattr("ingest_boundaries.BOUNDARY_FILES", [source])
    monkeypatch.setattr("ingest_boundaries.OUTPUT_FILE", output)

    written = build_region_assets()
    payload = json.loads(output.read_text())

    assert written == 1
    assert "North East & Yorkshire" in payload
    assert payload["North East & Yorkshire"]["boundary_geojson"]["type"] == "Polygon"
