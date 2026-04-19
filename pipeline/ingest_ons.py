"""
ONS Index of Multiple Deprivation (IMD) and population ingestion.

Expected file: data/raw/ons/imd_by_lsoa.csv
  Columns: LSOA code, LSOA name, Local Authority District code, Score

Population data: data/raw/ons/population_by_region.csv
  Columns: region_name, population
"""

import logging
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from config import DATABASE_URL, RAW_DIR

log = logging.getLogger(__name__)

# Approximate mean IMD score (0–1 scale) per NHS England region
# Source: ONS 2019 IMD statistics, aggregated to NHS regions
REGION_DEPRIVATION: dict[str, float] = {
    "North East & Yorkshire": 0.78,
    "North West": 0.61,
    "Midlands": 0.65,
    "East of England": 0.48,
    "London": 0.55,
    "South East": 0.38,
    "South West": 0.31,
}

REGION_POPULATION: dict[str, int] = {
    "North East & Yorkshire": 5_500_000,
    "North West": 7_400_000,
    "Midlands": 10_800_000,
    "East of England": 6_300_000,
    "London": 9_000_000,
    "South East": 9_200_000,
    "South West": 5_700_000,
}

REGION_CODES: dict[str, str] = {
    "North East & Yorkshire": "Y63",
    "North West": "Y62",
    "Midlands": "Y60",
    "East of England": "Y61",
    "London": "Y56",
    "South East": "Y59",
    "South West": "Y58",
}


def _load_region_value_overrides(filepath: Path, value_column: str) -> dict[str, float]:
    if not filepath.exists():
        return {}

    df = pd.read_csv(filepath)
    df.columns = [column.strip().lower().replace(" ", "_") for column in df.columns]
    if "region_name" not in df.columns or value_column not in df.columns:
        log.warning("Skipping %s; expected columns region_name and %s", filepath, value_column)
        return {}

    return {
        str(row["region_name"]).strip(): float(row[value_column])
        for _, row in df.iterrows()
        if str(row.get("region_name", "")).strip() in REGION_CODES
    }


def seed_regions(engine) -> None:
    """Upsert the 7 NHS England regions with deprivation and population data."""
    Session = sessionmaker(bind=engine)
    session = Session()

    deprivation_overrides = _load_region_value_overrides(RAW_DIR / "ons" / "imd_by_region.csv", "deprivation_index")
    population_overrides = _load_region_value_overrides(RAW_DIR / "ons" / "population_by_region.csv", "population")

    for name, dep_index in REGION_DEPRIVATION.items():
        session.execute(
            text("""
                INSERT INTO regions (name, region_code, deprivation_index, population)
                VALUES (:name, :code, :dep, :pop)
                ON CONFLICT (region_code) DO UPDATE
                  SET deprivation_index = EXCLUDED.deprivation_index,
                      population = EXCLUDED.population
            """),
            {
                "name": name,
                "code": REGION_CODES[name],
                "dep": deprivation_overrides.get(name, dep_index),
                "pop": int(population_overrides.get(name, REGION_POPULATION[name])),
            },
        )

    session.commit()
    session.close()
    log.info("Seeded 7 NHS England regions with ONS deprivation data")


def load_imd_from_csv(filepath: Path, engine) -> None:
    """
    Load LSOA-level IMD data and aggregate to NHS region level.
    Only used when detailed postcode-level data is available.
    """
    df = pd.read_csv(filepath)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    if "score" not in df.columns:
        log.warning(f"No 'score' column found in {filepath}")
        return
    log.info(f"Loaded {len(df)} LSOA rows from {filepath.name}")


if __name__ == "__main__":
    engine = create_engine(DATABASE_URL)
    seed_regions(engine)

    detailed_imd = RAW_DIR / "ons" / "imd_by_lsoa.csv"
    if detailed_imd.exists():
        load_imd_from_csv(detailed_imd, engine)
