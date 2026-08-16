---
title: PDF Translator
emoji: 📄
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# PDF Translator 后端

本 Space 是 [PDF Translator](https://pdf-translator-1fz.pages.dev) 的翻译后端：接收英文 PDF，输出中文翻译 PDF（保留排版），基于 [pdf2zh / PDFMathTranslate](https://github.com/Byaidu/PDFMathTranslate)。

## 实际运行入口

`Dockerfile` 使用 `FROM byaidu/pdf2zh:latest` 并以 `CMD ["pdf2zh", "-i"]` 启动，即 **pdf2zh 自带的 Gradio 交互界面**（监听 7860）。前端通过 Gradio 的队列 API 直接调用它，不经过任何中间代理。

## 前端如何对接（Gradio 队列协议）

1. `POST /gradio_api/upload?upload_id=...` —— 上传 PDF，返回 `filePath`
2. `POST /gradio_api/queue/join` —— 提交翻译任务
   - `fn_index: 5`
   - `data` 数组顺序：`["File", <FileData>, "", <service>, <lang_in>, <lang_out>, <pages>, "", "", <threads>, false, false, "", false, "", null, "", "", "", ""]`
   - 当前前端传 `service="Google"`、`lang_in="English"`、`lang_out="Simplified Chinese"`、`pages="All"`、`threads="4"`
3. `EventSource("/gradio_api/queue/data")` —— 监听 SSE 进度（`progress` / `process_completed` / `error` 等）
4. 完成后从 `output.data[0]`（mono 译文）与 `output.data[2]`（dual 双语对照）取下载 URL

## 本仓库中的其他后端代码（未部署，仅供参考）

- `app.py`：自写的 Gradio 简化版，仅 1 个文件输入，写死 `service="tencent"`，参数结构与前端当前的 Gradio 协议不匹配。
- `main.py` + `api/` + `services/`：FastAPI + 自定义 SSE 方案（早期设计），写死 `service="tencent"`，未被前端使用；且 `requirements.txt` 未声明 `fastapi`/`uvicorn`，当前依赖下无法直接运行。
- `config.py`：读取腾讯云密钥与服务配置，被 `app.py`/`main.py` 共用。

> 生产环境实际跑的是 `pdf2zh -i`（见 Dockerfile），上述 `app.py` / `main.py` 均不参与线上服务。

## 配置（Space Secrets / `backend/.env`）

- 翻译服务用**腾讯**时：`TENCENTCLOUD_SECRET_ID`、`TENCENTCLOUD_SECRET_KEY`
- 翻译服务用 **Google** 等其它服务时：填对应的凭证（由前端所选 service 决定）
- 可选：`HOST`（默认 `0.0.0.0`）、`PORT`（默认 `8000`）、`MAX_FILE_SIZE`（默认 `20971520`）

## 依赖

```
pdf2zh==1.9.11
python-dotenv>=1.0.0
```

（pdf2zh 自带 Gradio 等运行依赖；FastAPI 方案所需的 `fastapi`/`uvicorn` 未在此声明。）

## 本地运行

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 与生产一致的入口：
pdf2zh -i                 # 启动 pdf2zh 自带 Gradio，端口 7860

# 或自写简化版（非生产）：
python app.py             # http://localhost:7860
```
