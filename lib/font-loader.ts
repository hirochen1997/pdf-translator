import { readFileSync, existsSync } from "fs"
import path from "path"

let cachedFontBytes: Uint8Array | null = null

export function loadChineseFont(): Uint8Array {
  if (cachedFontBytes) return cachedFontBytes

  const fontPaths = [
    path.join(process.cwd(), "public", "fonts", "NotoSansSC-Regular.otf"),
    path.join(process.cwd(), "public", "fonts", "NotoSansSC-Regular.ttf"),
    path.join(process.cwd(), "public", "fonts", "NotoSansSC.otf"),
    path.join(process.cwd(), "public", "fonts", "NotoSansSC.ttf"),
  ]

  for (const fontPath of fontPaths) {
    if (existsSync(fontPath)) {
      cachedFontBytes = new Uint8Array(readFileSync(fontPath))
      return cachedFontBytes
    }
  }

  throw new Error(
    "Chinese font not found. Please download NotoSansSC and place it in public/fonts/"
  )
}

export function getFontPath(): string {
  const fontPaths = [
    path.join(process.cwd(), "public", "fonts", "NotoSansSC-Regular.otf"),
    path.join(process.cwd(), "public", "fonts", "NotoSansSC-Regular.ttf"),
    path.join(process.cwd(), "public", "fonts", "NotoSansSC.otf"),
    path.join(process.cwd(), "public", "fonts", "NotoSansSC.ttf"),
  ]

  for (const fontPath of fontPaths) {
    if (existsSync(fontPath)) return fontPath
  }

  throw new Error(
    "Chinese font not found. Please download NotoSansSC and place it in public/fonts/"
  )
}
