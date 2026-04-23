import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  Home, Map, BarChart2, Sparkles, Newspaper,
  Shield, LayoutDashboard, Settings, Layers,
  ArrowRight, Target, GitCompare, Bell, Info,
  X, Grid3X3, Stethoscope, FlaskConical,
  BookOpen, Lock, ChevronRight, HelpCircle,
  Users, Clock, Building2, Code2,
  Banknote, UserMinus, CalendarClock, Globe, Wallet, ScrollText, Network, Calculator
} from 'lucide-react'
import { useState, useEffect } from 'react'

const topTabs = [
  { label: 'National Overview', href: '/' },
  { label: 'Regional Analysis', href: '/map' },
  { label: 'Clinical Specialties', href: '/specialties' },
  { label: 'Recovery Tracker', href: '/recovery' },
  { label: 'Compare Regions', href: '/compare' },
  { label: 'News & Budgets', href: '/news' },
  { label: 'Strategic Tools', href: '/simulator' },
  { label: 'Mutual Aid', href: '/mutual-aid' },
]

const sidebarIcons = [
  { icon: Home, href: '/', label: 'Home' },
  { icon: Map, href: '/map', label: 'Regional Map' },
  { icon: Stethoscope, href: '/specialties', label: 'Clinical Specialties' },
  { icon: LayoutDashboard, href: '/ics', label: 'ICS Dashboard' },
  { icon: Sparkles, href: '/ai', label: 'AI Insights' },
  { icon: Target, href: '/recovery', label: 'Recovery Tracker' },
  { icon: FlaskConical, href: '/simulator', label: 'Strategic Simulator' },
  { icon: Network, href: '/mutual-aid', label: 'Mutual Aid Routing' },
  { icon: Calculator, href: '/cost-of-inaction', label: 'Cost of Inaction' },
]

const mobileNavIcons = [
  { icon: Home, href: '/', label: 'Home' },
  { icon: Map, href: '/map', label: 'Regions' },
  { icon: Sparkles, href: '/ai', label: 'AI' },
  { icon: Newspaper, href: '/news', label: 'News' },
]

