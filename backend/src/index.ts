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
╔═══════════════════════════════════════════════════════════════╗
║             AI Kit Backend Server                             ║
╠═══════════════════════════════════════════════════════════════╣
║  Local:    http://localhost:${config.port}                    ║
║  API:      http://localhost:${config.port}/api                ║
║  Health:   http://localhost:${config.port}/api/health         ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║  POST /api/chat          - 普通对话                            ║
║  POST /api/chat/stream   - SSE 流式对话                        ║
║  GET  /api/models        - 可用模型列表                         ║
╚═══════════════════════════════════════════════════════════════╝
  `);

  if (!config.miniMaxApiKey) {
    console.warn('⚠️  MINIMAX_API_KEY 未配置，请复制 .env.example 为 .env 并填入 key');
  }
});