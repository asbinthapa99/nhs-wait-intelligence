"""
NHS RTT (Referral to Treatment) waiting times ingestion.

Downloads monthly RTT provider-level CSV files from NHS England and loads
waiting list snapshots into PostgreSQL.

Real data URL pattern:
  https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/

Expected CSV columns (NHS England format):
  Period, Provider Code, Provider Name, Treatment Function Code,
  Treatment Function Name, Total All, Total <18 weeks, Total >18 weeks,
  Total >52 weeks
"""

import logging
from datetime import date, datetime
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from config import DATABASE_URL, RAW_DIR

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# Mapping from NHS England region codes to our 7 region names
REGION_CODE_MAP: dict[str, str] = {
    "Y63": "North East & Yorkshire",
    "Y62": "North West",
    "Y60": "Midlands",
    "Y61": "East of England",
    "Y56": "London",
    "Y59": "South East",
    "Y58": "South West",
}

REGION_CODES: dict[str, str] = {v: k for k, v in REGION_CODE_MAP.items()}

# ICS name keyword → region (for 2025-26+ CSV format)
ICS_KEYWORDS: list[tuple[str, str]] = [
    ("LANCASHIRE", "North West"),
    ("CHESHIRE", "North West"),
    ("MERSEY", "North West"),
    ("GREATER MANCHESTER", "North West"),
    ("CUMBRIA", "North West"),
    ("YORKSHIRE", "North East & Yorkshire"),
    ("HUMBER", "North East & Yorkshire"),
    ("NORTH EAST", "North East & Yorkshire"),
    ("TEES", "North East & Yorkshire"),
    ("BIRMINGHAM", "Midlands"),
    ("COVENTRY", "Midlands"),
    ("DERBYSHIRE", "Midlands"),
    ("NOTTINGHAM", "Midlands"),
    ("STAFFORDSHIRE", "Midlands"),
    ("LEICESTER", "Midlands"),
    ("NORTHAMPTONSHIRE", "Midlands"),
    ("SHROPSHIRE", "Midlands"),
    ("BLACK COUNTRY", "Midlands"),
    ("HEREFORDSHIRE", "Midlands"),
    ("LINCOLNSHIRE", "Midlands"),
    ("CAMBRIDGE", "East of England"),
    ("NORFOLK", "East of England"),
    ("SUFFOLK", "East of England"),
    ("ESSEX", "East of England"),
    ("HERTFORDSHIRE", "East of England"),
    ("BEDFORDSHIRE", "East of England"),
    ("MID AND SOUTH ESSEX", "East of England"),
    ("LONDON", "London"),
    ("KENT", "South East"),
    ("SURREY", "South East"),
    ("SUSSEX", "South East"),
    ("HAMPSHIRE", "South East"),
    ("BERKSHIRE", "South East"),
    ("OXFORDSHIRE", "South East"),
    ("BUCKINGHAMSHIRE", "South East"),
    ("CORNWALL", "South West"),
    ("DEVON", "South West"),
    ("DORSET", "South West"),
    ("BRISTOL", "South West"),
    ("SOMERSET", "South West"),
    ("WILTSHIRE", "South West"),
    ("GLOUCESTERSHIRE", "South West"),
    ("BATH", "South West"),
]


# Trust code prefix → region (first 3 chars of provider code, e.g. "RFH" → London)
TRUST_PREFIX_MAP: dict[str, str] = {
    "RAJ": "South West", "RK9": "South West", "RBD": "South West",
    "RDZ": "South West", "REF": "South West", "RH8": "South West",
    "RA3": "South West", "RA4": "South West", "RVJ": "South West",
    "RFH": "London", "RQM": "London", "RYJ": "London", "RKE": "London",
    "RAN": "London", "RAL": "London", "RRV": "London", "RJ1": "London",
    "RJ6": "London", "RJZ": "London", "RPY": "London", "RQX": "London",
    "RTG": "Midlands", "RJE": "Midlands", "RBK": "Midlands",
    "RLT": "Midlands", "RNA": "Midlands", "RR1": "Midlands",
    "RXW": "Midlands", "RKB": "Midlands", "RXH": "South East",
    "RYR": "South East", "RXC": "South East", "RTK": "South East",
    "RPC": "South East", "RHM": "South East", "R1F": "South East",
    "RDE": "East of England", "RGQ": "East of England",
    "RGR": "East of England", "RM1": "East of England",
    "RAJ": "East of England", "RGT": "East of England",
    "RCB": "North West", "RBQ": "North West", "RXN": "North West",
    "RMC": "North West", "RRF": "North West", "RBT": "North West",
    "RTX": "North East & Yorkshire", "RR8": "North East & Yorkshire",
    "RWD": "North East & Yorkshire", "RXF": "North East & Yorkshire",
    "RJL": "North East & Yorkshire", "RAE": "North East & Yorkshire",
}


