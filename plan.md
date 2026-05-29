# 英文 PDF 转中文 PDF 在线翻译网页 — 实现方案

---

## 一、现有开源项目调研

### 1.1 PDFMathTranslate (pdf2zh) ⭐ 核心参考项目

- **GitHub**: https://github.com/Byaidu/PDFMathTranslate
- **Star**: 20k+，社区活跃度极高
- **核心能力**: 科学 PDF 文档翻译，保留公式、图表、目录、注释
- **架构**: 三阶段流水线 — 提取(Extraction) → 翻译(Translation) → 重建(Reconstruction)
- **关键技术栈**:
  - DocLayout-YOLO (ONNX) 进行版面分析，识别标题/段落/公式/图表/代码块等区域
  - pdfminer.six + PyMuPDF 进行 PDF 解析与文本提取
  - 支持 23+ 翻译服务（腾讯、百度、OpenAI、DeepL 等）
  - Go Noto Universal 多语言字体库
  - SQLite 翻译缓存
- **部署方式**: CLI、Gradio GUI、Docker、HTTP API、MCP Server
- **局限性**: 基于 Python，依赖较重（ONNX 模型、PyTorch 等），不适合直接嵌入轻量 Web 应用

### 1.2 2026 年最新开源项目（Firecrawl 实时调研）

#### BabelDOC ⭐⭐ 2026 年最活跃项目

- **GitHub**: https://github.com/funstory-ai/BabelDOC
- **Star**: **8,600+**，693 Forks，61 Issues，7 PRs
- **最新版本**: **v0.6.2** (2026-05-09 发布)，1,825 Commits，18 Branches，223 Tags
- **许可证**: AGPL-3.0
- **核心能力**: PDF 科学论文翻译与双语对照，"中间语言(IL)"技术实现格式 100% 保留
- **架构创新**:
  - 中间语言 (IL) 表示：将 PDF 解析为结构化中间语言，翻译后按原布局重建
  - 术语表系统：CSV 格式自定义术语，确保专业词汇一致性
  - 公式识别引擎：基于 LaTeX 语法的公式保留技术
  - 离线资源包：支持生成离线 ZIP 包，含字体和模型权重
- **翻译引擎**: OpenAI、DeepSeek、SiliconFlow (免费层)、Google、DeepL、Ollama (本地 LLM)
- **集成方式**: CLI (`babeldoc`)、Python API、PDFMathTranslate-next WebUI、Zotero 插件
- **在线服务**: 沉浸式翻译 - BabelDOC (**每月 1000 页免费额度**)
- **安装方式**: `uv tool install --python 3.12 BabelDOC` 或从源码安装
- **关键价值**: BabelDOC 是 PDFMathTranslate 2.0 的核心后端引擎，代表了当前 PDF 翻译领域最先进的技术方向。有 arXiv 论文支撑 (arXiv:2605.10845)
- **社区**: Telegram 群组活跃，正在招聘中

#### DocuTranslate ⭐⭐ 多格式文档翻译工具（含前端）

- **GitHub**: https://github.com/xunbu/docutranslate
- **Star**: **1,100+**，158 Forks，12 Issues
- **最新版本**: **v1.7.4** (2026-05-23 发布)，915 Commits，78 Tags
- **许可证**: MPL-2.0
- **技术栈**: Python 后端 + **独立 frontend 目录 (Web UI)** + Docker 部署
- **核心能力**: 基于 LLM 的轻量级多格式文档翻译工具
- **支持的格式**: PDF、DOCX、XLSX、MD、TXT、JSON、EPUB、SRT、ASS 等 **10+ 格式**
- **PDF 解析**: 使用 **MinerU** (在线或本地部署) 进行 PDF 解析，支持表格、公式、代码识别
- **关键特性**:
  - ✅ 自动术语表生成 (Glossary)
  - ✅ Word/Excel 格式保留
  - ✅ 多 AI 平台支持 (OpenAI/Claude/DeepSeek/Qwen/Gemini 等)
  - ✅ 全异步支持，高性能并发翻译
  - ✅ 局域网多用户同时使用
  - ✅ **开箱即用的 Web UI + RESTful API**
  - ✅ Windows/Mac 便携包 **<40MB**
  - ✅ MCP 扩展支持
  - ✅ Office 文件密码支持
  - ✅ 国际化 (中文/英文/日文/越南语)
- **安装方式**: `pip install docutranslate` 或下载便携包
- **参考价值**: ⭐ **唯一同时具备 Web UI + 多格式支持 + PDF 解析的开源方案**，其前端架构和交互设计可直接参考
- **注意**: PDF 翻译时会先转为 Markdown，**会丢失原始排版**

#### pdf-translator-for-human (LLM 驱动)

- **GitHub**: https://github.com/davideuler/pdf-translator-for-human
- **定位**: "A flexible free and unlimited PDF Translator for Human"
- **特点**: 支持本地 LLM (Ollama) 或 ChatGPT，灵活免费的 PDF 翻译器
- **适用场景**: 个人用户，零成本使用本地模型进行 PDF 翻译

#### LLM_PDF_Translator (WebUI + API)

- **GitHub**: https://github.com/poppanda/LLM_PDF_Translator
- **特点**: 使用 LLM (Ollama、QWEN 等) 翻译 PDF，提供 **WebUI 和 API 端点**
- **能力**: 保留原始排版布局
- **参考价值**: WebUI 架构和 API 设计可参考

#### @opendocsg/pdf2md (纯 JavaScript 浏览器端 PDF 解析) ⭐ 重要发现

- **npm**: https://www.npmjs.com/package/@opendocsg/pdf2md
- **定位**: **JavaScript npm 库，在浏览器端解析 PDF 并转换为 Markdown**
- **核心价值**: **纯浏览器运行，无需服务器！无需上传！无基础设施依赖！**
- **技术路线**: Upload PDF → Extract text → Feed to LLM → Get translated result
- **参考价值**: 与我们的方案技术路线高度吻合 — 使用 JS 在浏览器/Node.js 端处理 PDF

#### Stirling PDF (开源 PDF 编辑平台)

- **GitHub**: https://github.com/Stirling-Tools/stirling-pdf
- **定位**: 强大的开源 PDF 编辑平台
- **部署方式**: 个人桌面应用 / 浏览器 / Docker 部署
- **参考价值**: PDF 处理的完整功能集，可作为补充工具

#### Argos Translate (开源离线翻译库)

- **GitHub**: https://github.com/argosopentech/argos-translate
- **定位**: 基于 OpenNMT 的开源离线翻译库
- **形式**: Python 库 / CLI / GUI 应用
- **参考价值**: 可作为离线翻译备选方案

#### LibreTranslate (开源自托管翻译 API)

- **GitHub**: https://github.com/LibreTranslate/LibreTranslate
- **定位**: 免费开源机器翻译 API
- **特点**: 自托管、离线可用、易于搭建
- **参考价值**: 如果需要自建翻译服务，可作为引擎选择

#### TransMD (Rust, 2026-04 新项目)

- **GitHub**: https://github.com/kelfvin/transmd
- **语言**: Rust (使用 Rust 2024 edition)
- **发布**: v0.1.0 (2026-04-19)
- **核心思路**: PDF → Markdown (via MinerU) → LLM 大上下文翻译 → 中文 Markdown
- **特点**:
  - 利用 LLM 大上下文窗口实现文档级一致性翻译
  - 支持数字 PDF 和扫描版 PDF
  - 保留标题、列表、表格结构
  - 推荐使用 mimo-flash 模型 (翻译质量与速度平衡)
- **局限**: 依赖 MinerU (需 GPU, 8GB+ VRAM)，输出为 Markdown 而非 PDF

#### AiryLark (Next.js, 2025-2026)

- **GitHub**: https://github.com/wizd/airylark
- **技术栈**: Next.js 框架 ⭐ 与我们方案最接近的参考
- **核心能力**: 多格式文档翻译 (PDF, Word, TXT, Markdown)
- **特点**:
  - 翻译过程透明化：展示思考步骤
  - 自动校对 + 翻译质量评分
  - 支持用户编辑翻译结果
  - 流式处理，实时显示进度
  - 提供 API 集成
  - Docker 部署支持
- **参考价值**: 作为 Next.js 实现的文档翻译工具，其架构和交互设计可直接参考

#### LinguaFlow (浏览器扩展, 2026)

- **GitHub**: https://github.com/Kloverdevs/LinguaFlow
- **类型**: Firefox/Chrome 浏览器扩展
- **核心能力**: 网页 + PDF 双语翻译
- **PDF 翻译方式**: 使用 PDF.js 渲染 PDF，在 canvas 上注入翻译块 (非破坏性)
- **特点**:
  - 多引擎: Chrome 内置翻译、Google、OpenAI、Claude
  - OCR 图片翻译 (Tesseract.js)
  - 离线词汇库
  - 隐私优先：默认设备端运行
