import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-7xl font-black text-slate-800 mb-6 tabular-nums">404</p>
        <h1 className="text-xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-sm text-slate-500 mb-8 max-w-sm">
          This page doesn't exist or was moved. Use the navigation to find what you need.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
            <Home size={14} /> Go home
          </Link>
          <button onClick={() => history.back()} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors">
            <ArrowLeft size={14} /> Go back
          </button>
        </div>
      </motion.div>
    </div>
  )
}
