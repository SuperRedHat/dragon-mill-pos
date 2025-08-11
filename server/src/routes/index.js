import { Router } from 'express';
import authRoutes from './auth.js';

const router = Router();

// 欢迎信息
router.get('/', (req, res) => {
  res.json({
    message: '神龙磨坊收银管理系统 API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 认证路由
router.use('/auth', authRoutes);

// TODO: 后续在这里导入其他路由模块
// import userRoutes from './user.js';
// import productRoutes from './product.js';
// import orderRoutes from './order.js';
// import memberRoutes from './member.js';
// import reportRoutes from './report.js';

// router.use('/users', userRoutes);
// router.use('/products', productRoutes);
// router.use('/orders', orderRoutes);
// router.use('/members', memberRoutes);
// router.use('/reports', reportRoutes);

export default router;