import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs"
import type { TextItem, TextCategory, PageData, ParsedPDF } from "./types"
import path from "path"

function ensureWorkerSrc() {
  if (!GlobalWorkerOptions.workerSrc) {
    GlobalWorkerOptions.workerSrc = path.join(
      process.cwd(),
      "node_modules",
      "pdfjs-dist",
      "legacy",
      "build",
      "pdf.worker.mjs"
    )
  }
}

export async function parsePDF(pdfBytes: ArrayBuffer): Promise<ParsedPDF> {
  ensureWorkerSrc()
  const doc = await getDocument({
    data: new Uint8Array(pdfBytes),
    useSystemFonts: true,
  }).promise
  const pages: PageData[] = []

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: 1.0 })
    const content = await page.getTextContent()

    const textItems: TextItem[] = content.items
      .filter((item: any): item is any => "str" in item)
      .map((item: any) => ({
        str: item.str,
        x: item.transform[4],
        y: viewport.height - item.transform[5],
        width: item.width,
        height: item.height || Math.abs(item.transform[0]) * 0.8,
        fontName: item.fontName || "",
        fontSize: Math.abs(item.transform[0]) || 12,
        transform: item.transform,
        hasEOL: item.hasEOL || false,
        category: "body" as TextCategory,
      }))

    pages.push({
      pageNum: i,
      width: viewport.width,
      height: viewport.height,
      textItems,
    })
  }

  const metadata = await doc.getMetadata()

  return {
    pages,
    metadata: {
      title: (metadata.info as any)?.Title || undefined,
      author: (metadata.info as any)?.Author || undefined,
      pageCount: doc.numPages,
    },
  }
}

export function aggregateIntoBlocks(items: TextItem[], pageNum: number): import("./types").TextBlock[] {
  if (items.length === 0) return []

  const sorted = [...items].sort((a, b) => {
    const yDiff = a.y - b.y
    if (Math.abs(yDiff) > a.fontSize * 0.3) return yDiff
    return a.x - b.x
  })

  const blocks: import("./types").TextBlock[] = []
  let currentBlock: TextItem[] = [sorted[0]]

  const isSameLine = (a: TextItem, b: TextItem) =>
    Math.abs(a.y - b.y) < a.fontSize * 0.4

  const isAdjacent = (a: TextItem, b: TextItem) =>
    b.x - (a.x + a.width) < a.fontSize * 1.0

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i]
    const last = currentBlock[currentBlock.length - 1]

    if (isSameLine(last, item) && isAdjacent(last, item)) {
      currentBlock.push(item)
    } else if (!isSameLine(last, item) && isAdjacentLine(last, item)) {
      currentBlock.push(item)
    } else {
      blocks.push(finalizeBlock(currentBlock, pageNum))
      currentBlock = [item]
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(finalizeBlock(currentBlock, pageNum))
  }

  return blocks
}

function isAdjacentLine(a: TextItem, b: TextItem): boolean {
  const lineGap = Math.abs(b.y - a.y)
  const expectedLineHeight = Math.max(a.fontSize, b.fontSize) * 1.6
  return lineGap < expectedLineHeight && Math.abs(b.x - a.x) < a.fontSize * 2
}

function finalizeBlock(items: TextItem[], pageNum: number): import("./types").TextBlock {
  const minX = Math.min(...items.map((i) => i.x))
  const minY = Math.min(...items.map((i) => i.y))
  const maxX = Math.max(...items.map((i) => i.x + i.width))
  const maxY = Math.max(...items.map((i) => i.y + i.height))

  const lines = new Map<number, TextItem[]>()
  for (const item of items) {
    const lineKey = Math.round(item.y / (item.fontSize * 0.4))
    if (!lines.has(lineKey)) lines.set(lineKey, [])
    lines.get(lineKey)!.push(item)
  }

  const sortedLines = Array.from(lines.entries()).sort((a: [number, TextItem[]], b: [number, TextItem[]]) => a[0] - b[0])
  const text = sortedLines
    .map(([, lineItems]) =>
      lineItems
        .sort((a: TextItem, b: TextItem) => a.x - b.x)
        .map((i: TextItem) => i.str)
        .join(" ")
    )
    .join("\n")

  return {
    items,
    category: items[0].category,
    bbox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    text,
    pageNum,
  }
}
