"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Toast } from "./Toast"

interface ResultPanelProps {
  jobId: string
  stats: { totalChars: number; codeBlocks: number; totalPages: number }
  onReset: () => void
}

export function ResultPanel({ jobId, stats, onReset }: ResultPanelProps) {
  const [downloading, setDownloading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const hideToast = useCallback(() => setToast(null), [])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const response = await fetch(`/api/download?jobId=${jobId}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "下载失败")
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "translated.pdf"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setToast({ message: "PDF 下载完成！", type: "success" })
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "下载失败", type: "error" })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-emerald-400 text-lg">✓</span>
          <span className="text-lg font-medium">翻译完成!</span>
        </div>

        <div className="font-mono text-sm text-white/60 space-y-1 mb-6">
          <p>├─ 翻译字符: {stats.totalChars.toLocaleString()}</p>
          <p>├─ 代码块: {stats.codeBlocks} 处 (已保留)</p>
          <p>├─ 总页数: {stats.totalPages}</p>
          <p>└─ 格式: PDF</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-indigo-500/25 transition-shadow disabled:opacity-50"
          >
            {downloading ? "下载中..." : "下载 PDF"}
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2.5 rounded-lg border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
          >
            重新翻译
          </button>
        </div>
      </motion.div>

      <Toast
        message={toast?.message || ""}
        type={toast?.type || "success"}
        visible={toast !== null}
        onClose={hideToast}
      />
    </>
  )
}