- **参考价值**: PDF.js + canvas 注入翻译的思路值得借鉴

### 1.3 其他相关项目

| 项目 | 说明 | 适用性 |
|------|------|--------|
| zotero-pdf-translate | Zotero 插件，20+ 翻译服务 | 仅限 Zotero 生态 |
| pdf-translator (discus0434) | 英译日 PDF，保留排版 | Python，仅日文 |
| Marker | PDF → Markdown，LayoutLMv3 版面分析 | Python，转换而非翻译 |
| 沉浸式翻译 | 浏览器插件，PDF/网页双语对照 | 闭源，无法二次开发 |
| deep-translator | Python 翻译聚合库，支持多平台 | 翻译层，非 PDF 处理 |

**结论** (基于 Firecrawl 实时调研):
1. **BabelDOC** 是 2026 年最活跃、最成熟的 PDF 翻译引擎 (8.6k Star, v0.6.2)，但其 Python + LLM 技术栈不适合零成本轻量 Web 应用
2. **DocuTranslate** 是唯一同时具备 Web UI + 多格式支持 + PDF 解析的开源方案 (1.1k Star, v1.7.4)，但其 Python + LLM 架构同样需要付费 API
3. **@opendocsg/pdf2md** 是重要发现 — 纯 JavaScript 浏览器端 PDF 解析库，与我们的技术路线高度吻合
4. **没有任何现有的 JavaScript/Next.js 方案**能同时满足：零成本 + 国内可用 + 保留排版 + Web 端部署
5. 我们的方案将借鉴 BabelDOC 的"中间语言"思路 + DocuTranslate 的 Web UI 设计 + @opendocsg/pdf2md 的 JS 解析思路，使用 Next.js 全栈 + 腾讯翻译 API 实现零成本方案

---

## 二、技术架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                     用户浏览器                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │              前端 (Next.js + React)                 │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │  │
│  │  │ 上传区域  │ │ 进度展示  │ │ 下载翻译结果  │  │  │
│  │  └──────────┘ └──────────┘ └──────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                         │ HTTP                          │
│                         ▼                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │           后端 (Next.js API Routes)                 │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │  │
│  │  │ PDF 解析  │ │ 翻译服务  │ │ PDF 生成         │  │  │
│  │  │ pdfjs-dist│ │ 腾讯翻译  │ │ pdf-lib          │  │  │
│  │  └──────────┘ └──────────┘ └──────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 技术栈选型

| 层级 | 技术 | 选型理由 |
|------|------|----------|
| **框架** | Next.js 14+ (App Router) | 全栈框架，API Routes 内置，SSR/SSG 支持 |
| **前端** | React 18 + TypeScript | 组件化开发，类型安全 |
| **样式** | Tailwind CSS + Framer Motion | 高科技风动效，流畅交互 |
| **PDF 解析** | pdfjs-dist (PDF.js) | Mozilla 官方，浏览器+Node.js 双端，提取文本+位置信息 |
| **PDF 生成** | pdf-lib | 纯 JS，浏览器+Node.js 双端，创建/修改 PDF，嵌入字体 |
| **翻译 API** | 腾讯翻译（主）+ 百度翻译（备） | 免费额度最大，国内可访问 |
| **代码检测** | 字体特征 + 启发式规则 | 零依赖，轻量高效 |
| **中文字体** | Noto Sans SC (Google Fonts) | 免费开源，覆盖全部中文字符 |
| **文件上传** | multer (Node.js) | 成熟的文件上传中间件 |
| **进度通信** | Server-Sent Events (SSE) | 实时推送翻译进度，无需 WebSocket |

---

## 三、核心流程设计

### 3.1 端到端翻译流程

```
用户上传 PDF
    │
    ▼
[1] PDF 解析 ─── pdfjs-dist 提取每页文本内容及位置信息
    │               (text items: str, transform, fontName, width, height)
    │
    ▼
[2] 文本分类 ─── 将文本块分为「可翻译」和「保持原样」两类
    │               - 可翻译: 正文、标题、目录、脚注、图注
    │               - 保持原样: 代码块、公式、URL、数字编号
    │
    ▼
[3] 文本翻译 ─── 将可翻译文本按段落批量发送至翻译 API
    │               - 腾讯翻译 API (500万字符/月免费)
    │               - 分批并发，控制请求频率
    │               - 翻译结果缓存，避免重复翻译
    │
    ▼
[4] PDF 重建 ─── 使用 pdf-lib 在原 PDF 基础上:
    │               - 用白色矩形覆盖原文区域
    │               - 嵌入中文字体 (Noto Sans SC)
    │               - 在原位置绘制翻译后的中文文本
    │               - 自动调整字号以适配原区域宽度
    │
    ▼
[5] 输出下载 ─── 生成翻译后的 PDF，供用户下载
```

### 3.2 PDF 解析详细设计

使用 `pdfjs-dist` 提取结构化文本信息：

```
每页输出结构:
{
  pageNum: number,
  width: number,        // 页面宽度
  height: number,       // 页面高度
  textItems: [
    {
      str: string,           // 文本内容
      x: number,             // X 坐标
      y: number,             // Y 坐标
      width: number,         // 文本宽度
      height: number,        // 文本高度
      fontName: string,      // 字体名称 (用于代码检测)
      fontSize: number,      // 字号
      transform: [number[]], // 变换矩阵
    }
  ]
}
```

**关键点**: `page.getTextContent()` 返回的 `items` 数组中，每个 `TextItem` 包含 `transform` 矩阵，可推算出精确的位置和字号信息。通过 `fontName` 可判断是否为等宽字体（代码块特征）。

### 3.3 代码/脚本检测策略

采用**多层级检测**，从粗到细：

#### 第一层：字体特征检测（最可靠）

```
等宽字体名称关键词匹配:
- Courier, CourierNew, Courier-New
- Consolas, Monaco, Menlo
- SourceCodePro, Source-Code-Pro
- DejaVuSansMono
- monospace

判断逻辑: fontName 中包含以上关键词 → 标记为代码区域
```

#### 第二层：启发式规则检测

```
规则 1: 连续多行以相同缩进开始，且包含编程符号
  - 编程符号: { } [ ] ( ) => -> :: ; // /* */
  - 缩进一致性: 连续 3+ 行具有相同或递增的缩进级别

规则 2: 文本中编程关键词密度过高
  - 关键词集合: function, class, import, return, if, else, for, while,
    def, var, let, const, public, private, void, int, string, ...
  - 密度阈值: 关键词占比 > 30%

规则 3: 文本包含典型代码模式
  - 行尾分号比例 > 50%
  - 包含 // 或 /* 注释标记
  - 包含 #include, #define 等预处理指令
  - 包含 <script>, <style>, <?php 等脚本标签

规则 4: URL 和路径检测
  - 正则匹配: https?://, www\., \.com|\.org|\.net
  - 文件路径: /usr/, C:\, ~/ 等
```

#### 第三层：上下文关联检测

```
如果一个文本块被判定为代码，其相邻的行号标注(如 "1  2  3  ...")也标记为保持原样
代码块的标题行(如 "Listing 1:", "Code Example:", "Algorithm 1:") 也保持原样
```

### 3.4 翻译服务设计

#### 主翻译服务：腾讯翻译 API

```
API: https://tmt.tencentcloudapi.com
方法: TextTranslate
免费额度: 500万字符/月
SDK: tencentcloud-sdk-python 或直接 HTTP 调用

请求参数:
- SourceText: 待翻译文本
- Source: "en"
- Target: "zh"
- ProjectId: 0

认证方式: SecretId + SecretKey + HMAC-SHA256 签名
```

#### 备选翻译服务

| 优先级 | 服务 | 免费额度 | 国内可用 | 备注 |
|--------|------|----------|----------|------|
| 1 | 腾讯翻译 | 500万字符/月 | ✅ | 主力，额度最大 |
| 2 | 百度翻译(高级版) | 100万字符/月 | ✅ | 需个人认证 |
| 3 | 阿里翻译(通用版) | 100万字符/月 | ✅ | 通用版 |
| 4 | 火山翻译 | 200万字符/月 | ✅ | 字节跳动旗下 |
| 5 | 小牛翻译 | 20万字符/日 | ✅ | 约600万/月 |
| 6 | SiliconFlow (LLM) | 注册送14元额度 | ✅ | 可调用 DeepSeek/Qwen 等模型做翻译 |
| 7 | LibreTranslate (自建) | 无限 | ✅ | 需自建服务器，离线可用 |

#### 翻译策略

```
1. 文本分段: 按段落/句子拆分，每段不超过 2000 字符(API 限制)
2. 批量翻译: 将多个短句合并为一次请求，减少 API 调用次数
3. 并发控制: 同时最多 5 个并发请求，避免触发频率限制
4. 重试机制: 失败自动重试 3 次，指数退避
5. 翻译缓存: 内存缓存已翻译内容，相同文本不重复请求
6. 降级策略: 主服务失败自动切换到备选服务
```

