"use client"

import { useState, useCallback, useRef } from "react"
import { motion } from "framer-motion"

interface UploadZoneProps {
  onUpload: (file: File) => void
}

export function UploadZone({ onUpload }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): boolean => {
    if (file.type !== "application/pdf") {
      setError("请上传 PDF 格式的文件")
      return false
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("文件大小不能超过 20MB")
      return false
    }
    setError(null)
    return true
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file && validateFile(file)) onUpload(file)
    },
    [onUpload, validateFile]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file && validateFile(file)) onUpload(file)
    },
    [onUpload, validateFile]
  )

  return (
    <motion.div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        relative rounded-xl border-2 border-dashed p-12 text-center cursor-pointer
        transition-all duration-300 group
        ${
          isDragOver
            ? "border-indigo-500 bg-indigo-500/10 scale-[1.02]"
            : error
            ? "border-red-500/50 bg-red-500/5"
            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        className="hidden"
      />
      <div className="text-4xl mb-4 text-indigo-400 group-hover:text-indigo-300 transition-colors">
        ⬡
      </div>
      <p className="text-lg font-medium text-white/80">
        拖拽或点击上传 PDF 文件
      </p>
      <p className="text-sm text-white/40 mt-2 font-mono">支持 .pdf · 最大 20MB</p>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400 mt-3"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  )
}
