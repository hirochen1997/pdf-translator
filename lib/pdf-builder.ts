import { PDFDocument, rgb, PDFFont, StandardFonts } from "pdf-lib"
import fontkit from "@pdf-lib/fontkit"
import { readFileSync } from "fs"
import type { TextBlock, PageData } from "./types"

export class PDFBuilder {
  private fontBytes: Uint8Array

  constructor(fontPath: string) {
    this.fontBytes = new Uint8Array(readFileSync(fontPath))
  }

  async rebuild(
    _originalPdfBytes: ArrayBuffer,
    blocks: TextBlock[],
    pageData: PageData[]
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    const cnFont = await pdfDoc.embedFont(this.fontBytes)
    const enFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const monoFont = await pdfDoc.embedFont(StandardFonts.Courier)

    for (const page of pageData) {
      const newPage = pdfDoc.addPage([page.width, page.height])
      const { height: pageHeight } = newPage.getSize()
      const pageBlocks = blocks.filter((b) => b.pageNum === page.pageNum)

      for (const block of pageBlocks) {
        const text = block.translatedText || block.text
        if (!text.trim()) continue

        const font = this.getFontForCategory(block.category, cnFont, enFont, monoFont)
        const originalFontSize = block.items[0]?.fontSize || 12
        const fontSize = this.calculateFontSize(text, block.bbox.width, originalFontSize, font)
        const lineHeight = fontSize * 1.5
        const lines = this.wrapText(text, block.bbox.width, fontSize, font)

        const startX = block.bbox.x
        const startY = pageHeight - block.bbox.y - fontSize

        for (let j = 0; j < lines.length; j++) {
          const y = startY - j * lineHeight
          if (y < 0) break

          try {
            newPage.drawText(lines[j], {
              x: startX,
              y,
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
            })
          } catch {
            const safeLine = lines[j].replace(/[^\x20-\x7E\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g, "")
            if (safeLine) {
              try {
                newPage.drawText(safeLine, {
                  x: startX,
                  y,
                  size: fontSize,
                  font: cnFont,
                  color: rgb(0, 0, 0),
                })
              } catch {}
            }
          }
        }
      }
    }

    return pdfDoc.save()
  }

  private getFontForCategory(
    category: string,
    cnFont: PDFFont,
    enFont: PDFFont,
    monoFont: PDFFont
  ): PDFFont {
    switch (category) {
      case "code":
        return monoFont
      case "formula":
      case "url":
        return enFont
      default:
        return cnFont
    }
  }

  private calculateFontSize(
    text: string,
    maxWidth: number,
    originalSize: number,
    font: PDFFont
  ): number {
    try {
      const longestLine = text.split("\n").reduce((a, b) => (a.length > b.length ? a : b), "")
      const textWidth = font.widthOfTextAtSize(longestLine, originalSize)
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
    const inputLines = text.split("\n")
    const result: string[] = []

    for (const line of inputLines) {
      const wrapped = this.wrapSingleLine(line, maxWidth, fontSize, font)
      result.push(...wrapped)
    }

    return result.length > 0 ? result : [text]
  }

  private wrapSingleLine(
    line: string,
    maxWidth: number,
    fontSize: number,
    font: PDFFont
  ): string[] {
    if (!line) return [""]
    const result: string[] = []
    let current = ""

    for (const char of line) {
      const test = current + char
      try {
        const w = font.widthOfTextAtSize(test, fontSize)
        if (w > maxWidth && current.length > 0) {
          result.push(current)
          current = char
        } else {
          current = test
        }
      } catch {
        current = test
      }
    }

    if (current) result.push(current)
    return result
  }
}