### 3.5 PDF 重建详细设计

使用 `pdf-lib` 在原 PDF 上进行文本替换：

```
步骤:
1. 加载原始 PDF: PDFDocument.load(pdfBytes)
2. 嵌入中文字体: pdfDoc.embedFont(notoSansSCFontBytes)
3. 遍历每一页:
   a. 获取页面对象
   b. 对每个需要翻译的文本区域:
      - 绘制白色矩形覆盖原文 (page.drawRectangle)
      - 计算翻译后文本的适配字号:
        * 原始区域宽度 / 中文文本宽度 × 原始字号
        * 字号下限: 6pt (保证可读性)
        * 如果缩小后仍超出区域，则自动换行
      - 在原位置绘制翻译文本 (page.drawText)
   c. 保持原样的区域不做任何修改
4. 保存 PDF: pdfDoc.save()
```

**字号适配算法**:

```
function calculateFontSize(
  originalWidth: number,    // 原文区域宽度
  originalFontSize: number, // 原文字号
  translatedText: string,   // 翻译后文本
  font: PDFFont             // 中文字体
): number {
  const textWidth = font.widthOfTextAtSize(translatedText, originalFontSize)
  if (textWidth <= originalWidth) {
    return originalFontSize  // 无需缩小
  }
  const adaptedSize = originalFontSize * (originalWidth / textWidth)
  return Math.max(adaptedSize, 6)  // 最低 6pt
}
```

**自动换行算法**:

```
当翻译文本即使缩小到 6pt 仍超出区域宽度时:
1. 按字符逐个计算累计宽度
2. 在超出宽度时插入换行
3. 行高 = 字号 × 1.4
4. 如果总行高超出原区域高度，进一步缩小字号
```

---

## 四、前端设计

### 4.1 高科技风格设计语言

**设计灵感**: Vercel / Linear / Raycast 的暗色科技风 + 赛博朋克微光元素

**色彩体系**:

```
主色调 (深色主题):
- 背景: #0A0A0F (深邃黑蓝，宇宙感)
- 表面: #12121A (卡片/面板背景)
- 前景: #E4E4E7 (高对比度浅灰白)
- 强调: #6366F1 (靛蓝紫，科技感核心色)
- 辅助强调: #8B5CF6 (紫色渐变终点)
- 成功: #10B981 (翡翠绿，翻译完成)
- 警告: #F59E0B (琥珀色，进度中)
- 错误: #EF4444 (红色，失败状态)
- 边框: rgba(99, 102, 241, 0.15) (靛蓝微光边框)

渐变:
- Hero 标题: from-indigo-400 via-purple-400 to-pink-400 (流动渐变)
- 按钮: from-indigo-600 to-purple-600 (科技感渐变)
- 进度条: from-indigo-500 to-cyan-400 (冷色调流动)
- 背景光晕: radial-gradient(indigo-500/10%, transparent) (微光晕)

玻璃拟态 (Glassmorphism):
- 卡片: bg-white/5 backdrop-blur-xl border border-white/10
- 面板: bg-white/[0.03] backdrop-blur-lg
- 悬浮: bg-white/10 backdrop-blur-2xl
```

**字体方案**:

```
标题字体: Space Grotesk (几何无衬线，未来感)
  - 备选: JetBrains Mono (代码风格标题)

正文字体: Inter (无衬线，高清晰度)
  - 中文: Noto Sans SC (思源黑体)

等宽字体: JetBrains Mono (代码/数据展示)

字体加载: Google Fonts CDN (国内可用 fonts.loli.net 镜像)
```

**排版原则**:

```
- 紧凑布局: 内容区最大宽度 960px，居中
- 行高: 1.6 (正文), 1.2 (标题)
- 字间距: tracking-tight (标题), tracking-normal (正文)
- 段落间距: 1.5rem
- 圆角: rounded-xl (卡片), rounded-lg (按钮), rounded-full (标签)
- 边框: 1px solid rgba(255,255,255,0.06) (微光边框)
```

### 4.2 页面结构

```
┌──────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│  ◆ PDF Translator    [●][●][●]     GitHub →     │  ← 玻璃拟态导航栏
├──────────────────────────────────────────────────┤
│                                                    │
│         ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│         ░                                    ░   │
│         ░   ⟁ PDF 智能翻译引擎              ░   │  ← 渐变流动标题
│         ░   英文文献 → 中文智慧              ░   │     + 微光晕背景
│         ░                                    ░   │
│         ░   [▓▓▓▓▓▓▓▓ 开始翻译 ▓▓▓▓▓▓▓▓]   ░   │  ← 渐变按钮 + hover 光效
│         ░                                    ░   │
│         ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│                                                    │
├──────────────────────────────────────────────────┤
│                                                    │
│  ┌─ 上传区域 ─────────────────────────────────┐  │
│  │                                            │  │
│  │     ╔═════════════════════════════════╗    │  │
│  │     ║  ⬡ 拖拽或点击上传 PDF 文件      ║    │  │  ← 虚线边框 + 拖拽动效
│  │     ║     支持 .pdf · 最大 20MB        ║    │  │
│  │     ╚═════════════════════════════════╝    │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                    │
├──────────────────────────────────────────────────┤
│                                                    │
│  ┌─ 翻译进度 ─────────────────────────────────┐  │  ← 玻璃拟态面板
│  │                                            │  │
│  │  ⟁ 正在翻译第 3/10 页...                   │  │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░  35%    │  │  ← 渐变进度条
│  │                                            │  │     + 数字跳动
│  │  ◉ PDF 解析      ✓ 完成                   │  │
│  │  ◉ 代码识别      ✓ 完成                   │  │  ← 状态指示器
│  │  ◉ 文本翻译      ⟳ 进行中...              │  │     (脉冲动画)
│  │  ◉ PDF 重建      ○ 等待中                 │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                    │
├──────────────────────────────────────────────────┤
│                                                    │
│  ┌─ 翻译结果 ─────────────────────────────────┐  │
│  │                                            │  │
│  │  ✓ 翻译完成!                               │  │
│  │  ├─ 翻译字符: 15,234                       │  │  ← 数据展示
│  │  ├─ 代码块: 3 处 (已保留)                  │  │     (等宽字体)
│  │  └─ 耗时: 12.3s                            │  │
│  │                                            │  │
│  │  [▓▓▓ 下载 PDF ▓▓▓]  [重新翻译]            │  │  ← 下载链接 + 重试
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                    │
├──────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ ⬡ 智能识别│  │ ⬡ 格式保留│  │ ⬡ 零成本 │        │  ← 特性卡片
│  │ 代码块    │  │ 原始排版  │  │ 免费使用 │        │     + 图标 + hover 光效
│  └──────────┘  └──────────┘  └──────────┘        │
│                                                    │
├──────────────────────────────────────────────────┤
│                                                    │
│  ───────────────────────────────────────────────  │
│  Made with ♥ by AI | 开源项目 | MIT License       │  ← 极简页脚
│                                                    │
└──────────────────────────────────────────────────┘
```

### 4.3 交互设计

```
1. 上传交互:
   - 拖拽上传 + 点击上传
   - 上传时显示文件名和大小 (等宽字体数据展示)
   - 支持 .pdf 格式校验
   - 文件大小限制 20MB
   - 拖拽进入时: 边框变为靛蓝渐变 + 背景微光脉冲

2. 翻译进度:
   - SSE 实时推送进度
   - 四阶段进度指示: 解析 → 识别 → 翻译 → 重建
   - 当前页码/总页码 (数字跳动动画)
   - 渐变进度条 (indigo → cyan 流动)
   - 状态指示器: 脉冲动画 (进行中) / 对勾 (完成) / 空心圆 (等待)

3. 结果展示:
   - 翻译统计信息 (等宽字体，终端风格数据展示)
   - 下载链接，点击后直接下载翻译后的 PDF 到本地（不提供在线预览）
   - 重新翻译按钮 (次按钮，ghost 样式)

4. 错误处理:
   - 文件格式错误: 红色边框 + 错误图标
   - 翻译 API 失败: 内联错误提示 + 重试按钮
   - 超出免费额度: 警告面板 + 配额信息
   - 网络错误: 断开图标 + 自动重连提示
```

### 4.4 动效设计

