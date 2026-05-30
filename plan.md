# 英文 PDF 转中文 PDF 在线翻译工具 — 实现方案

> **架构**: Python 后端 (pdf2zh) + Next.js 自定义前端
> **核心优势**: 利用 PDFMathTranslate 20k+ star 的成熟翻译引擎，实现专业级 PDF 排版保留

---

## 一、架构总览

### 1.1 为什么选择 Python 后端 + Next.js 前端

**旧方案问题**: 纯 Next.js 全栈方案（pdfjs-dist + pdf-lib）无法精确提取 PDF 格式信息，翻译后排版严重混乱：
- pdfjs-dist 只能提取文本和粗略位置，无法获取完整格式（字体对象、CID 编码、图形状态）
- pdf-lib 创建全新 PDF，无法保留原始排版
- 启发式规则无法精确识别内容类型（正文/代码/公式/图表）

**新方案优势**: 使用 pdf2zh（PDFMathTranslate）作为翻译引擎：
- **DocLayout-YOLO ONNX**: 深度学习布局检测模型，精确识别标题/段落/公式/图表/代码/脚注等区域（纯 CPU 可运行）
- **pdfminer render_char**: 逐字符提取完整格式信息（字体对象、字号、颜色、图形状态、CID 编码）
- **原地修改 PDF 内容流**: 不创建新 PDF，直接修改原始 PDF 的内容流指令（Tf/Tm/TJ 操作符），完美保留排版
- **内置 TencentTranslator**: pdf2zh 内置腾讯翻译，零额外开发
- **SQLite 翻译缓存**: 相同文本不重复翻译，节省 API 额度

### 1.2 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户浏览器                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              前端 (Next.js 14 + React 18)                  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐ │  │
│  │  │ 上传区域  │ │ 进度展示  │ │ 下载翻译结果             │ │  │
│  │  └──────────┘ └──────────┘ └──────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                         │ HTTP / SSE                            │
│                         ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         Next.js API Routes (代理层)                        │  │
│  │  /api/translate → 转发到 Python 后端                       │  │
│  │  /api/download → 转发到 Python 后端                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                         │ HTTP                                  │
│                         ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           Python 后端 (FastAPI + pdf2zh)                   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │  │
│  │  │ 布局检测  │ │ 文本提取  │ │ 翻译服务  │ │ PDF 重建   │ │  │
│  │  │ YOLO ONNX│ │ pdfminer │ │ 腾讯翻译  │ │ 原地修改   │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 技术栈选型

| 层级 | 技术 | 选型理由 |
|------|------|----------|
| **前端框架** | Next.js 14+ (App Router) | 保留现有前端代码，API Routes 做代理 |
| **前端样式** | React 18 + TypeScript + Tailwind CSS + Framer Motion | 保留现有暗色科技风 UI |
| **Python 后端** | FastAPI | 异步支持好，自动 OpenAPI 文档，SSE 原生支持 |
| **PDF 翻译引擎** | pdf2zh (PDFMathTranslate) | 20k+ star，专业 PDF 翻译，排版保留最好 |
| **布局检测** | DocLayout-YOLO ONNX (pdf2zh 内置) | 深度学习模型，纯 CPU 运行，精确识别内容区域 |
| **PDF 解析** | pdfminer.six (pdf2zh 内置) | 逐字符提取完整格式信息 |
| **PDF 重建** | 原地修改内容流 (pdf2zh 内置) | 直接修改 PDF 操作符，完美保留排版 |
| **翻译服务** | 腾讯翻译 (pdf2zh 内置 TencentTranslator) | 每月 500 万字符免费，国内可用 |
| **翻译缓存** | SQLite (pdf2zh 内置) | 相同文本不重复翻译 |
| **中文字体** | Source Han Serif CN (pdf2zh 内置) | pdf2zh 自动下载对应语言字体 |
| **进度通信** | Server-Sent Events (SSE) | 实时推送翻译进度 |

---

## 二、Python 后端设计

### 2.1 后端项目结构