const moreGroups = [
  {
    label: 'Analytics',
    items: [
      { icon: BarChart2, href: '/trends', label: 'Trends', desc: 'Historical & forecast data' },
      { icon: LayoutDashboard, href: '/ics', label: 'ICS Dashboard', desc: 'Integrated Care System view' },
      { icon: Stethoscope, href: '/specialties', label: 'Clinical Specialties', desc: 'By treatment type' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { icon: Target, href: '/recovery', label: 'Recovery Tracker', desc: 'Progress vs NHS targets' },
      { icon: GitCompare, href: '/compare', label: 'Compare Regions', desc: 'Side-by-side analysis' },
      { icon: Bell, href: '/alerts', label: 'Anomaly Alerts', desc: 'Statistical outliers' },
      { icon: FlaskConical, href: '/simulator', label: 'Strategic Simulator', desc: 'Model interventions' },
      { icon: Network, href: '/mutual-aid', label: 'Mutual Aid Routing', desc: 'Patient transfer optimizer' },
    ],
  },
  {
    label: 'Discover',
    items: [
      { icon: Users, href: '/mp', label: "Your MP's NHS Record", desc: 'Postcode → constituency data' },
      { icon: Clock, href: '/estimate', label: 'Wait Time Estimator', desc: 'Estimate your wait by specialty' },
      { icon: Building2, href: '/trusts', label: 'Trust League Table', desc: 'A–F graded NHS trusts' },
      { icon: Code2, href: '/api-docs', label: 'Public API', desc: 'Open data endpoints' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { icon: Banknote, href: '/budget', label: 'Budget vs Outcomes', desc: 'Does more spending buy shorter waits?' },
      { icon: Calculator, href: '/cost-of-inaction', label: 'Cost of Inaction', desc: 'Financial penalty of wait times' },
      { icon: UserMinus, href: '/vacancies', label: 'Staff Vacancies', desc: 'Empty posts driving longer waits' },
      { icon: CalendarClock, href: '/projection', label: '92% Target Projection', desc: 'When will England hit the standard?' },
      { icon: Globe, href: '/nations', label: 'UK Nations', desc: 'England vs Wales vs Scotland vs NI' },
      { icon: Wallet, href: '/private-cost', label: 'NHS vs Private Cost', desc: 'What going private actually costs' },
      { icon: ScrollText, href: '/hansard', label: 'Parliamentary Debates', desc: 'What MPs say about waiting times' },
    ],
  },
  {
    label: 'Info',
    items: [
      { icon: HelpCircle, href: '/guide', label: 'User Guide', desc: 'How to use the tools' },
      { icon: Info, href: '/about', label: 'About', desc: 'Mission & principles' },
      { icon: Settings, href: '/governance', label: 'Governance', desc: 'How we operate' },
      { icon: BookOpen, href: '/methodology', label: 'Methodology', desc: 'Data sources & methods' },
      { icon: Lock, href: '/privacy', label: 'Privacy Policy', desc: 'How we handle data' },
    ],
  },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)

  // Close drawer on route change
  useEffect(() => { setMoreOpen(false) }, [router.pathname])

  // Prevent body scroll when drawer open
  useEffect(() => {
    if (moreOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [moreOpen])

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] flex flex-col md:flex-row overflow-hidden selection:bg-blue-100 font-sans">

      {/* ── Mobile Header ── */}
      <header className="md:hidden flex items-center justify-between px-5 h-14 bg-white border-b border-[#e5e5e5] shrink-0 relative z-40">
        <Link href="/" className="flex items-center gap-2">
          <span className="bg-emerald-600 rounded text-white font-black px-1.5 py-0.5 text-xs tracking-tight">NHS</span>
          <span className="font-semibold text-[#111] text-[15px] tracking-tight">Wait Intelligence</span>
        </Link>
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-semibold">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          Live
        </span>
      </header>

      {/* ── Mobile Bottom Navbar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-white/95 backdrop-blur-md border-t border-[#e5e5e5] z-50 flex items-center shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
        {mobileNavIcons.map((item, i) => {
          const active = router.pathname === item.href || (item.href !== '/' && router.pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link key={i} href={item.href} className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${active ? 'text-emerald-600' : 'text-[#888] active:scale-95'}`}>
              <Icon size={active ? 21 : 19} strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[10px] tracking-wide ${active ? 'font-bold' : 'font-semibold opacity-70'}`}>{item.label}</span>
            </Link>
          )
        })}
        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${moreOpen ? 'text-emerald-600' : 'text-[#888] active:scale-95'}`}
        >
          <Grid3X3 size={moreOpen ? 21 : 19} strokeWidth={moreOpen ? 2.5 : 2} />
          <span className={`text-[10px] tracking-wide ${moreOpen ? 'font-bold' : 'font-semibold opacity-70'}`}>More</span>
        </button>
      </nav>

      {/* ── Mobile More Drawer ── */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          {/* Modal / Sheet */}
          <div className="fixed z-[70] bg-white border border-[#e5e5e5] shadow-2xl flex flex-col
            bottom-0 left-0 right-0 rounded-t-2xl max-h-[85vh] 
            md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[800px] md:h-[80vh] md:max-h-[800px] md:rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f0f0f0] shrink-0">
              <div className="flex items-center gap-3">
                <div className="md:hidden w-8 h-1 bg-[#e5e5e5] rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <span className="text-base font-bold text-[#111]">Platform Directory</span>
              </div>
              <button onClick={() => setMoreOpen(false)} className="p-2 rounded-xl bg-[#f5f5f5] text-[#888] hover:text-[#111] hover:bg-[#eee] transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Tool groups */}
            <div className="overflow-y-auto flex-1 px-6 py-6 pb-safe">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                {moreGroups.map((group) => (
                  <div key={group.label}>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#bbb] mb-3 px-1">{group.label}</p>
                    <div className="space-y-1.5">
                      {group.items.map((item) => {
                        const active = router.pathname === item.href || (item.href !== '/' && router.pathname.startsWith(item.href))
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all active:scale-[0.98] ${active ? 'bg-emerald-50 border border-emerald-100' : 'bg-transparent border border-transparent hover:bg-[#f8f8f8] hover:border-[#f0f0f0]'}`}
                          >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-white text-emerald-600 shadow-sm' : 'bg-white border border-[#e5e5e5] text-[#888] shadow-sm'}`}>
                              <Icon size={17} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold ${active ? 'text-emerald-700' : 'text-[#333]'}`}>{item.label}</p>
                              <p className="text-[11px] text-[#888] truncate">{item.desc}</p>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer links */}
              <div className="flex items-center justify-center gap-6 pt-8 pb-4 mt-4 border-t border-[#f0f0f0]">
                {[{ href: '/legal', label: 'Legal Terms' }, { href: '/cookies', label: 'Cookies' }, { href: '/privacy', label: 'Privacy' }].map(l => (
                  <Link key={l.href} href={l.href} className="text-[11px] text-[#aaa] hover:text-[#111] transition-colors font-bold uppercase tracking-wider">{l.label}</Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}


      {/* ── Desktop Left Sidebar ── */}
      <aside className="hidden md:flex flex-col w-[60px] bg-white border-r border-[#e5e5e5] shrink-0 z-20 pt-16 items-center py-6 gap-6">
        {sidebarIcons.map((item, i) => {
          const active = router.pathname === item.href
          const Icon = item.icon
          return (
            <Link key={i} href={item.href} title={item.label} className={`p-2.5 rounded-xl transition-all hover:scale-105 ${active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-[#999] hover:text-[#111] hover:bg-[#f5f5f5]'}`}>
              <Icon size={20} strokeWidth={2.5} />
            </Link>
          )
        })}
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* ── Desktop Top Navbar (Stripe/Vercel Light Style) ── */}
        <header className="hidden md:flex items-center h-16 bg-white border-b border-[#e5e5e5] px-8 shrink-0 relative z-10">
          <Link href="/" className="flex items-center gap-2 mr-8">
            <span className="bg-emerald-600 rounded text-white font-black px-1.5 py-0.5 text-xs tracking-tight">NHS</span>
            <span className="font-semibold text-[#111] text-[14px] tracking-tight">Wait Intelligence</span>
          </Link>
          <nav className="flex items-center gap-6 flex-1 overflow-x-auto scrollbar-none">
            {topTabs.map((tab) => {
              const active = router.pathname === tab.href || (tab.href !== '/' && router.pathname.startsWith(tab.href))
              return (
                <Link
                  key={tab.label}
                  href={tab.href}
                  className={`text-[13px] font-medium transition-colors whitespace-nowrap ${
                    active ? 'text-[#111] font-semibold' : 'text-[#888] hover:text-[#111]'
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setMoreOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#f5f5f5] hover:bg-[#eee] border border-[#e5e5e5] text-[#333] rounded-lg text-xs font-bold transition-colors ml-2"
            >
              <Grid3X3 size={14} />
              Browse Tools
            </button>
            <div className="w-px h-6 bg-[#e5e5e5] mx-2" />
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full text-xs font-semibold">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Live data
            </span>
            <Link href="https://github.com/asbinthapa99/nhs-wait-intelligence" target="_blank" rel="noopener noreferrer"
              className="text-[#666] hover:text-[#111] transition-colors p-1.5 ml-1">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
            </Link>
          </div>
        </header>

        {/* ── Page Scrollable Area ── */}
        <main className="flex-1 overflow-y-auto bg-[#f5f5f5] relative scroll-smooth pb-[64px] md:pb-0">
          <div className="min-h-full flex flex-col">
            <div className="flex-1 p-3 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
              {children}
            </div>

            {/* ── Footer ── */}
            <footer className="w-full border-t border-[#e5e5e5] bg-[#f5f5f5] pt-8 pb-20 md:pb-12 mt-10">
              <div className="max-w-[1600px] mx-auto px-4 md:px-8 flex flex-col gap-5">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 text-sm text-[#888] font-medium text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 text-[#666]">
                      <Shield size={16} className="text-emerald-500" /> UK GDPR Compliant
                    </div>
                    <span className="hidden md:block text-[#444]">|</span>
                    <span>100% Anonymised Data (NO-PHI)</span>
                    <span className="hidden md:block text-[#444]">|</span>
                    <span className="text-emerald-600 font-bold tracking-wide">Non-Profit Open Source</span>
                  </div>
                  <Link href="https://github.com/asbinthapa99/nhs-wait-intelligence" target="_blank" className="flex items-center gap-2 text-sm font-bold text-[#666] hover:text-white transition-colors group">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="group-hover:text-white"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
                    Open Source Repo
                    <ArrowRight size={14} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  </Link>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-5 border-t border-slate-800/40 text-[11px] text-[#666]">
                  <p className="text-center md:text-left max-w-3xl leading-relaxed">
                    NHS Wait Intelligence is an independent, non-profit open-source initiative. Not affiliated with the NHS, DHSC, or UK Government. All metrics are aggregated from publicly available NHS England statistical publications under UK GDPR. No personally identifiable information is processed or stored.
                  </p>
                  <div className="flex flex-wrap justify-center items-center gap-4 font-bold uppercase tracking-wider shrink-0">
                    <Link href="/privacy" className="hover:text-[#666] transition-colors">Privacy</Link>
                    <Link href="/legal" className="hover:text-[#666] transition-colors">Legal</Link>
                    <Link href="/cookies" className="hover:text-[#666] transition-colors">Cookies</Link>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}
