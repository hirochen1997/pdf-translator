import logging
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import config
from api.translate import router as translate_router
from api.download import router as download_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

pdf2zh_config_dir = Path(os.path.dirname(os.path.abspath(__file__))) / ".tmp" / "pdf2zh_config"
pdf2zh_config_dir.mkdir(parents=True, exist_ok=True)
pdf2zh_config_file = pdf2zh_config_dir / "config.json"
if not pdf2zh_config_file.exists():
    pdf2zh_config_file.write_text("{}")

from pdf2zh.config import ConfigManager


def _patched_config_init(self):
    if hasattr(self, "_initialized") and self._initialized:
        return
    self._initialized = True
    self._config_path = pdf2zh_config_file
    self._config_data = {}
    self._ensure_config_exists()


ConfigManager.__init__ = _patched_config_init
ConfigManager._instance = None

from pdf2zh.translator import TencentTranslator, BaseTranslator
_orig_tencent_init = TencentTranslator.__init__


def _patched_tencent_init(self, lang_in, lang_out, model, envs=None, ignore_cache=False, **kwargs):
    self.set_envs(envs)
    BaseTranslator.__init__(self, lang_in, lang_out, model, ignore_cache)
    from tencentcloud.common import credential
    from tencentcloud.tmt.v20180321.tmt_client import TmtClient
    from tencentcloud.tmt.v20180321.models import TextTranslateRequest
    try:
        cred = credential.DefaultCredentialProvider().get_credential()
    except EnvironmentError:
        cred = credential.Credential(
            self.envs["TENCENTCLOUD_SECRET_ID"],
            self.envs["TENCENTCLOUD_SECRET_KEY"],
        )
    self.client = TmtClient(cred, "ap-beijing")
    self.req = TextTranslateRequest()
    self.req.Source = self.lang_in
    self.req.Target = self.lang_out
    self.req.ProjectId = 0


TencentTranslator.__init__ = _patched_tencent_init

os.environ["TENCENTCLOUD_SECRET_ID"] = config.TENCENTCLOUD_SECRET_ID
os.environ["TENCENTCLOUD_SECRET_KEY"] = config.TENCENTCLOUD_SECRET_KEY

app = FastAPI(title="PDF Translator Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(translate_router)
app.include_router(download_router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.on_event("startup")
async def startup():
    logger.info(f"PDF Translator Backend starting on {config.HOST}:{config.PORT}")
    logger.info(f"Results directory: {config.RESULTS_DIR}")
    logger.info(f"pdf2zh config: {pdf2zh_config_file}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=config.HOST,
        port=config.PORT,
        reload=True,
    )