```
backend/
├── main.py                    # FastAPI 应用入口
├── api/
│   ├── __init__.py
│   ├── translate.py           # 翻译 API 端点
│   └── download.py            # 下载 API 端点
├── services/
│   ├── __init__.py
│   └── translator.py          # pdf2zh 翻译服务封装
├── config.py                  # 配置管理
├── requirements.txt           # Python 依赖
└── .env                       # 环境变量
```

### 2.2 API 端点设计

#### POST /api/translate

上传 PDF 并启动翻译，返回 SSE 流式进度。

```
请求:
POST /api/translate
Content-Type: multipart/form-data

参数:
- file: PDF 文件 (必填, 最大 20MB)
- lang_from: 源语言 (默认 "en")
- lang_to: 目标语言 (默认 "zh")
- service: 翻译服务 (默认 "tencent")

响应:
Content-Type: text/event-stream

SSE 事件格式:
event: progress
data: {"stage": "loading", "percent": 5, "message": "加载 PDF..."}

event: progress
data: {"stage": "detecting", "percent": 15, "message": "布局检测...", "current_page": 1, "total_pages": 10}

event: progress
data: {"stage": "translating", "percent": 50, "message": "翻译中...", "current_page": 5, "total_pages": 10}

event: progress
data: {"stage": "rebuilding", "percent": 90, "message": "重建 PDF..."}

event: complete
data: {"task_id": "uuid-xxx", "stats": {"total_chars": 15234, "pages": 10}}

event: error
data: {"message": "翻译失败: xxx"}
```

#### GET /api/download/{task_id}/{format}

下载翻译后的 PDF。

```
请求:
GET /api/download/{task_id}/mono    # 仅译文
GET /api/download/{task_id}/dual    # 双语对照

响应:
Content-Type: application/pdf
Content-Disposition: attachment; filename="translated.pdf"

Body: PDF 二进制内容
```

#### GET /api/health

健康检查。

```
响应:
{"status": "ok", "version": "1.0.0"}
```

### 2.3 核心翻译服务封装

基于 pdf2zh 的 `translate_stream()` 函数封装，关键流程：

```python
# pdf2zh 核心翻译流程 (参考 pdf2zh.py 和 high_level.py)
from pdf2zh import translate_stream
from pdf2zh.converter import TranslateConverter
from pdf2zh.doclayout import DocLayoutModel

async def translate_pdf(input_stream, lang_from, lang_to, service, progress_callback):
    # 1. 加载 DocLayout-YOLO ONNX 模型 (首次运行自动下载)
    model = DocLayoutModel()

    # 2. 调用 translate_stream 执行完整翻译
    #    内部流程:
    #    a. 加载 PDF (PyMuPDF)
    #    b. 插入目标语言字体 (SourceHanSerifCN-Regular.ttf)
    #    c. 逐页处理:
    #       - 渲染页面为图片 → YOLO 检测布局区域
    #       - pdfminer render_char 逐字符提取
    #       - 段落构建 + 公式检测 (vflag)
    #       - 调用翻译 API
    #       - 原地修改 PDF 内容流 (Tf/Tm/TJ 操作符)
    #    d. 输出 mono (仅译文) 和 dual (双语对照) 两种 PDF

    result = translate_stream(
        input_stream=input_stream,
        lang_from=lang_from,
        lang_to=lang_to,
        service=service,          # "tencent"
        noto="SourceHanSerifCN-Regular.ttf",
        callback=progress_callback,
    )

    return result  # {"mono": bytes, "dual": bytes}
```

### 2.4 进度回调设计

pdf2zh 的 `translate_patch()` 逐页处理，我们通过回调函数将进度推送到 SSE：

