import { NextRequest } from "next/server"
import { parsePDF, aggregateIntoBlocks } from "@/lib/pdf-parser"
import { detectCodeBlocks, applyContextRules } from "@/lib/code-detector"
import { Translator } from "@/lib/translator"
import { PDFBuilder } from "@/lib/pdf-builder"
import { getFontPath } from "@/lib/font-loader"
import { storeResult } from "@/lib/result-store"
import type { TranslateProgress } from "@/lib/types"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get("file") as File

  if (!file || file.type !== "application/pdf") {
    return new Response(JSON.stringify({ error: "Invalid PDF file" }), { status: 400 })
  }

  const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || "20971520")
  if (file.size > maxFileSize) {
    return new Response(JSON.stringify({ error: `文件大小不能超过 ${Math.round(maxFileSize / 1024 / 1024)}MB` }), { status: 400 })
  }

  const pdfBytes = await file.arrayBuffer()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (progress: TranslateProgress) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
        )
      }

      try {
        sendProgress({
          stage: "parsing",
          currentPage: 0,
          totalPages: 0,
          percent: 5,
          message: "Parsing PDF...",
        })
        const parsed = await parsePDF(pdfBytes)

        sendProgress({
          stage: "detecting",
          currentPage: 0,
          totalPages: parsed.pages.length,
          percent: 15,
          message: "Detecting code blocks...",
        })

        const allBlocks = parsed.pages.flatMap((page) => {
          const blocks = aggregateIntoBlocks(page.textItems, page.pageNum)
          return detectCodeBlocks(blocks)
        })
        const classifiedBlocks = applyContextRules(allBlocks)

        if (!process.env.TENCENT_SECRET_ID || !process.env.TENCENT_SECRET_KEY || process.env.TENCENT_SECRET_ID === "your_secret_id_here") {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "翻译 API 未配置。请在 .env.local 中设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY" })}\n\n`)
          )
          controller.close()
          return
        }

        const translator = new Translator({
          secretId: process.env.TENCENT_SECRET_ID!,
          secretKey: process.env.TENCENT_SECRET_KEY!,
        })

        const translatableBlocks = classifiedBlocks.filter(
          (b) => !["code", "formula", "url", "pageNumber"].includes(b.category)
        )

        const texts = translatableBlocks.map((b) => b.text)
        const totalTexts = texts.length

        if (totalTexts === 0) {
          sendProgress({
            stage: "translating",
            currentPage: 0,
            totalPages: 0,
            percent: 85,
            message: "No translatable text found",
          })
        } else {
          const batchSize = 20
          for (let i = 0; i < totalTexts; i += batchSize) {
            const batch = texts.slice(i, i + batchSize)
            const results = await translator.translateBatch(batch)

            for (let j = 0; j < results.length; j++) {
              if (i + j < translatableBlocks.length) {
                translatableBlocks[i + j].translatedText = results[j].translated
              }
            }

            const percent = 15 + Math.round(((i + batchSize) / totalTexts) * 70)
            sendProgress({
              stage: "translating",
              currentPage: Math.min(i + batchSize, totalTexts),
              totalPages: totalTexts,
              percent: Math.min(percent, 85),
              message: `Translating ${Math.min(i + batchSize, totalTexts)}/${totalTexts} blocks...`,
            })
          }
        }

        sendProgress({
          stage: "rebuilding",
          currentPage: 0,
          totalPages: parsed.pages.length,
          percent: 90,
          message: "Rebuilding PDF...",
        })

        let fontPath: string
        try {
          fontPath = getFontPath()
        } catch {
          sendProgress({
            stage: "rebuilding",
            currentPage: 0,
            totalPages: 0,
            percent: 0,
            message: JSON.stringify({
              error: "Chinese font not found. Please add NotoSansSC font to public/fonts/",
            }),
          })
          controller.close()
          return
        }

        const builder = new PDFBuilder(fontPath)
        const resultBytes = await builder.rebuild(pdfBytes, classifiedBlocks, parsed.pages)

        const jobId = crypto.randomUUID()
        await storeResult(jobId, resultBytes)

        sendProgress({
          stage: "rebuilding",
          currentPage: parsed.pages.length,
          totalPages: parsed.pages.length,
          percent: 100,
          message: JSON.stringify({
            jobId,
            stats: {
              totalChars: texts.reduce((s, t) => s + t.length, 0),
              codeBlocks: classifiedBlocks.filter((b) => b.category === "code").length,
              totalPages: parsed.pages.length,
            },
          }),
        })

        controller.close()
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`)
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
