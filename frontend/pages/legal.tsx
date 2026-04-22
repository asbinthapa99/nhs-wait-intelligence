import { motion } from 'framer-motion'
import { Scale } from 'lucide-react'

const SECTIONS = [
  {
    title: 'Independent platform',
    body: 'NHS Wait Intelligence is an independent, non-profit open-source initiative. It is not officially affiliated with, endorsed by, or operated by the National Health Service (NHS), NHS England, the Department of Health and Social Care (DHSC), or any UK Government body.',
  },
  {
    title: 'Data sources and licensing',
    body: 'All data used by this platform is sourced from publicly available NHS England statistical publications released under the Open Government Licence v3.0. ONS deprivation data is used under the same licence. CQC Trust ratings are used for informational purposes only and are reproduced from publicly available CQC publications.',
  },
  {
    title: 'Not medical advice',
    body: 'Nothing on this platform constitutes medical advice, clinical guidance, or a recommendation to seek or avoid any particular NHS service, provider, or treatment. All content is provided for informational and research purposes only. Always consult a qualified healthcare professional before making decisions about your health or care pathway.',
  },
  {
    title: 'Accuracy and liability',
    body: 'While we take care to ensure accuracy, NHS Wait Intelligence makes no warranty about the completeness, accuracy, or fitness for purpose of the data or analysis presented. The platform relies on upstream NHS data releases which may themselves contain errors or lags. We accept no liability for decisions made based on information presented here.',
  },
  {
    title: 'AI-generated content',
    body: 'This platform uses Claude (Anthropic) to generate explanatory text from aggregated data. AI outputs may contain errors, omissions, or hallucinations. They are not verified by a clinician or NHS statistician. Users should treat AI-generated content as a starting point for inquiry, not as authoritative analysis.',
  },
  {
    title: 'Open source licence',
    body: 'The source code for this platform is published under the MIT Licence on GitHub. You are free to fork, adapt, and redistribute it subject to the terms of that licence. Contributions and improvements are welcome.',
  },
  {
    title: 'UK GDPR',
    body: 'This platform does not process personal data about individuals. As a result, most UK GDPR obligations regarding data subject rights do not apply. For queries about NHS patient data, please contact NHS England directly.',
  },
]

export default function LegalPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0 border border-blue-500/20">
          <Scale className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Legal &amp; GDPR</h1>
          <p className="text-sm text-[#666] mt-0.5">Licensing, liability, independence statement, and data protection.</p>
        </div>
      </motion.div>

      <div className="space-y-6">
        {SECTIONS.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <h2 className="text-sm font-semibold text-white mb-2">{s.title}</h2>
            <p className="text-sm text-[#666] leading-relaxed">{s.body}</p>
          </motion.div>
        ))}
      </div>

      <div className="border-t border-[#e5e5e5] pt-6 text-xs text-[#666]">
        Questions? Contact us at <a href="mailto:phyhopeme@gmail.com" className="text-emerald-600 hover:underline">phyhopeme@gmail.com</a>
      </div>
    </div>
  )
}
