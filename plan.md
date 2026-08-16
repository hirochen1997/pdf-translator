# PDF Translator — 项目文档（以代码实现为准）

> 本文档根据 `app/`、`components/`、`lib/`、`backend/` 的实际代码整理，取代早期纯方案设想。
> 最后核对：2026-08-15

## 一、它是什么

把**英文 PDF 翻译成中文 PDF** 的在线工具，核心卖点是翻译后**完整保留原始排版**（公式、图表、代码块、目录、脚注都不乱）。

底层引擎是 **pdf2zh（PDFMathTranslate）** —— 一个 20k+ star 的开源 PDF 翻译引擎（当前锁定 `pdf2zh==1.9.11`）。它用 DocLayout-YOLO 做布局检测、pdfminer 逐字符提取，并**原地修改 PDF 内容流**替换文本，因此排版几乎零丢失。

## 二、生产架构（实际运行形态）

```
用户浏览器 (Next.js 14)
   │  HTTP + Gradio 队列 API（直接跨域，无代理层）
   ▼
HuggingFace Spaces 上的 pdf2zh Gradio 后端
   (hiro1997-pdf-translator-backend.hf.space : 7860)
   └─ 由 backend/Dockerfile 的 `CMD ["pdf2zh","-i"]` 启动
      = pdf2zh 自带的 Gradio 交互界面
```

关键事实：
- **前端直接跨域**调用后端的 Gradio 原生接口，**没有** Next.js API Routes 代理层（`app/` 下无 `api/` 目录）。
- 后端 URL 由 `lib/api.ts` 的 `NEXT_PUBLIC_BACKEND_URL` 决定，默认 `https://hiro1997-pdf-translator-backend.hf.space`。
- 翻译服务由前端提交的参数决定（见下），当前前端传 `"Google"`。
- 输出两种 PDF：`mono`（仅译文）、`dual`（双语对照）。

### 前端 → 后端调用链（Gradio 队列协议）

1. `POST {base}/gradio_api/upload?upload_id=...` —— 上传文件，返回 `filePath`
2. `POST {base}/gradio_api/queue/join` —— 提交任务
   - `fn_index: 5`
   - `data` 数组对应 pdf2zh Gradio 界面参数，顺序为：
     ```
     ["File", <FileData>, "", "Google", "English", "Simplified Chinese", "All", "", "", "4", false, false, "", false, "", null, "", "", "", ""]
     ```
     其中：`"Google"`=翻译服务、`"English"`=源语言、`"Simplified Chinese"`=目标语言、`"All"`=全部页面、`"4"`=线程数
3. `EventSource("{base}/gradio_api/queue/data")` —— 监听 SSE 进度
   - 事件：`estimation` / `process_starts` / `progress` / `process_completed` / `error` / `unexpected_error`
   - 完成后 `output.data[0]`=mono URL，`output.data[2]`=dual URL
4. 前端用 `file=` 或完整 URL 直接下载生成的 PDF（`ResultPanel`）

## 三、backend/ 目录代码现状（三套入口并存）

`backend/` 里实际并存着三套后端入口，**只有第一套在生产使用**：

| 入口 | 技术 | 状态 | 说明 |
|------|------|------|------|
| `Dockerfile` → `pdf2zh -i` | pdf2zh 自带 Gradio | **生产使用** | HF Spaces 实际运行的就是这个，端口 7860 |
| `app.py` | 自写 Gradio（`gr.Blocks`） | 未部署（候选） | 简化版，仅 1 个文件输入，写死 `service="tencent"`，与前端参数不匹配 |
| `main.py` + `api/` + `services/` | FastAPI + 自定义 SSE | 未部署（候选） | 即早期方案设计；写死 `service="tencent"`；**`requirements.txt` 未声明 fastapi/uvicorn，当前依赖下无法直接运行** |

> 注：`main.py` 引用的 `services/translator.py` 用 `translate_stream(..., service=..., thread=4)` 封装 pdf2zh，逻辑本身是完整可用的；但它既未被前端调用，也缺少运行依赖。

`backend/config.py` 读取腾讯云密钥与服务配置（`TENCENTCLOUD_SECRET_ID/KEY`、`HOST`、`PORT`、`MAX_FILE_SIZE` 等），被 `app.py`/`main.py` 共用。

`backend/requirements.txt` 当前仅：
```
pdf2zh==1.9.11
python-dotenv>=1.0.0
```
（pdf2zh 会随包带来 Gradio 等依赖；FastAPI 方案未在 requirements 中显式声明。）

## 四、前端交互流程（实际）

状态机（`app/page.tsx`）：`idle → translating → done / error`，用 Framer Motion `AnimatePresence` 做切换动画。

