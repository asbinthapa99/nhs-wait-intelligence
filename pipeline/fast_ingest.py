"""
Fast RTT ingest using psycopg2 COPY — replaces the slow executemany approach.
Run: python fast_ingest.py
"""
import io
import logging
import os
import calendar
from datetime import date, datetime
from pathlib import Path

import pandas as pd
import psycopg2
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s — %(message)s")
log = logging.getLogger(__name__)

DATABASE_URL = os.environ["DATABASE_URL"]
RAW_DIR = Path(__file__).parent / "data" / "raw"

ICS_KEYWORDS = [
    ("LANCASHIRE", "North West"), ("CHESHIRE", "North West"), ("MERSEY", "North West"),
    ("GREATER MANCHESTER", "North West"), ("CUMBRIA", "North West"),
    ("YORKSHIRE", "North East & Yorkshire"), ("HUMBER", "North East & Yorkshire"),
    ("NORTH EAST", "North East & Yorkshire"), ("TEES", "North East & Yorkshire"),
    ("BIRMINGHAM", "Midlands"), ("COVENTRY", "Midlands"), ("DERBYSHIRE", "Midlands"),
    ("NOTTINGHAM", "Midlands"), ("STAFFORDSHIRE", "Midlands"), ("LEICESTER", "Midlands"),
    ("NORTHAMPTONSHIRE", "Midlands"), ("SHROPSHIRE", "Midlands"), ("BLACK COUNTRY", "Midlands"),
    ("HEREFORDSHIRE", "Midlands"), ("LINCOLNSHIRE", "Midlands"),
    ("CAMBRIDGE", "East of England"), ("NORFOLK", "East of England"), ("SUFFOLK", "East of England"),
    ("ESSEX", "East of England"), ("HERTFORDSHIRE", "East of England"), ("BEDFORDSHIRE", "East of England"),
    ("MID AND SOUTH ESSEX", "East of England"),
    ("LONDON", "London"),
    ("KENT", "South East"), ("SURREY", "South East"), ("SUSSEX", "South East"),
    ("HAMPSHIRE", "South East"), ("BERKSHIRE", "South East"), ("OXFORDSHIRE", "South East"),
    ("BUCKINGHAMSHIRE", "South East"),
    ("CORNWALL", "South West"), ("DEVON", "South West"), ("DORSET", "South West"),
    ("BRISTOL", "South West"), ("SOMERSET", "South West"), ("WILTSHIRE", "South West"),
    ("GLOUCESTERSHIRE", "South West"), ("BATH", "South West"),
]


def map_region(ics_name: str) -> str:
    upper = str(ics_name).upper()
    for kw, region in ICS_KEYWORDS:
        if kw in upper:
            return region
    return "Unknown"


def parse_period(s: str) -> date:
    s = str(s).strip()
    if s.startswith("RTT-"):
        parts = s.split("-")
        month = datetime.strptime(parts[1], "%B").month
        year = int(parts[2])
        return date(year, month, calendar.monthrange(year, month)[1])
    return pd.to_datetime(s).date()


def process_csv(path: Path) -> pd.DataFrame:
    log.info("Reading %s ...", path.name)
    df = pd.read_csv(path, low_memory=False)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    # Keep only Incomplete Pathways
    df = df[df["rtt_part_type"].astype(str).str.contains("Part_2", na=False)]
    df = df.dropna(subset=["provider_org_code"])

    week_cols = [c for c in df.columns if c.startswith("gt_") and "_weeks_sum_1" in c]
    under_18 = week_cols[:18]
    over_18 = week_cols[18:]
    over_52 = week_cols[52:]

    def safe_sum(cols):
        avail = [c for c in cols if c in df.columns]
        if not avail:
            return pd.Series(0, index=df.index)
        return df[avail].apply(pd.to_numeric, errors="coerce").fillna(0).sum(axis=1).astype(int)

    df["under_18"] = safe_sum(under_18)
    df["over_18"] = safe_sum(over_18)
    df["over_52"] = safe_sum(over_52)
    df["total"] = pd.to_numeric(df["total_all"].astype(str).str.replace(",", ""), errors="coerce").fillna(0).astype(int)
    df["pct"] = (df["over_18"] / df["total"].replace(0, 1) * 100).round(2)
    df["region"] = df["provider_parent_name"].fillna("").apply(map_region)
    df["provider_code"] = df["provider_org_code"].astype(str).str.strip()
    df["provider_name"] = df["provider_org_name"].astype(str).str.strip() if "provider_org_name" in df.columns else df["provider_code"]
    df["specialty"] = df["treatment_function_name"].fillna("Unknown")
    df["snapshot_month"] = parse_period(df["period"].iloc[0])

    df = df[df["region"] != "Unknown"]
    log.info("Processed %d rows after filtering", len(df))
    return df[["region", "provider_code", "provider_name", "specialty", "snapshot_month", "total", "under_18", "over_18", "over_52", "pct"]]


def ingest(path: Path):
    df = process_csv(path)

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Load region IDs
    cur.execute("SELECT name, id FROM regions")
    region_ids = dict(cur.fetchall())

    # Upsert trusts
    trust_data = df[["provider_code", "provider_name", "region"]].drop_duplicates("provider_code")
    for _, row in trust_data.iterrows():
        rid = region_ids.get(row["region"])
        if not rid:
            continue
        cur.execute(
            "INSERT INTO trusts (name, trust_code, region_id) VALUES (%s, %s, %s) ON CONFLICT (trust_code) DO UPDATE SET name=EXCLUDED.name, region_id=EXCLUDED.region_id",
            (row["provider_name"], row["provider_code"], rid)
        )
    conn.commit()

    cur.execute("SELECT trust_code, id FROM trusts")
    trust_ids = dict(cur.fetchall())

    # Build CSV buffer for COPY
    log.info("Streaming %d rows via COPY ...", len(df))
    buf = io.StringIO()
    for _, row in df.iterrows():
        rid = region_ids.get(row["region"])
        tid = trust_ids.get(row["provider_code"], "")
        if not rid:
            continue
        buf.write(f"{rid}\t{tid if tid else '\\N'}\t{row['specialty']}\t{row['snapshot_month']}\t{row['total']}\t{row['under_18']}\t{row['over_18']}\t{row['over_52']}\t{row['pct']}\n")
    buf.seek(0)

    cur.execute("CREATE TEMP TABLE wl_staging (LIKE waiting_lists INCLUDING ALL) ON COMMIT DROP")
    cur.copy_from(buf, "wl_staging", columns=("region_id", "trust_id", "specialty", "snapshot_month", "total_waiting", "waiting_under_18_weeks", "waiting_over_18_weeks", "waiting_over_52_weeks", "pct_over_18_weeks"))
    cur.execute("""
        INSERT INTO waiting_lists (region_id, trust_id, specialty, snapshot_month, total_waiting, waiting_under_18_weeks, waiting_over_18_weeks, waiting_over_52_weeks, pct_over_18_weeks)
        SELECT region_id, trust_id, specialty, snapshot_month, total_waiting, waiting_under_18_weeks, waiting_over_18_weeks, waiting_over_52_weeks, pct_over_18_weeks
        FROM wl_staging
        ON CONFLICT DO NOTHING
    """)
    conn.commit()
    cur.close()
    conn.close()
    log.info("Done — %d rows loaded", len(df))


if __name__ == "__main__":
    csv_dir = RAW_DIR / "rtt" / "latest"
    for f in sorted(csv_dir.glob("*.csv")) + sorted(csv_dir.glob("*.CSV")):
        ingest(f)
