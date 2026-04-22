# Backend 学习指南

## 核心技术点

### 1. SSE（Server-Sent Events）流式传输

**什么是 SSE**：服务器向浏览器单向推送数据的技术，类比 WebSocket 但更轻量。

```
客户端请求 → 服务器保持连接 → 逐块发送数据 → 连接关闭
```

**实现方式**（见 `src/routes/chat.ts`）：
```typescript
// 设置响应头
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');

// 逐块发送数据
res.write(`event: content\ndata: ${JSON.stringify({ text: '你好' })}\n\n`);
res.write(`event: complete\ndata: ${JSON.stringify({})}\n\n`);
res.end();
```

**SSE vs WebSocket**：
| 特性 | SSE | WebSocket |
|------|-----|-----------|
| 方向 | 单向（服务器→客户端）| 双向 |
| 协议 | HTTP/1.1 | ws:// |
| 自动重连 | 支持 | 需手动实现 |
| 兼容性 | IE 不支持 | 主流都支持 |
| 简单实现 | ✅ | 较复杂 |

**前端消费 SSE**（见 `frontend/src/hooks/useChat.ts`）：
```typescript
const response = await fetch('/api/chat/stream', options);
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // 解析: event: TYPE\ndata: JSON\n\n
  // ...
}
```

---

### 2. OpenAI 兼容 API 格式

MiniMax 等国内厂商基本都兼容 OpenAI 格式。

**请求格式**：
```json
POST /v1/chat/completions
{
  "model": "MiniMax-M2.7",
  "messages": [
    {"role": "user", "content": "你好"}
  ],
  "stream": true
}
```

**流式响应**：
```
data: {"choices":[{"delta":{"content":"你"}}]}
data: {"choices":[{"delta":{"content":"好"}}]}
data: [DONE]
```

**MiniMax 特有**（见 `src/services/tools.ts` 的 `toMiniMaxToolsFormat`）：
```typescript
// 工具格式转换
{
  "type": "function",
  "function": {
    "name": "get_weather",
    "description": "查询天气",
    "parameters": {
      "type": "object",
      "properties": {
        "city": { "type": "string", "description": "城市名" }
      },
      "required": ["city"]
    }
  }
}
```

---

### 3. Function Calling（工具调用）

**流程**：
```
用户提问 → 模型判断需要调用工具 → 返回 tool_calls → 执行工具 → 把结果传回模型 → 模型生成最终回复
```

**关键代码路径**：
- `src/types/index.ts` - 定义 `Tool`、`ToolCall`、`ToolResult` 类型
- `src/services/tools.ts` - 工具注册表 + 执行器
- `src/services/aiService.ts` - `chatWithTools()` 和 `streamChatWithTools()`

**工具定义示例**：
```typescript
{
  name: 'get_weather',
  description: '查询城市天气',
  inputSchema: {
    type: 'object',
    properties: {
      city: { type: 'string', description: '城市名称' },
      unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
    },
    required: ['city']
  }
}
```

**多轮调用支持**（`streamChatWithTools`）：
```typescript
// 最多 5 轮工具调用
for (let round = 0; round < 5; round++) {
  // 1. 发送请求获取响应
  // 2. 检查是否有 tool_calls
  // 3. 执行工具
  // 4. 把结果追加到 messages
  // 5. 继续下一轮
}
```

---

### 4. 小技巧

**AbortController 取消请求**：
```typescript
const controller = new AbortController();
// 在 fetch 时传入
fetch(url, { signal: controller.signal });
// 取消
controller.abort();
```

**SSE 解析正则**：
```typescript
// 解析 event: TYPE\ndata: JSON\n\n
const lines = chunk.split('\n');
let eventType = '', eventData = '';
for (const line of lines) {
  if (line.startsWith('event:')) eventType = line.slice(6).trim();
  else if (line.startsWith('data:')) eventData = line.slice(5).trim();
  else if (line === '') {
    // 一个完整事件结束
    console.log(eventType, JSON.parse(eventData));
    eventType = eventData = '';
  }
}
```

---

## 文件结构

```
src/
├── index.ts           # Express 入口
├── config/            # 环境变量
├── routes/
│   ├── chat.ts        # /api/chat 和 /api/chat/stream
│   └── models.ts      # /api/models
├── services/
│   ├── aiService.ts   # AI SDK 封装（核心）
│   └── tools.ts       # 工具注册表
└── types/             # TypeScript 类型定义
```

## 启动

```bash
npm install
npm run dev   # http://localhost:3001
```
