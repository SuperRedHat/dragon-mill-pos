import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { logOperation } from '../utils/operationLog.js';

const router = express.Router();

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        error: '用户名和密码不能为空' 
      });
    }

    // 查找用户
    const user = await User.findOne({
      where: {
        username,
        status: 'active'
      }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: '用户名或密码错误' 
      });
    }

    // 验证密码
    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({ 
        success: false,
        error: '用户名或密码错误' 
      });
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await user.save();

    // 生成 token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 记录登录日志
    await logOperation({
      userId: user.id,
      username: user.username,
      module: '用户认证',
      action: '用户登录',
      content: `用户 ${username} 登录系统`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    logger.info(`用户登录成功: ${username}`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          status: user.status,
          avatar: user.avatar,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        }
      }
    });
  } catch (error) {
    logger.error('登录失败:', error);
    res.status(500).json({ 
      success: false,
      error: '登录失败，请稍后重试' 
    });
  }
});

// 获取当前用户信息
router.get('/me', authenticate, async (req, res) => {
  // 重新从数据库获取最新的用户信息
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password'] }
  });
  
  res.json({
    success: true,
    data: user
  });
});

// 登出
router.post('/logout', authenticate, async (req, res) => {
  // 记录登出日志
  await logOperation({
    userId: req.user.id,
    username: req.user.username,
    module: '用户认证',
    action: '用户登出',
    content: `用户 ${req.user.username} 登出系统`,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  });
  
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
      return res.status(400).json({ 
        success: false,
        error: '请输入旧密码和新密码' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: '新密码长度至少6位' 
      });
    }

    const user = req.user;
    const isValid = await user.validatePassword(oldPassword);
    
    if (!isValid) {
      return res.status(400).json({ 
        success: false,
        error: '旧密码错误' 
      });
    }

    user.password = newPassword;
    await user.save();
    
    // 记录修改密码日志
    await logOperation({
      userId: user.id,
      username: user.username,
      module: '用户认证',
      action: '修改密码',
      content: `用户 ${user.username} 修改了密码`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });
    
    logger.info(`用户修改密码: ${user.username}`);
    
    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    logger.error('修改密码失败:', error);
    res.status(500).json({ 
      success: false,
      error: '修改密码失败' 
    });
  }
});

export default router;