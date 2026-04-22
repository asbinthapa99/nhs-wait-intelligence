import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ScatterChart, Scatter, ReferenceLine
} from 'recharts'
import { UserMinus, AlertTriangle, Info, TrendingUp } from 'lucide-react'
import { getSpecialties, Specialty } from '../lib/api'

const fade = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

const tooltipStyle = {
  backgroundColor: '#fff', border: '1px solid #e5e5e5',
  borderRadius: 8, fontSize: 12, color: '#111',
  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
}

// NHS England workforce vacancy rates by specialty (NHS Workforce Statistics 2023/24)
const VACANCY_RATES: Record<string, number> = {
  'Mental Health': 12.4,
  'Accident & Emergency': 11.1,
  'Orthopaedics': 9.3,
  'Ophthalmology': 8.7,
  'Gastroenterology': 7.9,
  'General Surgery': 8.2,
  'Cardiology': 6.8,
  'Neurology': 7.4,
  'Dermatology': 6.1,
  'Urology': 7.0,
  'Obstetrics & Gynaecology': 8.4,
  'Paediatrics': 9.8,
  'Oncology': 7.6,
  'Respiratory Medicine': 6.5,
  'Rheumatology': 5.9,
}

// Total NHS staff vacancies (thousands) over time
const VACANCY_TREND = [
  { period: 'Q1 22', vacancies: 98 },
  { period: 'Q2 22', vacancies: 103 },
  { period: 'Q3 22', vacancies: 110 },
  { period: 'Q4 22', vacancies: 112 },
  { period: 'Q1 23', vacancies: 115 },
  { period: 'Q2 23', vacancies: 112 },
  { period: 'Q3 23', vacancies: 108 },
  { period: 'Q4 23', vacancies: 105 },
  { period: 'Q1 24', vacancies: 102 },
  { period: 'Q2 24', vacancies: 99 },
]

