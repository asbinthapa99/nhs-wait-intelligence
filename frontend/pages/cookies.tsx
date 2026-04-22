import { motion } from 'framer-motion'
import { Cookie } from 'lucide-react'

const SECTIONS = [
  {
    title: 'What are cookies?',
    body: 'Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences and improve your experience. NHS Wait Intelligence uses only essential, privacy-respecting cookies.',
  },
  {
    title: 'Cookies we use',
    body: 'This platform does not use advertising cookies, analytics cookies that identify individual users, or any third-party tracking cookies. We may use minimal session storage (not persistent cookies) to preserve your region or specialty filter selection within a single browser session. This data never leaves your browser.',
  },
  {
    title: 'What we do not use',
    body: 'We do not use Google Analytics, Facebook Pixel, Hotjar, or any other behavioural tracking tool. We do not set persistent cookies that follow you across websites. We do not serve targeted advertising.',
  },
  {
    title: 'Third-party content',
    body: 'Some pages may include embedded content from third-party services (such as GitHub). These services may set their own cookies subject to their own privacy policies. We have no control over third-party cookies.',
  },
  {
    title: 'Managing cookies',
    body: 'You can control and delete cookies through your browser settings. Disabling session storage may affect region or specialty filter preferences within a session, but will not prevent you from accessing any content on this platform.',
  },
  {
    title: 'Changes to this policy',
    body: 'This cookie policy may be updated occasionally. The most recent version is always available at this URL. Last updated: April 2026.',
  },
]

export default function CookiesPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0 border border-amber-500/20">
          <Cookie className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Cookie Policy</h1>
          <p className="text-sm text-[#666] mt-0.5">How NHS Wait Intelligence uses (and avoids) cookies.</p>
        </div>
      </motion.div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4">
        <p className="text-sm text-amber-300 font-medium">No tracking cookies — ever.</p>
        <p className="text-xs text-[#666] mt-1">We do not use advertising or analytics cookies. Session preferences are stored locally in your browser only.</p>
      </div>

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
