"use client"
import React, { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function GlowingStarsBackgroundCard({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  const [glowingStars, setGlowingStars] = useState<number[]>([])
  const stars = 108
  const columns = 18

  useEffect(() => {
    const interval = setInterval(() => {
      const newGlowing = Array.from({ length: 5 }, () => Math.floor(Math.random() * stars))
      setGlowingStars(newGlowing)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={cn("bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-hidden relative", className)}>
      <div
        className="absolute inset-0 grid"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 0 }}
      >
        {Array.from({ length: stars }).map((_, i) => (
          <div key={i} className="flex items-center justify-center">
            <AnimatePresence>
              {glowingStars.includes(i) && (
                <motion.div
                  key={`glow-${i}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 1.5 }}
                  className="absolute w-2 h-2 rounded-full bg-blue-500 blur-md"
                />
              )}
            </AnimatePresence>
            <div className="w-0.5 h-0.5 rounded-full bg-slate-700" />
          </div>
        ))}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}
