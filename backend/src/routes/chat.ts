/**
 * 聊天路由 - 支持普通调用、SSE 流式调用、Function Calling
 */

import { Router } from 'express';
import { chatWithTools, streamChatWithTools } from '../services/aiService.js';
import { AVAILABLE_TOOLS } from '../services/tools.js';
import type { ChatRequest } from '../types/index.js';

const router = Router();

/**
 * POST /api/chat - 普通对话 + Function Calling
 */
router.post('/', async (req, res) => {
  try {
    const { model, messages, maxTokens, system } = req.body as ChatRequest;

    if (!model || !messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Invalid request: model and messages are required' });
      return;
    }

    const result = await chatWithTools({
      model,
      messages,
      maxTokens,
      system,
    });

    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/chat/stream - SSE 流式对话 + Function Calling
 */
router.post('/stream', async (req, res) => {
  const { model, messages, maxTokens, system } = req.body as ChatRequest;

  if (!model || !messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'Invalid request: model and messages are required' });
    return;
  }

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    for await (const event of streamChatWithTools({ model, messages, maxTokens, system })) {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);

      if (event.type === 'complete' || event.type === 'error') {
        res.end();
        return;
      }
    }
  } catch (error) {
    console.error('Stream error:', error);
    res.write(`event: error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/tools - 获取可用工具列表
 */
router.get('/tools', (_req, res) => {
  res.json({
    tools: AVAILABLE_TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    })),
  });
});

export default router;