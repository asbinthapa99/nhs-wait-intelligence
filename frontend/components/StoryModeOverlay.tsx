import { useState } from 'react'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'

const STEPS = [
  {
    title: "Welcome to NHS Wait Intelligence",
    content: "This platform is an AI-powered decision intelligence system designed to help you reduce NHS waiting list inequalities.",
    path: "/",
    action: "Next: See National KPIs"
  },
  {
    title: "Track Regional Hotspots",
    content: "We compute a unique composite inequality score combining wait times, backlog growth, and ONS deprivation deciles.",
    path: "/inequality",
    action: "Next: Understand the AI"
  },
  {
    title: "AI-Driven Causal Reasoning",
    content: "Instead of just charts, our Claude-powered AI explains exactly WHY a region is flagging and suggests actionable interventions.",
    path: "/ai",
    action: "Next: Simulate Outcomes"
  },
  {
    title: "Decision Engine",
    content: "Test policy scenarios before deploying them. Add surgical capacity to high-need regions and see if it moves the needle 6 months out.",
    path: "/simulator",
    action: "Next: Policy Briefing"
  },
  {
    title: "Executive Summaries",
    content: "Generate one-click structured briefings combining real-time data and AI synthesis into an exportable report.",
    path: "/briefing",
    action: "Finish Tour"
  }
]

export default function StoryModeOverlay() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const router = useRouter()

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      const nextIdx = currentStep + 1
      setCurrentStep(nextIdx)
      void router.push(STEPS[nextIdx].path)
    } else {
      setIsOpen(false)
      setCurrentStep(0)
    }
  }

  if (!isOpen) {
    return (
      <motion.button 
        drag
        dragMomentum={false}
        whileDrag={{ scale: 1.1, cursor: "grabbing" }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center shadow-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 z-50 transition-colors group cursor-grab"
        title="Take the Platform Tour (Drag to move)"
      >
        <span className="text-xl pointer-events-none group-hover:scale-110 transition-transform">🎬</span>
      </motion.button>
    )
  }

  const step = STEPS[currentStep]

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 pointer-events-auto transition-opacity" />
      
      {/* Tour Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-700 rounded-xl p-8 z-50 w-full max-w-md shadow-2xl">
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-2xl font-bold cursor-pointer transition-colors"
          aria-label="Close"
        >
          &times;
        </button>
        
        <div className="flex gap-1.5 mb-8 mt-2">
          {STEPS.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 flex-1 rounded-full ${i <= currentStep ? 'bg-blue-500' : 'bg-slate-800'}`}
            />
          ))}
        </div>
        
        <h2 className="text-xl font-bold text-white mb-3">{step.title}</h2>
        <p className="text-slate-300 text-sm leading-relaxed mb-8 min-h-[80px]">{step.content}</p>
        
        <div className="flex justify-between items-center pt-5 border-t border-slate-800">
          <button 
            onClick={() => setIsOpen(false)}
            className="text-sm font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            Skip tour
          </button>
          <button 
            onClick={handleNext}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-5 rounded-lg transition-colors cursor-pointer"
          >
            {step.action}
          </button>
        </div>
      </div>
    </>
  )
}

