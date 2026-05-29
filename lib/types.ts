export interface TextItem {
  str: string
  x: number
  y: number
  width: number
  height: number
  fontName: string
  fontSize: number
  transform: number[]
  hasEOL: boolean
  category: TextCategory
}

export type TextCategory =
  | "body"
  | "title"
  | "toc"
  | "footnote"
  | "caption"
  | "code"
  | "formula"
  | "url"
  | "pageNumber"
  | "header"

export interface PageData {
  pageNum: number
  width: number
  height: number
  textItems: TextItem[]
}

export interface ParsedPDF {
  pages: PageData[]
  metadata: {
    title?: string
    author?: string
    pageCount: number
  }
}

export interface TextBlock {
  items: TextItem[]
  category: TextCategory
  bbox: { x: number; y: number; width: number; height: number }
  text: string
  translatedText?: string
  pageNum: number
}

export interface TranslationRequest {
  text: string
  source: "en"
  target: "zh"
}

export interface TranslationResult {
  original: string
  translated: string
  fromCache: boolean
}

export interface TranslateProgress {
  stage: "parsing" | "detecting" | "translating" | "rebuilding"
  currentPage: number
  totalPages: number
  percent: number
  message: string
}
