import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { X } from 'lucide-react'

const STORAGE_KEY = 'nhs_wi_role'

const roles = [
  {
    id: 'patient',
    label: 'Patient',
    emoji: '🏥',
    description: 'Understand NHS waits in your area, compare providers, and prepare for conversations with your GP.',
    href: '/patient',
    color: 'border-blue-200 hover:border-nhs-blue hover:bg-blue-50',
    badge: 'bg-blue-100 text-nhs-blue',
  },
  {
    id: 'analyst',
    label: 'Analyst',
    emoji: '📊',
    description: 'Benchmark regions, identify outliers, explore specialty trends, and run scenario simulations.',
    href: '/map',
    color: 'border-slate-200 hover:border-slate-400 hover:bg-slate-50',
    badge: 'bg-slate-100 text-slate-700',
  },
  {
    id: 'executive',
    label: 'Executive / ICS',
    emoji: '🏛️',
    description: 'Get a concise view of backlog scale, inequality, and emerging operational risk across England.',
    href: '/ics',
    color: 'border-slate-200 hover:border-slate-400 hover:bg-slate-50',
    badge: 'bg-slate-100 text-slate-700',
  },
]

export default function OnboardingModal() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show on first visit (no stored role) and only on the home page
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) setVisible(true)
    } catch {
      // localStorage unavailable (SSR / private mode)
    }
  }, [])

  function choose(role: typeof roles[0]) {
    try {
      localStorage.setItem(STORAGE_KEY, role.id)
    } catch { /* ignore */ }
    setVisible(false)
    void router.push(role.href)
  }

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, 'dismissed')
    } catch { /* ignore */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 md:p-8">
        {/* Close */}
        <button
          onClick={dismiss}
          aria-label="Skip and continue to overview"
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-nhs-blue mb-2">Welcome</p>
          <h2 id="onboarding-title" className="text-2xl font-bold text-slate-900">
            Who are you today?
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Choose your role to jump straight to the most relevant view. You can always switch later.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => choose(role)}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${role.color}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{role.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900 text-sm">{role.label}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${role.badge}`}>
                      {role.id === 'patient' ? 'Most popular' : role.id === 'analyst' ? 'Data-rich' : 'Executive'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{role.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={dismiss}
          className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors py-2"
        >
          Skip — take me to the overview
        </button>
      </div>
    </div>
  )
}

/** Returns the stored role, or null if not set. Safe to call on client only. */
export function getStoredRole(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}
