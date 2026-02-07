import 'dotenv/config';
import app from './app.js';
import { logger } from './utils/logger.js';
import { sequelize } from './config/database.js';
import { connectRedis } from './config/redis.js';

const PORT = process.env.PORT || 3001;

// 数据库连接和服务器启动
const startServer = async () => {
  try {
    // P0-3: JWT_SECRET 必须存在，否则拒绝启动
    if (!process.env.JWT_SECRET) {
      logger.error('FATAL: JWT_SECRET environment variable is not set. Server cannot start without it.');
      process.exit(1);
    }

    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 同步数据库模型（生产环境请使用迁移）
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('数据库模型同步完成');
    }

    // P0-9: 开发模式下检查关键迁移列是否存在（仅警告，不阻止启动）
    if (process.env.NODE_ENV === 'development') {
      try {
        const { QueryTypes } = await import('sequelize');
        const cols = await sequelize.query(
          `SELECT COLUMN_NAME FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items'
           AND COLUMN_NAME IN ('recipe_id', 'recipe_details', 'is_recipe')`,
          { type: QueryTypes.SELECT }
        );
        const found = cols.map(r => r.COLUMN_NAME || r.column_name);
        const missing = ['recipe_id', 'recipe_details', 'is_recipe'].filter(c => !found.includes(c));
        if (missing.length > 0) {
          logger.warn(`order_items 表缺少列: ${missing.join(', ')} — 请运行 npm run db:migrate`);
        }
      } catch {
        // 表可能不存在（首次启动前未 db:init），静默跳过
      }
    }

    // 连接 Redis（可选）
    await connectRedis();

    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`服务器运行在端口 ${PORT}`);
      logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API 路由: http://localhost:${PORT}/api/v1`);
      logger.info(`静态文件: http://localhost:${PORT}/uploads/`);
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

process.on('SIGINT', async () => {
  logger.info('收到 SIGINT 信号，开始优雅关闭...');
  await sequelize.close();
  process.exit(0);
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的 Promise 拒绝:', reason);
  process.exit(1);
});

startServer();
