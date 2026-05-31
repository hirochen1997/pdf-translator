const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://hiro1997-pdf-translator-backend.hf.space"

export function getBackendUrl(): string {
  return BACKEND_URL
}