```python
class ProgressTracker:
    def __init__(self, total_pages, sse_queue):
        self.total_pages = total_pages
        self.current_page = 0
        self.sse_queue = sse_queue  # asyncio.Queue

    async def on_page_start(self, page_num):
        self.current_page = page_num
        percent = int(10 + (page_num / self.total_pages) * 85)
        await self.sse_queue.put({
            "stage": "translating",
            "percent": percent,
            "message": f"翻译第 {page_num}/{self.total_pages} 页...",
            "current_page": page_num,
            "total_pages": self.total_pages,
        })

    async def on_layout_detected(self, page_num, regions):
        await self.sse_queue.put({
            "stage": "detecting",
            "percent": 10,
            "message": f"第 {page_num} 页布局检测完成，发现 {len(regions)} 个区域",
        })

    async def on_complete(self, task_id, stats):
        await self.sse_queue.put({
            "stage": "complete",
            "percent": 100,
            "task_id": task_id,
            "stats": stats,
        })
```

### 2.5 pdf2zh 关键技术原理

#### 布局检测 (DocLayout-YOLO ONNX)

```
1. 将 PDF 页面渲染为图片 (PyMuPDF pixmap)
2. 输入 DocLayout-YOLO ONNX 模型
3. 模型输出检测框，分类为:
   - title (标题)
   - text (正文)
   - abandon (页眉页脚)
   - figure (图片)
   - figure_caption (图注)
   - table (表格)
   - table_caption (表注)
   - table_footnote (表脚注)
   - isolate_formula (独立公式)
   - formula_caption (公式编号)
   - code (代码块)
   - footnote (脚注)
   - list (列表)
4. ONNX 模型纯 CPU 可运行，首次运行自动下载权重 (~50MB)
```

#### 文本提取 (pdfminer render_char)

```
pdf2zh 的 PDFConverterEx.render_char() 逐字符提取:
- font: 字体对象 (包含字体名、CID 编码)
- fontsize: 字号
- cid: 字符 ID
- graphicstate: 图形状态 (颜色、线宽等)
- 位置信息: (x, y) 坐标

与 pdfjs-dist 的区别:
- pdfjs-dist: 只能提取 str + transform，丢失字体对象和 CID
- pdfminer: 完整提取 font/fontsize/cid/graphicstate，可精确重建
```

#### 公式检测 (vflag)

```
pdf2zh 的公式检测规则 (converter.py):
1. 字体名正则匹配:
   (CM[^R]|MS.M|XY|MT|BL|RM|EU|LA|RS|LINE|LCIRCLE|TeX-|rsfs|txsy|wasy|stmary|.*Mono|.*Code|.*Ital|.*Sym|.*Math)
2. Unicode 类别检测:
   Lm (字母修饰符), Mn (非间距标记), Sk (修饰符号)
   Sm (数学符号), Zl (行分隔符), Zp (段落分隔符), Zs (空格分隔符)
3. 希腊字母范围检测
4. 检测结果标记为 vflag=True，翻译时跳过
```

#### 原地修改 PDF 内容流

```
pdf2zh 不创建新 PDF，而是直接修改原始 PDF 的内容流指令:

1. 修改字体指令 (Tf):
   原: /F1 12 Tf → 新: /F2 10 Tf (切换为目标语言字体)

2. 修改文本矩阵 (Tm):
   原: 1 0 0 1 100 700 Tm → 新: 1 0 0 1 100 700 Tm (调整位置)

3. 修改文本内容 (TJ):
   原: [(Hello) 5 (World)] TJ → 新: [(你好) 5 (世界)] TJ (替换文本)

4. 关键优势:
   - 保留原始 PDF 的所有非文本元素 (图片、矢量图、注释等)
   - 保留原始排版 (页边距、行间距、段落结构)
   - 不需要重新计算布局
```

### 2.6 Python 依赖

```
# requirements.txt
fastapi>=0.104.0
uvicorn>=0.24.0
python-multipart>=0.0.6
pdf2zh>=1.8.0
aiofiles>=23.2.0
```

### 2.7 环境变量配置