- **idle（UploadZone）**：拖拽/点击上传；本地校验 `application/pdf` 且 ≤ 20MB。
- **translating（ProgressPanel）**：
  1. 上传文件 → 进度 3%
  2. 提交 Gradio 队列任务 → 进度 8%
  3. `EventSource` 监听进度，后端 `progress` 被映射到 **10%–90%** 区间，<30% 显示「布局检测」，否则「翻译中」；显示当前页/总页
  4. `process_completed` → 取 mono/dual URL 进入 done；`error`/`unexpected_error`/连接中断/超时(600s) → error
- **done（ResultPanel）**：「下载译文 PDF」「下载双语对照 PDF」两个按钮；优先 `showSaveFilePicker` 另存为，回退 `<a download>`；下载带流式进度条；「重新翻译」回到 idle。
- **error（ErrorPanel）**：错误提示 + 「重试」回到 idle。

组件清单：`Header / HeroSection / UploadZone / ProgressPanel / ResultPanel / ErrorPanel / FeatureCard / Footer / Toast`。类型见 `lib/types.ts`（`TranslateStage / TranslateProgress / TranslateResult`）。

## 五、pdf2zh 关键技术原理（依然有效，保留）

### 布局检测（DocLayout-YOLO ONNX）
页面渲染为图片 → ONNX 模型检测，分类为 title/text/figure/table/code/formula/footnote 等区域。纯 CPU 可运行，首次自动下载权重（~50MB）。

### 文本提取（pdfminer render_char）
逐字符提取 font / fontsize / cid / graphicstate / 坐标，比 pdfjs-dist 完整得多，因此可精确重建。

### 公式检测（vflag）
字体名正则 + Unicode 类别（Sm/Lm/Mn…）+ 希腊字母范围，命中则跳过翻译。

### 原地修改 PDF 内容流
直接改原始 PDF 的 Tf/Tm/TJ 操作符替换文本，保留所有非文本元素与排版，不新建 PDF。

## 六、部署

| 部分 | 平台 | 命令 / 入口 |
|------|------|------------|
| 前端 | Cloudflare Pages | `npm run build` → 静态部署；线上 `https://pdf-translator-1fz.pages.dev` |
| 后端 | HuggingFace Spaces（Docker） | `backend/Dockerfile`：`FROM byaidu/pdf2zh:latest` + `CMD ["pdf2zh","-i"]`，端口 7860 |

环境变量：
- 前端：`.env.local` 的 `NEXT_PUBLIC_BACKEND_URL`（指向 HF 后端）
- 后端（HF Secrets / `backend/.env`）：`TENCENTCLOUD_SECRET_ID`、`TENCENTCLOUD_SECRET_KEY`（当翻译服务用腾讯时），或对应的 Google 等凭证；以及 `HOST`/`PORT`/`MAX_FILE_SIZE`

## 七、本地开发

```bash
# 前端
npm install
npm run dev          # http://localhost:3000

# 后端候选（任选其一，均非生产形态）
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py       # 自写 Gradio，http://localhost:7860
# 或 FastAPI 方案（需先补装依赖）：
pip install fastapi uvicorn
python main.py      # FastAPI，http://localhost:8000
```

> 注意：本地前端默认连 HF 上的生产后端。若要连本地后端，需设置 `NEXT_PUBLIC_BACKEND_URL=http://localhost:7860`（对应 app.py）或 `:8000`（对应 main.py）；但这两套本地后端的参数/接口与前端当前的 Gradio 队列协议并不完全一致（app.py 仅 1 个输入、main.py 用自定义 `/api/translate` SSE 而非 Gradio 协议），需要额外适配才能联通。

## 八、与早期方案（plan.md 旧版）的关键差异

| 维度 | 早期方案设想 | 实际代码 |
|------|------------|---------|
| 后端 | FastAPI + 自定义 `/api/translate` SSE | 生产用 **pdf2zh 自带 Gradio**（pdf2zh -i），前端直连 |
| 前端代理 | Next.js API Routes 代理避免跨域 | **无代理层**，前端直接跨域调 Gradio API |
| 翻译服务 | 默认腾讯翻译（免费） | 由前端参数决定，当前传 **Google** |
| 下载 | 后端 `/api/download/{task_id}` | 直接用 Gradio 返回的 `file=` URL |
| 部署 | 本地 FastAPI + 前端 | HF Spaces（后端）+ Cloudflare Pages（前端） |

## 九、常见误区

- ❌ “后端是 FastAPI”：生产后端是 pdf2zh Gradio；FastAPI 版本（`main.py`）只是未部署的候选，且缺依赖。
- ❌ “用腾讯翻译”：生产实际由前端参数决定，当前是 Google（pdf2zh -i 接受前端传入的 service）。
- ❌ “前端有 API 代理”：没有，`app/` 下无 `api/` 目录，直接跨域。
- ❌ “20MB 限制由后端强制”：仅前端 `UploadZone` 校验，后端未强制（pdf2zh 本身无硬性 20MB 限制）。
