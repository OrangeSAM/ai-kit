# routes/chat.ts 代码解析

这个文件定义了 3 个路由端点，是前端和 AI 服务之间的"中间人"。

## 整体流程

```
前端 fetch 请求
    ↓
routes/chat.ts  ← 你现在在这里
    ↓                做三件事：① 校验参数 ② 调用 aiService ③ 返回结果
aiService.ts
    ↓
MiniMax API
```

## 三个端点

### 1. `POST /api/chat` — 普通对话（非流式）

```
前端发 JSON → 等待 → 收到完整 JSON 响应
```

核心逻辑就这几行：

```ts
// 从请求体解构参数
const { model, messages, maxTokens, system } = req.body as ChatRequest;

// 校验：model 和 messages 必填
if (!model || !messages || !Array.isArray(messages)) {
  res.status(400).json({ error: '...' });
  return;
}

// 调 aiService，等它返回完整结果，直接 JSON 返回
const result = await chatWithTools({ model, messages, maxTokens, system });
res.json(result);
```

`as ChatRequest` 是类型断言——告诉 TS "我保证 req.body 符合这个类型"。实际上没有运行时校验，如果前端传了畸形数据，运行时可能会出问题。

### 2. `POST /api/chat/stream` — 流式对话（SSE）

这是和普通对话最大的区别：**不是等全部完成再返回，而是一边生成一边发**。

```ts
// 第一步：设置 SSE 必要的响应头
res.setHeader('Content-Type', 'text/event-stream');  // 告诉浏览器这是事件流
res.setHeader('Cache-Control', 'no-cache');           // 不要缓存
res.setHeader('Connection', 'keep-alive');            // 保持长连接
res.setHeader('X-Accel-Buffering', 'no');            // 禁止 Nginx 缓冲
```

```ts
// 第二步：for await 循环消费 aiService 的 AsyncGenerator
for await (const event of streamChatWithTools({ ... })) {
  // 每收到一个事件，立刻写入响应流
  res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);

  // 收到完成或错误事件时，关闭连接
  if (event.type === 'complete' || event.type === 'error') {
    res.end();
    return;
  }
}
```

SSE 协议格式就是 `event: 类型\ndata: JSON\n\n`，每个事件之间用空行分隔。

**关键区别**：普通对话用 `await` 等一个结果，流式对话用 `for await...of` 循环接收多个事件。这是因为 `streamChatWithTools` 是个 **AsyncGenerator**（`async function*`），它不会一次返回，而是 `yield` 一个事件就暂停，前端收到一个 chunk，再 `yield` 下一个。

### 3. `GET /api/tools` — 获取可用工具列表

最简单，把工具定义转成 JSON 返回给前端展示。

```ts
router.get('/tools', (_req, res) => {
  res.json({
    tools: AVAILABLE_TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    })),
  });
});
```

`_req` 前面的下划线表示"这个参数我接收了但不用"，避免 TS 的 `noUnusedParameters` 报错。

## 容易忽略的细节

1. **流式路由没有 `try/catch` 包裹参数校验前的解构**（第 44 行），如果 `req.body` 是 `undefined`，解构不会报错（得到 `undefined`），但如果传了非 JSON 的 body，`express.json()` 中间件会先返回 400，所以实际上不会到这里。

2. **`res.end()` 的位置**：流式路由在收到 `complete`/`error` 后调 `res.end()` 关闭连接。如果 `streamChatWithTools` 的 generator 正常结束但没 yield `complete`（比如循环 break 了），连接不会被关闭，客户端会一直挂着。目前靠 `aiService.ts` 里的 "Maximum tool call rounds reached" error 事件兜底。
