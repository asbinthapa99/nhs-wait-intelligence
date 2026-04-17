import Link from 'next/link'
import { useRouter } from 'next/router'
import { Home, Map, BarChart2, TrendingUp, Sparkles, Menu, X } from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { label: 'Overview', href: '/', icon: Home, mobileLabel: 'Home' },
  { label: 'Regional Map', href: '/map', icon: Map, mobileLabel: 'Map' },
  { label: 'Inequality', href: '/inequality', icon: BarChart2, mobileLabel: 'Inequality' },
  { label: 'Specialties', href: '/specialties', icon: BarChart2, mobileLabel: 'Specialties' },
  { label: 'Trends', href: '/trends', icon: TrendingUp, mobileLabel: 'Trends' },
  { label: 'AI Insights', href: '/ai', icon: Sparkles, mobileLabel: 'AI' },
]

const mobileNavItems = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Map', href: '/map', icon: Map },
  { label: 'Inequality', href: '/inequality', icon: BarChart2 },
  { label: 'Trends', href: '/trends', icon: TrendingUp },
  { label: 'AI', href: '/ai', icon: Sparkles },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {/* Desktop Header */}
      <header className="hidden md:block bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center h-14">
            <span className="text-nhs-blue font-bold text-lg mr-10 whitespace-nowrap">
              NHS Wait Intelligence
            </span>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const active = router.pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      active
                        ? 'text-nhs-blue border-b-2 border-nhs-blue bg-blue-50'
                        : 'text-slate-600 hover:text-nhs-blue hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <span className="text-nhs-blue font-bold text-base">NHS Wait Intelligence</span>
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 text-slate-600">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menuOpen && (
          <div className="bg-white border-t border-slate-100 px-4 py-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`block py-3 text-sm font-medium border-b border-slate-50 ${
                  router.pathname === item.href ? 'text-nhs-blue' : 'text-slate-600'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-5 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileNavItems.map((item) => {
            const active = router.pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                  active ? 'text-nhs-blue' : 'text-slate-400'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
