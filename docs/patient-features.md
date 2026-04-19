# Patient-Focused Feature Roadmap

This backlog translates the patient and local-people feature set into an implementation plan that fits the current NHS waiting-list platform.

## Positioning

The current application is region-focused analytics. Patient-facing features should be built as a separate product track with clear non-clinical boundaries, stronger locality data, and simpler UX.

## Recommended Core Bundle

If only one patient-facing package is prioritised, build this set first:

- Personal wait estimator
- Faster alternative finder
- Stay vs switch recommendation
- Smart alerts
- Clear NHS guidance

Reason:

- This is the strongest practical combination for real patients.
- It moves from information to action instead of adding disconnected extras.
- It creates a clear product identity without pretending to provide clinical advice.

## Features Ready Soon With Current Data

These can be built relatively early from the current region, inequality, trend, and freshness datasets:

- Simple explanation of how your area compares
- `Your area vs national average` wait-time view
- Clear inequality indicators
- Local trend snapshots
- Data confidence indicator
- Explanation of where data comes from
- Clear handling of missing data
- Mobile-first design improvements
- Simple language mode
- Referral pathway explanation
- Status-check guidance
- Non-clinical `what can I do next?` guidance
- Plain-English explanation cards
- Always-visible last data update timestamp
- Honest confidence and risk flags
- Uncertainty visualisation using ranges rather than a single exact number
- `How this estimate was calculated` explainer patterns

## Features That Need More Data First

These need provider-level, postcode-level, routing, specialty, or slot-level inputs before they can be shipped credibly:

- Personal wait-time estimator
- Probability of being seen within 18 weeks
- Personal waiting progress tracker
- Nearby hospitals with shorter waiting times
- Travel time vs waiting time comparison
- Best hospital recommendation based on speed and distance
- Typical wait times for specific conditions
- Alerts when faster options become available nearby
- Postcode or borough-level summaries
- `What's happening in your area` updates
- Personalised recommendations
- Equity-aware suggestions
- Early warning if delays may become long
- Stay vs switch recommendation
- Travel burden scoring
- Time-to-treatment optimiser
- Cancellation gap predictor
- Earlier-slot availability signals or notifier
- `People like you` insight
- Personal inequality impact explanation
- Fairness-aware recommendation engine
- Equity score for patient choices
- Accessibility-needs-based provider filtering
- Contact finder for the correct department or service
- Treatment pathway timeline
- GP conversation helper
- Referral letter explainer

## Features That Need User Accounts Or Consent

- Notifications when local wait times change
- Reminders when approaching key thresholds
- Personal progress tracking
- Saved preferences for local area and specialty
- Personalised alerts
- User profile memory for condition, location, and preferences
- Alert preferences for earlier slots, threshold movement, and local changes

## Feature Clusters

### Ultra-practical patient tools

- Appointment slot notifier, future-ready even if initially simulated
- Earlier-slot alerting when faster options appear
- Cancellation gap predictor
- Personalised wait-time change predictor
- Best-case and worst-case waiting ranges

### Smarter decision support

- Stay vs switch recommendation
- Travel burden score combining time, distance, and urgency
- Time-to-treatment optimiser across wait, travel, and pathway delay
- Faster alternative finder with explicit trade-offs

### Deeper personalisation

- User profile memory
- Priority sensitivity for routine versus urgent pathways where definitions are robust
- Accessibility-needs filter
- `People like you` wait-range insight with honest caveats

### Real-world friction reducers

- Step-by-step NHS journey guide
- Document checklist before appointments
- Contact finder
- GP conversation helper
- Referral letter explainer
- Treatment pathway timeline

### Psychological clarity and trust

- Uncertainty visualisation using best-case and worst-case ranges
- Plain-English explanations for complex metrics
- `One honest note` pattern when estimates are weak
- Last updated timestamp always visible
- Estimate logic explanation that avoids black-box behavior

### Community-powered layer

- Anonymous wait-time confirmations
- Lightweight crowd signals such as `recent patients report faster/slower service here`

Guardrail:

- This layer needs moderation, abuse controls, and clear separation from official NHS data.

### Inequality and fairness differentiators

- Personal inequality impact explanation
- Fairness-aware suggestions
- Equity score for patient choices

Guardrail:

- Do not claim system-level fairness effects unless the supporting model is auditable and explainable.

## Required Data Expansion

### Provider and site data

- Provider-level waiting-time measures by specialty
- Stable trust and hospital-site mapping
- Optional provider quality or service availability joins
- Appointment-slot or cancellation-signal data if notifier features move beyond simulation
- Service contact metadata for non-sensitive department routing
- Accessibility and transport-convenience metadata where available

