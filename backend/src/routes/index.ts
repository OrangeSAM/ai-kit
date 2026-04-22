/**
 * 路由汇总
 */

import { Router } from 'express';
import chatRoutes from './chat.js';
import modelsRoutes from './models.js';

const router = Router();

router.use('/chat', chatRoutes);
router.use('/models', modelsRoutes);

// 健康检查
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;