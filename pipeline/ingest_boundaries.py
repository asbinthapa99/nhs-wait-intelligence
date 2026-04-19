"""
Optional NHS region boundary ingestion.

Expected file:
  data/raw/ons/nhs_regions.geojson

The script extracts simple region center points and stores the full region
geometry in `data/processed/region_assets.json` for the backend map endpoints.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from config import PROCESSED_DIR, RAW_DIR
from ingest_ons import REGION_CODES

log = logging.getLogger(__name__)

BOUNDARY_FILES = [
    RAW_DIR / "ons" / "nhs_regions.geojson",
    RAW_DIR / "ons" / "regions.geojson",
]
OUTPUT_FILE = PROCESSED_DIR / "region_assets.json"

REGION_ALIASES = {
    "north east and yorkshire": "North East & Yorkshire",
    "north east & yorkshire": "North East & Yorkshire",
    "north west": "North West",
    "midlands": "Midlands",
    "east of england": "East of England",
    "london": "London",
    "south east": "South East",
    "south west": "South West",
}

REGION_CODE_TO_NAME = {code.lower(): name for name, code in REGION_CODES.items()}


def _canonical_region_name(raw_name: str | None) -> str | None:
    if not raw_name:
        return None
    normalized = " ".join(str(raw_name).strip().lower().split())
    return REGION_ALIASES.get(normalized)


def _extract_name(properties: dict[str, Any]) -> str | None:
    normalized_properties = {str(key).strip().lower(): value for key, value in properties.items()}

    for key in (
        "name",
        "region_name",
        "nhs_name",
        "nhsername",
        "nhser_name",
        "nhsernm",
        "nhser24nm",
        "nhser23nm",
        "nhser22nm",
        "region",
    ):
        if key in normalized_properties:
            canonical = _canonical_region_name(str(normalized_properties[key]))
            if canonical is not None:
                return canonical

    for key in ("region_code", "code", "nhser24cd", "nhser23cd", "nhser22cd", "nhsercd"):
        value = normalized_properties.get(key)
        if value is None:
            continue
        region_name = REGION_CODE_TO_NAME.get(str(value).strip().lower())
        if region_name is not None:
            return region_name

    return None


def _iter_points(coordinates: Any):
    if not isinstance(coordinates, list):
        return
    if coordinates and isinstance(coordinates[0], (int, float)) and len(coordinates) >= 2:
        yield coordinates[0], coordinates[1]
        return
    for item in coordinates:
        yield from _iter_points(item)


def build_region_assets() -> int:
    source_file = next((path for path in BOUNDARY_FILES if path.exists()), None)
    if source_file is None:
        log.info("No region GeoJSON found in %s", ", ".join(str(path) for path in BOUNDARY_FILES))
        return 0

    raw = json.loads(source_file.read_text())
    features = raw.get("features", [])
    assets: dict[str, dict[str, Any]] = {}

    for feature in features:
        properties = feature.get("properties") or {}
        geometry = feature.get("geometry") or {}
        region_name = _extract_name(properties)
        if region_name is None or geometry.get("type") not in {"Polygon", "MultiPolygon"}:
            continue

        points = list(_iter_points(geometry.get("coordinates")))
        if not points:
            continue

        lng_values = [lng for lng, _ in points]
        lat_values = [lat for _, lat in points]

        assets[region_name] = {
            "region_center_lat": round(sum(lat_values) / len(lat_values), 4),
            "region_center_lng": round(sum(lng_values) / len(lng_values), 4),
            "boundary_geojson": geometry,
        }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(assets, indent=2))
    log.info("Wrote %s region asset entries to %s", len(assets), OUTPUT_FILE)
    return len(assets)


if __name__ == "__main__":
    build_region_assets()
