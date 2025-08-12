import express from 'express';
import multer from 'multer';
import path from 'path';
import { ensureUploadDirs } from '../utils/ensureDir.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// 确保上传目录存在
const { avatarsDir } = ensureUploadDirs();

// 配置测试上传
const testUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, avatarsDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'test-' + uniqueSuffix + path.extname(file.originalname));
    }
  })
});

// 测试路由
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

// 测试上传路由（不需要认证）
router.post('/upload', testUpload.single('file'), (req, res) => {
  try {
    logger.info('测试上传 - 接收到请求');
    logger.info('文件信息:', req.file);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '没有接收到文件'
      });
    }
    
    res.json({
      success: true,
      message: '文件上传成功',
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        path: `/uploads/avatars/${req.file.filename}`
      }
    });
  } catch (error) {
    logger.error('测试上传失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 检查上传目录
router.get('/check-dirs', (req, res) => {
  const fs = require('fs');
  const uploadsPath = path.join(process.cwd(), 'uploads');
  const avatarsPath = path.join(uploadsPath, 'avatars');
  
  res.json({
    success: true,
    data: {
      cwd: process.cwd(),
      uploadsPath,
      avatarsPath,
      uploadsExists: fs.existsSync(uploadsPath),
      avatarsExists: fs.existsSync(avatarsPath)
    }
  });
});

export default router;