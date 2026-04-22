# AI Kit - 大模型 API 接入体验 Demo

一个同时支持 **Anthropic (Claude)** 和 **OpenAI (GPT)** 的 API 接入示例，展示：

- 普通对话调用（非流式）
- SSE 流式实时输出
- Token 使用量和延迟统计

## 技术栈

- 后端：Node.js + Express + TypeScript
- 前端：React + Vite + TypeScript
- AI SDK：@anthropic-ai/sdk

## 快速开始

### 1. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2. 配置 API Key

```bash
cp backend/.env.example backend/.env
```

## 配置 API Key

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`，填入你的 MiniMax API Key：

```
MINIMAX_API_KEY=your_key_here
MINIMAX_API_BASE=https://api.minimax.chat/v1
```

MiniMax 使用 OpenAI 兼容格式，可以直接替换其他 OpenAI 兼容的 API。

### 3. 启动

```bash
# Terminal 1: 启动后端
cd backend && npm run dev

# Terminal 2: 启动前端
cd frontend && npm run dev
```

访问 http://localhost:3000

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/chat` | POST | 普通对话 |
| `/api/chat/stream` | POST | SSE 流式对话 |
| `/api/models` | GET | 可用模型列表 |
| `/api/health` | GET | 健康检查 |

## 请求示例

```bash
# 普通对话
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","messages":[{"role":"user","content":"你好"}]}'

# SSE 流式（用浏览器或支持 SSE 的工具）
curl -N -X POST http://localhost:3001/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","messages":[{"role":"user","content":"你好"}]}'
```

## 项目结构

```
ai-kit/
├── backend/
│   ├── src/
│   │   ├── index.ts          # 入口
│   │   ├── config/           # 配置
│   │   ├── routes/           # API 路由
│   │   ├── services/         # AI 服务封装
│   │   └── types/            # 类型定义
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # 根组件
│   │   ├── components/       # UI 组件
│   │   ├── hooks/            # React Hooks
│   │   └── services/         # API 调用
│   └── package.json
└── README.md
```

## 学习要点

1. **OpenAI 风格 vs Anthropic 风格**
   - OpenAI：messages + completions，流式用 `data: {...}\n\n`
   - Anthropic：messages，流式用 SSE 事件 `event: content_block_delta\ndata: {...}\n\n`

2. **SSE 流式处理**
   - 后端：`res.write()` 逐步发送
   - 前端：`ReadableStream` + `TextDecoder` 消费

3. **AbortController**
   - 用于取消正在进行的请求
   - 流式输出时可以实现"停止"功能