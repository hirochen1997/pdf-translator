import gradio as gr
import os
import uuid
import asyncio
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

pdf2zh_config_dir = Path("/app/.tmp/pdf2zh_config") if os.path.exists("/app") else Path(os.path.dirname(os.path.abspath(__file__))) / ".tmp" / "pdf2zh_config"
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

from pdf2zh import translate_stream
from pdf2zh.doclayout import OnnxModel

_model_instance = None


def get_model():
    global _model_instance
    if _model_instance is None:
        logger.info("Loading DocLayout-YOLO ONNX model...")
        _model_instance = OnnxModel.load_available()
        logger.info("Model loaded successfully")
    return _model_instance


RESULTS_DIR = Path(os.path.dirname(os.path.abspath(__file__))) / ".tmp" / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def translate_pdf_file(pdf_file, progress=gr.Progress()):
    if pdf_file is None:
        return None, None

    model = get_model()

    progress(0.05, desc="加载 PDF...")

    with open(pdf_file, "rb") as f:
        pdf_bytes = f.read()

    envs = {
        "TENCENTCLOUD_SECRET_ID": os.environ.get("TENCENTCLOUD_SECRET_ID", ""),
        "TENCENTCLOUD_SECRET_KEY": os.environ.get("TENCENTCLOUD_SECRET_KEY", ""),
    }

    class GradioProgressCallback:
        def __init__(self, progress_obj):
            self.progress_obj = progress_obj
            self.total_pages = 0

        def callback(self, pbar):
            n = pbar.n
            total = pbar.total or self.total_pages
            self.total_pages = total
            if total > 0:
                pct = 0.1 + (n / total) * 0.85
            else:
                pct = 0.1
            if n > 0:
                self.progress_obj(pct, desc=f"翻译第 {n}/{total} 页...")
            else:
                self.progress_obj(pct, desc="布局检测中...")

    tracker = GradioProgressCallback(progress)

    try:
        mono_bytes, dual_bytes = translate_stream(
            stream=pdf_bytes,
            lang_in="en",
            lang_out="zh",
            service="tencent",
            thread=4,
            callback=tracker.callback,
            model=model,
            envs=envs,
        )
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        raise gr.Error(f"翻译失败: {str(e)}")

    progress(0.95, desc="保存结果...")

    task_id = str(uuid.uuid4())
    mono_path = str(RESULTS_DIR / f"{task_id}_mono.pdf")
    dual_path = str(RESULTS_DIR / f"{task_id}_dual.pdf")

    with open(mono_path, "wb") as f:
        f.write(mono_bytes)
    with open(dual_path, "wb") as f:
        f.write(dual_bytes)

    progress(1.0, desc="翻译完成!")

    return mono_path, dual_path


with gr.Blocks(
    title="PDF Translator",
    theme=gr.themes.Soft(primary_hue="indigo"),
) as demo:
    gr.Markdown("# 📄 PDF 智能翻译引擎")
    gr.Markdown("英文 PDF → 中文 PDF | AI 布局检测 | 完美保留排版 | 零成本")

    with gr.Row():
        with gr.Column(scale=1):
            pdf_input = gr.File(label="上传 PDF 文件", file_types=[".pdf"])
            translate_btn = gr.Button("开始翻译", variant="primary", size="lg")

        with gr.Column(scale=1):
            mono_output = gr.File(label="下载译文 PDF (mono)")
            dual_output = gr.File(label="下载双语对照 PDF (dual)")

    gr.Markdown("""
### 特性
- ⬡ **智能识别**: AI 深度学习模型精确识别代码块、公式、图表区域
- ⬡ **格式保留**: 原地修改 PDF 内容流，完美保留原始排版
- ⬡ **零成本**: 基于免费翻译 API，每月 500 万字符免费额度
    """)

    translate_btn.click(
        fn=translate_pdf_file,
        inputs=[pdf_input],
        outputs=[mono_output, dual_output],
    )


if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
