import crypto from "crypto"
import type { TranslationResult } from "./types"

interface TencentTranslateConfig {
  secretId: string
  secretKey: string
  region?: string
}

const MONTHLY_FREE_QUOTA = 5_000_000

class TranslationCache {
  private cache = new Map<string, string>()

  get(key: string): string | undefined {
    return this.cache.get(key)
  }

  set(key: string, value: string): void {
    this.cache.set(key, value)
  }

  has(key: string): boolean {
    return this.cache.has(key)
  }
}

class QuotaManager {
  private usedChars: number = 0
  private resetDate: string

  constructor() {
    this.resetDate = this.getCurrentMonth()
  }

  private getCurrentMonth(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  }

  checkAndConsume(charCount: number): boolean {
    const currentMonth = this.getCurrentMonth()
    if (currentMonth !== this.resetDate) {
      this.usedChars = 0
      this.resetDate = currentMonth
    }

    if (this.usedChars + charCount > MONTHLY_FREE_QUOTA) {
      return false
    }

    this.usedChars += charCount
    return true
  }

  getUsedChars(): number {
    return this.usedChars
  }

  getRemainingChars(): number {
    const currentMonth = this.getCurrentMonth()
    if (currentMonth !== this.resetDate) {
      return MONTHLY_FREE_QUOTA
    }
    return MONTHLY_FREE_QUOTA - this.usedChars
  }
}

const quotaManager = new QuotaManager()

export class Translator {
  private cache = new TranslationCache()
  private concurrency = 1
  private requestInterval = 210

  constructor(private config: TencentTranslateConfig) {
    if (!config.region) {
      config.region = "ap-beijing"
    }
  }

  static getQuotaInfo() {
    return {
      used: quotaManager.getUsedChars(),
      remaining: quotaManager.getRemainingChars(),
      total: MONTHLY_FREE_QUOTA,
    }
  }

  async translateBatch(texts: string[]): Promise<TranslationResult[]> {
    const batches = this.splitIntoBatches(texts, 1800)
    const results: TranslationResult[] = []

    for (const batch of batches) {
      const batchResults = await this.runWithConcurrency(batch, this.concurrency)
      results.push(...batchResults)
    }

    return results
  }

  private lastRequestTime = 0
  private queue: Promise<void> = Promise.resolve()

  private async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.queue
    let resolve!: () => void
    this.queue = new Promise((r) => { resolve = r })
    await prev
    try {
      return await fn()
    } finally {
      resolve()
    }
  }

  private async throttledCall(text: string): Promise<string> {
    return this.enqueue(async () => {
      const now = Date.now()
      const elapsed = now - this.lastRequestTime
      if (elapsed < this.requestInterval) {
        await new Promise((r) => setTimeout(r, this.requestInterval - elapsed))
      }
      this.lastRequestTime = Date.now()
      return this.callTencentAPI(text)
    })
  }

  private async runWithConcurrency(texts: string[], concurrency: number): Promise<TranslationResult[]> {
    const results: TranslationResult[] = new Array(texts.length)
    let index = 0

    const runNext = async (): Promise<void> => {
      while (index < texts.length) {
        const i = index++
        results[i] = await this.translateWithRetry(texts[i])
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, texts.length) }, () => runNext())
    await Promise.all(workers)
    return results
  }

  private async translateWithRetry(text: string, maxRetries = 3): Promise<TranslationResult> {
    if (this.cache.has(text)) {
      return { original: text, translated: this.cache.get(text)!, fromCache: true }
    }

    if (!quotaManager.checkAndConsume(text.length)) {
      throw new Error(
        `本月免费翻译额度已用尽（${MONTHLY_FREE_QUOTA / 10000}万字），请下月再试或更换翻译服务`
      )
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const translated = await this.throttledCall(text)
        this.cache.set(text, translated)
        return { original: text, translated, fromCache: false }
      } catch (error) {
        if (attempt === maxRetries - 1) {
          quotaManager.checkAndConsume(-text.length)
          throw error
        }
        const delay = Math.pow(2, attempt) * 500
        await new Promise((r) => setTimeout(r, delay))
      }
    }

    throw new Error("Translation failed after retries")
  }

  private async callTencentAPI(text: string): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const date = new Date().toISOString().split("T")[0]
    const service = "tmt"
    const action = "TextTranslate"
    const version = "2018-03-21"

    const payload = JSON.stringify({
      SourceText: text,
      Source: "en",
      Target: "zh",
      ProjectId: 0,
    })

    const signedHeaders = this.signRequest({
      secretId: this.config.secretId,
      secretKey: this.config.secretKey,
      service,
      action,
      version,
      timestamp,
      date,
      payload,
    })

    const response = await fetch("https://tmt.tencentcloudapi.com", {
      method: "POST",
      headers: signedHeaders,
      body: payload,
    })

    const data = await response.json()
    if (data.Response?.Error) {
      const errorCode = data.Response.Error.Code || ""
      if (
        errorCode.includes("LimitExceeded") ||
        errorCode.includes("ResourceInsufficient") ||
        errorCode.includes("FreqLimit")
      ) {
        throw new Error(
          `翻译 API 额度不足或频率超限: ${data.Response.Error.Message}`
        )
      }
      throw new Error(data.Response.Error.Message)
    }
    return data.Response.TargetText
  }

  private signRequest(params: {
    secretId: string
    secretKey: string
    service: string
    action: string
    version: string
    timestamp: string
    date: string
    payload: string
  }): Record<string, string> {
    const { secretId, secretKey, service, action, version, timestamp, date, payload } = params

    const host = "tmt.tencentcloudapi.com"
    const contentType = "application/json"

    const canonicalRequest = [
      "POST",
      "/",
      "",
      `content-type:${contentType}`,
      `host:${host}`,
      `x-tc-action:${action.toLowerCase()}`,
      "",
      "content-type;host;x-tc-action",
      crypto.createHash("sha256").update(payload).digest("hex"),
    ].join("\n")

    const credentialScope = `${date}/${service}/tc3_request`
    const stringToSign = [
      "TC3-HMAC-SHA256",
      timestamp,
      credentialScope,
      crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n")

    const secretDate = crypto
      .createHmac("sha256", `TC3${secretKey}`)
      .update(date)
      .digest()
    const secretService = crypto
      .createHmac("sha256", secretDate)
      .update(service)
      .digest()
    const secretSigning = crypto
      .createHmac("sha256", secretService)
      .update("tc3_request")
      .digest()
    const signature = crypto
      .createHmac("sha256", secretSigning)
      .update(stringToSign)
      .digest("hex")

    const authorization =
      `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, ` +
      `SignedHeaders=content-type;host;x-tc-action, ` +
      `Signature=${signature}`

    return {
      "Content-Type": contentType,
      Host: host,
      "X-TC-Action": action,
      "X-TC-Version": version,
      "X-TC-Timestamp": timestamp,
      "X-TC-Region": this.config.region!,
      Authorization: authorization,
    }
  }

  private splitIntoBatches(texts: string[], maxChars: number): string[][] {
    const batches: string[][] = []
    let currentBatch: string[] = []
    let currentLength = 0

    for (const text of texts) {
      if (currentLength + text.length > maxChars && currentBatch.length > 0) {
        batches.push(currentBatch)
        currentBatch = []
        currentLength = 0
      }
      currentBatch.push(text)
      currentLength += text.length
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch)
    }

    return batches
  }
}