```
核心动效 (Framer Motion):

1. 页面加载:
   - 元素依次淡入 + 上移 (staggerChildren: 0.1s)
   - 背景光晕缓慢旋转 (CSS animation, 20s/圈)

2. 上传区域:
   - 拖拽悬浮: 边框渐变流动 + scale(1.02) + 背景光晕
   - 文件放入: 短暂脉冲 + 边框变绿 (成功反馈)

3. 进度展示:
   - 进度条: 渐变流动动画 (background-position 循环)
   - 百分比数字: 计数器动画 (数字递增效果)
   - 状态切换: 弹性动画 (spring, stiffness: 300)
   - 脉冲指示器: 2s 循环脉冲 (opacity 0.4 → 1)

4. 按钮交互:
   - Hover: translateY(-2px) + 阴影扩散 + 微光扫过
   - Active: translateY(0) + 阴影收缩
   - 按钮 hover 光效: 伪元素渐变从左到右扫过

5. 卡片交互:
   - Hover: 微上浮 + 边框颜色变亮 + 内部光晕
   - 玻璃拟态: backdrop-blur 变化

6. 背景效果:
   - 网格点阵: 细微的 dot grid 背景 (opacity: 0.03)
   - 光晕跟随: 鼠标位置附近的微弱光晕 (可选)
   - 渐变流动: Hero 区域背景渐变缓慢位移

7. 页面切换:
   - 条件渲染: AnimatePresence + 淡入淡出
   - 状态切换: layout animation (自动布局过渡)
```

---

## 五、项目结构

```
pdf-translator/
├── app/
│   ├── layout.tsx              # 根布局 (字体加载、全局样式)
│   ├── page.tsx                # 首页 (上传、进度、结果)
│   ├── globals.css             # 全局 CSS (Tailwind + 自定义)
│   └── api/
│       ├── translate/
│       │   └── route.ts        # 翻译 API (SSE 推送进度)
│       └── download/
│           └── route.ts        # 下载翻译后 PDF
├── components/
│   ├── Header.tsx              # 导航栏
│   ├── HeroSection.tsx         # Hero 区域
│   ├── UploadZone.tsx          # 文件上传区域
│   ├── ProgressPanel.tsx       # 翻译进度面板
│   ├── ResultPanel.tsx         # 翻译结果面板
│   ├── FeatureCard.tsx         # 特性卡片
│   └── Footer.tsx              # 页脚
├── lib/
│   ├── pdf-parser.ts           # PDF 解析 (pdfjs-dist 封装)
│   ├── pdf-builder.ts          # PDF 生成 (pdf-lib 封装)
│   ├── code-detector.ts        # 代码块检测
│   ├── translator.ts           # 翻译服务 (腾讯 API 封装)
│   ├── font-loader.ts          # 中文字体加载
│   └── types.ts                # TypeScript 类型定义
├── public/
│   └── fonts/
│       └── NotoSansSC-Regular.ttf  # 中文字体文件
├── tailwind.config.ts
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## 六、关键依赖包

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "pdfjs-dist": "^4.4.0",
    "pdf-lib": "^1.17.1",
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

---

## 七、翻译 API 集成方案

### 7.1 腾讯翻译 API 调用方式

腾讯翻译 API 使用 TC3-HMAC-SHA256 签名方法，纯 HTTP 调用，无需 SDK：

```
请求:
POST https://tmt.tencentcloudapi.com
Headers:
  - Authorization: TC3-HMAC-SHA256 Credential=...
  - X-TC-Action: TextTranslate
  - X-TC-Version: 2018-03-21
  - Content-Type: application/json

Body:
{
  "SourceText": "Hello World",
  "Source": "en",
  "Target": "zh",
  "ProjectId": 0
}

响应:
{
  "Response": {
    "TargetText": "你好世界",
    "Source": "en",
    "Target": "zh",
    "RequestId": "..."
  }
}
```

### 7.2 签名实现 (Node.js)

```
使用 Node.js 内置 crypto 模块实现 HMAC-SHA256 签名:
1. 拼接规范请求串 (CanonicalRequest)
2. 拼接待签名字符串 (StringToSign)
3. 计算签名 (Signature)
4. 拼接 Authorization

无需额外依赖，纯 crypto 实现
```

### 7.3 环境变量配置

```
# .env.local
TENCENT_SECRET_ID=你的SecretId
TENCENT_SECRET_KEY=你的SecretKey

# 可选: 备选翻译服务
BAIDU_APP_ID=你的百度APPID
BAIDU_SECRET_KEY=你的百度密钥
```

---

## 八、代码/脚本保持原样的实现细节

### 8.1 检测流程

```
对 PDF 中提取的每个 TextItem:

Step 1: 字体检测
  fontName 包含等宽字体关键词 → isCode = true

Step 2: 区域聚合
  将相邻的 isCode=true 的 TextItem 聚合为代码块区域
  记录代码块的边界框 (x, y, width, height)

Step 3: 启发式补充检测
  对 isCode=false 的文本，检查:
  - 编程符号密度 > 阈值
  - 行尾分号比例 > 50%
  - 编程关键词密度 > 30%
  - 包含 <script>, <?php, #include 等标记
  → 满足任一条件则 isCode = true

Step 4: 上下文关联
  代码块前后的行号标注 (如 "1", "2", "3"...)
  代码块标题 (如 "Listing", "Code", "Algorithm")
  → 也标记为保持原样

