export type TranslateStage = "loading" | "detecting" | "translating" | "rebuilding"

export interface TranslateProgress {
  stage: TranslateStage
  percent: number
  message: string
  current_page?: number
  total_pages?: number
}

export interface TranslateResult {
  monoUrl: string
  dualUrl: string
  fileName: string
}

export type DownloadFormat = "mono" | "dual"
