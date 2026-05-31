"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Toast } from "./Toast"
import type { DownloadFormat, TranslateResult } from "@/lib/types"

interface ResultPanelProps {
  result: TranslateResult
  onReset: () => void
}

async function pickSaveLocation(filename: string): Promise<FileSystemFileHandle | null> {
  if (!("showSaveFilePicker" in window)) return null
  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: filename,
      types: [{ description: "PDF 文件", accept: { "application/pdf": [".pdf"] } }],
    })
    return handle
  } catch {
    return null
  }
}

async function downloadWithProgress(
  url: string,
  onProgress: (loaded: number, total: number) => void
): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) throw new Error("下载失败")

  const contentLength = Number(response.headers.get("content-length")) || 0
  if (contentLength === 0) {
    const blob = await response.blob()
    onProgress(blob.size, blob.size)
    return blob
  }

  const reader = response.body!.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    onProgress(loaded, contentLength)
  }

  const blob = new Blob(chunks as BlobPart[])
  onProgress(contentLength, contentLength)
  return blob
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ResultPanel({ result, onReset }: ResultPanelProps) {
  const [downloadState, setDownloadState] = useState<{
    format: DownloadFormat
    loaded: number
    total: number
  } | null>(null)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const hideToast = useCallback(() => setToast(null), [])

  const handleDownload = async (format: DownloadFormat) => {
    const url = format === "mono" ? result.monoUrl : result.dualUrl
    if (!url) {
      setToast({ message: "下载链接不可用", type: "error" })
      return
    }

    const filename = format === "mono"
      ? result.fileName
      : result.fileName.replace(/\.pdf$/i, "-dual.pdf")

    const fileHandle = await pickSaveLocation(filename)

    if (fileHandle) {
      try {
        setDownloadState({ format, loaded: 0, total: 1 })
        const blob = await downloadWithProgress(url, (loaded, total) => {
          setDownloadState({ format, loaded, total })
        })
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
        setDownloadState(null)
        setToast({ message: `${filename} 下载完成！`, type: "success" })
      } catch (err) {
        setDownloadState(null)
        if (err instanceof Error && err.message.includes("aborted")) return
        setToast({ message: err instanceof Error ? err.message : "下载失败", type: "error" })
      }
    } else {
      try {
        setDownloadState({ format, loaded: 0, total: 1 })
        const blob = await downloadWithProgress(url, (loaded, total) => {
          setDownloadState({ format, loaded, total })
        })
        saveFileViaLink(blob, filename)
        setDownloadState(null)
        setToast({ message: `${filename} 下载完成！`, type: "success" })
      } catch (err) {
        setDownloadState(null)
        if (err instanceof Error && err.message.includes("aborted")) return
        setToast({ message: err instanceof Error ? err.message : "下载失败", type: "error" })
      }
    }
  }

  const downloadPercent = downloadState
    ? downloadState.total > 0
      ? Math.round((downloadState.loaded / downloadState.total) * 100)
      : 0
    : 0

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
          <p>├─ 格式: PDF</p>
          <p>└─ 翻译: English → 简体中文</p>
        </div>

        {downloadState && (
          <div className="mb-4 p-3 rounded-lg bg-white/[0.03] border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/60">
                {downloadState.format === "mono" ? "下载译文" : "下载双语对照"}中...
              </span>
              <span className="font-mono text-xs text-indigo-400">{downloadPercent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: `${downloadPercent}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            {downloadState.total > 0 && (
              <p className="text-xs text-white/30 mt-1.5 font-mono">
                {formatBytes(downloadState.loaded)} / {formatBytes(downloadState.total)}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => handleDownload("mono")}
            disabled={downloadState !== null}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-indigo-500/25 transition-shadow disabled:opacity-50"
          >
            {downloadState?.format === "mono" ? `${downloadPercent}%` : "下载译文 PDF"}
          </button>
          <button
            onClick={() => handleDownload("dual")}
            disabled={downloadState !== null}
            className="px-6 py-2.5 rounded-lg border border-indigo-500/30 text-indigo-400 font-medium text-sm hover:bg-indigo-500/10 transition-colors disabled:opacity-50"
          >
            {downloadState?.format === "dual" ? `${downloadPercent}%` : "下载双语对照 PDF"}
          </button>
          <button
            onClick={onReset}
            disabled={downloadState !== null}
            className="px-4 py-2.5 rounded-lg border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors disabled:opacity-50"
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
