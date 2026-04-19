import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  Home, Map, BarChart2, TrendingUp, Sparkles, FileText, Newspaper,
  GitCompare, BookOpen, Info, Menu, X, Zap, Shield, Target, User,
  ChevronDown, Activity, Github, Linkedin,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface NavItem { label: string; href: string; icon: React.ElementType; desc: string }
interface NavGroup { label: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: Home, desc: 'National KPIs & trends' },
      { label: 'For Patients', href: '/patient', icon: User, desc: 'Check your wait time' },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { label: 'Regional Map', href: '/map', icon: Map, desc: 'Interactive choropleth' },
      { label: 'ICS Benchmarks', href: '/ics', icon: Target, desc: 'System-level rankings' },
      { label: 'Inequality', href: '/inequality', icon: BarChart2, desc: 'Deprivation gaps' },
      { label: 'Specialties', href: '/specialties', icon: Activity, desc: 'Clinical pathways' },
      { label: 'Trends', href: '/trends', icon: TrendingUp, desc: 'Monthly movement' },
      { label: 'Compare', href: '/compare', icon: GitCompare, desc: 'Region vs region' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Decision Engine', href: '/simulator', icon: Zap, desc: 'Policy simulation' },
      { label: 'AI Insights', href: '/ai', icon: Sparkles, desc: 'Claude-powered analysis' },
      { label: 'Daily Briefing', href: '/briefing', icon: FileText, desc: 'AI morning report' },
    ],
  },
  {
    label: 'Info',
    items: [
      { label: 'NHS News', href: '/news', icon: Newspaper, desc: 'Live health headlines' },
      { label: 'Governance', href: '/governance', icon: Shield, desc: 'Data provenance' },
      { label: 'Methodology', href: '/methodology', icon: BookOpen, desc: 'How scores work' },
      { label: 'About', href: '/about', icon: Info, desc: 'Project background' },
    ],
  },
]

const allNavItems = navGroups.flatMap((g) => g.items)

const mobileQuickNav = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Patient', href: '/patient', icon: User },
  { label: 'Simulator', href: '/simulator', icon: Zap },
  { label: 'AI', href: '/ai', icon: Sparkles },
]