Step 5: 特殊内容保持原样
  - URL (https?://...)
  - 邮箱地址
  - 文件路径
  - 纯数字编号
  - 数学公式 (LaTeX 格式, 如 $...$, \begin{equation})
```

### 8.2 翻译内容分类

| 内容类型 | 是否翻译 | 检测方式 |
|----------|----------|----------|
| 正文段落 | ✅ 翻译 | 默认翻译 |
| 标题/章节名 | ✅ 翻译 | 字号较大 + 位置靠上 |
| 目录条目 | ✅ 翻译 | 页码前的文本 |
| 脚注 | ✅ 翻译 | 页面底部 + 字号较小 |
| 图注/表注 | ✅ 翻译 | "Figure", "Table" 开头 |
| 代码块 | ❌ 保持原样 | 等宽字体 + 启发式规则 |
| 代码行号 | ❌ 保持原样 | 与代码块关联 |
| 公式 | ❌ 保持原样 | LaTeX 标记 / 特殊字体 |
| URL | ❌ 保持原样 | 正则匹配 |
| 页眉/页码 | ❌ 保持原样 | 页面顶部/底部固定位置 |

---

## 九、部署方案

### 9.1 本地开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入翻译 API 密钥

# 下载中文字体
# 将 NotoSansSC-Regular.ttf 放入 public/fonts/

# 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

### 9.2 部署选项 (零成本)

| 平台 | 免费额度 | 国内访问 | 备注 |
|------|----------|----------|------|
| Vercel | Hobby 免费 | ⚠️ 偶有延迟 | Next.js 官方推荐 |
| Netlify | 100GB/月 | ⚠️ 偶有延迟 | 支持Serverless Functions |
| Cloudflare Pages | 无限带宽 | ✅ 国内CDN | 需适配 Edge Runtime |
| 自建服务器 | 取决于机器 | ✅ | 完全可控 |

**推荐方案**: 本地开发 + Vercel 部署。如需国内稳定访问，可使用 Cloudflare Pages 或自建服务器。

---

## 十、已知限制与改进方向

### 10.1 当前方案限制

1. **排版保真度**: 文本覆盖+重绘方式无法 100% 还原复杂排版（多栏、表格内文本、旋转文本）
2. **中文字体宽度**: 中文通常比英文更紧凑，翻译后文本可能比原文短，留白较多
3. **代码检测准确率**: 启发式规则无法达到 AI 模型的准确率，可能误判
4. **扫描版 PDF**: 纯图片 PDF 无法提取文本，需要 OCR 支持
5. **大文件处理**: 超大 PDF (100+ 页) 可能导致内存占用过高

### 10.2 后续改进方向

1. **引入轻量版面分析模型**: 如 DocLayout-YOLO ONNX (WebAssembly)，提升代码检测和区域分类准确率
2. **OCR 支持**: 集成 Tesseract.js 处理扫描版 PDF
3. **双语对照输出**: 生成原文+译文左右对照的 PDF（类似 PDFMathTranslate 的 dual 模式）
4. **翻译记忆**: 本地存储翻译结果，跨文档复用
5. **多翻译引擎切换**: 用户可选择不同的翻译服务
6. **术语表**: 用户自定义专业术语翻译对照表

---

## 十一、与主流开源方案的对比

| 维度 | 本方案 | BabelDOC | DocuTranslate | @opendocsg/pdf2md |
|------|--------|----------|---------------|-------------------|
| 技术栈 | JavaScript 全栈 (Next.js) | Python (中间语言引擎) | Python + Web UI | JavaScript (浏览器端) |
| 部署方式 | Web 应用，浏览器访问 | CLI / Python API / Zotero | Web UI / Docker / 便携包 | npm 库，嵌入应用 |
| PDF 解析 | pdfjs-dist | 自研 IL 解析器 | MinerU (需 GPU) | 自研浏览器端解析 |
| PDF 生成 | pdf-lib (修改原 PDF) | IL 渲染回 PDF | 转 Markdown (丢排版) | 不生成 PDF |
| 代码检测 | 等宽字体 + 规则匹配 | IL 级别精确识别 | MinerU AI 识别 | 无 |
| 翻译服务 | 腾讯翻译 (免费) | OpenAI/DeepSeek/Ollama 等 | OpenAI/Claude/Qwen 等 | 需自行接入 |
| 排版保真度 | 中等 (文本覆盖重绘) | 最高 (IL 精确重建) | 低 (PDF→MD→翻译) | 不涉及 |
| 零成本 | ✅ 完全免费 | ⚠️ LLM API 需付费 | ⚠️ LLM API 需付费 | ✅ 免费 (不含翻译) |
| 国内可用 | ✅ 原生支持 | ⚠️ 需配置国内 LLM | ⚠️ 需配置国内 LLM | ✅ 浏览器端运行 |
| 学习成本 | 低 (Web 界面) | 中 (需 Python 环境) | 低 (Web 界面) | 中 (需编码集成) |
| 前端风格 | 高科技暗色主题 | 无独立前端 | 现代简洁 Web UI | 无 UI |
| Star 数 | - | 8,600+ | 1,100+ | - |

---

## 十二、开发里程碑

### Phase 1: 基础框架搭建
- Next.js 项目初始化
- Tailwind CSS + 文艺风主题配置
- 前端页面布局 (Hero + Upload + Progress + Result)
- 文件上传功能

### Phase 2: PDF 处理核心
- pdfjs-dist 集成，文本+位置提取
- 代码块检测逻辑实现
- pdf-lib 集成，PDF 修改和文本覆盖
- 中文字体嵌入

### Phase 3: 翻译服务集成
- 腾讯翻译 API 签名实现
- 翻译请求管理 (分批、并发、重试)
- SSE 进度推送
- 翻译缓存

### Phase 4: 端到端联调
- 完整流程串联: 上传 → 解析 → 检测 → 翻译 → 重建 → 下载
- 错误处理和边界情况
- 字号适配和自动换行优化

### Phase 5: 优化与打磨
- 前端动效和交互优化
- 移动端适配
- 性能优化 (大文件处理)
- 部署配置

---

## 十三、具体实现方案

> 以下为各模块的具体代码级实现方案，包含关键函数签名、数据结构、算法伪代码和文件职责。

### 13.1 TypeScript 类型系统 (`lib/types.ts`)

```typescript
export interface TextItem {
  str: string
  x: number
  y: number
  width: number
  height: number
  fontName: string
  fontSize: number
  transform: number[]
  hasEOL: boolean
  category: TextCategory
}

export type TextCategory =
  | "body"
  | "title"
  | "toc"
  | "footnote"
  | "caption"
  | "code"
  | "formula"
  | "url"
  | "pageNumber"
  | "header"

export interface PageData {
  pageNum: number
  width: number
  height: number
  textItems: TextItem[]
}

export interface ParsedPDF {
  pages: PageData[]
  metadata: {
    title?: string
    author?: string
    pageCount: number
  }
}

export interface TextBlock {
  items: TextItem[]
  category: TextCategory
  bbox: { x: number; y: number; width: number; height: number }
  text: string
  translatedText?: string
}

export interface TranslationRequest {
  text: string
  source: "en"
  target: "zh"
}

export interface TranslationResult {
  original: string
  translated: string
  fromCache: boolean
}

export interface TranslateProgress {
  stage: "parsing" | "detecting" | "translating" | "rebuilding"
  currentPage: number
  totalPages: number
  percent: number
  message: string
}
```

### 13.2 PDF 解析模块 (`lib/pdf-parser.ts`)

**职责**: 使用 pdfjs-dist 提取每页文本内容及精确位置信息

```typescript
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist"

GlobalWorkerOptions.workerSrc = "pdfjs-dist/build/pdf.worker.mjs"

export async function parsePDF(pdfBytes: ArrayBuffer): Promise<ParsedPDF> {
  const doc = await getDocument({ data: pdfBytes }).promise
  const pages: PageData[] = []

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: 1.0 })
    const content = await page.getTextContent()

    const textItems: TextItem[] = content.items
      .filter((item): item is any => "str" in item)
      .map((item) => ({
        str: item.str,
        x: item.transform[4],
        y: viewport.height - item.transform[5],
        width: item.width,
        height: item.height || item.transform[0] * 0.8,
        fontName: item.fontName || "",
        fontSize: Math.abs(item.transform[0]) || 12,
        transform: item.transform,
        hasEOL: item.hasEOL || false,
        category: "body" as TextCategory,
      }))

    pages.push({
      pageNum: i,
      width: viewport.width,
      height: viewport.height,
      textItems,
    })
  }

  return {
    pages,
    metadata: {
      title: doc.getTitle() || undefined,
      author: doc.getAuthor() || undefined,
      pageCount: doc.numPages,
    },
  }
}
```

**关键实现细节**:
- pdfjs-dist 的 `transform[4]` 是 X 坐标，`transform[5]` 是 Y 坐标（PDF 坐标系从底部起算），需用 `viewport.height - transform[5]` 转为从顶部起算
- `transform[0]` 近似等于字号（水平缩放因子）
- `fontName` 格式通常为 `g_d0_f1` 之类的内部 ID，需通过 `page.getOperatorList()` 获取字体名映射，或直接使用 PDF.js 的字体描述符

**字体名映射策略**:

```typescript
async function buildFontMap(page: any): Promise<Map<string, string>> {
  const fontMap = new Map<string, string>()
  const operatorList = await page.getOperatorList()
  const commonObjs = page.commonObjs

  for (const op of operatorList.fnArray) {
    if (op === pdfjsLib.OPS.setFont) {
      const fontId = operatorList.argsArray[operatorList.fnArray.indexOf(op)][0]
      const fontObj = commonObjs.get(fontId)
      if (fontObj) {
        fontMap.set(fontId, fontObj.name || "")
      }
    }
  }
  return fontMap
}
```

**文本行聚合算法**:

```typescript
export function aggregateIntoBlocks(items: TextItem[]): TextBlock[] {
  const blocks: TextBlock[] = []
  let currentBlock: TextItem[] = []

  const isSameLine = (a: TextItem, b: TextItem) =>
    Math.abs(a.y - b.y) < a.fontSize * 0.3

  const isAdjacent = (a: TextItem, b: TextItem) =>
    Math.abs(b.x - (a.x + a.width)) < a.fontSize * 0.5

  for (const item of items) {
    if (currentBlock.length === 0) {
      currentBlock.push(item)
      continue
    }

    const last = currentBlock[currentBlock.length - 1]
    if (isSameLine(last, item) && isAdjacent(last, item)) {
      currentBlock.push(item)
    } else {
      blocks.push(finalizeBlock(currentBlock))
      currentBlock = [item]
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(finalizeBlock(currentBlock))
  }

  return blocks
}

function finalizeBlock(items: TextItem[]): TextBlock {
  const minX = Math.min(...items.map((i) => i.x))
  const minY = Math.min(...items.map((i) => i.y))
  const maxX = Math.max(...items.map((i) => i.x + i.width))
  const maxY = Math.max(...items.map((i) => i.y + i.height))

  return {
    items,
    category: items[0].category,
    bbox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    text: items.map((i) => i.str).join(" "),
  }
}
```

### 13.3 代码检测模块 (`lib/code-detector.ts`)

**职责**: 多层级检测代码块、公式、URL 等不需翻译的内容

```typescript
const MONOSPACE_KEYWORDS = [
  "courier", "consolas", "monaco", "menlo", "monospace",
  "sourcecodepro", "dejavusansmono", "robotomono",
  "fira", "code", "hack", "iosevka",
]

const CODE_KEYWORDS = new Set([
  "function", "class", "import", "export", "return", "if", "else",
  "for", "while", "switch", "case", "break", "continue", "try",
  "catch", "throw", "new", "delete", "typeof", "instanceof",
  "def", "var", "let", "const", "async", "await", "yield",
  "public", "private", "protected", "void", "int", "string",
  "boolean", "float", "double", "null", "undefined", "true", "false",
  "self", "this", "super", "extends", "implements", "interface",
  "package", "namespace", "using", "include", "require",
])

const CODE_SYMBOLS = /[{[\]()=>::;\/\/\*\/#@$~]/g

const URL_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+\.[a-z]{2,}/i
const EMAIL_PATTERN = /[\w.-]+@[\w.-]+\.\w+/
const LATEX_PATTERN = /\$[^$]+\$|\\begin\{[^}]+\}|\\end\{[^}]+\}|\\[a-zA-Z]+\{/
const SCRIPT_TAGS = /<script|<style|<\?php|#include|#define|#pragma/

export function detectCodeBlocks(blocks: TextBlock[]): TextBlock[] {
  return blocks.map((block) => {
    const category = classifyBlock(block)
    return { ...block, category }
  })
}

function classifyBlock(block: TextBlock): TextCategory {
  const text = block.text
  const primaryFont = block.items[0]?.fontName?.toLowerCase() || ""

  // Layer 1: Font-based detection
  if (MONOSPACE_KEYWORDS.some((kw) => primaryFont.includes(kw))) {
    return "code"
  }

  // Layer 2: URL detection
  if (URL_PATTERN.test(text) && text.trim().length < 300) {
    return "url"
  }

  // Layer 3: LaTeX/formula detection
  if (LATEX_PATTERN.test(text)) {
    return "formula"
  }

  // Layer 4: Heuristic code detection
  const lines = text.split(/\n/)
  const symbolCount = (text.match(CODE_SYMBOLS) || []).length
  const symbolDensity = symbolCount / Math.max(text.length, 1)

  const keywordCount = text.split(/\s+/).filter((w) =>
    CODE_KEYWORDS.has(w.toLowerCase())
  ).length
  const keywordDensity = keywordCount / Math.max(text.split(/\s+/).length, 1)

  const semicolonLines = lines.filter((l) => l.trim().endsWith(";")).length
  const semicolonRatio = semicolonLines / Math.max(lines.length, 1)

  if (SCRIPT_TAGS.test(text)) return "code"
  if (keywordDensity > 0.3 && symbolDensity > 0.1) return "code"
  if (semicolonRatio > 0.5 && lines.length >= 3) return "code"
  if (symbolDensity > 0.25 && keywordDensity > 0.15) return "code"

  // Layer 5: Context-based detection
  if (isPageNumber(block)) return "pageNumber"
  if (isHeader(block)) return "header"
  if (isFootnote(block)) return "footnote"
  if (isCaption(block)) return "caption"
  if (isTitle(block)) return "title"

  return "body"
}

function isPageNumber(block: TextBlock): boolean {
  const text = block.text.trim()
  return /^\d{1,4}$/.test(text) && block.bbox.height < 15
}

function isHeader(block: TextBlock): boolean {
  return block.bbox.y < 40 && block.bbox.height < 15
}

function isFootnote(block: TextBlock): boolean {
  const pageHeight = 792
  return block.bbox.y > pageHeight - 60 && block.items[0]?.fontSize < 9
}

function isCaption(block: TextBlock): boolean {
  const text = block.text.trim().toLowerCase()
  return /^(figure|fig\.|table|tab\.|listing|algorithm|example)\s/i.test(text)
}

function isTitle(block: TextBlock): boolean {
  const avgFontSize = block.items.reduce((s, i) => s + i.fontSize, 0) / block.items.length
  return avgFontSize >= 14 && block.bbox.y < 200
}
```

**上下文关联处理**:

```typescript
export function applyContextRules(blocks: TextBlock[]): TextBlock[] {
  const result = [...blocks]

  for (let i = 0; i < result.length; i++) {
    if (result[i].category === "code") {
      // Mark adjacent line numbers as code
      if (i > 0 && isLineNumber(result[i - 1])) {
        result[i - 1] = { ...result[i - 1], category: "code" }
      }
      if (i < result.length - 1 && isLineNumber(result[i + 1])) {
        result[i + 1] = { ...result[i + 1], category: "code" }
      }

      // Mark code block title as keep-original
      if (i > 0 && isCodeTitle(result[i - 1])) {
        result[i - 1] = { ...result[i - 1], category: "code" }
      }
    }
  }

  return result
}

function isLineNumber(block: TextBlock): boolean {
  const text = block.text.trim()
  return /^\d{1,4}$/.test(text) && block.bbox.width < 30
}

function isCodeTitle(block: TextBlock): boolean {
  return /^(listing|code|algorithm|example|listing)\s*\d/i.test(block.text.trim())
}
```

### 13.4 翻译服务模块 (`lib/translator.ts`)

**职责**: 封装腾讯翻译 API，实现签名、分批、并发、重试、缓存

```typescript
import crypto from "crypto"

interface TencentTranslateConfig {
  secretId: string
  secretKey: string
  region?: string
}

class TranslationCache {
  private cache = new Map<string, string>()

  get(key: string): string | undefined {
    return this.cache.get(key)
  }

  set(key: string, value: string): void {
    this.cache.set(key, value)
  }

  has(key: string): boolean {
    return this.cache.has(key)
  }
}

export class Translator {
  private cache = new TranslationCache()
  private concurrency = 5
  private requestQueue: Promise<string>[] = []

  constructor(private config: TencentTranslateConfig) {}

  async translateBatch(texts: string[]): Promise<TranslationResult[]> {
    const batches = this.splitIntoBatches(texts, 2000)
    const results: TranslationResult[] = []

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map((text) => this.translateWithRetry(text))
      )
      results.push(...batchResults)
    }

    return results
  }

  private async translateWithRetry(
    text: string,
    maxRetries = 3
  ): Promise<TranslationResult> {
    if (this.cache.has(text)) {
      return { original: text, translated: this.cache.get(text)!, fromCache: true }
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const translated = await this.callTencentAPI(text)
        this.cache.set(text, translated)
        return { original: text, translated, fromCache: false }
      } catch (error) {
        if (attempt === maxRetries - 1) throw error
        const delay = Math.pow(2, attempt) * 500
        await new Promise((r) => setTimeout(r, delay))
      }
    }

    throw new Error("Translation failed after retries")
  }

  private async callTencentAPI(text: string): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const date = new Date().toISOString().split("T")[0]
    const service = "tmt"
    const action = "TextTranslate"
    const version = "2018-03-21"

    const payload = JSON.stringify({
      SourceText: text,
      Source: "en",
      Target: "zh",
      ProjectId: 0,
    })

    const signedHeaders = this.signRequest({
      secretId: this.config.secretId,
      secretKey: this.config.secretKey,
      service,
      action,
      version,
      timestamp,
      date,
      payload,
    })

    const response = await fetch("https://tmt.tencentcloudapi.com", {
      method: "POST",
      headers: signedHeaders,
      body: payload,
    })

    const data = await response.json()
    if (data.Response?.Error) {
      throw new Error(data.Response.Error.Message)
    }
    return data.Response.TargetText
  }

  private signRequest(params: {
    secretId: string
    secretKey: string
    service: string
    action: string
    version: string
    timestamp: string
    date: string
    payload: string
  }): Record<string, string> {
    const { secretId, secretKey, service, action, version, timestamp, date, payload } = params

    const host = "tmt.tencentcloudapi.com"
    const contentType = "application/json"

    const canonicalRequest = [
      "POST",
      "/",
      "",
      `content-type:${contentType}`,
      `host:${host}`,
      `x-tc-action:${action.toLowerCase()}`,
      "",
      "content-type;host;x-tc-action",
      crypto.createHash("sha256").update(payload).digest("hex"),
    ].join("\n")

    const credentialScope = `${date}/${service}/tc3_request`
    const stringToSign = [
      "TC3-HMAC-SHA256",
      timestamp,
      credentialScope,
      crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n")

    const secretDate = crypto
      .createHmac("sha256", `TC3${secretKey}`)
      .update(date)
      .digest()
    const secretService = crypto
      .createHmac("sha256", secretDate)
      .update(service)
      .digest()
    const secretSigning = crypto
      .createHmac("sha256", secretService)
      .update("tc3_request")
      .digest()
    const signature = crypto
      .createHmac("sha256", secretSigning)
      .update(stringToSign)
      .digest("hex")

    const authorization =
      `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, ` +
      `SignedHeaders=content-type;host;x-tc-action, ` +
      `Signature=${signature}`

    return {
      "Content-Type": contentType,
      Host: host,
      "X-TC-Action": action,
      "X-TC-Version": version,
      "X-TC-Timestamp": timestamp,
      Authorization: authorization,
    }
  }

  private splitIntoBatches(texts: string[], maxChars: number): string[][] {
    const batches: string[][] = []
    let currentBatch: string[] = []
    let currentLength = 0

    for (const text of texts) {
      if (currentLength + text.length > maxChars && currentBatch.length > 0) {
        batches.push(currentBatch)
        currentBatch = []
        currentLength = 0
      }
      currentBatch.push(text)
      currentLength += text.length
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch)
    }

    return batches
  }
}
```

### 13.5 PDF 重建模块 (`lib/pdf-builder.ts`)

**职责**: 使用 pdf-lib 在原 PDF 上覆盖原文并绘制翻译文本

```typescript
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import { readFileSync } from "fs"

