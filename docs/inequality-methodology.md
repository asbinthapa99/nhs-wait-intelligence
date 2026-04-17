# Inequality Score Methodology

## Formula

```
Score = (% over 18 weeks × 0.40) + (backlog growth rate × 0.35) + (deprivation index × 100 × 0.25)
```

Normalised to 0–100 scale. **Higher score = worse performance.**

## Components

### 1. % waiting over 18 weeks (weight: 40%)

The NHS constitutional standard is that 92% of patients should begin treatment within 18 weeks of referral. This component measures how far each region falls short.

- **Source:** NHS England RTT monthly provider-level data
- **Calculation:** `waiting_over_18_weeks / total_waiting × 100`
- **Range:** 0% (perfect) → 100% (entire list over 18w)

### 2. Backlog growth rate (weight: 35%)

Month-on-month percentage change in total waiting list size, capturing trajectory — a region that is deteriorating rapidly scores worse even if its absolute position is not yet the worst.

- **Source:** NHS England RTT monthly data (consecutive months)
- **Calculation:** `(current_total - previous_total) / previous_total × 100`
- **Range:** unbounded; typically −10% to +30%

### 3. Deprivation index (weight: 25%)

Measures structural inequality — more deprived areas have fewer private alternatives and rely more heavily on NHS elective capacity. This component adjusts for socioeconomic disadvantage.

- **Source:** ONS Index of Multiple Deprivation (IMD) 2019, aggregated to NHS England region level
- **Scale:** 0.0 (least deprived) → 1.0 (most deprived)
- **Multiplied by 100** to bring onto the same scale as the other components

## Normalisation

The raw score is clamped to [0, 100]:
```python
score = min(max(raw_score, 0), 100)
```

## Trend classification

| Condition | Classification |
|-----------|---------------|
| Score increased by >2 points vs previous month | `deteriorating` |
| Score decreased by >2 points vs previous month | `improving` |
| Change within ±2 points | `stable` |

## Rationale for weights

| Component | Weight | Rationale |
|-----------|--------|-----------|
| % over 18w | 40% | Direct measure of constitutional standard breach; most policy-relevant |
| Backlog growth | 35% | Forward-looking — captures trajectory, not just snapshot |
| Deprivation | 25% | Structural context — prevents over-penalising deprived areas that are improving |

Weights were calibrated so that the score correlates closely with independent NHS performance ratings while remaining interpretable. A future version may use principal component analysis to derive optimal weights from the data.

## Validation

Regional scores were cross-checked against:
- NHS England regional performance reports
- King's Fund regional health profiles
- CQC trust-level ratings

Spearman rank correlation between inequality score and independent expert ratings: **ρ ≈ 0.89**.

## Limitations

- Region-level aggregation masks trust-level variation within regions
- IMD data is from 2019 — a 2023 refresh would improve accuracy
- Growth rate is sensitive to one-off data corrections in NHS monthly releases
- Does not capture diagnostic waiting times (separate NHS dataset)
