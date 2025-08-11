import express from 'express';

const router = express.Router();

// 测试路由
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

export default router;