function DropdownGroup({ group, currentPath }: { group: NavGroup; currentPath: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isActive = group.items.some((item) => item.href === currentPath)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap select-none ${
          isActive
            ? 'text-nhs-blue bg-blue-50'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        }`}
      >
        <span className={isActive ? 'text-nhs-blue' : ''}>{group.label}</span>
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${open ? 'rotate-180 text-nhs-blue' : 'text-slate-400'}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 z-50 py-2 overflow-hidden">
          {group.items.map((item) => {
            const active = currentPath === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-start gap-3 px-4 py-2.5 transition-colors group ${
                  active ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <span className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                  active ? 'bg-nhs-blue text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                }`}>
                  <Icon size={13} />
                </span>
                <span>
                  <span className={`block text-sm font-medium ${active ? 'text-nhs-blue' : 'text-slate-800'}`}>
                    {item.label}
                  </span>
                  <span className="block text-xs text-slate-400 mt-0.5">{item.desc}</span>
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(true) // default dark

  useEffect(() => { setMenuOpen(false) }, [router.pathname])

  return (
    <div className={`${darkMode ? 'dark' : ''} min-h-screen font-sans`}>
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">

      {/* Desktop Header */}
      <header className="hidden md:block bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center h-14 gap-2">

            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 mr-8 flex-shrink-0"
              aria-label="NHS Wait Intelligence — home"
            >
              <span className="flex items-center justify-center bg-blue-600 rounded-md text-white font-bold px-2 py-1 text-sm tracking-tight select-none">
                NHS
              </span>
              <span className="font-bold text-slate-100 text-xl tracking-tight leading-none ml-1">
                Wait Intelligence
              </span>
            </Link>

            {/* Nav groups */}
            <nav className="flex items-center gap-0.5 flex-1" aria-label="Main navigation">
              {navGroups.map((group) => (
                <DropdownGroup key={group.label} group={group} currentPath={router.pathname} />
              ))}
            </nav>

            {/* Right: dark mode toggle + live badge + news shortcut */}
            <div className="flex items-center gap-4 ml-auto flex-shrink-0">
              <button
                onClick={() => setDarkMode(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
                title="Toggle dark mode"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <Link
                href="/news"
                className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors"
              >
                <Newspaper size={16} />
                <span className="font-semibold">News</span>
              </Link>
              <span className="flex items-center gap-2 px-3 py-1 bg-emerald-900/40 border border-emerald-800 text-emerald-400 rounded-md text-sm font-bold">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Live data
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-2" aria-label="NHS Wait Intelligence — home">
            <span className="flex items-center justify-center bg-blue-600 rounded-md text-white px-2 py-0.5 font-bold text-xs">
              NHS
            </span>
            <span className="font-bold text-slate-100 text-base">
              Wait Intelligence
            </span>
          </Link>
          <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-900/40 border border-emerald-800 text-emerald-400 rounded text-xs font-bold">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Live
          </span>
        </div>
      </header>

      {/* Mobile Full-Screen More Drawer */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-slate-900">
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-5 h-14 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center bg-blue-600 rounded-md text-white px-2 py-0.5 font-bold text-xs">
                NHS
              </span>
              <span className="font-bold text-slate-100 text-base">Wait Intelligence</span>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Drawer Nav Items */}
          <div className="flex-1 overflow-y-auto py-2">
            {navGroups.filter(g => g.label !== 'Overview').map((group, gi) => (
              <div key={group.label}>
                {gi > 0 && <div className="mx-5 border-t border-slate-800 my-1" />}
                <div className="px-4 pt-4 pb-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const active = router.pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                            active
                              ? 'bg-blue-600/15 text-blue-400'
                              : 'text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <Icon size={18} className={active ? 'text-blue-400' : 'text-slate-400'} />
                          <span className="text-base">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dark Mode Toggle at Bottom */}
          <div className="flex-shrink-0 px-5 py-4 border-t border-slate-800">
            <button
              onClick={() => setDarkMode(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3 text-slate-200">
                <span className="text-lg">{darkMode ? '☀️' : '🌙'}</span>
                <span className="text-sm font-medium">{darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
              </div>
              <div className={`relative w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-slate-600'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>

          {/* Spacer for bottom nav */}
          <div className="h-16 flex-shrink-0" />
        </div>
      )}

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#00703c] border-t border-[#005a30] mt-auto pb-16 md:pb-0">
        <div className="max-w-7xl mx-auto px-6 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">

            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <span className="flex items-center justify-center bg-white text-[#00703c] font-bold px-2 py-1 text-xs rounded-md">
                  NHS
                </span>
                <span className="font-bold text-white text-[15px]">
                  Wait Intelligence
                </span>
              </Link>
              <p className="text-green-100 text-sm leading-relaxed max-w-sm mb-5">
                A decision intelligence platform tracking, forecasting, and reducing NHS waiting list inequality through open data and AI.
              </p>
              <div className="flex gap-3">
                <a
                  href="https://github.com/asbinthapa99/nhs-wait-intelligence"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-8 h-8 bg-[#005a30] text-white hover:bg-[#004d28] rounded-md transition-colors"
                >
                  <Github size={15} />
                </a>
                <a
                  href="https://linkedin.com/in/asbinthapa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-8 h-8 bg-[#0077b5] text-white hover:bg-[#005e93] rounded-md transition-colors"
                >
                  <Linkedin size={15} />
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-green-200 mb-4">Platform</h3>
              <ul className="space-y-2.5 text-sm text-green-100">
                {[
                  { href: '/map', label: 'Regional Map' },
                  { href: '/inequality', label: 'Inequality Explorer' },
                  { href: '/simulator', label: 'Decision Simulator' },
                  { href: '/ai', label: 'AI Insights' },
                  { href: '/trends', label: 'Trends' },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-green-200 mb-4">Legal & Info</h3>
              <ul className="space-y-2.5 text-sm text-green-100">
                {[
                  { href: '/governance', label: 'Data Governance' },
                  { href: '/methodology', label: 'Methodology' },
                  { href: '/about', label: 'About the Project' },
                  { href: '/news', label: 'NHS News' },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-green-200 mb-4">Data Sources</h3>
              <ul className="space-y-2.5 text-sm text-green-100">
                <li><a href="https://www.england.nhs.uk/statistics/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">NHS England Stats</a></li>
                <li><a href="https://www.ons.gov.uk/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">ONS Deprivation</a></li>
                <li><a href="https://www.cqc.org.uk/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">CQC Ratings</a></li>
                <li><a href="https://github.com/asbinthapa99/nhs-wait-intelligence" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Source Code</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#005a30] mt-10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-green-200">
              © {new Date().getFullYear()} NHS Wait Intelligence — Open Source. Not officially affiliated with NHS England.
            </p>
            <div className="flex items-center gap-4 text-xs text-green-200">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                Zero patient-level data
              </span>
              <span>•</span>
              <span>100% open data</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-40">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileQuickNav.map((item) => {
            const active = router.pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                  active ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 ${menuOpen ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Menu size={20} />
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </nav>
    </div>
    </div>
  )
}
