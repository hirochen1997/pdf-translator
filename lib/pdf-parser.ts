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

interface Line {
  y: number
  items: TextItem[]
  text: string
  x: number
  width: number
  fontSize: number
  height: number
}

interface Column {
  x: number
  width: number
  lines: Line[]
}

export function aggregateIntoBlocks(items: TextItem[], pageNum: number): import("./types").TextBlock[] {
  if (items.length === 0) return []

  const lines = buildLines(items)
  const columns = detectColumns(lines)
  const sortedLines = sortLinesByReadingOrder(columns)
  const blocks = groupLinesIntoBlocks(sortedLines, pageNum)

  return blocks
}

function buildLines(items: TextItem[]): Line[] {
  const sorted = [...items].sort((a, b) => {
    const yDiff = a.y - b.y
    if (Math.abs(yDiff) > Math.max(a.fontSize, b.fontSize) * 0.3) return yDiff
    return a.x - b.x
  })

  const lines: Line[] = []
  let currentLineItems: TextItem[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i]
    const lastItem = currentLineItems[currentLineItems.length - 1]
    const avgFontSize = currentLineItems.reduce((s, it) => s + it.fontSize, 0) / currentLineItems.length

    if (Math.abs(item.y - lastItem.y) < avgFontSize * 0.35) {
      currentLineItems.push(item)
    } else {
      lines.push(finalizeLine(currentLineItems))
      currentLineItems = [item]
    }
  }
  if (currentLineItems.length > 0) {
    lines.push(finalizeLine(currentLineItems))
  }

  return lines
}

function finalizeLine(items: TextItem[]): Line {
  const sortedItems = [...items].sort((a, b) => a.x - b.x)
  const text = sortedItems.map((i) => i.str).join(" ")
  const x = Math.min(...sortedItems.map((i) => i.x))
  const right = Math.max(...sortedItems.map((i) => i.x + i.width))
  const y = sortedItems[0].y
  const fontSize = sortedItems.reduce((s, i) => s + i.fontSize, 0) / sortedItems.length
  const height = Math.max(...sortedItems.map((i) => i.height))

  return { y, items: sortedItems, text: text.trim(), x, width: right - x, fontSize, height }
}

function detectColumns(lines: Line[]): Column[] {
  if (lines.length === 0) return []

  const pageWidth = Math.max(...lines.map((l) => l.x + l.width))
  const leftMargins = lines.map((l) => l.x).filter((x) => x > 10)

  if (leftMargins.length === 0) {
    return [{ x: 0, width: pageWidth, lines }]
  }

  const clusters = clusterValues(leftMargins, pageWidth * 0.08)
  const isMultiColumn = clusters.length >= 2 &&
    clusters.some((c) => c.center > pageWidth * 0.35)

  if (!isMultiColumn) {
    return [{ x: 0, width: pageWidth, lines }]
  }

  const columns: Column[] = clusters
    .sort((a, b) => a.center - b.center)
    .map((c) => ({
      x: c.center - pageWidth * 0.05,
      width: pageWidth / clusters.length + pageWidth * 0.1,
      lines: [],
    }))

  for (const line of lines) {
    const lineCenter = line.x + line.width / 2
    let bestCol = 0
    let bestDist = Infinity
    for (let i = 0; i < columns.length; i++) {
      const colCenter = columns[i].x + columns[i].width / 2
      const dist = Math.abs(lineCenter - colCenter)
      if (dist < bestDist) {
        bestDist = dist
        bestCol = i
      }
    }
    columns[bestCol].lines.push(line)
  }

  for (const col of columns) {
    col.lines.sort((a, b) => a.y - b.y)
  }

  return columns
}

function clusterValues(values: number[], threshold: number): { center: number; count: number }[] {
  const sorted = [...values].sort((a, b) => a - b)
  const clusters: { center: number; count: number }[] = []
  let clusterStart = sorted[0]
  let clusterSum = sorted[0]
  let clusterCount = 1

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - clusterStart < threshold) {
      clusterSum += sorted[i]
      clusterCount++
    } else {
      clusters.push({ center: clusterSum / clusterCount, count: clusterCount })
      clusterStart = sorted[i]
      clusterSum = sorted[i]
      clusterCount = 1
    }
  }
  clusters.push({ center: clusterSum / clusterCount, count: clusterCount })

  return clusters.filter((c) => c.count >= 2)
}

function sortLinesByReadingOrder(columns: Column[]): Line[] {
  const result: Line[] = []
  for (const col of columns) {
    result.push(...col.lines)
  }
  return result
}

function groupLinesIntoBlocks(lines: Line[], pageNum: number): import("./types").TextBlock[] {
  if (lines.length === 0) return []

  const blocks: import("./types").TextBlock[] = []
  let currentLines: Line[] = [lines[0]]

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const prevLine = currentLines[currentLines.length - 1]

    const sameColumn = Math.abs(line.x - prevLine.x) < prevLine.fontSize * 3
    const lineGap = line.y - (prevLine.y + prevLine.height)
    const expectedLineHeight = Math.max(line.fontSize, prevLine.fontSize) * 1.6
    const isParagraphBreak = lineGap > expectedLineHeight * 1.2

    const indentChanged = Math.abs(line.x - prevLine.x) > prevLine.fontSize * 2
    const fontSizeChanged = Math.abs(line.fontSize - prevLine.fontSize) > 2

    if (sameColumn && !isParagraphBreak && !indentChanged && !fontSizeChanged) {
      currentLines.push(line)
    } else {
      blocks.push(finalizeBlock(currentLines, pageNum))
      currentLines = [line]
    }
  }

  if (currentLines.length > 0) {
    blocks.push(finalizeBlock(currentLines, pageNum))
  }

  return blocks
}

function finalizeBlock(lines: Line[], pageNum: number): import("./types").TextBlock {
  const allItems = lines.flatMap((l) => l.items)
  const minX = Math.min(...lines.map((l) => l.x))
  const minY = Math.min(...lines.map((l) => l.y))
  const maxX = Math.max(...lines.map((l) => l.x + l.width))
  const maxY = Math.max(...lines.map((l) => l.y + l.height))

  const text = lines.map((l) => l.text).join("\n")

  return {
    items: allItems,
    category: allItems[0].category,
    bbox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    text,
    pageNum,
  }
}
