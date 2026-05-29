import { PDFDocument, rgb, PDFFont } from "pdf-lib"
import { readFileSync } from "fs"
import type { TextBlock, PageData } from "./types"

export class PDFBuilder {
  private fontBytes: Uint8Array

  constructor(fontPath: string) {
    this.fontBytes = new Uint8Array(readFileSync(fontPath))
  }

  async rebuild(
    originalPdfBytes: ArrayBuffer,
    blocks: TextBlock[],
    pageData: PageData[]
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(originalPdfBytes)
    const font = await pdfDoc.embedFont(this.fontBytes)
    const pages = pdfDoc.getPages()

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      const { height: pageHeight } = page.getSize()
      const pageBlocks = blocks.filter((b) => b.pageNum === i + 1)

      for (const block of pageBlocks) {
        if (
          block.category === "code" ||
          block.category === "formula" ||
          block.category === "url" ||
          block.category === "pageNumber"
        ) {
          continue
        }

        if (!block.translatedText) continue

        const { x, y, width: bboxWidth, height: bboxHeight } = block.bbox
        const pdfY = pageHeight - y - bboxHeight

        page.drawRectangle({
          x: x - 1,
          y: pdfY - 1,
          width: bboxWidth + 4,
          height: bboxHeight + 2,
          color: rgb(1, 1, 1),
          borderWidth: 0,
        })

        const originalFontSize = block.items[0]?.fontSize || 12
        const adaptedFontSize = this.calculateFontSize(
          block.translatedText,
          bboxWidth,
          originalFontSize,
          font
        )

        const lines = this.wrapText(
          block.translatedText,
          bboxWidth,
          adaptedFontSize,
          font
        )

        const lineHeight = adaptedFontSize * 1.4
        for (let j = 0; j < lines.length; j++) {
          page.drawText(lines[j], {
            x,
            y: pdfY + bboxHeight - adaptedFontSize - j * lineHeight,
            size: adaptedFontSize,
            font,
            color: rgb(0, 0, 0),
          })
        }
      }
    }

    return pdfDoc.save()
  }

  private calculateFontSize(
    text: string,
    maxWidth: number,
    originalSize: number,
    font: PDFFont
  ): number {
    try {
      const textWidth = font.widthOfTextAtSize(text, originalSize)
      if (textWidth <= maxWidth) return originalSize
      const adapted = originalSize * (maxWidth / textWidth)
      return Math.max(adapted, 6)
    } catch {
      return Math.max(originalSize * 0.8, 6)
    }
  }

  private wrapText(
    text: string,
    maxWidth: number,
    fontSize: number,
    font: PDFFont
  ): string[] {
    const lines: string[] = []
    let currentLine = ""

    for (const char of text) {
      const testLine = currentLine + char
      try {
        const testWidth = font.widthOfTextAtSize(testLine, fontSize)
        if (testWidth > maxWidth && currentLine.length > 0) {
          lines.push(currentLine)
          currentLine = char
        } else {
          currentLine = testLine
        }
      } catch {
        currentLine = testLine
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine)
    }

    return lines.length > 0 ? lines : [text]
  }
}
