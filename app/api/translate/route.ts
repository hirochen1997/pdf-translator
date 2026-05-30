import { NextRequest, NextResponse } from "next/server"

const PYTHON_BACKEND = process.env.PYTHON_BACKEND_URL || "http://localhost:8000"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get("file") as File

  if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 })
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 })
  }

  try {
    const backendForm = new FormData()
    backendForm.append("file", file)
    backendForm.append("lang_from", "en")
    backendForm.append("lang_to", "zh")
    backendForm.append("service", "tencent")

    const response = await fetch(`${PYTHON_BACKEND}/api/translate`, {
      method: "POST",
      body: backendForm,
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json(
        { error: `Backend error: ${text}` },
        { status: response.status }
      )
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Cannot connect to Python backend: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    )
  }
}
