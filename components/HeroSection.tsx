"use client"

import { motion } from "framer-motion"

export function HeroSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="py-16 text-center relative"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
      <motion.h1
        className="text-4xl md:text-5xl font-display font-bold tracking-tight relative"
        style={{
          background: "linear-gradient(135deg, #818CF8 0%, #A78BFA 50%, #F472B6 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        PDF 智能翻译引擎
      </motion.h1>
      <p className="mt-4 text-lg text-white/50 font-light">
        英文文献 → 中文智慧
      </p>
      <p className="mt-2 text-sm text-white/30">
        保留代码 · 保留排版 · 免费使用
      </p>
    </motion.section>
  )
}
