const resultStore = new Map<string, { data: Uint8Array; createdAt: number }>()

export async function storeResult(jobId: string, data: Uint8Array): Promise<void> {
  resultStore.set(jobId, { data, createdAt: Date.now() })
  setTimeout(() => resultStore.delete(jobId), 10 * 60 * 1000)
}

export async function retrieveResult(jobId: string): Promise<Uint8Array | null> {
  const entry = resultStore.get(jobId)
  if (!entry) return null
  if (Date.now() - entry.createdAt > 10 * 60 * 1000) {
    resultStore.delete(jobId)
    return null
  }
  return entry.data
}
