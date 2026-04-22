# Express 框架入门指南

## 什么是 Express？

Express 是 Node.js 最流行的 Web 框架，用于构建 API 和 Web 应用。

**一句话理解**：Express 是 Node.js 原生 HTTP 模块的封装，让你不用手动处理请求路径、请求方法、响应头等繁琐细节。

---

## 核心概念

### 1. 路由（Router）

路由 = HTTP 方法 + 路径 + 处理函数

```typescript
// GET /users → 返回用户列表
app.get('/users', (req, res) => {
  res.json([{ id: 1, name: '张三' }]);
});

// POST /users → 创建用户
app.post('/users', (req, res) => {
  const user = req.body;  // 获取请求体
  res.status(201).json({ id: 2, ...user });
});

// 通配符路由
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;  // 获取路径参数
  res.json({ id: userId });
});
```

### 2. 中间件（Middleware）

中间件是介于请求和响应之间的函数，**按顺序执行**。

```
请求 → Middleware1 → Middleware2 → Handler → 响应
              ↓           ↓
         可以在这里      可以在这里
         修改 req       修改 res
```

**Express 的核心就是中间件系统**

```typescript
// 记录请求日志
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();  // 必须调用 next() 才会继续
});

// 解析 JSON 请求体
app.use(express.json());

// 路由级别的中间件
app.get('/admin', requireAuth, (req, res) => {
  res.json({ secret: '...' });
});
```

### 3. 请求与响应

**req（Request）对象**：
```typescript
req.body        // 请求体 { name: '张三' }
req.params      // 路径参数 /users/:id → { id: '123' }
req.query       // 查询参数 /search?q=keyword → { q: 'keyword' }
req.headers     // 请求头
req.method      // GET, POST, PUT, DELETE
req.path        // 路径 /users
```

**res（Response）对象**：
```typescript
res.json(data)           // 返回 JSON
res.send('hello')        // 返回文本
res.status(404).send()   // 设置状态码
res.redirect('/login')   // 重定向
res.setHeader('X-Custom', 'value')  // 设置响应头
```

---

## 快速体验

### 最简 API

```typescript
const express = require('express');
const app = express();

// 端口 3000 的所有请求
app.listen(3000, () => {
  console.log('服务器启动在 http://localhost:3000');
});
```

### RESTful API 示例

```typescript
const express = require('express');
const app = express();

// 解析 JSON 请求体
app.use(express.json());

// 模拟数据
let users = [
  { id: 1, name: '张三' },
  { id: 2, name: '李四' },
];

// GET /users - 获取用户列表
app.get('/users', (req, res) => {
  res.json(users);
});

// GET /users/:id - 获取单个用户
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
});

// POST /users - 创建用户
app.post('/users', (req, res) => {
  const newUser = { id: Date.now(), ...req.body };
  users.push(newUser);
  res.status(201).json(newUser);
});

// PUT /users/:id - 更新用户
app.put('/users/:id', (req, res) => {
  const index = users.findIndex(u => u.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: '用户不存在' });
  users[index] = { ...users[index], ...req.body };
  res.json(users[index]);
});

// DELETE /users/:id - 删除用户
app.delete('/users/:id', (req, res) => {
  users = users.filter(u => u.id !== parseInt(req.params.id));
  res.status(204).send();
});

app.listen(3000);
```

---

## Express vs KOA

| 特性 | Express | KOA |
|------|---------|-----|
| **版本** | 4.x（2013） | 2.x（2017）/ 3.x（2023） |
| **异步处理** | 回调 / async/await | async/await（原生支持） |
| **中间件** | 线性（next()） | 级联（洋葱模型） |
| **体积** | 较大（含很多内置中间件） | 极简（需手动添加） |
| **错误处理** | try/catch | 统一错误处理中间件 |
| **Context** | req/res 分开 | ctx 统一对象 |
| **学习曲线** | 低 | 中 |

### 1. 异步处理差异

**Express（需要手动 try/catch）**：
```typescript
app.get('/users', async (req, res, next) => {
  try {
    const users = await db.query('SELECT * FROM users');
    res.json(users);
  } catch (err) {
    next(err);  // 必须传给错误中间件
  }
});
```

**KOA（async/await 原生支持）**：
```typescript
app.use(async (ctx) => {
  ctx.body = await db.query('SELECT * FROM users');
});
```

### 2. 中间件模型差异

**Express（线性，中间件必须调用 next()）**：
```
请求 → M1 → M2 → Handler → M2 → M1 → 响应
```

**KOA（洋葱模型，每个中间件都有两次执行机会）**：
```
请求 → M1 → M2 → Handler → M2 → M1 → 响应
         ↓           ↑
      next()    await next()
```

```typescript
// KOA 中间件
app.use(async (ctx, next) => {
  console.log('1 - 请求前');
  await next();  // 等后面的中间件执行完
  console.log('1 - 响应后');
});
```

### 3. Context 统一 vs 分开

**Express**：
```typescript
app.get('/users', (req, res) => {
  req.body;      // 请求体
  req.params;    // 路径参数
  req.query;     // 查询参数
  res.json();    // 响应
});
```

**KOA**：
```typescript
app.use(async (ctx) => {
  ctx.request.body;   // 请求体
  ctx.params;         // 路径参数（需额外配置）
  ctx.query;          // 查询参数
  ctx.body = {};      // 响应（直接赋值）
});
```

---

## 什么时候选哪个？

**选 Express**：
- 快速上手，项目紧迫
- 文档和社区丰富，踩坑少
- 需要大量现成中间件（如 express-session, express-passport）

**选 KOA**：
- 追求代码优雅，喜欢 async/await
- 需要精细控制中间件执行顺序
- 构建轻量级 API

---

## 快速对比代码

**Express**：
```typescript
const express = require('express');
const app = express();

app.use(express.json());

app.get('/api/users', (req, res) => {
  res.json([{ name: '张三' }]);
});

app.listen(3000);
```

**KOA**：
```typescript
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const app = new Koa();

app.use(bodyParser());

app.use(async (ctx) => {
  if (ctx.path === '/api/users' && ctx.method === 'GET') {
    ctx.body = [{ name: '张三' }];
  }
});

app.listen(3000);
```

---

## 本项目中的 Express 用法

在 `backend/src/index.ts` 中：

```typescript
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';

const app = express();

// 中间件
app.use(cors());           // 允许跨域
app.use(express.json());   // 解析 JSON 请求体

// 路由
app.use('/api', routes);

// 启动
app.listen(config.port, () => {
  console.log(`服务器启动在端口 ${config.port}`);
});
```

所有 `/api` 开头的请求都会经过 `routes` 处理，在 `routes/chat.ts` 中定义具体的 API 端点。
