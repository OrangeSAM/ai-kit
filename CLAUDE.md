# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

AI API 接入体验 Demo，全栈 TypeScript 项目。前端 React + Vite，后端 Express，当前对接 MiniMax API（OpenAI 兼容格式）。

## 常用命令

```bash
# 安装所有依赖（根目录）
npm run install:all

# 启动开发（需要两个终端）
npm run dev:backend    # 后端 http://localhost:3001
npm run dev:frontend   # 前端 http://localhost:3000

# 后端单独操作
cd backend
npm run dev            # tsx watch 热重载
npm run build          # tsc 编译到 dist/
npm start              # 运行编译产物

# 前端单独操作
cd frontend
npm run dev            # Vite 开发服务器
npm run build          # tsc + vite build
npm run preview        # 预览构建产物
```

## 架构

前后端独立 package，前端通过 Vite proxy (`/api` → `http://localhost:3001`) 转发请求到后端。

### 后端 (`backend/src/`)

- `config/index.ts` — 读取环境变量，所有配置集中导出
- `routes/` — Express 路由，`chat.ts` 处理 `/api/chat` 和 `/api/chat/stream`，`models.ts` 处理模型列表
- `services/aiService.ts` — 核心 AI 集成，用 `fetch` 直接调 MiniMax OpenAI 兼容 API，支持非流式和 SSE 流式，内置多轮 Function Calling 循环（最多 5 轮）
- `services/tools.ts` — Function Calling 工具注册，包含 `get_weather`、`get_time`、`search_code` 三个演示工具
- `types/index.ts` — 共享类型：`Message`、`ChatRequest`、`ChatResponse`、`Tool`、`ToolCall`、`SSEEventType`

### 前端 (`frontend/src/`)

- `services/api.ts` — API 客户层，`fetchModels()`、`chat()`、`streamChat()`（AsyncGenerator 解析 SSE）
- `hooks/useChat.ts` — 聊天逻辑 Hook，管理消息状态、流式/非流式切换、AbortController 取消
- `components/ChatWindow.tsx` — 主聊天 UI，含模型选择、系统提示词输入、消息列表、工具调用面板、调试信息

### 数据流

```
用户输入 → useChat hook → api.ts (fetch) → Vite proxy → Express routes → aiService → MiniMax API
                                                          ↓
                              SSE stream ← aiService 流式解析 ← MiniMax SSE
                                 ↓
                           api.ts SSE parser → useChat 状态更新 → ChatWindow 渲染
```

## 环境配置

后端需要 `backend/.env`（从 `.env.example` 复制），至少配置 `MINIMAX_API_KEY`。`.env` 不应提交到 git。

## 类型系统

后端 tsconfig 启用 `strict` 模式。前端额外启用 `noUnusedLocals` 和 `noUnusedParameters`，编译时未使用的变量会报错。
