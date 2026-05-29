"use client"

import { motion } from "framer-motion"

interface ErrorPanelProps {
  message: string
  onRetry: () => void
}

export function ErrorPanel({ message, onRetry }: ErrorPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-red-500/20 bg-red-500/5 backdrop-blur-xl p-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-red-400 text-lg">✕</span>
        <span className="text-lg font-medium text-red-300">翻译失败</span>
      </div>
      <p className="text-sm text-white/50 mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
      >
        重新尝试
      </button>
    </motion.div>
  )
}