```bash
# backend/.env

# 腾讯翻译 API (pdf2zh 内置 TencentTranslator 使用)
TENCENT_SECRET_ID=your_secret_id_here
TENCENT_SECRET_KEY=your_secret_key_here

# 服务配置
HOST=0.0.0.0
PORT=8000
MAX_FILE_SIZE=20971520  # 20MB

# 翻译配置
DEFAULT_SERVICE=tencent
DEFAULT_LANG_FROM=en
DEFAULT_LANG_TO=zh
```

---

## 三、Next.js 前端设计

### 3.1 前端改造策略

**保留**: 所有现有 UI 组件（Header, HeroSection, UploadZone, ProgressPanel, ResultPanel, ErrorPanel, FeatureCard, Footer, Toast）

**删除**: 旧的后端逻辑模块
- `lib/pdf-parser.ts` — PDF 解析（改由 Python 后端处理）
- `lib/pdf-builder.ts` — PDF 生成（改由 Python 后端处理）
- `lib/code-detector.ts` — 代码检测（改由 YOLO 模型处理）
- `lib/translator.ts` — 翻译服务（改由 pdf2zh 内置处理）
- `lib/font-loader.ts` — 字体加载（改由 pdf2zh 内置处理）
- `lib/result-store.ts` — 结果存储（改由 Python 后端处理）

**修改**:
- `lib/types.ts` — 更新类型定义，适配新的 API 响应
- `app/api/translate/route.ts` — 改为代理到 Python 后端
- `app/api/download/route.ts` — 改为代理到 Python 后端
- `app/page.tsx` — 更新状态管理逻辑
- `components/ResultPanel.tsx` — 增加双语对照下载选项

### 3.2 前端项目结构（改造后）

```
pdf-translator/
├── app/
│   ├── layout.tsx              # 根布局 (保留)
│   ├── page.tsx                # 首页 (修改: 适配新 API)
│   ├── globals.css             # 全局 CSS (保留)
│   └── api/
│       ├── translate/
│       │   └── route.ts        # 翻译 API (修改: 代理到 Python 后端)
│       └── download/
│           └── route.ts        # 下载 API (修改: 代理到 Python 后端)
├── components/
│   ├── Header.tsx              # 导航栏 (保留)
│   ├── HeroSection.tsx         # Hero 区域 (保留)
│   ├── UploadZone.tsx          # 文件上传 (保留)
│   ├── ProgressPanel.tsx       # 翻译进度 (保留)
│   ├── ResultPanel.tsx         # 翻译结果 (修改: 增加双语下载)
│   ├── ErrorPanel.tsx          # 错误提示 (保留)
│   ├── FeatureCard.tsx         # 特性卡片 (保留)
│   ├── Footer.tsx              # 页脚 (保留)
│   └── Toast.tsx               # Toast 提示 (保留)
├── lib/
│   └── types.ts                # TypeScript 类型定义 (修改)
├── next.config.js              # Next.js 配置 (修改: 添加 proxy)
├── tailwind.config.ts          # Tailwind 配置 (保留)
├── package.json                # 依赖 (精简: 移除 pdfjs-dist, pdf-lib 等)
└── tsconfig.json               # TypeScript 配置 (保留)
```

### 3.3 类型定义更新 (`lib/types.ts`)

```typescript
export type TranslateStage = "loading" | "detecting" | "translating" | "rebuilding"

export interface TranslateProgress {
  stage: TranslateStage
  percent: number
  message: string
  current_page?: number
  total_pages?: number
}

export interface TranslateComplete {
  task_id: string
  stats: {
    total_chars: number
    pages: number
  }
}

export interface TranslateError {
  message: string
}

export type SSEEvent = 
  | { type: "progress"; data: TranslateProgress }
  | { type: "complete"; data: TranslateComplete }
  | { type: "error"; data: TranslateError }

export type DownloadFormat = "mono" | "dual"
```

### 3.4 API 代理层设计

#### 翻译 API 代理 (`app/api/translate/route.ts`)

