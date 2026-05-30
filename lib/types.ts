export type TranslateStage = "loading" | "detecting" | "translating" | "rebuilding"

export interface TranslateProgress {
  stage: TranslateStage
  percent: number
  message: string
  current_page?: number
  total_pages?: number
}

export interface TranslateComplete {
  task_id: string
  stats: {
    total_chars: number
    pages: number
  }
}

export interface TranslateError {
  message: string
}

export type SSEEvent =
  | { type: "progress"; data: TranslateProgress }
  | { type: "complete"; data: TranslateComplete }
  | { type: "error"; data: TranslateError }

export type DownloadFormat = "mono" | "dual"
