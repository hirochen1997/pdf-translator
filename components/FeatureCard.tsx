"use client"

import { motion } from "framer-motion"

interface FeatureCardProps {
  icon: string
  title: string
  description: string
  delay?: number
}

export function FeatureCard({ icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4, borderColor: "rgba(99, 102, 241, 0.3)" }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6 transition-colors"
    >
      <div className="text-2xl mb-3 text-indigo-400">{icon}</div>
      <h3 className="font-display font-semibold text-white/90 mb-2">{title}</h3>
      <p className="text-sm text-white/50 leading-relaxed">{description}</p>
    </motion.div>
  )
}