```typescript
// 将前端请求代理到 Python 后端，同时转发 SSE 流
const PYTHON_BACKEND = process.env.PYTHON_BACKEND_URL || "http://localhost:8000"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get("file") as File

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Invalid PDF file" }, { status: 400 })
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 })
  }

  // 转发到 Python 后端
  const backendForm = new FormData()
  backendForm.append("file", file)

  const response = await fetch(`${PYTHON_BACKEND}/api/translate`, {
    method: "POST",
    body: backendForm,
  })

  // 透传 SSE 流
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
```

#### 下载 API 代理 (`app/api/download/route.ts`)

```typescript
const PYTHON_BACKEND = process.env.PYTHON_BACKEND_URL || "http://localhost:8000"

export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get("taskId")
  const format = request.nextUrl.searchParams.get("format") || "mono"

  if (!taskId) {
    return NextResponse.json({ error: "Missing taskId" }, { status: 400 })
  }

  const response = await fetch(`${PYTHON_BACKEND}/api/download/${taskId}/${format}`)

  if (!response.ok) {
    return NextResponse.json({ error: "Download failed" }, { status: response.status })
  }

  const pdfBytes = await response.arrayBuffer()
  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="translated.pdf"`,
    },
  })
}
```

### 3.5 前端页面交互流程（保留现有设计）

```
1. 上传交互 (保留):
   - 拖拽上传 + 点击上传
   - 上传时显示文件名和大小
   - 支持 .pdf 格式校验
   - 文件大小限制 20MB
   - 拖拽进入时: 边框变为靛蓝渐变 + 背景微光脉冲

2. 翻译进度 (保留 + 优化):
   - SSE 实时推送进度
   - 四阶段进度指示: 加载 → 检测 → 翻译 → 重建
   - 当前页码/总页码
   - 渐变进度条 (indigo → cyan 流动)

3. 结果展示 (修改: 增加双语下载):
   - 翻译统计信息
   - 两个下载按钮:
     * 下载译文 PDF (mono 模式)
     * 下载双语对照 PDF (dual 模式)
   - 重新翻译按钮

4. 错误处理 (保留):
   - 文件格式错误
   - 翻译 API 失败
   - 后端服务不可用
```

### 3.6 前端依赖精简

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "framer-motion": "^11.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "@types/react": "^18.3.0",
    "@types/node": "^20.14.0"
  }
}
```

移除的依赖:
- `pdfjs-dist` — PDF 解析改由 Python 后端
- `pdf-lib` — PDF 生成改由 Python 后端
- `@pdf-lib/fontkit` — 字体处理改由 Python 后端

### 3.7 Next.js 配置更新

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/py/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ]
  },
}

module.exports = nextConfig
```

---

## 四、核心流程设计

### 4.1 端到端翻译流程

```
用户上传 PDF
    │
    ▼
[1] 前端上传 ─── Next.js 接收文件，代理到 Python 后端
    │
    ▼
[2] 加载 PDF ─── PyMuPDF 加载 PDF，获取页数和元数据
    │               SSE: {"stage": "loading", "percent": 5}
    │
    ▼
[3] 布局检测 ─── 逐页处理:
    │               a. 渲染页面为图片 (PyMuPDF pixmap)
    │               b. DocLayout-YOLO ONNX 检测布局区域
    │               c. 分类: title/text/code/formula/figure/table/footnote...
    │               SSE: {"stage": "detecting", "percent": 10-15}
    │
    ▼
[4] 文本提取 ─── pdfminer render_char 逐字符提取
    │               获取: font, fontsize, cid, graphicstate, 位置
    │               段落构建 + 公式检测 (vflag)
    │
    ▼
[5] 文本翻译 ─── 调用 TencentTranslator 翻译
    │               - 跳过公式 (vflag=True)
    │               - 跳过代码块 (YOLO 标记)
    │               - 跳过图片/表格区域
    │               - SQLite 缓存，相同文本不重复翻译
    │               SSE: {"stage": "translating", "percent": 15-90}
    │
    ▼
