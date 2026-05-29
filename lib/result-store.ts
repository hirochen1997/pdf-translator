import { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync } from "fs"
import path from "path"

const STORE_DIR = path.join(process.cwd(), ".tmp", "results")

function ensureDir() {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true })
  }
}

function getFilePath(jobId: string): string {
  return path.join(STORE_DIR, `${jobId}.pdf`)
}

function getMetaPath(jobId: string): string {
  return path.join(STORE_DIR, `${jobId}.json`)
}

export async function storeResult(jobId: string, data: Uint8Array): Promise<void> {
  ensureDir()
  writeFileSync(getFilePath(jobId), data)
  writeFileSync(getMetaPath(jobId), JSON.stringify({ createdAt: Date.now() }))
}

export async function retrieveResult(jobId: string): Promise<Uint8Array | null> {
  const filePath = getFilePath(jobId)
  const metaPath = getMetaPath(jobId)

  if (!existsSync(filePath) || !existsSync(metaPath)) return null

  try {
    const meta = JSON.parse(readFileSync(metaPath, "utf-8"))
    if (Date.now() - meta.createdAt > 10 * 60 * 1000) {
      cleanup(jobId)
      return null
    }
    return new Uint8Array(readFileSync(filePath))
  } catch {
    return null
  }
}

function cleanup(jobId: string) {
  try { unlinkSync(getFilePath(jobId)) } catch {}
  try { unlinkSync(getMetaPath(jobId)) } catch {}
}
