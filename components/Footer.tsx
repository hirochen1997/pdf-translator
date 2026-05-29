"use client"

import { motion } from "framer-motion"

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="border-t border-white/[0.06] py-8 mt-16"
    >
      <div className="max-w-[960px] mx-auto px-6 text-center">
        <p className="text-sm text-white/30">
          Made by hirochen
        </p>
      </div>
    </motion.footer>
  )
}