[6] PDF 重建 ─── 原地修改 PDF 内容流
    │               - 修改 Tf 操作符 (切换字体)
    │               - 修改 Tm 操作符 (调整位置)
    │               - 修改 TJ 操作符 (替换文本)
    │               - 插入目标语言字体 (SourceHanSerifCN)
    │               SSE: {"stage": "rebuilding", "percent": 90-95}
    │
    ▼
[7] 输出结果 ─── 生成两种 PDF:
    │               - mono: 仅译文 (替换原文)
    │               - dual: 双语对照 (原文+译文)
    │               SSE: {"stage": "complete", "percent": 100}
    │
    ▼
[8] 前端下载 ─── 用户选择 mono 或 dual 模式下载
```

### 4.2 与旧方案的关键区别

| 维度 | 旧方案 (Next.js 全栈) | 新方案 (Python 后端 + Next.js 前端) |
|------|----------------------|--------------------------------------|
| PDF 解析 | pdfjs-dist (粗略提取) | pdfminer (逐字符精确提取) |
| 布局检测 | 启发式规则 (误判多) | DocLayout-YOLO ONNX (深度学习，精确) |
| 公式检测 | LaTeX 正则匹配 | 字体名正则 + Unicode 类别 (精确) |
| PDF 重建 | pdf-lib 创建新 PDF (丢排版) | 原地修改内容流 (完美保留排版) |
| 翻译服务 | Node.js 手动签名调用 | pdf2zh 内置 TencentTranslator |
| 翻译缓存 | 内存 Map (重启丢失) | SQLite (持久化) |
| 中文字体 | NotoSansSC (手动下载) | SourceHanSerifCN (pdf2zh 自动下载) |
| 代码检测 | 等宽字体+启发式规则 | YOLO 模型精确识别 code 区域 |

---

## 五、前端设计（保留现有）

### 5.1 高科技风格设计语言

**保留现有设计**: 暗色科技风 + 赛博朋克微光元素

**色彩体系**:
```
主色调 (深色主题):
- 背景: #0A0A0F
- 表面: #12121A
- 前景: #E4E4E7
- 强调: #6366F1 (靛蓝紫)
- 辅助强调: #8B5CF6
- 成功: #10B981
- 警告: #F59E0B
- 错误: #EF4444
- 边框: rgba(99, 102, 241, 0.15)
```

**字体方案**:
```
标题字体: Space Grotesk
正文字体: Inter
等宽字体: JetBrains Mono
```

### 5.2 页面结构（保留现有）

```
┌──────────────────────────────────────────────────┐
│  ◆ PDF Translator                               │  ← 导航栏
├──────────────────────────────────────────────────┤
│  ⟁ PDF 智能翻译引擎                              │  ← Hero 区域
│  英文文献 → 中文智慧                              │
├──────────────────────────────────────────────────┤
│  ⬡ 拖拽或点击上传 PDF 文件                        │  ← 上传区域
│    支持 .pdf · 最大 20MB                          │
├──────────────────────────────────────────────────┤
│  ⟳ 正在翻译第 3/10 页...                         │  ← 进度面板
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░  35%         │
├──────────────────────────────────────────────────┤
│  ✓ 翻译完成!                                     │  ← 结果面板
│  [下载译文 PDF]  [下载双语对照 PDF]  [重新翻译]    │
├──────────────────────────────────────────────────┤
│  ⬡ 智能识别  ⬡ 格式保留  ⬡ 零成本               │  ← 特性卡片
├──────────────────────────────────────────────────┤
│  Made by hirochen                                │  ← 页脚
└──────────────────────────────────────────────────┘
```

### 5.3 ResultPanel 修改（增加双语下载）

```typescript
interface ResultPanelProps {
  taskId: string
  stats: { total_chars: number; pages: number }
  onReset: () => void
}

