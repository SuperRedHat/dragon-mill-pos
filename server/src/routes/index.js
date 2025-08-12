import express from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import profileRoutes from './profile.js';
import productCategoryRoutes from './productCategories.js'; 
import productRoutes from './products.js';

const router = express.Router();

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

// 用户管理路由
router.use('/users', userRoutes);

// 个人信息路由
router.use('/profile', profileRoutes);

// 商品分类路由
router.use('/product-categories', productCategoryRoutes);

// 商品路由
router.use('/products', productRoutes);

// TODO: 后续在这里导入其他路由模块
// import productRoutes from './product.js';
// import orderRoutes from './order.js';
// import memberRoutes from './member.js';
// import reportRoutes from './report.js';

// router.use('/products', productRoutes);
// router.use('/orders', orderRoutes);
// router.use('/members', memberRoutes);
// router.use('/reports', reportRoutes);

export default router;