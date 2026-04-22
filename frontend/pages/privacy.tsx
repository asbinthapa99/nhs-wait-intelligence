import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'

const SECTIONS = [
  {
    title: 'What data we use',
    body: 'NHS Wait Intelligence uses exclusively aggregated, publicly available data published by NHS England under the Open Government Licence. This includes Referral-to-Treatment (RTT) waiting time statistics, ONS Index of Multiple Deprivation data, and CQC Trust quality ratings. No patient-level, personally identifiable, or protected health information (PHI/PII) is ingested, processed, or stored at any point.',
  },
  {
    title: 'Cookies and tracking',
    body: 'This platform does not use advertising cookies, third-party tracking, or analytics that identify individual users. The site may use minimal session storage to preserve your region or specialty selection within a single browser session. No data is shared with third parties for marketing or profiling purposes.',
  },
  {
    title: 'AI-generated content',
    body: 'Some pages use Claude (Anthropic) to generate plain-English explanations and summaries from aggregated NHS data. These AI outputs are not medical advice. They are provided for informational and research purposes only. Always consult a qualified healthcare professional before making decisions about your care.',
  },
  {
    title: 'Data retention',
    body: 'NHS Wait Intelligence does not collect or store personal information about visitors. If you contact us by email, your email address will be used only to respond to your message and will not be shared or stored beyond that correspondence.',
  },
  {
    title: 'Your rights',
    body: 'As this platform does not process personal data about visitors, there is no personal data to access, correct, or delete. For questions about NHS patient data held by NHS England, please contact NHS England directly at england.contactus@nhs.net.',
  },
  {
    title: 'Changes to this policy',
    body: 'This privacy policy may be updated occasionally to reflect changes to the platform. The most recent version is always available at this URL. Last updated: April 2026.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/20">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
          <p className="text-sm text-[#666] mt-0.5">How NHS Wait Intelligence handles data and your privacy.</p>
        </div>
      </motion.div>

      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-5 py-4">
        <p className="text-sm text-emerald-300 font-medium">Zero patient-level data — ever.</p>
        <p className="text-xs text-[#666] mt-1">This platform is built entirely on publicly available aggregated NHS statistics. No PII, no PHI, no individual patient records.</p>
      </div>

      <div className="space-y-6">
        {SECTIONS.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
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
