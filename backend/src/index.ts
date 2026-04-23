/**
 * 后端入口 - AI API 接入体验 Demo
 */

import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import routes from './routes/index.js';

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// API 路由
app.use('/api', routes);

// 启动服务器
app.listen(config.port, () => {
  console.log(`

  > AI Kit Backend v1.0
  > http://localhost:${config.port}

  POST  /api/chat          Chat
  POST  /api/chat/stream   SSE Streaming
  GET   /api/models        Model List
  GET   /api/health        Health Check

`);

  if (!config.miniMaxApiKey) {
    console.warn('⚠️  MINIMAX_API_KEY 未配置，请复制 .env.example 为 .env 并填入 key');
  }
});