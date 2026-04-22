# AI Kids 学习规划

## 当前已实现

- ✅ 基础对话调用（MiniMax M2.7）
- ✅ SSE 流式输出
- ✅ Function Calling / 工具调用

---

## 待新增功能

### 1. 多轮对话上下文
- 现在每次请求都是独立的，AI 记不住之前的对话
- 需要在请求中携带历史消息

### 2. Structured Output
- 让 AI 返回结构化 JSON，不是纯文本
- MiniMax 支持 JSON Mode

### 3. RAG（检索增强）
- 私有知识库，让 AI 读自己的文档
- 需要接入向量数据库（Milvus / Qdrant）

### 4. Embeddings + 向量数据库
- 文本相似度、语义搜索
- 目前项目暂无涉及

### 5. AI 角色设定（预设角色）
- 预设不同风格的 AI 助手
- 属于 Prompt 工程范畴

### 6. 多模态
- 图片生成（DALL-E、Stable Diffusion）
- 语音合成

---

## 综合项目规划

### 技术栈

```
前端：React + Vite
后端：Egg.js（换框架练习）
数据库：MongoDB（存对话历史）+ Redis（缓存）
AI：MiniMax
```

### 功能列表

| 功能 | 实践内容 |
|------|---------|
| 用户注册/登录（JWT 鉴权） | Egg.js 中间件、加密、Session |
| 对话功能（多轮上下文） | MongoDB 存历史、上下文管理 |
| SSE 流式输出 | Egg.js 响应 Stream |
| Function Calling | 多轮 Agent 架构 |
| 对话搜索 | MongoDB 模糊查询 |
| Token 用量统计 | Redis 计数器 |
| AI 角色设定 | Prompt 工程 |

### 项目结构（Egg.js 约定）

```
ai-kit-backend/
├── app/
│   ├── controller/      # 处理请求
│   │   ├── auth.js
│   │   └── chat.js
│   ├── service/         # 业务逻辑
│   │   ├── chat.js
│   │   ├── user.js
│   │   └── ai.js        # AI 服务封装
│   ├── model/           # MongoDB 模型
│   │   ├── user.js
│   │   └── conversation.js
│   ├── router.js        # 路由定义
│   └── middleware/       # 中间件
│       └── auth.js
├── config/
│   └── config.default.js
└── package.json
```

### 工作量估算

- 基础框架 + 用户模块：1-2天
- 对话功能（含历史）：1天
- SSE 流式 + Function Calling：1天
- 搜索 + 用量统计：1天

**总工期：大概 4-5 天**

---

## 技术讨论笔记

### 后端深入方向

1. **性能 & 扩展** - 索引优化、缓存策略
2. **可靠性** - 重试机制、熔断降级、幂等性
3. **数据建模** - 分库分表、读写分离
4. **安全** - SQL注入、XSS、RBAC
5. **架构** - 微服务、消息队列、定时任务

### Node.js 框架选择

| 框架 | 特点 | 适用场景 |
|------|------|---------|
| Express | 生态最丰富、最流行 | 个人/小团队 |
| Koa | 优雅、async/await 原生 | 小团队（略鸡肋） |
| Egg.js | 约定大于配置、企业级 | 中大团队 |
| NestJS | TypeScript + 依赖注入 | 大型企业 |

### MongoDB vs Mongoose

- MongoDB = 数据库软件
- Mongoose = Node.js 连接 MongoDB 的驱动 + ORM
- 类比：MySQL + JDBC/Sequelize

### Node.js 能连的数据库

MongoDB、MySQL、PostgreSQL、Redis、SQLite、Neo4j 等都有对应驱动。

### "约定大于配置"的理解

- Express = 毛坯房，自己定规范
- Egg.js = 精装房，约定好目录结构和文件名，框架自动加载
- Koa = 简装房，有建议但不强求

目的：减少团队沟通成本，让代码结构统一。
