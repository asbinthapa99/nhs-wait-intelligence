import { useEffect, useState } from 'react'

import DataStatusBanner from '../components/DataStatusBanner'
import EmptyStateCard from '../components/EmptyStateCard'
import PageHero from '../components/PageHero'
import ProvenancePanel from '../components/ProvenancePanel'
import {
  DataStatus,
  estimatePatientWait,
  getDataStatus,
  getPatientAreaCompare,
  getPatientChoiceRights,
  getPatientContactGuide,
  getPatientGPHelper,
  getPatientJourneyGuide,
  getPatientLocalSummary,
  getPatientPreparationGuide,
  getPatientProviders,
  getPatientStaySwitch,
  getRegions,
  getSpecialties,
  PatientAreaCompare,
  PatientChoiceRights,
  PatientContactGuide,
  PatientGPHelper,
  PatientJourneyGuide,
  PatientLocalSummary,
  PatientPreparationGuide,
  PatientProvidersData,
  PatientStaySwitch,
  PatientWaitEstimate,
  RegionDetail,
  Specialty,
} from '../lib/api'

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-rose-50 text-rose-700 border-rose-200',
}

const ACTION_STYLES: Record<string, string> = {
  switch: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'consider-switch': 'bg-amber-50 text-amber-700 border-amber-200',
  stay: 'bg-slate-100 text-slate-700 border-slate-200',
  'insufficient-data': 'bg-rose-50 text-rose-700 border-rose-200',
}

function formatInt(value: number) {
  return new Intl.NumberFormat('en-GB').format(Math.round(value))
}

