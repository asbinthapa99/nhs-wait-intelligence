# Data Dictionary

This document outlines the core data entities stored within the PostgreSQL database and utilized by the API and Data Pipeline.

## Core Entities

### 1. Regions
Stores the geographical boundaries and overarching structure of NHS administration.
- `id` (String): Internal unique identifier.
- `name` (String): Official NHS region name.
- `deprivation_score` (Float): Aggregated ONS IMD relative score.
- `inequality_index` (Float): Computed platform score weighting deprivation, backlog, and waits.

### 2. Trusts
Individual healthcare provider organizations under NHS regions.
- `id` (String): Typically the ODS code (e.g., RR8).
- `name` (String): Full name of the hospital or trust.
- `region_id` (Foreign Key): Link to the encompassing region.
- `cqc_rating` (String): Latest Care Quality Commission rating (Outstanding, Good, Requires Improvement, Inadequate).

### 3. Waiting List Snapshots
Monthly records pulled from NHS RTT (Referral to Treatment) CSV files.
- `id` (Integer): Primary Key.
- `trust_id` (Foreign Key): Link to the Trust providing the data.
- `specialty` (String): The medical specialty (e.g., Orthopaedics, Cardiology).
- `snapshot_date` (Date): The month and year of the data record.
- `total_waiting` (Integer): Overall backlog size.
- `over_18_weeks` (Integer): Patients waiting beyond the constitutional standard.
- `over_52_weeks` (Integer): Patients waiting over a year.
- `over_65_weeks` (Integer): Extreme long waits.

### 4. Forecast Output
System-generated linear projections for the next 6 months.
- `region_id` (Foreign Key): Region applied to.
- `specialty` (String): Specialty predicted.
- `forecast_month` (Date): Future month.
- `predicted_total` (Integer): Projected backlog.
- `confidence_interval_low` (Integer)
- `confidence_interval_high` (Integer)

### 5. AI Cache
Stores previously generated Claude 3.5 Sonnet responses to save on API costs and response time.
- `prompt_hash` (String): SHA-256 hash of the generated prompt (including real-time data stats).
- `response_text` (Text): The raw markdown/text returned by Claude.
- `created_at` (Timestamp): Timestamp for TTL expiration checking.