export class PDFBuilder {
  private fontBytes: Uint8Array

  constructor(fontPath: string) {
    this.fontBytes = new Uint8Array(readFileSync(fontPath))
  }

  async rebuild(
    originalPdfBytes: ArrayBuffer,
    blocks: TextBlock[],
    pageData: PageData[]
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(originalPdfBytes)
    const font = await pdfDoc.embedFont(this.fontBytes)
    const pages = pdfDoc.getPages()

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      const { width: pageWidth, height: pageHeight } = page.getSize()
      const pageBlocks = blocks.filter(
        (b) => b.items[0] && pageData[i]?.pageNum === i + 1
      )

      for (const block of pageBlocks) {
        if (block.category === "code" || block.category === "formula" || block.category === "url") {
          continue
        }

        if (!block.translatedText) continue

        const { x, y, width: bboxWidth, height: bboxHeight } = block.bbox
        const pdfY = pageHeight - y - bboxHeight

        // Step 1: Cover original text with white rectangle
        page.drawRectangle({
          x,
          y: pdfY,
          width: bboxWidth + 4,
          height: bboxHeight + 2,
          color: rgb(1, 1, 1),
          borderWidth: 0,
        })

        // Step 2: Calculate adapted font size
        const originalFontSize = block.items[0]?.fontSize || 12
        const adaptedFontSize = this.calculateFontSize(
          block.translatedText,
          bboxWidth,
          originalFontSize,
          font
        )

        // Step 3: Word-wrap if needed
        const lines = this.wrapText(
          block.translatedText,
          bboxWidth,
          adaptedFontSize,
          font
        )

        // Step 4: Draw translated text
        const lineHeight = adaptedFontSize * 1.4
        for (let j = 0; j < lines.length; j++) {
          page.drawText(lines[j], {
            x,
            y: pdfY + bboxHeight - adaptedFontSize - j * lineHeight,
            size: adaptedFontSize,
            font,
            color: rgb(0, 0, 0),
          })
        }
      }
    }

