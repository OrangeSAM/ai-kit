/**
 * 模型列表路由
 */

import { Router } from 'express';
import { ALL_MODELS } from '../services/aiService.js';

const router = Router();

/**
 * GET /api/models - 获取可用模型列表
 */
router.get('/', (_req, res) => {
  res.json({ models: ALL_MODELS });
});

export default router;