export function ResultPanel({ taskId, stats, onReset }: ResultPanelProps) {
  const handleDownload = async (format: "mono" | "dual") => {
    const response = await fetch(`/api/download?taskId=${taskId}&format=${format}`)
    const blob = await response.blob()

    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: format === "mono" ? "translated.pdf" : "translated-dual.pdf",
        types: [{ accept: { "application/pdf": [".pdf"] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
    } else {
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = format === "mono" ? "translated.pdf" : "translated-dual.pdf"
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    // ... 保留现有样式
    <div className="flex gap-3">
      <button onClick={() => handleDownload("mono")}>
        下载译文 PDF
      </button>
      <button onClick={() => handleDownload("dual")}>
        下载双语对照 PDF
      </button>
      <button onClick={onReset}>
        重新翻译
      </button>
    </div>
  )
}
```

---

## 六、部署方案

### 6.1 本地开发

```bash
# 1. 启动 Python 后端
cd backend
python -m venv venv
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
cp .env.example .env      # 填入腾讯 API 密钥
uvicorn main:app --reload --port 8000

# 2. 启动 Next.js 前端
cd ..
npm install               # 无需 pdfjs-dist, pdf-lib 等
npm run dev               # http://localhost:3000

# 3. 访问 http://localhost:3000
```

### 6.2 首次运行注意事项

```
1. DocLayout-YOLO ONNX 模型:
   - 首次运行时 pdf2zh 会自动下载模型权重 (~50MB)
   - 下载后缓存到 ~/.cache/huggingface/ 或本地目录
   - 后续运行无需重复下载

2. SourceHanSerifCN 字体:
   - pdf2zh 首次运行时自动下载目标语言字体
   - 缓存到 ~/.cache/pdf2zh/ 目录

3. Python 版本:
   - 要求 Python 3.10+
   - 推荐 Python 3.12

4. 系统依赖:
   - 纯 CPU 运行，无需 GPU
   - ONNX Runtime 默认使用 CPU Provider
```

### 6.3 生产部署选项

| 方式 | 说明 | 成本 |
|------|------|------|
| 本地运行 | Python 后端 + Next.js 前端 | 免费 |
| Docker Compose | 一键部署前后端 | 免费 |
| Vercel + 云服务器 | 前端 Vercel + 后端云服务器 | 前端免费 |

---

## 七、与主流开源方案的对比

| 维度 | 本方案 | BabelDOC | DocuTranslate | 旧方案 (Next.js 全栈) |
|------|--------|----------|---------------|----------------------|
| 技术栈 | Python + Next.js | Python (IL 引擎) | Python + Web UI | JavaScript 全栈 |
| PDF 引擎 | pdf2zh (20k+ star) | 自研 IL 解析器 | MinerU (需 GPU) | pdfjs-dist + pdf-lib |
| 布局检测 | DocLayout-YOLO ONNX | IL 级别 | MinerU AI | 启发式规则 |
| PDF 重建 | 原地修改内容流 | IL 渲染回 PDF | PDF→MD (丢排版) | 创建新 PDF (丢排版) |
| 排版保真度 | **最高** (原地修改) | 最高 (IL 精确重建) | 低 | 中等 |
| 翻译服务 | 腾讯翻译 (免费) | LLM (付费) | LLM (付费) | 腾讯翻译 (免费) |
| 零成本 | ✅ | ❌ | ❌ | ✅ |
| 前端风格 | 高科技暗色主题 | 无独立前端 | 简洁 Web UI | 高科技暗色主题 |
| 纯 CPU | ✅ | ✅ | ❌ (需 GPU) | ✅ |

---

## 八、开发里程碑

### Phase 1: Python 后端搭建
- 创建 backend/ 目录结构
- 安装 pdf2zh 及依赖
- 实现 FastAPI 应用入口
- 实现 /api/translate 端点 (SSE 进度推送)
- 实现 /api/download 端点
- 实现 /api/health 端点
- 配置环境变量和腾讯翻译 API

### Phase 2: 翻译服务集成
- 封装 pdf2zh translate_stream 调用
- 实现进度回调 (ProgressTracker)
- 实现翻译结果临时存储 (文件系统)
- 测试完整翻译流程 (curl 上传 → SSE 进度 → 下载结果)

### Phase 3: Next.js 前端改造
- 移除旧的后端逻辑模块 (pdf-parser, pdf-builder, code-detector, translator, font-loader, result-store)
- 更新 lib/types.ts
- 改造 API 路由为代理模式
- 更新 page.tsx 适配新 API
- 修改 ResultPanel 增加双语下载
- 精简 package.json 依赖

### Phase 4: 端到端联调
- 前后端联调: 上传 → 进度 → 下载
- SSE 流式进度推送验证
- mono/dual 两种 PDF 下载验证
- 错误处理和边界情况

### Phase 5: 优化与打磨
- 大文件处理优化
- 翻译缓存验证
- 前端动效和交互优化
- Docker 部署配置

---

## 九、关键技术难点及解决方案

| 难点 | 问题 | 解决方案 |
|------|------|----------|
| pdf2zh 进度回调 | translate_stream 没有原生进度回调 | 在 translate_patch 逐页处理时注入回调，通过 asyncio.Queue 推送到 SSE |
| 前后端跨域 | Next.js (3000) 和 FastAPI (8000) 不同端口 | Next.js API Routes 做代理，避免前端直接跨域请求 |
| ONNX 模型首次下载 | 首次运行需下载 ~50MB 模型权重 | 启动时预加载检测，前端提示"首次运行需下载模型" |
| 大文件内存 | 100+ 页 PDF 内存占用高 | pdf2zh 逐页处理，流式输出 |
| 翻译结果存储 | 多次翻译的结果需要临时保存 | 文件系统存储 (.tmp/results/)，定时清理 |
| SSE 连接中断 | 网络不稳定导致 SSE 断开 | 前端自动重连 + 后端任务状态持久化 |
| pdf2zh 版本兼容 | pdf2zh API 可能随版本变化 | 锁定 pdf2zh 版本，封装适配层 |

---

## 十、现有开源项目调研（保留参考）

### 10.1 PDFMathTranslate (pdf2zh) ⭐ 核心依赖

- **GitHub**: https://github.com/Byaidu/PDFMathTranslate
- **Star**: 20k+，社区活跃度极高
- **核心能力**: 科学 PDF 文档翻译，保留公式、图表、目录、注释
- **架构**: 三阶段流水线 — 提取(Extraction) → 翻译(Translation) → 重建(Reconstruction)
- **关键技术栈**:
  - DocLayout-YOLO (ONNX) 进行版面分析
  - pdfminer.six + PyMuPDF 进行 PDF 解析与文本提取
  - 支持 23+ 翻译服务（腾讯、百度、OpenAI、DeepL 等）
  - Go Noto Universal 多语言字体库
  - SQLite 翻译缓存
- **部署方式**: CLI、Gradio GUI、Docker、HTTP API、MCP Server

### 10.2 BabelDOC

- **GitHub**: https://github.com/funstory-ai/BabelDOC
- **Star**: 8,600+，2026 年最活跃的 PDF 翻译引擎
- **核心创新**: 中间语言 (IL) 表示，翻译后按原布局重建
- **关系**: BabelDOC 是 PDFMathTranslate 2.0 的核心后端引擎

### 10.3 DocuTranslate

- **GitHub**: https://github.com/xunbu/docutranslate
- **Star**: 1,100+，唯一同时具备 Web UI + 多格式支持的开源方案
- **局限**: PDF 翻译时先转 Markdown，会丢失原始排版

---

## 十一、环境变量汇总

### Python 后端 (`backend/.env`)

```bash
TENCENT_SECRET_ID=your_secret_id_here
TENCENT_SECRET_KEY=your_secret_key_here
HOST=0.0.0.0
PORT=8000
MAX_FILE_SIZE=20971520
DEFAULT_SERVICE=tencent
DEFAULT_LANG_FROM=en
DEFAULT_LANG_TO=zh
```

### Next.js 前端 (`.env.local`)

```bash
PYTHON_BACKEND_URL=http://localhost:8000
```
