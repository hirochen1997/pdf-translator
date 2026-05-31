# PDF Translator Project Rules

## 1. 项目特定测试要求

### 后端测试
- 验证 SSE 流式推送是否正常工作
- 验证交互流程（上传 → 进度 → 结果 → 下载）

### 前端测试
- 验证交互流程（上传 → 进度 → 结果 → 下载）

## 2. 测试文件

- 使用 `test/testPDF.pdf` 作为测试文件
- 该文件是一本英文技术书籍（Learning Spark），包含正文、代码块、公式、目录、脚注等多种内容类型
- 后端测试时使用 curl 上传该文件验证翻译流程
- 前端测试时使用 Playwright 模拟上传该文件验证 UI 交互

## 3. 修改验证后重启服务

每轮对话中，代码修改推送到 GitHub 后，必须：
1. 重启后端服务（停止当前运行的 dev server，重新执行 `npm run dev`）
2. 自动打开前端页面：优先打开已部署的线上地址（https://pdf-translator-1fz.pages.dev），仅在未部署时才打开本地端口
