import { NextRequest, NextResponse } from "next/server"
import { retrieveResult } from "@/lib/result-store"

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId")
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 })
  }

  const pdfBytes = await retrieveResult(jobId)
  if (!pdfBytes) {
    return NextResponse.json({ error: "Result not found or expired" }, { status: 404 })
  }

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="translated.pdf"`,
    },
  })
}
