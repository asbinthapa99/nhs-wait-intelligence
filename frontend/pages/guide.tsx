import { motion } from 'framer-motion'
import {
  HelpCircle, Map, BarChart2, Sparkles, FlaskConical,
  GitCompare, Bell, ChevronRight, Activity, Database
} from 'lucide-react'
import Link from 'next/link'

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }

const modules = [
  {
    icon: Map,
    title: 'Regional Analysis (Map)',
    href: '/map',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    description: 'Explore geographic disparities in NHS wait times across England.',
    features: [
      'Hover over regions on the interactive map to see quick stats.',
      'Click a region to drill down into specific trusts or metrics.',
      'Use the right-side ranking panel to identify top and bottom performers.',
      'The color gradient (Emerald to Red) indicates performance severity.'
    ]
  },
  {
    icon: BarChart2,
    title: 'Trends & Forecasting',
    href: '/trends',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    description: 'Analyze historical data and view machine-learning driven projections.',
    features: [
      'Toggle the "Show Forecast" button to overlay 6-month ML predictions.',
      'Click on any region in the summary table to isolate its trend line.',
      'Use the shaded area in the forecast chart to understand prediction confidence bounds.',
      'Export the raw time-series data using the Download CSV button.'
    ]
  },
  {
    icon: Sparkles,
    title: 'AI Insights Panel',
    href: '/ai',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    description: 'Ask natural language questions about the current state of the NHS.',
    features: [
      'Type questions directly into the prompt bar (e.g., "Why is the backlog rising in London?").',
      'The AI uses Retrieval-Augmented Generation (RAG) to query the actual dataset.',
      'Look for the "Sources" citations to verify the raw data behind the AI\'s answer.',
      'Use the "Suggested Prompts" for quick deep-dives into complex topics.'
    ]
  },
  {
    icon: FlaskConical,
    title: 'Strategic Simulator',
    href: '/simulator',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    description: 'Model the impact of resource interventions on waiting lists.',
    features: [
      'Adjust the "Target Region" and "Surgical Teams" sliders to simulate interventions.',
      'View the optimistic, expected, and pessimistic reduction scenarios.',
      'Switch to the "Resource Allocator" tab to see algorithmic ROI recommendations.',
      'Explore the "Policy Scenarios" tab for costed, pre-calculated policy options.'
    ]
  },
  {
    icon: GitCompare,
    title: 'Compare Regions',
    href: '/compare',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    description: 'Head-to-head benchmarking of any two NHS regions.',
    features: [
      'Select Region A and Region B from the dropdown menus.',
      'Review the KPI head-to-head table for direct metric comparisons.',
      'Use the Radar Chart to see a holistic "Performance Profile" across multiple axes.',
      'Identify structural inequalities by comparing deprivation index correlations.'
    ]
  },
  {
    icon: Bell,
    title: 'Anomaly Alerts',
    href: '/alerts',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-100',
    description: 'Automated statistical outlier detection for critical metrics.',
    features: [
      'The system automatically flags regions or specialties breaking historical trends.',
      'Review the "Severity" level (Warning, Critical) to prioritize attention.',
      'Click into an alert to see the specific Z-score and statistical deviation.',
      'Alerts are recalculated automatically on every new data ingestion.'
    ]
  }
]

export default function GuidePage() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 max-w-4xl mx-auto pb-24">
      
      {/* Header */}
      <motion.div variants={fade} className="text-center space-y-4 py-8 border-b border-[#e5e5e5]">
        <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <HelpCircle size={32} className="text-blue-600" />
        </div>
        <h1 className="text-3xl font-black text-[#111] tracking-tight">Platform User Guide</h1>
        <p className="text-[#666] max-w-2xl mx-auto leading-relaxed">
          Learn how to navigate the NHS Wait Intelligence platform, interpret the data visualizations, and leverage our AI and simulation tools for advanced operational insights.
        </p>
      </motion.div>

      {/* Intro Cards */}
      <motion.div variants={stagger} className="grid sm:grid-cols-2 gap-4">
        <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Database className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-[#111]">Data Provenance</h2>
          </div>
          <p className="text-sm text-[#666] leading-relaxed">
            All data is sourced directly from official NHS England Statistical Publications. The platform automatically ingests new data monthly. We never use or store Patient Health Information (PHI).
          </p>
        </motion.div>
        <motion.div variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-5 h-5 text-violet-600" />
            <h2 className="font-bold text-[#111]">Best Practices</h2>
          </div>
          <p className="text-sm text-[#666] leading-relaxed">
            For the most accurate analysis, always combine <strong>Trends</strong> (historical context) with the <strong>Simulator</strong> (forward-looking models). Use the <strong>AI Insights</strong> panel to quickly summarize findings.
          </p>
        </motion.div>
      </motion.div>

      {/* Modules Guide */}
      <motion.div variants={stagger} className="space-y-6 pt-4">
        <motion.h2 variants={fade} className="text-xl font-bold text-[#111] border-b border-[#e5e5e5] pb-3">
          Module Instructions
        </motion.h2>

        <div className="grid gap-6">
          {modules.map((mod, idx) => {
            const Icon = mod.icon
            return (
              <motion.div key={mod.title} variants={fade} className="bg-white border border-[#e5e5e5] rounded-2xl overflow-hidden group hover:border-[#bbb] transition-colors">
                <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:gap-8">
                  <div className="shrink-0 flex flex-col items-start gap-4 sm:w-64">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${mod.bg} ${mod.border}`}>
                      <Icon size={24} className={mod.color} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#111] text-lg mb-1">{mod.title}</h3>
                      <p className="text-sm text-[#666] leading-relaxed">{mod.description}</p>
                    </div>
                    <Link href={mod.href} className="inline-flex items-center gap-1 text-sm font-bold text-[#111] hover:text-blue-600 transition-colors mt-2">
                      Open Module <ChevronRight size={16} />
                    </Link>
                  </div>
                  
                  <div className="flex-1 border-t sm:border-t-0 sm:border-l border-[#f0f0f0] pt-6 sm:pt-0 sm:pl-8">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#bbb] mb-4">How to use</h4>
                    <ul className="space-y-3">
                      {mod.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-[#444]">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-[#f5f5f5] text-[#888] flex items-center justify-center text-[10px] font-bold mt-0.5">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

    </motion.div>
  )
}
