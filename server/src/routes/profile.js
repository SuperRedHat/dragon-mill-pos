import express from 'express';
import { Op } from 'sequelize';
import User from '../models/User.js';
import OperationLog from '../models/OperationLog.js';
import { authenticate } from '../middleware/auth.js';
import { logOperation } from '../utils/operationLog.js';
import { logger } from '../utils/logger.js';
import { ensureUploadDirs } from '../utils/ensureDir.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// 确保上传目录存在
const { avatarsDir } = ensureUploadDirs();

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter: function (req, file, cb) {
    console.log('文件过滤器 - 文件信息:', {
      originalname: file.originalname,
      mimetype: file.mimetype
    });
    
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件（jpg, jpeg, png, gif）'));
    }
  }
});

// 所有个人信息接口都需要认证
router.use(authenticate);

// 更新个人信息
router.put('/update', async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    const userId = req.user.id;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: '用户不存在' 
      });
    }
    
    // 更新信息
    await user.update({
      ...(name && { name }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email })
    });
    
    // 记录操作日志
    await logOperation({
      userId: user.id,
      username: user.username,
      module: '个人信息',
      action: '更新信息',
      content: '更新了个人信息',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });
    
    logger.info(`用户更新个人信息: ${user.username}`);
    
    res.json({
      success: true,
      data: user.toJSON(),
      message: '个人信息更新成功'
    });
  } catch (error) {
    logger.error('更新个人信息失败:', error);
    res.status(500).json({ 
      success: false,
      error: '更新个人信息失败' 
    });
  }
});

// 上传头像
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    console.log('收到头像上传请求');
    console.log('文件信息:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: '请选择要上传的图片' 
      });
    }
    
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = req.user;
    
    // 更新用户头像
    await user.update({ avatar: avatarUrl });
    
    // 记录操作日志
    await logOperation({
      userId: user.id,
      username: user.username,
      module: '个人信息',
      action: '更新头像',
      content: '更新了头像',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });
    
    logger.info(`用户 ${user.username} 更新了头像`);
    
    res.json({
      success: true,
      data: {
        avatar: avatarUrl
      },
      message: '头像上传成功'
    });
  } catch (error) {
    logger.error('上传头像失败:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || '上传头像失败' 
    });
  }
});

// 获取登录历史（需要额外的登录日志表，这里简化处理）
router.get('/login-history', async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    
    // 从操作日志中获取登录记录
    const { count, rows } = await OperationLog.findAndCountAll({
      where: {
        userId: req.user.id,
        action: '用户登录'
      },
      limit: parseInt(pageSize),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: {
        list: rows,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    logger.error('获取登录历史失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取登录历史失败' 
    });
  }
});

// 获取个人操作日志
router.get('/operation-logs', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, module, action } = req.query;
    const offset = (page - 1) * pageSize;
    
    const where = {
      userId: req.user.id
    };
    
    if (module) {
      where.module = module;
    }
    
    if (action) {
      where.action = action;
    }
    
    const { count, rows } = await OperationLog.findAndCountAll({
      where,
      limit: parseInt(pageSize),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: {
        list: rows,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    logger.error('获取操作日志失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取操作日志失败' 
    });
  }
});

// 获取个人统计信息
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取登录次数
    const loginCount = await OperationLog.count({
      where: {
        userId,
        action: '用户登录'
      }
    });
    
    // 获取操作次数
    const operationCount = await OperationLog.count({
      where: {
        userId
      }
    });
    
    res.json({
      success: true,
      data: {
        loginCount,
        operationCount,
        lastLogin: req.user.lastLoginAt,
        accountAge: Math.floor((new Date() - new Date(req.user.createdAt)) / (1000 * 60 * 60 * 24))
      }
    });
  } catch (error) {
    logger.error('获取统计信息失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取统计信息失败' 
    });
  }
});

export default router;