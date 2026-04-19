"""
Bulk load NHS RTT data into Neon PostgreSQL.

Steps:
1. Load DATABASE_URL from ../backend/.env
2. Parse the CSV using clean_rtt_csv() from ingest_rtt.py
3. Bulk upsert trusts using psycopg2 execute_values
4. Bulk insert waiting_lists using psycopg2 execute_values (page_size=2000)
5. Run inequality_score.py to compute processed_metrics
"""

import logging
import os
import sys
from pathlib import Path

# ── Bootstrap: load .env from ../backend/.env before importing anything that
#    reads config (ingest_rtt / inequality_score both import config.py which
#    calls load_dotenv() without a path, so it would miss the backend .env).
from dotenv import load_dotenv

_env_path = Path(__file__).parent.parent / "backend" / ".env"
if not _env_path.exists():
    print(f"ERROR: .env not found at {_env_path}", file=sys.stderr)
    sys.exit(1)

load_dotenv(dotenv_path=_env_path, override=True)

# Verify DATABASE_URL was loaded
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set after loading .env", file=sys.stderr)
    sys.exit(1)

print(f"Using DATABASE_URL: {DATABASE_URL[:60]}...")

import psycopg2
from psycopg2.extras import execute_values
from sqlalchemy import create_engine, text

# Pipeline dir is the cwd when running this script; ensure imports resolve.
sys.path.insert(0, str(Path(__file__).parent))

from ingest_rtt import clean_rtt_csv
import inequality_score

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)

CSV_PATH = (
    Path(__file__).parent
    / "data" / "raw" / "rtt" / "latest"
    / "20260228-RTT-February-2026-full-extract.csv"
)

# Region IDs as seeded in the DB
REGION_NAME_TO_ID: dict[str, int] = {
    "North East & Yorkshire": 1,
    "Midlands": 2,
    "North West": 3,
    "East of England": 4,
    "London": 5,
    "South East": 6,
    "South West": 7,
}


def get_psycopg2_conn():
    """Return a raw psycopg2 connection from DATABASE_URL."""
    return psycopg2.connect(DATABASE_URL)


def bulk_upsert_trusts(df, conn) -> dict[str, int]:
    """
    Upsert unique trusts and return a mapping trust_code -> trust_id.
    Uses execute_values for bulk efficiency.
    """
    log.info("Upserting trusts ...")

    # Deduplicate: keep one row per provider_code (latest name wins)
    trust_df = (
        df[["provider_code", "provider_name", "region_name"]]
        .drop_duplicates(subset=["provider_code"])
        .copy()
    )
    trust_df = trust_df[trust_df["provider_code"].notna()]
    trust_df = trust_df[trust_df["provider_code"].str.strip() != ""]
    trust_df["region_id"] = trust_df["region_name"].map(REGION_NAME_TO_ID)
    trust_df = trust_df.dropna(subset=["region_id"])
    trust_df["region_id"] = trust_df["region_id"].astype(int)

    records = [
        (
            row["provider_name"][:255],
            row["provider_code"].strip()[:50],
            row["region_id"],
        )
        for _, row in trust_df.iterrows()
    ]

    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO trusts (name, trust_code, region_id)
            VALUES %s
            ON CONFLICT (trust_code) DO UPDATE
              SET name      = EXCLUDED.name,
                  region_id = EXCLUDED.region_id
            """,
            records,
            page_size=500,
        )
        conn.commit()
        log.info(f"Upserted {len(records)} trusts")

        # Fetch the current trust_code -> id mapping
        cur.execute("SELECT id, trust_code FROM trusts")
        trust_map: dict[str, int] = {code: tid for tid, code in cur.fetchall()}

    return trust_map


def bulk_insert_waiting_lists(df, trust_map: dict[str, int], conn) -> int:
    """
    Bulk insert waiting_list rows.  Skips rows without a valid trust_id or region_id.
    Uses execute_values with page_size=2000.
    """
    log.info("Preparing waiting_list rows ...")

    rows = []
    skipped = 0
    for _, row in df.iterrows():
        region_id = REGION_NAME_TO_ID.get(row["region_name"])
        if region_id is None:
            skipped += 1
            continue

        provider_code = str(row.get("provider_code", "")).strip()
        trust_id = trust_map.get(provider_code)
        # trust_id may be None if provider_code was empty; that's OK per schema

        rows.append((
            region_id,
            trust_id,
            str(row.get("treatment_function_name", "Unknown"))[:255],
            row["snapshot_month"],
            int(row["total_all"]),
            int(row["total_within_18_weeks"]),
            int(row["total_over_18_weeks"]),
            int(row.get("total_over_52_weeks", 0)),
            float(row["pct_over_18_weeks"]),
        ))

    if skipped:
        log.warning(f"Skipped {skipped} rows with unknown region")

    log.info(f"Inserting {len(rows)} waiting_list rows (page_size=2000) ...")
    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO waiting_lists
              (region_id, trust_id, specialty, snapshot_month, total_waiting,
               waiting_under_18_weeks, waiting_over_18_weeks, waiting_over_52_weeks,
               pct_over_18_weeks)
            VALUES %s
            ON CONFLICT DO NOTHING
            """,
            rows,
            page_size=2000,
        )
        conn.commit()

    log.info(f"Inserted {len(rows)} rows into waiting_lists")
    return len(rows)


def verify_counts(conn) -> dict[str, int]:
    """Query and return row counts for key tables."""
    tables = ["trusts", "waiting_lists", "processed_metrics"]
    counts = {}
    with conn.cursor() as cur:
        for table in tables:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            counts[table] = cur.fetchone()[0]
    return counts


def main() -> None:
    if not CSV_PATH.exists():
        log.error(f"CSV not found: {CSV_PATH}")
        sys.exit(1)

    log.info(f"Parsing CSV: {CSV_PATH.name}")
    df = clean_rtt_csv(CSV_PATH)
    log.info(f"Parsed {len(df):,} rows after cleaning")

    conn = get_psycopg2_conn()
    try:
        trust_map = bulk_upsert_trusts(df, conn)
        waiting_count = bulk_insert_waiting_lists(df, trust_map, conn)
    finally:
        conn.close()

    # Run inequality scoring (uses SQLAlchemy engine internally)
    log.info("Running inequality_score.run() ...")
    engine = create_engine(DATABASE_URL)
    metric_count = inequality_score.run(engine)
    engine.dispose()
    log.info(f"Computed {metric_count} processed_metric records")

    # Final verification
    conn = get_psycopg2_conn()
    try:
        counts = verify_counts(conn)
    finally:
        conn.close()

    print("\n=== Final row counts ===")
    for table, count in counts.items():
        print(f"  {table}: {count:,}")
    print("========================\n")


if __name__ == "__main__":
    main()
