import asyncio
import logging
import os
import uuid
from typing import Optional

from pdf2zh import translate_stream
from pdf2zh.doclayout import OnnxModel

import config

logger = logging.getLogger(__name__)

_model_instance: Optional[OnnxModel] = None
_model_lock = asyncio.Lock()
_main_loop: Optional[asyncio.AbstractEventLoop] = None


async def get_model() -> OnnxModel:
    global _model_instance
    if _model_instance is None:
        async with _model_lock:
            if _model_instance is None:
                logger.info("Loading DocLayout-YOLO ONNX model...")
                _model_instance = OnnxModel.load_available()
                logger.info("Model loaded successfully")
    return _model_instance


class ProgressTracker:
    def __init__(self, sse_queue: asyncio.Queue, loop: asyncio.AbstractEventLoop, total_pages: int = 0):
        self.sse_queue = sse_queue
        self.loop = loop
        self.total_pages = total_pages
        self.current_page = 0

    def callback(self, progress):
        try:
            n = progress.n
            total = progress.total or self.total_pages
            if total > 0:
                percent = int(10 + (n / total) * 85)
            else:
                percent = 10

            stage = "translating"
            if n == 0:
                stage = "detecting"
            elif n >= total:
                stage = "rebuilding"

            self.current_page = n
            self.total_pages = total

            asyncio.run_coroutine_threadsafe(
                self.sse_queue.put({
                    "type": "progress",
                    "data": {
                        "stage": stage,
                        "percent": min(percent, 95),
                        "message": f"翻译第 {n}/{total} 页..." if n > 0 else "布局检测中...",
                        "current_page": n,
                        "total_pages": total,
                    },
                }),
                self.loop,
            )
        except Exception as e:
            logger.warning(f"Progress callback error: {e}")


async def translate_pdf(
    pdf_bytes: bytes,
    lang_from: str = "en",
    lang_to: str = "zh",
    service: str = "tencent",
    sse_queue: asyncio.Queue = None,
) -> dict:
    global _main_loop
    model = await get_model()

    loop = asyncio.get_running_loop()
    _main_loop = loop

    tracker = ProgressTracker(sse_queue=sse_queue, loop=loop)

    await sse_queue.put({
        "type": "progress",
        "data": {
            "stage": "loading",
            "percent": 5,
            "message": "加载 PDF...",
        },
    })

    envs = {
        "TENCENTCLOUD_SECRET_ID": config.TENCENTCLOUD_SECRET_ID,
        "TENCENTCLOUD_SECRET_KEY": config.TENCENTCLOUD_SECRET_KEY,
    }

    def run_translate():
        os.environ["TENCENTCLOUD_SECRET_ID"] = config.TENCENTCLOUD_SECRET_ID
        os.environ["TENCENTCLOUD_SECRET_KEY"] = config.TENCENTCLOUD_SECRET_KEY
        return translate_stream(
            stream=pdf_bytes,
            lang_in=lang_from,
            lang_out=lang_to,
            service=service,
            thread=4,
            callback=tracker.callback,
            model=model,
            envs=envs,
        )

    try:
        mono_bytes, dual_bytes = await loop.run_in_executor(None, run_translate)
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        await sse_queue.put({
            "type": "error",
            "data": {"message": str(e)},
        })
        raise

    task_id = str(uuid.uuid4())

    mono_path = os.path.join(config.RESULTS_DIR, f"{task_id}_mono.pdf")
    dual_path = os.path.join(config.RESULTS_DIR, f"{task_id}_dual.pdf")

    with open(mono_path, "wb") as f:
        f.write(mono_bytes)
    with open(dual_path, "wb") as f:
        f.write(dual_bytes)

    stats = {
        "total_chars": len(pdf_bytes),
        "pages": tracker.total_pages,
    }

    await sse_queue.put({
        "type": "complete",
        "data": {
            "task_id": task_id,
            "stats": stats,
        },
    })

    return {"task_id": task_id, "stats": stats}
