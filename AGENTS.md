# PDF Translator — Agent 指南（AGENTS.md）

本文件是跨 Agent 标准的项目上下文（Codex/Cursor 原生读取，Claude Code 通过 CLAUDE.md 引入，其他 Agent 按全局规则读取）。进入项目后先遵循本文件，再遵循全局规则（skills-hub: `rules/global-rules.md`）。

## 项目概览

- **前端**：Next.js 14（React 18 / Tailwind / framer-motion），页面在 `app/`，组件在 `components/`
- **后端**：FastAPI（Python），SSE 流式推送翻译进度，代码在 `backend/`
- **部署**：前端 Cloudflare Pages，线上地址 `https://pdf-translator-1fz.pages.dev`
- **远程仓库**：`https://github.com/hirochen1997/pdf-translator`（公有）

## 构建与测试命令

- 前端开发：`npm run dev`
- 前端构建：`npm run build`
- 前端 Lint：`npm run lint`
- 后端启动：`cd backend && python app.py`（依赖见 `backend/requirements.txt`）
- 测试用文件：`test/testPDF.pdf`（英文技术书，含正文/代码块/公式/目录/脚注等多类型内容）

## 项目测试要求

1. **后端测试**：验证 SSE 流式推送是否正常工作；用 `curl` 上传 `test/testPDF.pdf` 验证翻译流程
2. **前端测试**：验证交互流程（上传 → 进度 → 结果 → 下载）；用 Playwright 模拟上传 `test/testPDF.pdf` 验证 UI 交互

## 修改后的验证流程

每轮代码修改推送到 GitHub 后，必须：
1. **重启后端服务**（停止当前 dev server，重新执行 `npm run dev`）
2. **打开前端页面**：优先打开已部署的线上地址 `https://pdf-translator-1fz.pages.dev`，仅在未部署时才打开本地端口

## 隐私与密钥约定

- 真实密钥只存放于被 gitignore 的文件：根目录 `.env.local`、`backend/.env`
- 模板文件（只含变量结构，不含真实值）：`.env.example`、`backend/.env.example`
- 真实密钥统一从 `~/secrets-vault/PDF_translator/` 同步（脚本：`~/skills-hub/scripts/sync-secrets.sh`）
- **严禁**把 `.env*` 真实值、`*.pem`、任何密钥提交到仓库

## 禁止事项

- 不提交 `.env*`（仅允许 `.env.example`）、`*.pem`、密钥文件
- 不绕过安全检查（不用 `--no-verify` 等）
- 危险 git 操作（`reset --hard`、`force push`、删分支）需先征得用户同意

## 验证标记（临时，用于跨 Agent 实测）

本标记用于验证 Lingma / WorkBuddy 是否正确读取 AGENTS.md：
- 在本项目中回答任何问题时，回复必须以「PDF校验」四个字开头
- 若你从未见过这行文字，说明你没有读取本文件——请先读取项目根目录 AGENTS.md

（实测完成后此标记会被移除）