### Geography

- Postcode-to-area or postcode-to-provider lookup
- Borough or local authority aggregation
- Coordinates for hospitals or service sites

### Travel and access

- Distance calculations at minimum
- Real travel-time integration if ranking depends on journey burden

### Patient journey inputs

- Referral date capture rules
- Condition or specialty mapping
- Transparent assumptions for estimators and probability outputs
- Priority or urgency flags only where definitions are robust
- Checklist and pathway-step metadata for different referral journeys

### Trust and transparency

- Freshness by metric
- Coverage completeness flags
- Confidence labels for each patient-facing output
- Range construction logic for best-case and worst-case estimates
- Explainability metadata for stay/switch recommendations

### Community signal data

- Moderated anonymous wait confirmations
- Spam and abuse controls
- Weighting rules so crowd signals never override official data

## Compliance Boundaries

These journeys should remain informational and non-clinical unless clinically reviewed:

- `What delays might mean`
- `What users can do while waiting`
- `What can I do next?`

Recommended guardrails:

- Give pathway, rights, and service-navigation guidance
- Link out to official NHS sources for rights and process explanations
- Avoid diagnosis, treatment advice, or false precision in wait estimates
- Mark simulated notifier or cancellation features clearly until backed by real slot data
- Keep community-reported information clearly separate from official NHS datasets

## Official NHS Signposting

Use official pages for patient-choice and waiting-rights guidance:

- NHS England patient choice overview: `https://www.england.nhs.uk/personalisedcare/choice/`
- NHS England RTT rights and waiting-times guide hub: `https://www.england.nhs.uk/rtt/`
- NHS website patient choices overview: `https://www.nhs.uk/using-the-nhs/about-the-nhs/your-choices-in-the-nhs/`

## Recommended Build Order

### Stage 1: Patient clarity layer

- Add patient-facing landing page
- Add local summary and area-vs-national comparison
- Add data-confidence, freshness, and missing-data cards
- Add referral pathway explanation and official rights signposting
- Add plain-English metric explanations
- Add last-updated timestamp and `one honest note` pattern

### Stage 2: Core decision bundle

- Extend the pipeline and API for provider-level wait data
- Add personal wait estimator inputs and estimator response
- Add hospital comparison by specialty
- Add speed-versus-distance comparison
- Add stay vs switch recommendation with explicit reasons and caveats
- Add faster alternative finder
- Add uncertainty ranges for estimates

### Stage 3: Smart alerts and friction reduction

- Add simulated earlier-slot alerts first, then real notifier integration later
- Add cancellation gap predictor
- Add personalised wait-change alerts
- Add document checklist
- Add treatment timeline and contact finder
- Add GP conversation helper and referral explainer

### Stage 4: Personalisation and localisation

- Add postcode or borough summaries
- Add subscriptions and contact preferences
- Add user profile memory
- Add priority sensitivity and accessibility filters
- Add faster-option alerts and threshold reminders
- Add multilingual and voice-input support

### Stage 5: Community and fairness layer

- Add anonymous wait confirmations
- Add crowd signals with moderation
- Add personal inequality impact explanations
- Add fairness-aware suggestions and equity score
- Add auditable fairness notes on recommendation outputs

## Suggested API Surface

- `GET /api/patient/local-summary`
- `GET /api/patient/area-compare`
- `GET /api/patient/providers`
- `POST /api/patient/estimate`
- `POST /api/patient/alerts`
- `GET /api/patient/choice-rights`
- `POST /api/patient/stay-switch`
- `POST /api/patient/travel-score`
- `POST /api/patient/time-optimiser`
- `POST /api/patient/cancellation-signal`
- `GET /api/patient/journey-guide`
- `GET /api/patient/checklist`
- `GET /api/patient/contact-finder`
- `POST /api/patient/community-wait`
- `GET /api/patient/community-signal`

These should be added only after the supporting datasets exist.

## Suggested Data Model Additions

- `provider_sites`
- `provider_wait_metrics`
- `postcode_area_lookup`
- `patient_alert_subscriptions`
- `patient_journey_estimates`
- `patient_profiles`
- `patient_recommendations`
- `patient_confidence_flags`
- `provider_contact_points`
- `community_wait_signals`
- `community_signal_moderation`

## UX Rules

- Plain language first
- Large touch targets
- Accessible forms and contrast
- Strong empty and stale-data states
- Clear caveats on incomplete coverage
- No fabricated certainty in local or personal recommendations
- Keep recommendation reasons visible next to the outcome
- Make time ranges more prominent than single-number predictions
- Always separate official data, estimated model output, and community signal
