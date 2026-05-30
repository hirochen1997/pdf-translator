import { NextRequest, NextResponse } from "next/server"

const PYTHON_BACKEND = process.env.PYTHON_BACKEND_URL || "http://localhost:8000"

export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get("taskId")
  const format = request.nextUrl.searchParams.get("format") || "mono"

  if (!taskId) {
    return NextResponse.json({ error: "Missing taskId" }, { status: 400 })
  }

  try {
    const response = await fetch(`${PYTHON_BACKEND}/api/download/${taskId}/${format}`)

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json(
        { error: `Download failed: ${text}` },
        { status: response.status }
      )
    }

    const pdfBytes = await response.arrayBuffer()
    const filename = format === "mono" ? "translated.pdf" : "translated-dual.pdf"

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Cannot connect to Python backend: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    )
  }
}
