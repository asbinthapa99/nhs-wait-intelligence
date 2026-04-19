"""
Care Quality Commission trust rating ingestion.

Expected file:
  data/raw/cqc/trust_ratings.csv

The loader accepts a few common column aliases and updates `trusts.cqc_rating`
for any trust already known from RTT ingestion.
"""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from config import RAW_DIR

log = logging.getLogger(__name__)

CQC_DIR = RAW_DIR / "cqc"
CQC_FILE = CQC_DIR / "trust_ratings.csv"


def _pick_column(df: pd.DataFrame, candidates: list[str]) -> str | None:
    for candidate in candidates:
        if candidate in df.columns:
            return candidate
    return None


def ingest_cqc_ratings(engine, filepath: Path = CQC_FILE) -> int:
    if not filepath.exists():
        log.info("No CQC ratings file found at %s", filepath)
        return 0

    df = pd.read_csv(filepath)
    df.columns = [column.strip().lower().replace(" ", "_") for column in df.columns]

    code_col = _pick_column(df, ["trust_code", "provider_code", "ods_code", "organisation_code", "organization_code"])
    name_col = _pick_column(df, ["trust_name", "provider_name", "organisation_name", "organization_name", "name"])
    rating_col = _pick_column(df, ["cqc_rating", "overall_rating", "rating", "current_rating"])

    if rating_col is None or (code_col is None and name_col is None):
        log.warning("CQC file missing required columns: %s", list(df.columns))
        return 0

    Session = sessionmaker(bind=engine)
    session = Session()

    trusts_by_code = {
        trust_code: trust_id
        for trust_id, trust_code in session.execute(text("SELECT id, trust_code FROM trusts")).fetchall()
        if trust_code
    }
    trusts_by_name = {
        name.strip().lower(): trust_id
        for trust_id, name in session.execute(text("SELECT id, name FROM trusts")).fetchall()
        if name
    }

    updated = 0
    for _, row in df.iterrows():
        trust_id = None
        if code_col:
            trust_id = trusts_by_code.get(str(row.get(code_col, "")).strip())

        if trust_id is None and name_col:
            trust_id = trusts_by_name.get(str(row.get(name_col, "")).strip().lower())

        rating = str(row.get(rating_col, "")).strip()
        if trust_id is None or not rating:
            continue

        session.execute(
            text("UPDATE trusts SET cqc_rating = :rating WHERE id = :trust_id"),
            {"rating": rating, "trust_id": trust_id},
        )
        updated += 1

    session.commit()
    session.close()
    log.info("Updated %s trust CQC ratings", updated)
    return updated


if __name__ == "__main__":
    from sqlalchemy import create_engine
    from config import DATABASE_URL

    ingest_cqc_ratings(create_engine(DATABASE_URL))
