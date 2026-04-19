# Build Plan

## Objective

Upgrade the product from an analytics dashboard into a decision intelligence platform by delivering only five high-impact capabilities:

1. Intervention simulator
2. Capacity vs demand engine
3. Cross-region optimization
4. Pathway bottleneck detection
5. Equity impact modeling

## Scope Guardrail

Do not add new standalone dashboard pages during this roadmap. Only ship capabilities that change decisions and can be validated with measurable outcomes.

## Parallel Track: Patient-Facing Local Experience

Patient-facing features for local people are tracked separately in `docs/patient-features.md`.

Reason:
- The main roadmap in this file is for decision-grade commissioning and planning workflows.
- Patient-focused wait estimators, local choice tooling, and alert journeys require different data, UX, and governance constraints.

## Phase 0: Decision-Grade Foundation (Weeks 1-4)

- Define canonical data model for demand, capacity, pathway stage events, and intervention actions.
- Build backtesting harness using historical snapshots.
- Define intervention taxonomy and assumptions catalog.
- Add decision ledger for traceability: input snapshot, model version, recommendation, user action, observed result.

Acceptance criteria:
- Baseline forecast and pathway decomposition reproducible from code and signed off.
- Data freshness and completeness SLAs published.

## Phase 1: Intervention Simulator + Capacity Engine (Weeks 5-10)

- Implement scenario runner with adjustable levers:
	- Staffing uplift
	- Outsourcing volume
	- Triage rule changes
	- Session capacity changes
- Implement capacity-vs-demand gap model at region and specialty level.
- Expose API endpoints and UI workspace for side-by-side scenario comparisons.

Acceptance criteria:
- Planners can compare at least three scenarios in one workflow.
- Scenario runtime <= 30s for pilot dataset.
- 4-12 week demand forecast accuracy in agreed threshold band.

## Phase 2: Cross-Region Optimization (Weeks 11-16)

- Build multi-objective optimizer balancing:
	- Wait reduction
	- Feasibility constraints
	- Travel burden
	- Equity constraints
- Add explainability output for each recommendation.

Acceptance criteria:
- Optimized plan outperforms baseline in pilot simulations.
- Hard constraints satisfied for all proposed transfers.
- Recommendation generation <= 5 minutes for pilot regions.

## Phase 3: Pathway Bottleneck Detection (Weeks 17-20)

- Model delay contribution by pathway stage.
- Build bottleneck scoring and alert generation.
- Attach suggested intervention options per detected bottleneck.

Acceptance criteria:
- Detects majority of high-impact bottlenecks before manual escalation.
- Alert false-positive rate remains within agreed threshold.

## Phase 4: Equity Impact Modeling (Weeks 21-24)

- Add equity-aware evaluation for all recommendations.
- Compute disparity metrics across interventions and outcomes.
- Enforce policy gates for high-disparity recommendations.

Acceptance criteria:
- Every recommendation includes equity impact statement.
- Threshold breaches trigger warn or block workflow consistently.

## Validation and Evidence Workstream (Runs Across All Phases)

- Forecast and simulation backtesting reports.
- Adoption and recommendation acceptance tracking.
- Before vs after pilot metrics for:
	- Long waits reduction
	- Capacity utilization
	- Equity gap movement
- Governance pack:
	- Data provenance
	- Model card
	- Fairness controls
	- Safety and risk notes

## Program Exit Criteria

- All five decision capabilities shipped and used in pilot workflows.
- Measurable outcome improvement demonstrated in pilot data.
- Complete innovation evidence pack ready for external review.
