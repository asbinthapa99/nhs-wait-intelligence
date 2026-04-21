"use client"
import React, { useId, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface Sparkle {
  id: string
  createdAt: number
  color: string
  size: number
  style: { top: string; left: string; zIndex: number }
}

function generateSparkle(color: string): Sparkle {
  return {
    id: String(Math.random()),
    createdAt: Date.now(),
    color,
    size: Math.random() * 10 + 10,
    style: {
      top: Math.random() * 100 + "%",
      left: Math.random() * 100 + "%",
      zIndex: 2,
    },
  }
}

export function SparkleIcon({ color, size }: { color: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M80 7C80 7 84.2846 45.2987 101.496 62.5C118.707 79.7013 157 80 157 80C157 80 118.709 80.2987 101.496 97.5C84.2846 114.701 80 153 80 153C80 153 75.7154 114.701 58.504 97.5C41.2926 80.2987 3 80 3 80C3 80 41.2926 79.7013 58.504 62.5C75.7154 45.2987 80 7 80 7Z"
        fill={color}
      />
    </svg>
  )
}

export function Sparkles({
  children,
  color = "#FFC700",
  className,
}: {
  children: React.ReactNode
  color?: string
  className?: string
}) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const sparkle = generateSparkle(color)
      setSparkles((prev) => [...prev.filter((s) => now - s.createdAt < 750), sparkle])
    }, 250)
    return () => clearInterval(interval)
  }, [color])

  return (
    <span className={cn("relative inline-block", className)}>
      <AnimatePresence>
        {sparkles.map((sparkle) => (
          <motion.span
            key={sparkle.id}
            className="absolute pointer-events-none"
            style={sparkle.style}
            initial={{ scale: 0, rotate: 0, opacity: 1 }}
            animate={{ scale: 1, rotate: 45, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <SparkleIcon color={sparkle.color} size={sparkle.size} />
          </motion.span>
        ))}
      </AnimatePresence>
      <span className="relative z-10">{children}</span>
    </span>
  )
}
