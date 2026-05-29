"use client"

import { motion } from "framer-motion"
import type { TranslateProgress } from "@/lib/types"

const stageLabels: Record<string, string> = {
  parsing: "PDF 解析",
  detecting: "代码识别",
  translating: "文本翻译",
  rebuilding: "PDF 重建",
}

export function ProgressPanel({ progress }: { progress: TranslateProgress }) {
  const stages = ["parsing", "detecting", "translating", "rebuilding"] as const
  const currentStageIndex = stages.indexOf(progress.stage)

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-white/60">
          {stageLabels[progress.stage]}...
        </span>
        <span className="font-mono text-indigo-400 text-lg">
          {progress.percent}%
        </span>
      </div>

      <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-6">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress.percent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <div className="space-y-3">
        {stages.map((stage, i) => (
          <div key={stage} className="flex items-center gap-3 text-sm">
            {i < currentStageIndex ? (
              <span className="text-emerald-400">✓</span>
            ) : i === currentStageIndex ? (
              <motion.span
                className="text-indigo-400"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ⟳
              </motion.span>
            ) : (
              <span className="text-white/20">○</span>
            )}
            <span
              className={i <= currentStageIndex ? "text-white/80" : "text-white/30"}
            >
              {stageLabels[stage]}
            </span>
          </div>
        ))}
      </div>

      {progress.stage === "translating" && (
        <p className="text-xs text-white/40 mt-4 font-mono">
          {progress.currentPage} / {progress.totalPages} blocks
        </p>
      )}

      {progress.message && progress.stage !== "rebuilding" && (
        <p className="text-xs text-white/30 mt-2">{progress.message}</p>
      )}
    </div>
  )
}
