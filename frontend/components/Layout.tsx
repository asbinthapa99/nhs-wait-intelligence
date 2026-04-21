import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  Home, Map, BarChart2, Sparkles, Newspaper,
  Shield, LayoutDashboard, Settings, Layers,
  ArrowRight, Target, GitCompare, Bell, Info
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
]

const sidebarIcons = [
  { icon: Home, href: '/', label: 'Home' },
  { icon: LayoutDashboard, href: '/ics', label: 'ICS' },
  { icon: BarChart2, href: '/trends', label: 'Trends' },
  { icon: Sparkles, href: '/ai', label: 'AI Insights' },
  { icon: Target, href: '/recovery', label: 'Recovery' },
  { icon: GitCompare, href: '/compare', label: 'Compare' },
  { icon: Bell, href: '/alerts', label: 'Alerts' },
  { icon: Newspaper, href: '/news', label: 'News' },
  { icon: Settings, href: '/governance', label: 'Governance' },
  { icon: Info, href: '/about', label: 'About' },
  { icon: Layers, href: '/methodology', label: 'Methodology' },
]

const mobileNavIcons = [
  { icon: Home, href: '/', label: 'Home' },
  { icon: Map, href: '/map', label: 'Regions' },
  { icon: Sparkles, href: '/ai', label: 'AI' },
  { icon: Newspaper, href: '/news', label: 'News' },
  { icon: Settings, href: '/governance', label: 'More' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col md:flex-row overflow-hidden selection:bg-blue-500/30 font-sans">
      
      {/* ── Mobile Header ── */}
      <header className="md:hidden flex items-center justify-between px-5 h-16 bg-[#1e293b] border-b border-slate-700/80 shrink-0 relative z-40 shadow-md">
        <Link href="/" className="flex items-center gap-2">
          <span className="bg-[#005eb8] rounded text-white font-black px-1.5 py-0.5 text-xs italic shadow-sm">NHS</span>
          <span className="font-bold text-slate-100 text-[15px] tracking-tight">Wait Intelligence</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full live-dot" />
            Live
          </span>
        </div>
      </header>

      {/* ── Mobile Bottom Navbar (Native App Style) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[68px] bg-[#1e293b]/95 backdrop-blur-md border-t border-slate-700/80 z-50 flex justify-between items-center px-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        {mobileNavIcons.map((item, i) => {
          const active = router.pathname === item.href || (item.href !== '/' && router.pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link key={i} href={item.href} className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${active ? 'text-blue-400 scale-105' : 'text-slate-500 hover:text-slate-300 active:scale-95'}`}>
              <Icon size={active ? 22 : 20} strokeWidth={active ? 2.5 : 2} className={active ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : ''} />
              <span className={`text-[10px] tracking-wide ${active ? 'font-black opacity-100' : 'font-semibold opacity-70'}`}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── Desktop Left Sidebar ── */}
      <aside className="hidden md:flex flex-col w-[60px] bg-[#1e293b] border-r border-slate-700/80 shrink-0 z-20 pt-16 items-center py-6 gap-6 shadow-xl shadow-black/20">
        {sidebarIcons.map((item, i) => {
          const active = router.pathname === item.href
          const Icon = item.icon
          return (
            <Link key={i} href={item.href} title={item.label} className={`p-2.5 rounded-xl transition-all hover:scale-105 ${active ? 'bg-blue-600/20 text-blue-400 shadow-sm border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/80'}`}>
              <Icon size={20} strokeWidth={2.5} />
            </Link>
          )
        })}
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* ── Desktop Top Navbar ── */}
        <header className="hidden md:flex items-center h-16 bg-[#1e293b] border-b border-slate-700/80 px-6 shrink-0 relative z-10 shadow-sm">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mr-10 w-64">
            <span className="bg-[#005eb8] rounded text-white font-black px-1.5 py-0.5 text-sm italic shadow-sm">NHS</span>
            <span className="font-bold text-slate-100 text-[17px] tracking-tight">Wait Intelligence</span>
          </Link>

          {/* Top Tabs */}
          <nav className="flex items-center gap-2 flex-1">
            {topTabs.map((tab) => {
              const active = router.pathname === tab.href || (tab.href !== '/' && router.pathname.startsWith(tab.href))
              return (
                <Link
                  key={tab.label}
                  href={tab.href}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all ${
                    active ? 'bg-slate-800 text-white border border-slate-600 shadow-inner' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full live-dot" />
              Live data
            </span>
            <Link href="https://github.com/asbinthapa99/nhs-wait-intelligence" target="_blank" rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-300 transition-colors p-1.5">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
            </Link>
          </div>
        </header>

        {/* ── Page Scrollable Area ── */}
        <main className="flex-1 overflow-y-auto bg-[#0f172a] relative scroll-smooth pb-[68px] md:pb-0">
          <div className="min-h-full flex flex-col">
            <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
              {children}
            </div>
            
            {/* ── Footer ── */}
            <footer className="w-full border-t border-slate-800/60 bg-[#0f172a] pt-10 pb-16 mt-10">
              <div className="max-w-[1600px] mx-auto px-4 md:px-8 flex flex-col gap-6">
                
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 text-sm text-slate-500 font-medium text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 text-slate-300">
                      <Shield size={16} className="text-emerald-500" /> UK GDPR Compliant
                    </div>
                    <span className="hidden md:block text-slate-700">|</span>
                    <span>100% Anonymised Data (NO-PHI)</span>
                    <span className="hidden md:block text-slate-700">|</span>
                    <span className="text-blue-400 font-bold tracking-wide">Non-Profit Open Source</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-6">
                    <Link href="https://github.com/asbinthapa99/nhs-wait-intelligence" target="_blank" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors group">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="group-hover:text-white"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
                      Open Source Repo
                      <ArrowRight size={14} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    </Link>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-800/40 text-[11px] text-slate-600">
                  <p className="text-center md:text-left max-w-3xl leading-relaxed">
                    NHS Wait Intelligence is an independent, non-profit open-source initiative. We are not officially affiliated with the National Health Service (NHS), the Department of Health and Social Care (DHSC), or the UK Government. All metrics are aggregated from publicly available NHS England statistical publications in strict accordance with UK GDPR and data protection laws. No personally identifiable information (PII) is processed or stored.
                  </p>
                  <div className="flex flex-wrap justify-center items-center gap-4 font-bold uppercase tracking-wider shrink-0">
                    <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
                    <Link href="/legal" className="hover:text-slate-400 transition-colors">Legal & GDPR</Link>
                    <Link href="/cookies" className="hover:text-slate-400 transition-colors">Cookies</Link>
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