    return pdfDoc.save()
  }

  private calculateFontSize(
    text: string,
    maxWidth: number,
    originalSize: number,
    font: any
  ): number {
    const textWidth = font.widthOfTextAtSize(text, originalSize)
    if (textWidth <= maxWidth) return originalSize
    const adapted = originalSize * (maxWidth / textWidth)
    return Math.max(adapted, 6)
  }

  private wrapText(
    text: string,
    maxWidth: number,
    fontSize: number,
    font: any
  ): string[] {
    const lines: string[] = []
    let currentLine = ""

    for (const char of text) {
      const testLine = currentLine + char
      const testWidth = font.widthOfTextAtSize(testLine, fontSize)

      if (testWidth > maxWidth && currentLine.length > 0) {
        lines.push(currentLine)
        currentLine = char
      } else {
        currentLine = testLine
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine)
    }

    return lines
  }
}
```

**中文字体嵌入策略**:

```typescript
export async function loadChineseFont(): Promise<Uint8Array> {
  // Option 1: Load from public directory (self-hosted)
  const fontResponse = await fetch("/fonts/NotoSansSC-Regular.ttf")
  const fontArrayBuffer = await fontResponse.arrayBuffer()
  return new Uint8Array(fontArrayBuffer)

  // Option 2: Load from node_modules (build-time)
  // import fontPath from "@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-400-normal.woff2"
}
```

**字体文件获取**:

```bash
# 下载 Noto Sans SC 字体 (约 16MB)
curl -L "https://github.com/google/fonts/raw/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf" \
  -o public/fonts/NotoSansSC.ttf

# 或使用 fontsource npm 包 (按字重分包，更小)
npm install @fontsource/noto-sans-sc
```

### 13.6 API 路由实现

#### 翻译 API (`app/api/translate/route.ts`)

```typescript
import { NextRequest } from "next/server"
import { parsePDF } from "@/lib/pdf-parser"
import { aggregateIntoBlocks, detectCodeBlocks, applyContextRules } from "@/lib/code-detector"
import { Translator } from "@/lib/translator"
import { PDFBuilder } from "@/lib/pdf-builder"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get("file") as File

  if (!file || file.type !== "application/pdf") {
    return new Response(JSON.stringify({ error: "Invalid PDF file" }), { status: 400 })
  }

  const pdfBytes = await file.arrayBuffer()

  // Set up SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (progress: TranslateProgress) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
        )
      }

      try {
        // Stage 1: Parse PDF
        sendProgress({
          stage: "parsing", currentPage: 0, totalPages: 0,
          percent: 5, message: "Parsing PDF...",
        })
        const parsed = await parsePDF(pdfBytes)

        // Stage 2: Detect code blocks
        sendProgress({
          stage: "detecting", currentPage: 0, totalPages: parsed.pages.length,
          percent: 15, message: "Detecting code blocks...",
        })
        const allBlocks = parsed.pages.flatMap((page) => {
          const blocks = aggregateIntoBlocks(page.textItems)
          return detectCodeBlocks(blocks)
        })
        const classifiedBlocks = applyContextRules(allBlocks)

        // Stage 3: Translate
        const translator = new Translator({
          secretId: process.env.TENCENT_SECRET_ID!,
          secretKey: process.env.TENCENT_SECRET_KEY!,
        })

        const translatableBlocks = classifiedBlocks.filter(
          (b) => !["code", "formula", "url", "pageNumber"].includes(b.category)
        )

        const texts = translatableBlocks.map((b) => b.text)
        const totalTexts = texts.length

        for (let i = 0; i < totalTexts; i += 20) {
          const batch = texts.slice(i, i + 20)
          const results = await translator.translateBatch(batch)

          for (let j = 0; j < results.length; j++) {
            translatableBlocks[i + j].translatedText = results[j].translated
          }

          const percent = 15 + Math.round(((i + 20) / totalTexts) * 70)
          sendProgress({
            stage: "translating",
            currentPage: Math.min(i + 20, totalTexts),
            totalPages: totalTexts,
            percent,
            message: `Translating ${Math.min(i + 20, totalTexts)}/${totalTexts} blocks...`,
          })
        }

        // Stage 4: Rebuild PDF
        sendProgress({
          stage: "rebuilding", currentPage: 0, totalPages: parsed.pages.length,
          percent: 90, message: "Rebuilding PDF...",
        })

        const builder = new PDFBuilder("public/fonts/NotoSansSC-Regular.ttf")
        const resultBytes = await builder.rebuild(pdfBytes, classifiedBlocks, parsed.pages)

        // Store result in temp storage and return ID
        const jobId = crypto.randomUUID()
        await storeResult(jobId, resultBytes)

        sendProgress({
          stage: "rebuilding", currentPage: parsed.pages.length,
          totalPages: parsed.pages.length, percent: 100,
          message: JSON.stringify({
            jobId,
            stats: {
              totalChars: texts.reduce((s, t) => s + t.length, 0),
              codeBlocks: classifiedBlocks.filter((b) => b.category === "code").length,
            },
          }),
        })

        controller.close()
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`)
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
```

#### 下载 API (`app/api/download/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId")
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 })
  }

  const pdfBytes = await retrieveResult(jobId)
  if (!pdfBytes) {
    return NextResponse.json({ error: "Result not found or expired" }, { status: 404 })
  }

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="translated.pdf"`,
    },
  })
}
```

**临时结果存储** (使用内存 Map，生产环境可替换为 Redis/文件系统):

```typescript
const resultStore = new Map<string, { data: Uint8Array; createdAt: number }>()

export async function storeResult(jobId: string, data: Uint8Array): Promise<void> {
  resultStore.set(jobId, { data, createdAt: Date.now() })
  // Auto-cleanup after 10 minutes
  setTimeout(() => resultStore.delete(jobId), 10 * 60 * 1000)
}

export async function retrieveResult(jobId: string): Promise<Uint8Array | null> {
  const entry = resultStore.get(jobId)
  if (!entry) return null
  if (Date.now() - entry.createdAt > 10 * 60 * 1000) {
    resultStore.delete(jobId)
    return null
  }
  return entry.data
}
```

### 13.7 前端组件实现

#### 根布局 (`app/layout.tsx`)

```typescript
import type { Metadata } from "next"
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" })

export const metadata: Metadata = {
  title: "PDF Translator | 英文 PDF 智能翻译引擎",
  description: "将英文 PDF 文献翻译为中文，保留代码和排版",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans bg-[#0A0A0F] text-[#E4E4E7]`}>
        {children}
      </body>
    </html>
  )
}
```

#### 主页面 (`app/page.tsx`)

```typescript
"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Header } from "@/components/Header"
import { HeroSection } from "@/components/HeroSection"
import { UploadZone } from "@/components/UploadZone"
import { ProgressPanel } from "@/components/ProgressPanel"
import { ResultPanel } from "@/components/ResultPanel"
import { FeatureCard } from "@/components/FeatureCard"
import { Footer } from "@/components/Footer"

type AppState = "idle" | "uploading" | "translating" | "done" | "error"