def map_trust_to_region(provider_code: str) -> str:
    prefix = str(provider_code)[:3].upper()
    return TRUST_PREFIX_MAP.get(prefix, "Unknown")


def map_ics_to_region(ics_name: str) -> str:
    upper = ics_name.upper()
    for keyword, region in ICS_KEYWORDS:
        if keyword in upper:
            return region
    return "Unknown"


def _parse_rtt_period(period_str: str) -> date:
    """Parse 'RTT-February-2026' or '2026-02-01' style strings to a date."""
    import calendar
    s = str(period_str).strip()
    if s.startswith("RTT-"):
        parts = s.split("-")  # ['RTT', 'February', '2026']
        if len(parts) == 3:
            try:
                month_num = datetime.strptime(parts[1], "%B").month
                year = int(parts[2])
                last_day = calendar.monthrange(year, month_num)[1]
                return date(year, month_num, last_day)
            except Exception:
                pass
    # fallback: try pandas
    return pd.to_datetime(s, infer_datetime_format=True).date()


def _is_new_format(cols: list[str]) -> bool:
    """Detect 2025-26+ CSV format by presence of weekly bucket columns."""
    return any("gt_00_to_01" in c or "gt 00 to 01" in c.lower() for c in cols)


def clean_rtt_csv(filepath: Path) -> pd.DataFrame:
    # New 2025-26+ format has header on row 0; old format needed skiprows=3
    df_probe = pd.read_csv(filepath, nrows=2)
    cols_probe = [c.strip().lower().replace(" ", "_") for c in df_probe.columns]

    if _is_new_format(cols_probe):
        df = pd.read_csv(filepath, low_memory=False)
    else:
        df = pd.read_csv(filepath, skiprows=3)

    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    # ── New 2025-26 format ────────────────────────────────────────────────────
    if _is_new_format(list(df.columns)):
        # Only keep "Incomplete Pathways" rows (Part_2)
        if "rtt_part_type" in df.columns:
            df = df[df["rtt_part_type"].astype(str).str.contains("Part_2", na=False)]

        df = df.dropna(subset=["provider_org_code"])

        # Identify weekly bucket columns (Gt XX To XX Weeks SUM 1)
        week_cols = [c for c in df.columns if c.startswith("gt_") and "_weeks_sum_1" in c]

        # Under 18 weeks: Gt 00-00 … Gt 17-18 (first 18 buckets)
        under_18_cols = week_cols[:18]
        # Over 18 weeks: Gt 18-19 onward
        over_18_cols = week_cols[18:]
        # Over 52 weeks: Gt 52-53 onward (52 buckets in)
        over_52_cols = week_cols[52:]

        def safe_sum(sub_df: pd.DataFrame, cols: list[str]) -> pd.Series:
            available = [c for c in cols if c in sub_df.columns]
            if not available:
                return pd.Series(0, index=sub_df.index)
            return sub_df[available].apply(pd.to_numeric, errors="coerce").fillna(0).sum(axis=1).astype(int)

        df["total_within_18_weeks"] = safe_sum(df, under_18_cols)
        df["total_over_18_weeks"] = safe_sum(df, over_18_cols)
        df["total_over_52_weeks"] = safe_sum(df, over_52_cols)

        total_col = "total_all" if "total_all" in df.columns else "total"
        df["total_all"] = pd.to_numeric(
            df[total_col].astype(str).str.replace(",", ""), errors="coerce"
        ).fillna(0).astype(int)

        df["pct_over_18_weeks"] = (
            df["total_over_18_weeks"] / df["total_all"].replace(0, 1) * 100
        ).round(2)

        # Region from ICS parent name
        parent_col = "provider_parent_name" if "provider_parent_name" in df.columns else None
        if parent_col:
            df["region_name"] = df[parent_col].fillna("").apply(map_ics_to_region)
        else:
            df["region_name"] = "Unknown"

        df["provider_code"] = df["provider_org_code"].astype(str).str.strip()
        df["provider_name"] = df["provider_org_name"].astype(str).str.strip() if "provider_org_name" in df.columns else df["provider_code"]
        df["treatment_function_name"] = df.get("treatment_function_name", "Unknown").fillna("Unknown")
        df["snapshot_month"] = df["period"].apply(_parse_rtt_period)

    # ── Legacy format ─────────────────────────────────────────────────────────
    else:
        required = ["period", "provider_code", "treatment_function_name", "total_all"]
        if not all(c in df.columns for c in required):
            raise ValueError(f"Unrecognised CSV format: {list(df.columns)[:8]}")

        df = df.dropna(subset=["provider_code", "total_all"])
        df["total_all"] = pd.to_numeric(
            df["total_all"].astype(str).str.replace(",", ""), errors="coerce"
        ).fillna(0).astype(int)
        df["total_within_18_weeks"] = pd.to_numeric(df.get("total_within_18_weeks", 0), errors="coerce").fillna(0).astype(int)
        df["total_over_18_weeks"] = pd.to_numeric(df.get("total_over_18_weeks", 0), errors="coerce").fillna(0).astype(int)
        df["total_over_52_weeks"] = pd.to_numeric(df.get("total_over_52_weeks", 0), errors="coerce").fillna(0).astype(int)
        df["pct_over_18_weeks"] = (df["total_over_18_weeks"] / df["total_all"].replace(0, 1) * 100).round(2)

        def _legacy_region(code: str) -> str:
            legacy_map = {"R": "North East & Yorkshire", "RM": "North West", "RW": "Midlands",
                          "RC": "East of England", "RF": "London", "RN": "South East", "RD": "South West"}
            for prefix in sorted(legacy_map.keys(), key=len, reverse=True):
                if str(code).startswith(prefix):
                    return legacy_map[prefix]
            return "Unknown"

        df["region_name"] = df["provider_code"].apply(_legacy_region)
        df["provider_name"] = df.get("provider_name", df["provider_code"])
        df["snapshot_month"] = pd.to_datetime(df["period"], infer_datetime_format=True).dt.date

    return df[df["region_name"] != "Unknown"]


