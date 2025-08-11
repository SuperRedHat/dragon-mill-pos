import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 查找用户
    const user = await User.findOne({
      where: {
        username,
        status: 'active',
        deletedAt: null
      }
    });

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 更新最后登录时间
    await user.update({ lastLoginAt: new Date() });

    // 生成 token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 记录登录日志
    logger.info(`用户登录成功: ${username}`);

    res.json({
      success: true,
      data: {
        token,
        user: user.toJSON()
      }
    });
  } catch (error) {
    logger.error('登录失败:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// 获取当前用户信息
router.get('/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    data: req.user.toJSON()
  });
});

// 登出（前端清除 token 即可，这里可以记录日志）
router.post('/logout', authenticate, async (req, res) => {
  logger.info(`用户登出: ${req.user.username}`);
  res.json({
    success: true,
    message: '登出成功'
  });
});

// 修改密码
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '请输入旧密码和新密码' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少6位' });
    }

    const user = req.user;
    const isValid = await user.validatePassword(oldPassword);
    
    if (!isValid) {
      return res.status(400).json({ error: '旧密码错误' });
    }

    await user.update({ password: newPassword });
    
    logger.info(`用户修改密码: ${user.username}`);
    
    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    logger.error('修改密码失败:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

export default router;