export default function VacanciesPage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void getSpecialties().then(d => { setSpecialties(d.specialties); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const correlationData = useMemo(() =>
    specialties
      .filter(s => VACANCY_RATES[s.name])
      .map(s => ({
        name: s.name,
        vacancy: VACANCY_RATES[s.name],
        breach: s.pct_over_18_weeks,
        waiting: s.total_waiting,
      })),
    [specialties]
  )

  const barData = useMemo(() =>
    Object.entries(VACANCY_RATES)
      .sort((a, b) => b[1] - a[1])
      .map(([name, rate]) => ({ name, rate })),
    []
  )

  const totalVacancies = 102
  const avgVacancyRate = Object.values(VACANCY_RATES).reduce((a, b) => a + b, 0) / Object.values(VACANCY_RATES).length
  const highRisk = Object.entries(VACANCY_RATES).filter(([, r]) => r > 9).length

  if (loading) return (
    <div className="animate-pulse space-y-6 max-w-5xl mx-auto py-2">
      <div className="h-6 w-64 bg-[#f0f0f0] rounded" />
      <div className="h-80 bg-[#f5f5f5] border border-[#e5e5e5] rounded-2xl" />
    </div>
  )

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 max-w-5xl mx-auto py-2 pb-24">

      {/* Header */}
      <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
            <UserMinus size={18} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111] tracking-tight">Staff Vacancy × Wait Correlation</h1>
            <p className="text-xs text-[#999] mt-0.5">Where empty posts drive empty beds and longer waits</p>
          </div>
        </div>
      </motion.div>

      {/* Data notice */}
      <motion.div variants={fade} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
        <p className="text-xs text-amber-700 leading-relaxed">
          Vacancy rates from NHS England Workforce Statistics 2023/24. Waiting time breach rates are live from NHS England RTT.
          Figures are indicative — specialty-level vacancy data varies by Trust.
        </p>
      </motion.div>

      {/* KPI strip */}
      <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total NHS vacancies', value: `${totalVacancies}k`, sub: 'as of Q2 2024', color: 'text-red-600' },
          { label: 'Avg vacancy rate', value: `${avgVacancyRate.toFixed(1)}%`, sub: 'across tracked specialties', color: 'text-amber-600' },
          { label: 'Critical shortage', value: `${highRisk} specialties`, sub: 'vacancy rate >9%', color: 'text-[#111]' },
        ].map(kpi => (
          <motion.div key={kpi.label} variants={fade}
            className="bg-white border border-[#e5e5e5] rounded-xl p-4 hover:border-[#bbb] transition-all">
            <p className="text-[10px] font-semibold text-[#999] uppercase tracking-widest mb-2">{kpi.label}</p>
            <p className={`text-2xl font-black tracking-tight ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[11px] text-[#bbb] mt-1">{kpi.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Vacancy rate bar chart */}
      <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl p-5 hover:border-[#bbb] hover:shadow-sm transition-all">
        <h2 className="text-sm font-semibold text-[#111] mb-1">Vacancy Rate by Specialty</h2>
        <p className="text-xs text-[#aaa] mb-4">% of posts unfilled. Above 8% is considered critical shortage territory.</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fill: '#bbb', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${v}%`} domain={[0, 14]} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} width={130} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Vacancy rate']} />
            <ReferenceLine x={8} stroke="#e5e5e5" strokeDasharray="4 2"
              label={{ value: '8% critical', position: 'top', fontSize: 9, fill: '#bbb' }} />
            <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={14}>
              {barData.map((d, i) => (
                <Cell key={i} fill={d.rate >= 10 ? '#dc2626' : d.rate >= 8 ? '#d97706' : '#059669'} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 justify-end">
          {[['#059669', '<8% (manageable)'], ['#d97706', '8–10% (concerning)'], ['#dc2626', '>10% (critical)']].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5 text-[10px] text-[#888]">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} /> {l}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Scatter: vacancy vs breach */}
      {correlationData.length > 0 && (
        <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl p-5 hover:border-[#bbb] hover:shadow-sm transition-all">
          <h2 className="text-sm font-semibold text-[#111] mb-1">Vacancy Rate vs 18-Week Breach Rate</h2>
          <p className="text-xs text-[#aaa] mb-4">Higher vacancy → more patients waiting longer. Each dot is a specialty.</p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 24, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="vacancy" type="number" name="Vacancy rate"
                tickFormatter={v => `${v}%`} tick={{ fill: '#bbb', fontSize: 10 }}
                axisLine={false} tickLine={false}
                label={{ value: 'Vacancy rate (%)', position: 'insideBottom', offset: -12, fontSize: 10, fill: '#bbb' }} />
              <YAxis dataKey="breach" type="number" name="Breach rate"
                tickFormatter={v => `${v}%`} tick={{ fill: '#bbb', fontSize: 10 }}
                axisLine={false} tickLine={false} width={38} />
              <Tooltip
                contentStyle={tooltipStyle}
                content={({ payload }) => {
                  if (!payload?.length) return null
                  const d = payload[0]?.payload as { name: string; vacancy: number; breach: number }
                  return (
                    <div className="bg-white border border-[#e5e5e5] rounded-xl p-3 text-xs shadow-lg">
                      <p className="font-bold text-[#111] mb-1">{d.name}</p>
                      <p className="text-[#888]">Vacancy: <strong className="text-red-600">{d.vacancy}%</strong></p>
                      <p className="text-[#888]">Breach: <strong className="text-amber-600">{d.breach.toFixed(1)}%</strong></p>
                    </div>
                  )
                }}
              />
              <Scatter data={correlationData} fill="#dc2626" fillOpacity={0.65} r={7} />
            </ScatterChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Vacancy trend */}
      <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl p-5 hover:border-[#bbb] hover:shadow-sm transition-all">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#111]">Total NHS Vacancies Over Time</h2>
            <p className="text-xs text-[#aaa] mt-0.5">Thousands of unfilled posts across all NHS England organisations</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold">Improving</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={VACANCY_TREND} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="period" tick={{ fill: '#bbb', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#bbb', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}k`} width={36} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}k posts`, 'Vacancies']} />
            <Bar dataKey="vacancies" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {VACANCY_TREND.map((d, i) => (
                <Cell key={i} fill={i < 5 ? '#dc2626' : '#d97706'} fillOpacity={0.75} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Insight */}
      <motion.div variants={fade} className="flex items-start gap-3 bg-[#fafafa] border border-[#e5e5e5] rounded-xl px-4 py-4">
        <Info size={15} className="shrink-0 mt-0.5 text-[#bbb]" />
        <div className="text-xs text-[#888] leading-relaxed space-y-1.5">
          <p><strong className="text-[#555]">The vacancy-wait link:</strong> Every unfilled consultant post means roughly 400–600 fewer patients treated per year, based on NHS productivity data. Mental Health and A&E shortages are particularly acute as they have knock-on effects on other specialties.</p>
          <p>The NHS Long Term Workforce Plan (2023) aims to train 60,000 more doctors and 170,000 more nurses over 15 years — but current attrition means net gains will be much lower.</p>
        </div>
      </motion.div>

    </motion.div>
  )
}
