# Validation & Reproducibility Evidence

To support the claims made regarding the NHS Wait Intelligence Platform's capabilities, this directory contains a suite of independent, reproducible validation reports. 

Every claim of predictive accuracy, anomaly detection, or mathematical correlation is backed by empirical testing against published NHS data.

## 🗂️ Artifact Directory

1. **[Forecast Backtest Report](./forecast-backtest.md)**
   * **Purpose:** Proves the machine learning forecaster is highly accurate.
   * **Method:** Backtested 6-month predictions against actual published outcomes.
   * **Result:** Demonstrates a Mean Absolute Error (MAE) of ~1.1% nationally.

2. **[Anomaly Alert Verification Log](./anomaly-log.md)**
   * **Purpose:** Proves the platform's mathematical anomaly radar works.
   * **Method:** Mapped platform-generated Z-score spikes to actual NHS press releases.
   * **Result:** Confirms the system accurately flags real-world capacity crises.

3. **[Inequality Methodology Audit](../inequality-methodology.md)**
   * **Purpose:** Validates the socio-economic inequality mathematical model.
   * **Method:** Documents the exact Python/SQL code, IMD data sources, and correlation regression.
   * **Result:** Proves a statistically significant Pearson correlation (r ≈ 0.91) with official CQC ratings.

4. **[Simulator Backtest Report](./simulator-backtest.md)**
   * **Purpose:** Validates the Resource Optimization algorithm.
   * **Method:** Ran a historical intervention through the simulator and compared the projected reduction against the actual NHS data reduction.
   * **Result:** Confirms the physics of the model align with reality, while transparently noting a ~12% real-world efficiency drag.

5. **[System Failure Case Study: Orthopaedics](./case-study-orthopaedics-ne.md)**
   * **Purpose:** Provides a concrete narrative of the system in action.
   * **Method:** Highlights a specific anomaly in the North East & Yorkshire and the platform's autonomous Mutual Aid routing response.

---

### Data Provenance & Reproducibility

*   **Primary Data Source:** [NHS England Consultant-Led Referral to Treatment Waiting Times](https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/)
*   **Deprivation Data:** ONS English Indices of Deprivation (2019)
*   **Validation Execution Date:** October 2025
*   **Reproducibility:** Because the platform exclusively ingests these public data files via its open-source ETL pipeline, any independent reviewer, analyst, or visa assessor can clone the repository, run the exact same data month, and yield the identical algorithmic outputs described in these artifacts. No proprietary or hidden datasets are used.
