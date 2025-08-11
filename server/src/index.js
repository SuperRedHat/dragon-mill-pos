import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sequelize } from './config/database.js';
import { connectRedis } from './config/redis.js';
import routes from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// 基础中间件
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// 限流配置
const limiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT_MAX || 100),
  message: '请求过于频繁，请稍后再试',
});

app.use('/api/', limiter);

// 静态文件服务
app.use('/uploads', express.static('uploads'));

// API 路由
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

// 数据库连接和服务器启动
const startServer = async () => {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 同步数据库模型（生产环境请使用迁移）
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('数据库模型同步完成');
    }

    // 连接 Redis（可选）
    await connectRedis();

    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`服务器运行在端口 ${PORT}`);
      logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGTERM', async () => {
  logger.info('收到 SIGTERM 信号，开始优雅关闭...');
  await sequelize.close();
  process.exit(0);
});

startServer();