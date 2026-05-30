"use client"

import { useState, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Header } from "@/components/Header"
import { HeroSection } from "@/components/HeroSection"
import { UploadZone } from "@/components/UploadZone"
import { ProgressPanel } from "@/components/ProgressPanel"
import { ResultPanel } from "@/components/ResultPanel"
import { ErrorPanel } from "@/components/ErrorPanel"
import { FeatureCard } from "@/components/FeatureCard"
import { Footer } from "@/components/Footer"
import type { TranslateProgress } from "@/lib/types"

type AppState = "idle" | "translating" | "done" | "error"

export default function Home() {
  const [state, setState] = useState<AppState>("idle")
  const [progress, setProgress] = useState<TranslateProgress | null>(null)
  const [taskId, setTaskId] = useState("")
  const [stats, setStats] = useState<{ total_chars: number; pages: number }>({ total_chars: 0, pages: 0 })
  const [error, setError] = useState<string | null>(null)
  const taskIdRef = useRef("")
  const statsRef = useRef<{ total_chars: number; pages: number }>({ total_chars: 0, pages: 0 })

  const handleUpload = async (file: File) => {
    setState("translating")
    setError(null)
    setProgress(null)
    setTaskId("")
    setStats({ total_chars: 0, pages: 0 })

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        setState("error")
        setError(data.error || "Upload failed")
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        let currentEvent = ""
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))

              if (currentEvent === "complete") {
                taskIdRef.current = data.task_id || ""
                statsRef.current = data.stats || { total_chars: 0, pages: 0 }
                setTaskId(taskIdRef.current)
                setStats(statsRef.current)
                setState("done")
                return
              }

              if (currentEvent === "error") {
                setState("error")
                setError(data.message || "Translation failed")
                return
              }

              if (currentEvent === "progress") {
                setProgress(data as TranslateProgress)
              }
            } catch {
              // ignore parse errors
            }
            currentEvent = ""
          }
        }
      }

      // If we reach here without a complete event, check if we have task_id from progress
      if (taskIdRef.current) {
        setState("done")
      } else {
        setState("error")
        setError("Translation stream ended unexpectedly")
      }
    } catch (err) {
      setState("error")
      setError(err instanceof Error ? err.message : "Network error")
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] relative">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #6366F1 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10">
        <Header />
        <main className="max-w-[960px] mx-auto px-6">
          <HeroSection />

          <AnimatePresence mode="wait">
            {state === "idle" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <UploadZone onUpload={handleUpload} />
              </motion.div>
            )}

            {state === "translating" && progress && (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ProgressPanel progress={progress} />
              </motion.div>
            )}

            {state === "done" && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ResultPanel
                  taskId={taskId}
                  stats={stats}
                  onReset={() => setState("idle")}
                />
              </motion.div>
            )}

            {state === "error" && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ErrorPanel message={error} onRetry={() => setState("idle")} />
              </motion.div>
            )}
          </AnimatePresence>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 mb-16">
            <FeatureCard
              icon="⬡"
              title="智能识别"
              description="AI 深度学习模型精确识别代码块、公式、图表区域"
              delay={0}
            />
            <FeatureCard
              icon="⬡"
              title="格式保留"
              description="原地修改 PDF 内容流，完美保留原始排版"
              delay={0.1}
            />
            <FeatureCard
              icon="⬡"
              title="零成本"
              description="基于免费翻译 API，每月 500 万字符免费额度"
              delay={0.2}
            />
          </section>
        </main>
        <Footer />
      </div>
    </div>
  )
}
