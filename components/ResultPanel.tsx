"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Toast } from "./Toast"
import type { DownloadFormat } from "@/lib/types"

interface ResultPanelProps {
  taskId: string
  stats: { total_chars: number; pages: number }
  onReset: () => void
}

async function saveFileViaPicker(blob: Blob, filename: string): Promise<boolean> {
  if (!("showSaveFilePicker" in window)) return false
  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: filename,
      types: [{ description: "PDF 文件", accept: { "application/pdf": [".pdf"] } }],
    })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return true
  } catch {
    return false
  }
}

function saveFileViaLink(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function ResultPanel({ taskId, stats, onReset }: ResultPanelProps) {
  const [downloading, setDownloading] = useState<DownloadFormat | null>(null)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const hideToast = useCallback(() => setToast(null), [])

  const handleDownload = async (format: DownloadFormat) => {
    setDownloading(format)
    try {
      const response = await fetch(`/api/download?taskId=${taskId}&format=${format}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "下载失败")
      }
      const blob = await response.blob()

      const filename = format === "mono" ? "translated.pdf" : "translated-dual.pdf"
      const saved = await saveFileViaPicker(blob, filename)
      if (!saved) {
        saveFileViaLink(blob, filename)
      }

      setToast({ message: "PDF 下载完成！", type: "success" })
    } catch (err) {
      if (err instanceof Error && err.message.includes("aborted")) return
      setToast({ message: err instanceof Error ? err.message : "下载失败", type: "error" })
    } finally {
      setDownloading(null)
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
          <p>├─ 文件大小: {(stats.total_chars / 1024).toFixed(1)} KB</p>
          <p>├─ 总页数: {stats.pages}</p>
          <p>└─ 格式: PDF</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => handleDownload("mono")}
            disabled={downloading !== null}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-indigo-500/25 transition-shadow disabled:opacity-50"
          >
            {downloading === "mono" ? "下载中..." : "下载译文 PDF"}
          </button>
          <button
            onClick={() => handleDownload("dual")}
            disabled={downloading !== null}
            className="px-6 py-2.5 rounded-lg border border-indigo-500/30 text-indigo-400 font-medium text-sm hover:bg-indigo-500/10 transition-colors disabled:opacity-50"
          >
            {downloading === "dual" ? "下载中..." : "下载双语对照 PDF"}
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
