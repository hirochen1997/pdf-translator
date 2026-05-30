import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

import config

router = APIRouter()


@router.get("/api/download/{task_id}/{format}")
async def download_endpoint(task_id: str, format: str = "mono"):
    if format not in ("mono", "dual"):
        raise HTTPException(status_code=400, detail="Invalid format. Use 'mono' or 'dual'")

    suffix = "mono" if format == "mono" else "dual"
    file_path = os.path.join(config.RESULTS_DIR, f"{task_id}_{suffix}.pdf")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Translation result not found or expired")

    filename = "translated.pdf" if format == "mono" else "translated-dual.pdf"

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=filename,
    )
