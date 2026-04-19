from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[3]
REGION_ASSETS_FILE = ROOT_DIR / "pipeline" / "data" / "processed" / "region_assets.json"

DEFAULT_REGION_CENTERS: dict[str, tuple[float, float]] = {
    "North East & Yorkshire": (54.2, -1.5),
    "Midlands": (52.6, -1.9),
    "North West": (53.6, -2.7),
    "East of England": (52.3, 0.4),
    "London": (51.51, -0.1),
    "South East": (51.0, -0.2),
    "South West": (50.7, -3.7),
}


@lru_cache(maxsize=1)
def load_region_assets() -> dict[str, dict[str, Any]]:
    assets: dict[str, dict[str, Any]] = {}

    if REGION_ASSETS_FILE.exists():
        try:
            raw = json.loads(REGION_ASSETS_FILE.read_text())
            if isinstance(raw, dict):
                assets = {
                    str(name): value
                    for name, value in raw.items()
                    if isinstance(value, dict)
                }
        except json.JSONDecodeError:
            assets = {}

    for name, (lat, lng) in DEFAULT_REGION_CENTERS.items():
        entry = assets.setdefault(name, {})
        entry.setdefault("region_center_lat", lat)
        entry.setdefault("region_center_lng", lng)

    return assets


def get_region_asset_fields(region_name: str) -> dict[str, Any]:
    asset = load_region_assets().get(region_name, {})
    return {
        "region_center_lat": asset.get("region_center_lat"),
        "region_center_lng": asset.get("region_center_lng"),
        "boundary_geojson": asset.get("boundary_geojson"),
    }