export default function Home() {
  const [state, setState] = useState<AppState>("idle")
  const [progress, setProgress] = useState<TranslateProgress | null>(null)
  const [result, setResult] = useState<{ jobId: string; stats: any } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async (file: File) => {
    setState("translating")
    setError(null)

    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch("/api/translate", {
      method: "POST",
      body: formData,
    })

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    while (reader) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value)
      const lines = text.split("\n").filter((l) => l.startsWith("data: "))

      for (const line of lines) {
        const data = JSON.parse(line.slice(6))
        if (data.error) {
          setState("error")
          setError(data.error)
          return
        }
        if (data.stage === "rebuilding" && data.percent === 100) {
          const parsed = JSON.parse(data.message)
          setResult(parsed)
          setState("done")
        } else {
          setProgress(data)
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] relative">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: "radial-gradient(circle, #6366F1 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }} />

      <div className="relative z-10">
        <Header />
        <main className="max-w-[960px] mx-auto px-6">
          <HeroSection />

          <AnimatePresence mode="wait">
            {state === "idle" && (
              <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <UploadZone onUpload={handleUpload} />
              </motion.div>
            )}

            {state === "translating" && progress && (
              <motion.div key="progress" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <ProgressPanel progress={progress} />
              </motion.div>
            )}

            {state === "done" && result && (
              <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <ResultPanel jobId={result.jobId} stats={result.stats} onReset={() => setState("idle")} />
              </motion.div>
            )}

            {state === "error" && (
              <motion.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <ErrorPanel message={error!} onRetry={() => setState("idle")} />
              </motion.div>
            )}
          </AnimatePresence>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 mb-16">
            <FeatureCard icon="⬡" title="智能识别" description="自动识别代码块、公式、URL，保持原样不翻译" />
            <FeatureCard icon="⬡" title="格式保留" description="在原始 PDF 布局上覆盖翻译，保留排版结构" />
            <FeatureCard icon="⬡" title="零成本" description="基于免费翻译 API，每月 500 万字符免费额度" />
          </section>
        </main>
        <Footer />
      </div>
    </div>
  )
}
```

#### 上传组件 (`components/UploadZone.tsx`)

```typescript
"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"

interface UploadZoneProps {
  onUpload: (file: File) => void
}

export function UploadZone({ onUpload }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file?.type === "application/pdf") onUpload(file)
  }, [onUpload])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
  }, [onUpload])

  return (
    <motion.div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`
        relative rounded-xl border-2 border-dashed p-12 text-center transition-all duration-300
        ${isDragOver
          ? "border-indigo-500 bg-indigo-500/10 scale-[1.02]"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
        }
      `}
    >
      <input type="file" accept=".pdf" onChange={handleChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
      <div className="text-4xl mb-4">⬡</div>
      <p className="text-lg font-medium text-white/80">拖拽或点击上传 PDF 文件</p>
      <p className="text-sm text-white/40 mt-2 font-mono">支持 .pdf · 最大 20MB</p>
    </motion.div>
  )
}
```

#### 进度面板 (`components/ProgressPanel.tsx`)

```typescript
"use client"

import { motion } from "framer-motion"
import type { TranslateProgress } from "@/lib/types"

const stageLabels = {
  parsing: "PDF 解析",
  detecting: "代码识别",
  translating: "文本翻译",
  rebuilding: "PDF 重建",
}

const stageIcons = {
  parsing: "◉",
  detecting: "◉",
  translating: "◉",
  rebuilding: "◉",
}

export function ProgressPanel({ progress }: { progress: TranslateProgress }) {
  const stages = ["parsing", "detecting", "translating", "rebuilding"] as const
  const currentStageIndex = stages.indexOf(progress.stage)

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-white/60">
          {stageLabels[progress.stage]}...
        </span>
        <span className="font-mono text-indigo-400">{progress.percent}%</span>
      </div>

      <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-6">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress.percent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <div className="space-y-3">
        {stages.map((stage, i) => (
          <div key={stage} className="flex items-center gap-3 text-sm">
            {i < currentStageIndex ? (
              <span className="text-emerald-400">✓</span>
            ) : i === currentStageIndex ? (
              <motion.span
                className="text-indigo-400"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ⟳
              </motion.span>
            ) : (
              <span className="text-white/20">○</span>
            )}
            <span className={i <= currentStageIndex ? "text-white/80" : "text-white/30"}>
              {stageLabels[stage]}
            </span>
          </div>
        ))}
      </div>

      {progress.stage === "translating" && (
        <p className="text-xs text-white/40 mt-4 font-mono">
          {progress.currentPage} / {progress.totalPages} blocks
        </p>
      )}
    </div>
  )
}
```

#### 结果面板 (`components/ResultPanel.tsx`)

```typescript
"use client"

import { motion } from "framer-motion"

interface ResultPanelProps {
  jobId: string
  stats: { totalChars: number; codeBlocks: number }
  onReset: () => void
}

export function ResultPanel({ jobId, stats, onReset }: ResultPanelProps) {
  const downloadUrl = `/api/download?jobId=${jobId}`

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-emerald-400 text-lg">✓</span>
        <span className="text-lg font-medium">翻译完成!</span>
      </div>

      <div className="font-mono text-sm text-white/60 space-y-1 mb-6">
        <p>├─ 翻译字符: {stats.totalChars.toLocaleString()}</p>
        <p>├─ 代码块: {stats.codeBlocks} 处 (已保留)</p>
        <p>└─ 格式: PDF</p>
      </div>

      <div className="flex gap-3">
        <a
          href={downloadUrl}
          download="translated.pdf"
          className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-indigo-500/25 transition-shadow inline-block"
        >
          下载 PDF
        </a>
        <button
          onClick={onReset}
          className="px-4 py-2.5 rounded-lg border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
        >
          重新翻译
        </button>
      </div>
    </div>
  )
}
```

### 13.8 全局样式 (`app/globals.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-inter: var(--font-inter);
  --font-space-grotesk: var(--font-space-grotesk);
  --font-jetbrains-mono: var(--font-jetbrains-mono);
}

body {
  font-family: var(--font-inter), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3 {
  font-family: var(--font-space-grotesk), system-ui, sans-serif;
}

code, .font-mono {
  font-family: var(--font-jetbrains-mono), monospace;
}

@keyframes gradient-flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animate-gradient-flow {
  background-size: 200% 200%;
  animation: gradient-flow 3s ease infinite;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.animate-glow-pulse {
  animation: glow-pulse 2s ease-in-out infinite;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.3);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.5);
}
```

### 13.9 Tailwind 配置 (`tailwind.config.ts`)

```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      colors: {
        surface: "#12121A",
        accent: {
          DEFAULT: "#6366F1",
          secondary: "#8B5CF6",
        },
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)",
        "btn-gradient": "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
        "progress-gradient": "linear-gradient(90deg, #6366F1 0%, #22D3EE 100%)",
      },
    },
  },
  plugins: [],
}

export default config
```

### 13.10 Next.js 配置 (`next.config.js`)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false
    config.resolve.alias.encoding = false
    return config
  },
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist"],
  },
}

module.exports = nextConfig
```

**关键配置说明**:
- `canvas: false`: pdfjs-dist 在 Node.js 中依赖 canvas 模块，Web 环境不需要，需排除
- `encoding: false`: 避免某些 polyfill 冲突
- `serverComponentsExternalPackages`: 确保 pdfjs-dist 在服务端正确加载

### 13.11 环境变量配置 (`.env.example`)

```bash
# 腾讯翻译 API (必填)
TENCENT_SECRET_ID=your_secret_id_here
TENCENT_SECRET_KEY=your_secret_key_here

# 百度翻译 API (可选，备用)
BAIDU_APP_ID=your_app_id_here
BAIDU_SECRET_KEY=your_secret_key_here

# 文件大小限制 (可选，默认 20MB)
MAX_FILE_SIZE=20971520
```

### 13.12 完整初始化流程

```bash
# 1. 创建 Next.js 项目
npx create-next-app@latest pdf-translator --typescript --tailwind --app --src-dir=false --import-alias="@/*"

# 2. 安装核心依赖
cd pdf-translator
npm install pdfjs-dist pdf-lib framer-motion

# 3. 下载中文字体
mkdir -p public/fonts
curl -L "https://github.com/notofonts/noto-cjk/raw/main/Sans/Variable/OTF/NotoSansCJKsc-VF.otf" \
  -o public/fonts/NotoSansSC.otf

# 4. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入腾讯翻译 API 密钥

# 5. 启动开发服务器
npm run dev
```

### 13.13 关键技术难点及解决方案

| 难点 | 问题 | 解决方案 |
|------|------|----------|
| pdfjs-dist Node.js 兼容 | canvas 模块缺失 | webpack alias `canvas: false` + 仅使用文本提取 API |
| 中文字体嵌入 | NotoSansSC 完整版 16MB+ | 使用可变字体 (VF) 版本，约 7MB；或按需子集化 |
| PDF 坐标系转换 | PDF 原点在左下角 | `pdfY = pageHeight - y - height` 转换 |
| 翻译后文本溢出 | 中文可能比英文长 | 字号自适应缩小 + 自动换行算法 |
| SSE 流式响应 | Next.js App Router SSE | 使用 ReadableStream + `text/event-stream` Content-Type |
| 大文件内存 | 100+ 页 PDF 内存占用高 | 分页处理，每页独立解析和重建，流式输出 |
| 字体名映射 | PDF.js 返回内部 ID | 通过 `page.commonObjs` 获取字体描述符，提取原始字体名 |
| 腾讯 API 签名 | HMAC-SHA256 多层签名 | 使用 Node.js crypto 模块纯实现，无需 SDK |
