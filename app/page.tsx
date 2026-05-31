"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Header } from "@/components/Header"
import { HeroSection } from "@/components/HeroSection"
import { UploadZone } from "@/components/UploadZone"
import { ProgressPanel } from "@/components/ProgressPanel"
import { ResultPanel } from "@/components/ResultPanel"
import { ErrorPanel } from "@/components/ErrorPanel"
import { FeatureCard } from "@/components/FeatureCard"
import { Footer } from "@/components/Footer"
import type { TranslateProgress, TranslateResult } from "@/lib/types"
import { getBackendUrl } from "@/lib/api"

type AppState = "idle" | "translating" | "done" | "error"

export default function Home() {
  const [state, setState] = useState<AppState>("idle")
  const [progress, setProgress] = useState<TranslateProgress | null>(null)
  const [result, setResult] = useState<TranslateResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async (file: File) => {
    setState("translating")
    setError(null)
    setProgress({ stage: "loading", percent: 0, message: "连接翻译服务..." })
    setResult(null)

    const baseUrl = getBackendUrl()
    const sessionHash = crypto.randomUUID().replace(/-/g, "").substring(0, 10)

    try {
      setProgress({ stage: "loading", percent: 3, message: "上传文件中..." })

      const uploadFormData = new FormData()
      uploadFormData.append("files", file)

      const uploadRes = await fetch(
        `${baseUrl}/gradio_api/upload?upload_id=${sessionHash}`,
        { method: "POST", body: uploadFormData }
      )

      if (!uploadRes.ok) throw new Error(`文件上传失败: ${uploadRes.status}`)
      const uploadData = await uploadRes.json()
      const filePath = uploadData[0]
      const fileUrl = `${baseUrl}/gradio_api/file=${filePath}`

      setProgress({ stage: "loading", percent: 8, message: "提交翻译任务..." })

      const submitRes = await fetch(`${baseUrl}/gradio_api/queue/join?`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            "File",
            {
              path: filePath,
              url: fileUrl,
              orig_name: file.name,
              size: file.size,
              mime_type: "application/pdf",
              meta: { _type: "gradio.FileData" },
            },
            "",
            "Google",
            "English",
            "Simplified Chinese",
            "All",
            "",
            "",
            "4",
            false,
            false,
            "",
            false,
            "",
            null,
            "",
            "",
            "",
            "",
          ],
          event_data: null,
          fn_index: 5,
          trigger_id: 33,
          session_hash: sessionHash,
        }),
      })

      if (!submitRes.ok) {
        const errText = await submitRes.text()
        throw new Error(`提交翻译任务失败: ${submitRes.status} ${errText.substring(0, 200)}`)
      }

      const submitData = await submitRes.json()
      const eventId = submitData.event_id

      if (!eventId) throw new Error("未获取到翻译任务 ID")

      setProgress({ stage: "detecting", percent: 10, message: "布局检测中..." })

      const eventSource = new EventSource(
        `${baseUrl}/gradio_api/queue/data?session_hash=${sessionHash}`
      )

      const resultPromise = new Promise<TranslateResult>((resolve, reject) => {
        let maxPercent = 10

        eventSource.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data)

            if (msg.msg === "estimation") {
              setProgress({ stage: "loading", percent: 10, message: "等待处理..." })
            }

            if (msg.msg === "process_starts") {
              maxPercent = 10
              setProgress({ stage: "detecting", percent: 10, message: "布局检测中..." })
            }

            if (msg.msg === "progress") {
              const pd = msg.progress_data?.[0]
              if (pd && pd.progress != null) {
                const rawPct = Math.round(pd.progress * 100)
                const pct = Math.min(10 + Math.round(rawPct * 0.8), 90)
                if (pct >= maxPercent) {
                  maxPercent = pct
                  setProgress({
                    stage: pct < 30 ? "detecting" : "translating",
                    percent: pct,
                    message: pd.desc || "翻译中...",
                    current_page: pd.index != null ? pd.index + 1 : undefined,
                    total_pages: pd.length != null ? pd.length : undefined,
                  })
                }
              }
            }

            if (msg.msg === "process_completed") {
              eventSource.close()

              if (!msg.success) {
                reject(new Error("翻译失败"))
                return
              }

              const outputData = msg.output?.data
              if (!outputData) {
                reject(new Error("翻译结果为空"))
                return
              }

              const monoFile = outputData[0]
              const dualFile = outputData[2]

              const makeUrl = (f: any) => {
                if (!f) return ""
                if (f.url && f.url.startsWith("http")) return f.url
                if (f.url) return `${baseUrl}${f.url}`
                if (f.path) return `${baseUrl}/gradio_api/file=${f.path}`
                return ""
              }

              resolve({
                monoUrl: makeUrl(monoFile),
                dualUrl: makeUrl(dualFile),
                fileName: file.name.replace(/\.pdf$/i, "-translated.pdf"),
              })
            }

            if (msg.msg === "error" || msg.msg === "unexpected_error") {
              eventSource.close()
              reject(new Error(msg.message || msg.error || "翻译失败"))
            }
          } catch (parseErr) {
          }
        }

        eventSource.onerror = () => {
          eventSource.close()
          reject(new Error("翻译连接中断"))
        }

        setTimeout(() => {
          eventSource.close()
          reject(new Error("翻译超时"))
        }, 600000)
      })

      const translateResult = await resultPromise
      setResult(translateResult)
      setState("done")
    } catch (err) {
      setState("error")
      setError(err instanceof Error ? err.message : "网络错误")
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

            {state === "done" && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ResultPanel
                  result={result}
                  onReset={() => setState("idle")}
                />
              </motion.div>
            )}

            {state === "error" && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
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