def load_to_db(df: pd.DataFrame, engine) -> int:
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        session.execute(text("SELECT 1 FROM regions LIMIT 1"))
    except Exception:
        log.warning("regions table not found — run backend first to create schema")
        session.close()
        return 0

    region_ids: dict[str, int] = {}
    rows = session.execute(text("SELECT id, name FROM regions")).fetchall()
    for row_id, name in rows:
        region_ids[name] = row_id

    trust_ids: dict[str, int] = {}
    trust_rows = session.execute(text("SELECT id, trust_code FROM trusts")).fetchall()
    for trust_id, trust_code in trust_rows:
        trust_ids[trust_code] = trust_id

    # Bulk upsert trusts first
    new_trusts = []
    for _, row in df.iterrows():
        provider_code = str(row.get("provider_code", "")).strip()
        provider_name = str(row.get("provider_name", provider_code or "Unknown")).strip()
        region_id = region_ids.get(row["region_name"])
        if provider_code and region_id and provider_code not in trust_ids:
            new_trusts.append({"name": provider_name, "trust_code": provider_code, "region_id": region_id})
            trust_ids[provider_code] = None  # placeholder to avoid duplicates

    if new_trusts:
        session.execute(
            text("""
                INSERT INTO trusts (name, trust_code, region_id)
                VALUES (:name, :trust_code, :region_id)
                ON CONFLICT (trust_code) DO UPDATE
                  SET name = EXCLUDED.name, region_id = EXCLUDED.region_id
            """),
            new_trusts,
        )
        session.flush()
        trust_rows = session.execute(text("SELECT id, trust_code FROM trusts")).fetchall()
        trust_ids = {tc: tid for tid, tc in trust_rows}

    # Bulk insert waiting_lists
    records = []
    for _, row in df.iterrows():
        region_id = region_ids.get(row["region_name"])
        if not region_id:
            continue
        provider_code = str(row.get("provider_code", "")).strip()
        records.append({
            "region_id": region_id,
            "trust_id": trust_ids.get(provider_code),
            "specialty": row.get("treatment_function_name", "Unknown"),
            "snapshot_month": row["snapshot_month"],
            "total_waiting": int(row["total_all"]),
            "under_18": int(row["total_within_18_weeks"]),
            "over_18": int(row["total_over_18_weeks"]),
            "over_52": int(row.get("total_over_52_weeks", 0)),
            "pct": float(row["pct_over_18_weeks"]),
        })

    if records:
        session.execute(
            text("""
                INSERT INTO waiting_lists
                  (region_id, trust_id, specialty, snapshot_month, total_waiting,
                   waiting_under_18_weeks, waiting_over_18_weeks, waiting_over_52_weeks, pct_over_18_weeks)
                VALUES
                  (:region_id, :trust_id, :specialty, :snapshot_month, :total_waiting,
                   :under_18, :over_18, :over_52, :pct)
                ON CONFLICT DO NOTHING
            """),
            records,
        )

    session.commit()
    session.close()
    return len(records)


def ingest_file(filepath: Path) -> int:
    log.info(f"Ingesting {filepath.name}")
    df = clean_rtt_csv(filepath)
    engine = create_engine(DATABASE_URL)
    n = load_to_db(df, engine)
    log.info(f"Loaded {n} rows from {filepath.name}")
    return n


def ingest_directory(directory: Path = RAW_DIR / "rtt" / "latest") -> int:
    total = 0
    csv_files = sorted(directory.glob("*.csv")) + sorted(directory.glob("*.CSV"))
    if not csv_files:
        log.warning(f"No CSV files found in {directory}")
        return 0
    for f in csv_files:
        total += ingest_file(f)
    log.info(f"RTT ingestion complete: {total} rows total")
    return total


if __name__ == "__main__":
    ingest_directory()
