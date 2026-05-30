import asyncio
import json
import logging

from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import StreamingResponse

import config
from services.translator import translate_pdf

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/api/translate")
async def translate_endpoint(
    file: UploadFile = File(...),
    lang_from: str = Form("en"),
    lang_to: str = Form("zh"),
    service: str = Form("tencent"),
):
    if not file.filename.lower().endswith(".pdf"):
        return {"error": "Only PDF files are supported"}

    pdf_bytes = await file.read()

    if len(pdf_bytes) > config.MAX_FILE_SIZE:
        return {"error": f"File too large (max {config.MAX_FILE_SIZE // 1024 // 1024}MB)"}

    sse_queue = asyncio.Queue()

    async def event_generator():
        translate_task = asyncio.create_task(
            translate_pdf(
                pdf_bytes=pdf_bytes,
                lang_from=lang_from,
                lang_to=lang_to,
                service=service,
                sse_queue=sse_queue,
            )
        )

        try:
            while True:
                if translate_task.done() and sse_queue.empty():
                    break
                try:
                    event = await asyncio.wait_for(sse_queue.get(), timeout=0.5)
                    yield f"event: {event['type']}\ndata: {json.dumps(event['data'], ensure_ascii=False)}\n\n"

                    if event["type"] == "complete":
                        break
                    if event["type"] == "error":
                        break
                except asyncio.TimeoutError:
                    if translate_task.done():
                        break
                    continue
        except Exception as e:
            logger.error(f"SSE stream error: {e}")
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"
        finally:
            if not translate_task.done():
                translate_task.cancel()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