function formatMonth(value: string | null) {
  if (!value) return 'Not available'
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatSigned(value: number, suffix = '') {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}${suffix}`
}

function formatActionLabel(value: string) {
  return value.replace(/-/g, ' ')
}

function WaitEstimateCard({ estimate }: { estimate: PatientWaitEstimate | null }) {
  if (!estimate) {
    return <p className="mt-3 text-sm leading-6 text-slate-600">Select a specialty and provider to generate the first estimate.</p>
  }

  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Best case</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{estimate.best_case_weeks.toFixed(1)}w</p>
        </div>
        <div className="rounded-2xl bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Likely</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{estimate.likely_wait_weeks.toFixed(1)}w</p>
        </div>
        <div className="rounded-2xl bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Worst case</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{estimate.worst_case_weeks.toFixed(1)}w</p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Chance of being seen within 18 weeks</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{estimate.probability_within_18_weeks.toFixed(1)}%</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{estimate.methodology}</p>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{estimate.honest_note}</p>
    </>
  )
}

function cqcTone(rating: string | null) {
  if (!rating) return 'text-slate-500'
  const normalized = rating.toLowerCase()
  if (normalized === 'outstanding') return 'text-emerald-600'
  if (normalized === 'good') return 'text-emerald-600'
  if (normalized === 'requires improvement') return 'text-amber-600'
  if (normalized === 'inadequate') return 'text-rose-600'
  return 'text-slate-500'
}

export default function PatientPage() {
  const [regions, setRegions] = useState<RegionDetail[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedSpecialty, setSelectedSpecialty] = useState('')
  const [selectedTrustCode, setSelectedTrustCode] = useState('')

  const [status, setStatus] = useState<DataStatus | null>(null)
  const [summary, setSummary] = useState<PatientLocalSummary | null>(null)
  const [compare, setCompare] = useState<PatientAreaCompare | null>(null)
  const [rights, setRights] = useState<PatientChoiceRights | null>(null)
  const [journeyGuide, setJourneyGuide] = useState<PatientJourneyGuide | null>(null)
  const [preparationGuide, setPreparationGuide] = useState<PatientPreparationGuide | null>(null)
  const [providersData, setProvidersData] = useState<PatientProvidersData | null>(null)
  const [waitEstimate, setWaitEstimate] = useState<PatientWaitEstimate | null>(null)
  const [staySwitch, setStaySwitch] = useState<PatientStaySwitch | null>(null)
  const [gpHelper, setGpHelper] = useState<PatientGPHelper | null>(null)
  const [contactGuide, setContactGuide] = useState<PatientContactGuide | null>(null)

  const [loadingContext, setLoadingContext] = useState(false)
  const [loadingLocal, setLoadingLocal] = useState(false)
  const [loadingProviderTools, setLoadingProviderTools] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadContext = async () => {
      setLoadingContext(true)
      setError(null)

      const [regionsResult, statusResult, rightsResult, guideResult, preparationResult, specialtiesResult] = await Promise.allSettled([
        getRegions(),
        getDataStatus(),
        getPatientChoiceRights(),
        getPatientJourneyGuide(),
        getPatientPreparationGuide(),
        getSpecialties(),
      ])

      if (regionsResult.status === 'fulfilled') {
        setRegions(regionsResult.value)
        if (regionsResult.value.length > 0) {
          setSelectedRegion((current) => current || regionsResult.value[0].name)
        }
      } else {
        setRegions([])
        setError('Patient page could not load regional metadata from the API.')
      }

      if (statusResult.status === 'fulfilled') {
        setStatus(statusResult.value)
      }

      if (rightsResult.status === 'fulfilled') {
        setRights(rightsResult.value)
      }

      if (guideResult.status === 'fulfilled') {
        setJourneyGuide(guideResult.value)
      }

      if (preparationResult.status === 'fulfilled') {
        setPreparationGuide(preparationResult.value)
      }

      if (specialtiesResult.status === 'fulfilled') {
        setSpecialties(specialtiesResult.value.specialties)
        if (specialtiesResult.value.specialties.length > 0) {
          setSelectedSpecialty((current) => current || specialtiesResult.value.specialties[0].name)
        }
      } else {
        setSpecialties([])
      }

      setLoadingContext(false)
    }

    void loadContext()
  }, [])

  useEffect(() => {
    if (!selectedRegion) return

    const loadLocalData = async () => {
      setLoadingLocal(true)

      const [summaryResult, compareResult] = await Promise.allSettled([
        getPatientLocalSummary(selectedRegion),
        getPatientAreaCompare(selectedRegion),
      ])

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value)
      } else {
        setSummary(null)
        setError('Local patient summary could not be loaded from the API.')
      }

      if (compareResult.status === 'fulfilled') {
        setCompare(compareResult.value)
      } else {
        setCompare(null)
      }

      setLoadingLocal(false)
    }

    void loadLocalData()
  }, [selectedRegion])

  useEffect(() => {
    if (!selectedRegion || !selectedSpecialty) return

    const loadProviderData = async () => {
      setLoadingProviderTools(true)

      try {
        const providerResult = await getPatientProviders(selectedSpecialty, selectedRegion)
        setProvidersData(providerResult)

        if (providerResult.providers.length > 0) {
          setSelectedTrustCode((current) =>
            providerResult.providers.some((provider) => provider.trust_code === current)
              ? current
              : providerResult.providers[0].trust_code
          )
        } else {
          setSelectedTrustCode('')
          setWaitEstimate(null)
          setStaySwitch(null)
          setGpHelper(null)
          setContactGuide(null)
        }
      } catch {
        setProvidersData(null)
        setSelectedTrustCode('')
        setWaitEstimate(null)
        setStaySwitch(null)
        setGpHelper(null)
        setContactGuide(null)
      } finally {
        setLoadingProviderTools(false)
      }
    }

    void loadProviderData()
  }, [selectedRegion, selectedSpecialty])

  useEffect(() => {
    if (!selectedRegion || !selectedSpecialty || !selectedTrustCode) return

    const loadDecisionTools = async () => {
      setLoadingProviderTools(true)

      const [estimateResult, staySwitchResult, gpHelperResult, contactGuideResult] = await Promise.allSettled([
        estimatePatientWait(selectedSpecialty, selectedTrustCode, selectedRegion),
        getPatientStaySwitch(selectedSpecialty, selectedTrustCode, selectedRegion),
        getPatientGPHelper(selectedSpecialty, selectedRegion, selectedTrustCode),
        getPatientContactGuide(selectedSpecialty, selectedRegion, selectedTrustCode),
      ])

      if (estimateResult.status === 'fulfilled') {
        setWaitEstimate(estimateResult.value)
      } else {
        setWaitEstimate(null)
      }

      if (staySwitchResult.status === 'fulfilled') {
        setStaySwitch(staySwitchResult.value)
      } else {
        setStaySwitch(null)
      }

      if (gpHelperResult.status === 'fulfilled') {
        setGpHelper(gpHelperResult.value)
      } else {
        setGpHelper(null)
      }

      if (contactGuideResult.status === 'fulfilled') {
        setContactGuide(contactGuideResult.value)
      } else {
        setContactGuide(null)
      }

      setLoadingProviderTools(false)
    }

    void loadDecisionTools()
  }, [selectedRegion, selectedSpecialty, selectedTrustCode])

  const confidenceStyle = summary ? (CONFIDENCE_STYLES[summary.confidence] ?? 'bg-slate-50 text-slate-700 border-slate-200') : ''
  const actionStyle = staySwitch ? (ACTION_STYLES[staySwitch.recommended_action] ?? 'bg-slate-50 text-slate-700 border-slate-200') : ''
  const hasLiveRegionalData = Boolean(status?.has_live_data && summary?.has_live_data && compare?.has_live_data)

  const transparencyPoints = [
    summary?.has_live_data
      ? `Regional summary uses the processed NHS snapshot from ${formatMonth(summary.last_updated)}.`
      : 'Regional summary is waiting for a processed NHS snapshot.',
    providersData?.has_live_data
      ? `Provider comparison uses the latest trust-level specialty backlog snapshot from ${formatMonth(providersData.snapshot_month)}.`
      : 'Provider comparison is unavailable until trust-level specialty RTT data is loaded.',
    'CQC ratings are shown only when trust ratings have been ingested into the pipeline.',
    'This page does not use patient-level records, direct department contact details, travel times, or live appointment slots.',
  ]

  const provenanceItems = [
    {
      label: 'Regional snapshot',
      value: summary?.has_live_data
        ? `Processed snapshot from ${formatMonth(summary.last_updated)}`
        : 'Not yet available',
      tone: summary?.has_live_data ? 'info' : 'warn',
    },
    {
      label: 'Provider comparison snapshot',
      value: providersData?.has_live_data
        ? `Trust-level specialty backlog from ${formatMonth(providersData.snapshot_month)}`
        : 'Awaiting provider-level data for this selection',
      tone: providersData?.has_live_data ? 'info' : 'warn',
    },
    {
      label: 'Known limits',
      value: 'No postcode routing, live appointment slots, patient-level records, or clinical suitability checks.',
      tone: 'warn',
    },
    {
      label: 'Use this for',
      value: 'Directional questions for your GP, referral team, or hospital booking office.',
      tone: 'default',
    },
  ] as const

  return (
    <>
      <PageHero
        eyebrow="For patients"
        title="Understand NHS waits in your area without overpromising certainty"
        description="Use regional summaries, provider comparisons, and plain-English guidance to prepare for conversations with your GP or hospital team. This page is designed to be transparent about what the data can and cannot tell you."
        aside={
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Current area</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{selectedRegion || 'Choose an area'}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Start with your region, then compare provider options by specialty where trust-level data is available.
            </p>
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-3">
            <a
              href="#patient-area-selector"
              className="rounded-full bg-nhs-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Choose your area
            </a>
            <a
              href="#provider-tools"
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-nhs-blue hover:text-nhs-blue"
            >
              Compare providers
            </a>
          </div>
        }
      />

      <DataStatusBanner status={status} loading={loadingContext && !status} />

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Patient safety and honesty first</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Do not use this page for urgent or clinical decisions</h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
            <p>
              This tool summarises aggregated NHS data to help you ask better questions. It does not replace advice from your GP,
              specialist, NHS 111, or emergency services.
            </p>
            <p>
              If your symptoms worsen, you feel unsafe, or you think your condition has become urgent, contact the appropriate NHS service straight away.
            </p>
            <p>
              Provider comparisons are directional only. They do not confirm whether a switch is clinically appropriate, faster in practice, or available for your exact referral pathway.
            </p>
          </div>
        </section>

        <ProvenancePanel
          title="Data freshness and transparency"
          items={provenanceItems.map((item) => ({ ...item }))}
          footnote={
            status?.refresh_recommended
              ? 'Current snapshots look stale enough that a refresh is recommended before treating this view as decision-grade.'
              : 'Use this page for orientation and preparation, not for precise booking or treatment guarantees.'
          }
        />
      </div>

      {regions.length === 0 ? (
        <EmptyStateCard
          title="No regional patient context yet"
          body="Run the live NHS pipeline first. This patient page needs the processed regional snapshot before it can explain local waiting pressure honestly."
        />
      ) : (
        <>
          <div id="patient-area-selector" className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-lg font-semibold text-slate-900">Choose your area</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Start with regional NHS data for a broad picture of waiting pressure. Provider-level specialty comparison is available below, but postcode, travel, and live slot data still come later.
                </p>
              </div>

              <label className="block min-w-[260px]">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  NHS region
                </span>
                <select
                  value={selectedRegion}
                  onChange={(event) => setSelectedRegion(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-nhs-blue focus:bg-white"
                >
                  {regions.map((region) => (
                    <option key={region.id} value={region.name}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {summary ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Plain-English summary</p>
                <h2 className="mt-3 text-xl font-semibold text-slate-900">{summary.region}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-700">{summary.plain_english_summary}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Total waiting</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{formatInt(summary.total_waiting)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Over 18 weeks</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.pct_over_18_weeks.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Inequality score</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.inequality_score.toFixed(1)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Confidence</p>
                <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${confidenceStyle}`}>
                  {summary.confidence}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{summary.confidence_reason}</p>
                <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Last data update</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{formatMonth(summary.last_updated)}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">One honest note</p>
                <p className="mt-3 text-sm leading-6 text-slate-700">{summary.honest_note}</p>
                <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Trend</p>
                  <p className="mt-1 text-sm font-medium capitalize text-slate-900">{summary.trend}</p>
                </div>
              </div>
            </div>
          ) : null}

          {compare ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Your area vs England regional average</p>
                <h2 className="mt-3 text-lg font-semibold text-slate-900">{compare.comparison_label}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-700">{compare.plain_english_summary}</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">18-week difference</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {formatSigned(compare.pct_over_18_weeks_delta, '%')}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Local {compare.local_pct_over_18_weeks.toFixed(1)}% vs average {compare.national_avg_pct_over_18_weeks.toFixed(1)}%
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Inequality score difference</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {formatSigned(compare.inequality_score_delta)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Local {compare.local_inequality_score.toFixed(1)} vs average {compare.national_avg_inequality_score.toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">What this means</p>
                {summary ? (
                  <ul className="mt-3 space-y-3">
                    {summary.what_this_means.map((item) => (
                      <li key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-4 rounded-2xl bg-nhs-blue px-4 py-3 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-100">Pressure rank</p>
                  <p className="mt-1 text-sm font-medium">
                    {compare.regional_rank ? `${compare.regional_rank} of ${compare.total_regions}` : 'Not available'}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <section id="provider-tools" className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Stage 2 provider tools</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Find faster provider options for a specialty</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This first version uses trust-level RTT pressure by specialty. It is useful for comparison, but it still does not include travel time, live slot availability, or clinical suitability checks.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block min-w-[220px]">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Specialty
                  </span>
                  <select
                    value={selectedSpecialty}
                    onChange={(event) => setSelectedSpecialty(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-nhs-blue focus:bg-white"
                  >
                    {specialties.map((specialty) => (
                      <option key={specialty.name} value={specialty.name}>
                        {specialty.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block min-w-[260px]">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Current provider
                  </span>
                  <select
                    value={selectedTrustCode}
                    onChange={(event) => setSelectedTrustCode(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-nhs-blue focus:bg-white"
                    disabled={!providersData?.providers.length}
                  >
                    {providersData?.providers.map((provider) => (
                      <option key={provider.trust_code} value={provider.trust_code}>
                        {provider.trust_name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {loadingProviderTools ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-40 animate-pulse rounded-3xl bg-slate-100" />
                ))}
              </div>
            ) : providersData?.providers.length ? (
              <>
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {providersData.honest_note}
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-3">
                  {providersData.providers.slice(0, 3).map((provider) => {
                    const isCurrent = provider.trust_code === selectedTrustCode
                    return (
                      <div
                        key={provider.trust_code}
                        className={`rounded-3xl border p-5 shadow-sm ${isCurrent ? 'border-nhs-blue bg-blue-50' : 'border-slate-200 bg-white'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{provider.region}</p>
                            <h3 className="mt-2 text-lg font-semibold text-slate-900">{provider.trust_name}</h3>
                          </div>
                          {isCurrent ? (
                            <span className="rounded-full bg-nhs-blue px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                              Current
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl bg-white/80 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Likely wait</p>
                            <p className="mt-1 text-2xl font-semibold text-slate-900">{provider.estimated_wait_weeks.toFixed(1)}w</p>
                          </div>
                          <div className="rounded-2xl bg-white/80 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Within 18 weeks</p>
                            <p className="mt-1 text-2xl font-semibold text-slate-900">{provider.probability_within_18_weeks.toFixed(1)}%</p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2 text-sm text-slate-700">
                          <p>
                            <span className="font-semibold text-slate-900">Over 18 weeks:</span> {provider.pct_over_18_weeks.toFixed(1)}%
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">Queue size:</span> {formatInt(provider.total_waiting)}
                          </p>
                          <p className={cqcTone(provider.cqc_rating)}>
                            <span className="font-semibold text-slate-900">CQC:</span> {provider.cqc_rating ?? 'Not loaded'}
                          </p>
                        </div>

                        <p className="mt-4 text-sm leading-6 text-slate-600">{provider.recommendation_note}</p>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Transparent wait estimate</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">
                      {waitEstimate?.trust_name ?? 'Choose a provider'}
                    </h3>
                    <WaitEstimateCard estimate={waitEstimate} />
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Stay vs switch</p>
                    <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${actionStyle}`}>
                      {staySwitch ? formatActionLabel(staySwitch.recommended_action) : 'Waiting'}
                    </div>

                    {staySwitch ? (
                      <>
                        <h3 className="mt-3 text-lg font-semibold text-slate-900">
                          {staySwitch.recommended_provider
                            ? `Best alternative: ${staySwitch.recommended_provider.trust_name}`
                            : 'No alternative provider found'}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          Estimated weeks saved: {staySwitch.estimated_weeks_saved.toFixed(1)}
                        </p>

                        <div className="mt-4 space-y-3">
                          {staySwitch.reasoning.map((item) => (
                            <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                              {item}
                            </div>
                          ))}
                        </div>

                        <p className="mt-4 text-sm leading-6 text-slate-600">{staySwitch.honest_note}</p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        Select a current provider to compare staying versus switching within this regional comparison set.
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No provider-level options were available for this specialty in the current regional snapshot.
              </div>
            )}
          </section>

          {!hasLiveRegionalData && !loadingLocal ? (
            <div className="mt-6">
              <EmptyStateCard
                title="Live patient context is not ready yet"
                body="The guidance sections below are still useful, but the area comparison cards need the processed regional NHS snapshot to be populated first."
              />
            </div>
          ) : null}
        </>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Your rights</p>
          <h2 className="mt-3 text-lg font-semibold text-slate-900">{rights?.title ?? 'Your NHS choice rights'}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">{rights?.summary}</p>

          <div className="mt-4 space-y-3">
            {rights?.rights.map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Useful official links</p>
            <div className="mt-3 flex flex-col gap-2">
              {rights?.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-nhs-blue hover:text-nhs-blue"
                >
                  {source.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Simple journey guide</p>
          <h2 className="mt-3 text-lg font-semibold text-slate-900">{journeyGuide?.title ?? 'Simple NHS waiting-list journey'}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">{journeyGuide?.summary}</p>

          <div className="mt-4 space-y-3">
            {journeyGuide?.steps.map((step) => (
              <div key={step.step} className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Step {step.step}</p>
                <h3 className="mt-1 text-sm font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-700">{step.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-nhs-blue">Questions to ask your GP</p>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
              {journeyGuide?.questions_for_gp.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Prepare and organise</p>
          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            {preparationGuide?.title ?? 'How to prepare while you wait'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">{preparationGuide?.summary}</p>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Document checklist</p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                {preparationGuide?.document_checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Before the appointment</p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                {preparationGuide?.before_appointment.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-nhs-blue">While waiting</p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                {preparationGuide?.while_waiting.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">If you need to chase it</p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                {preparationGuide?.escalation_steps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">GP conversation helper</p>
          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            Questions for {gpHelper?.trust_name ?? 'your GP or referrer'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {gpHelper?.summary ??
              'Choose a specialty and provider above to tailor the conversation around your current wait and options.'}
          </p>

          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Suggested questions</p>
            <div className="mt-2 space-y-3">
              {gpHelper?.suggested_questions.map((item) => (
                <div key={item} className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-nhs-blue">Talking points to keep handy</p>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
              {gpHelper?.talking_points.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">{gpHelper?.honest_note}</p>
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Who to contact next</p>
          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            {contactGuide?.trust_name ? `Contact routes for ${contactGuide.trust_name}` : 'General contact guide'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            This is a routing guide only. It helps you choose the right kind of NHS contact point for the next step.
          </p>

          <div className="mt-4 space-y-3">
            {contactGuide?.routes.map((route) => (
              <div key={route.label} className="rounded-2xl bg-slate-50 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-900">{route.label}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-700">{route.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-nhs-blue">Before you call or write</p>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
              {contactGuide?.checklist_before_contact.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">{contactGuide?.honest_note}</p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">How this page uses data</p>
          <h2 className="mt-3 text-lg font-semibold text-slate-900">Transparency and missing pieces</h2>
          <div className="mt-4 space-y-3">
            {transparencyPoints.map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Latest regional snapshot</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatMonth(status?.latest_processed_month ?? null)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Latest provider snapshot</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatMonth(status?.latest_waiting_month ?? null)}</p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            {status?.refresh_recommended
              ? 'The dataset looks stale enough that a refresh is recommended before treating the current view as decision-grade.'
              : 'The latest snapshot looks recent enough for directional use, but this page still avoids patient-level precision.'}
          </p>
        </section>
      </div>
    </>
  )
}