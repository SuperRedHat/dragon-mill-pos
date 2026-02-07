import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';
import recipesRouter from './routes/recipes.js';
import { ensureUploadDirs } from './utils/ensureDir.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 确保必要的目录存在
const { uploadsDir } = ensureUploadDirs();

// 基础中间件
app.use(helmet({
  crossOriginResourcePolicy: false, // 允许跨域访问静态资源
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


app.use('/api/v1/recipes', recipesRouter);
// 日志中间件
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// 限流配置
const limiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT_MAX || 100),
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
});

// 应用限流到 API 路由
app.use('/api/', limiter);

// 静态文件服务 - 必须在API路由之前
const uploadsPath = path.join(__dirname, '../uploads');
logger.info(`静态文件目录: ${uploadsPath}`);
app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif')) {
      res.set('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// API 路由 (test routes removed — P0-1/P0-2)
app.use('/api/v1', routes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'dragon-mill-pos-server'
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '请求的资源不存在' });
});

// 错误处理中间件
app.use(errorHandler);

export default app;
