import type { TextBlock, TextCategory } from "./types"

const MONOSPACE_KEYWORDS = [
  "courier", "consolas", "monaco", "menlo", "monospace",
  "sourcecodepro", "dejavusansmono", "robotomono",
  "fira", "code", "hack", "iosevka",
]

const CODE_KEYWORDS = new Set([
  "function", "class", "import", "export", "return", "if", "else",
  "for", "while", "switch", "case", "break", "continue", "try",
  "catch", "throw", "new", "delete", "typeof", "instanceof",
  "def", "var", "let", "const", "async", "await", "yield",
  "public", "private", "protected", "void", "int", "string",
  "boolean", "float", "double", "null", "undefined", "true", "false",
  "self", "this", "super", "extends", "implements", "interface",
  "package", "namespace", "using", "include", "require",
])

const CODE_SYMBOLS = /[{[\]()=>::;\/\/\*\/#@$~]/g

const URL_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+\.[a-z]{2,}/i
const EMAIL_PATTERN = /[\w.-]+@[\w.-]+\.\w+/
const LATEX_PATTERN = /\$[^$]+\$|\\begin\{[^}]+\}|\\end\{[^}]+\}|\\[a-zA-Z]+\{/
const SCRIPT_TAGS = /<script|<style|<\?php|#include|#define|#pragma/

export function detectCodeBlocks(blocks: TextBlock[]): TextBlock[] {
  return blocks.map((block) => {
    const category = classifyBlock(block)
    return { ...block, category }
  })
}

function classifyBlock(block: TextBlock): TextCategory {
  const text = block.text
  const primaryFont = block.items[0]?.fontName?.toLowerCase() || ""

  if (MONOSPACE_KEYWORDS.some((kw) => primaryFont.includes(kw))) {
    return "code"
  }

  if (URL_PATTERN.test(text) && text.trim().length < 300) {
    return "url"
  }

  if (EMAIL_PATTERN.test(text) && text.trim().length < 100) {
    return "url"
  }

  if (LATEX_PATTERN.test(text)) {
    return "formula"
  }

  const lines = text.split(/\n/)
  const symbolCount = (text.match(CODE_SYMBOLS) || []).length
  const symbolDensity = symbolCount / Math.max(text.length, 1)

  const words = text.split(/\s+/)
  const keywordCount = words.filter((w) => CODE_KEYWORDS.has(w.toLowerCase())).length
  const keywordDensity = keywordCount / Math.max(words.length, 1)

  const semicolonLines = lines.filter((l) => l.trim().endsWith(";")).length
  const semicolonRatio = semicolonLines / Math.max(lines.length, 1)

  if (SCRIPT_TAGS.test(text)) return "code"
  if (keywordDensity > 0.3 && symbolDensity > 0.1) return "code"
  if (semicolonRatio > 0.5 && lines.length >= 3) return "code"
  if (symbolDensity > 0.25 && keywordDensity > 0.15) return "code"

  if (isPageNumber(block)) return "pageNumber"
  if (isHeader(block)) return "header"
  if (isFootnote(block)) return "footnote"
  if (isCaption(block)) return "caption"
  if (isTitle(block)) return "title"

  return "body"
}

function isPageNumber(block: TextBlock): boolean {
  const text = block.text.trim()
  return /^\d{1,4}$/.test(text) && block.bbox.height < 15
}

function isHeader(block: TextBlock): boolean {
  return block.bbox.y < 40 && block.bbox.height < 15
}

function isFootnote(block: TextBlock): boolean {
  const avgFontSize = block.items.reduce((s, i) => s + i.fontSize, 0) / Math.max(block.items.length, 1)
  return avgFontSize < 9
}

function isCaption(block: TextBlock): boolean {
  const text = block.text.trim().toLowerCase()
  return /^(figure|fig\.|table|tab\.|listing|algorithm|example)\s/i.test(text)
}

function isTitle(block: TextBlock): boolean {
  const avgFontSize = block.items.reduce((s, i) => s + i.fontSize, 0) / Math.max(block.items.length, 1)
  return avgFontSize >= 14
}

export function applyContextRules(blocks: TextBlock[]): TextBlock[] {
  const result = [...blocks]

  for (let i = 0; i < result.length; i++) {
    if (result[i].category === "code") {
      if (i > 0 && isLineNumber(result[i - 1])) {
        result[i - 1] = { ...result[i - 1], category: "code" }
      }
      if (i < result.length - 1 && isLineNumber(result[i + 1])) {
        result[i + 1] = { ...result[i + 1], category: "code" }
      }

      if (i > 0 && isCodeTitle(result[i - 1])) {
        result[i - 1] = { ...result[i - 1], category: "code" }
      }
    }
  }

  return result
}

function isLineNumber(block: TextBlock): boolean {
  const text = block.text.trim()
  return /^\d{1,4}$/.test(text) && block.bbox.width < 30
}

function isCodeTitle(block: TextBlock): boolean {
  return /^(listing|code|algorithm|example)\s*\d/i.test(block.text.trim())
}
