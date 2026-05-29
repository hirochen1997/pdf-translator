"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface ToastProps {
  message: string
  type?: "success" | "error"
  visible: boolean
  onClose: () => void
}

export function Toast({ message, type = "success", visible, onClose }: ToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 3000)
      return () => clearTimeout(timer)
    }
  }, [visible, onClose])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 40, x: "-50%" }}
          className={`fixed bottom-8 left-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg backdrop-blur-xl ${
            type === "success"
              ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
              : "bg-red-500/20 border border-red-500/30 text-red-300"
          }`}
        >
          <span className="mr-2">{type === "success" ? "✓" : "✕"}</span>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
