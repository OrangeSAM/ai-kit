# Frontend 学习指南

## 核心技术点

### 1. React Hooks 状态管理

**useState + useCallback**：
```typescript
const [messages, setMessages] = useState<Message[]>([]);
const sendMessage = useCallback(async (...) => {
  setMessages(prev => [...prev, newMessage]);
}, [dependencies]);
```

**useRef + 滚动到底部**：
```typescript
const messagesEndRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

**AbortController 在 Hook 中使用**：
```typescript
const abortControllerRef = useRef<AbortController | null>(null);

const sendMessage = useCallback(async (...) => {
  abortControllerRef.current?.abort();
  abortControllerRef.current = new AbortController();
  // ...
}, []);
```

---

### 2. SSE 流式消费（AsyncGenerator）

**核心模式**：
```typescript
// 定义生成器
async function* streamChat(request) {
  const response = await fetch(url, ...);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    // 解析 SSE...
    yield event; // 产出事件
  }
}

// 消费生成器
for await (const event of streamChat(request)) {
  if (event.type === 'content') {
    // 更新 UI
  }
}
```

**SSE 事件解析**：
```typescript
// SSE 格式: event: TYPE\ndata: JSON\n\n
const lines = chunk.split('\n');
let eventType = '', eventData = '';

for (const line of lines) {
  if (line.startsWith('event:')) {
    eventType = line.slice(6).trim();
  } else if (line.startsWith('data:')) {
    eventData = line.slice(5).trim();
  } else if (line === '') {
    // 完整事件
    yield { type: eventType, data: JSON.parse(eventData) };
    eventType = eventData = '';
  }
}
```

---

### 3. 状态提升 + 组件组合

**App.tsx** - 管理全局状态（选中的模型）：
```typescript
function App() {
  const [selectedModel, setSelectedModel] = useState('');
  // 将状态和方法传递给子组件
  return <ChatWindow onModelChange={setSelectedModel} />;
}
```

**ChatWindow.tsx** - 管理对话状态：
```typescript
export function ChatWindow({ models, selectedModel, onModelChange }) {
  const { messages, isLoading, sendMessage, clear } = useChat();
  // ...
}
```

**useChat.ts** - 封装业务逻辑：
```typescript
export function useChat() {
  const [messages, setMessages] = useState([]);
  const sendMessage = useCallback(async (...) => {
    // 业务逻辑
  }, []);
  return { messages, sendMessage, clear, ... };
}
```

---

### 4. CSS 变量 + 主题系统

**定义变量**（`index.css`）：
```css
:root {
  --bg-deep: #0c0c14;
  --accent-amber: #f59e0b;
  --font-ui: 'Outfit', sans-serif;
}

.message-content {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border-radius: var(--radius-md);
}
```

**优点**：
- 统一管理颜色、字体、间距
- 便于主题切换
- 减少重复代码

---

### 5. Vite 配置（代理）

**解决跨域**（`vite.config.ts`）：
```typescript
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

请求 `/api/chat` → 自动代理到 `http://localhost:3001/api/chat`

---

## 文件结构

```
src/
├── App.tsx              # 根组件
├── main.tsx             # 入口
├── index.css            # 全局样式 + CSS 变量
├── App.css              # App 布局样式
├── components/
│   ├── ChatWindow.tsx   # 主聊天界面
│   └── ChatWindow.css   # 聊天组件样式
├── hooks/
│   └── useChat.ts       # 聊天逻辑 Hook
└── services/
    └── api.ts           # API 调用封装
```

## 启动

```bash
npm install
npm run dev   # http://localhost:3000
```

## 关键知识点地图

```
浏览器
  └── fetch() 发起请求
        └── AsyncGenerator 消费流
              └── useState 更新 UI
                    └── ChatWindow 渲染消息
                          └── CSS 变量 主题样式
```

---

## 扩展方向

1. **添加新工具**：在 `backend/src/services/tools.ts` 添加新的 `executeXxx` 函数
2. **换 AI 提供商**：修改 `backend/src/services/aiService.ts` 的 API 调用逻辑
3. **添加功能**：在 `useChat` 中添加新的状态和逻辑
4. **美化 UI**：修改 CSS 变量和组件样式
