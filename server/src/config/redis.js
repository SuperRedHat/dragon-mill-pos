import { createClient } from 'redis';
import { logger } from '../utils/logger.js';

let redisClient = null;

// Redis 连接配置
const connectRedis = async () => {
  // 如果没有配置 Redis，则跳过连接
  if (!process.env.REDIS_HOST) {
    logger.info('Redis 未配置，跳过连接');
    return null;
  }

  try {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || 6379),
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis 连接错误:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis 连接成功');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Redis 连接失败:', error);
    // Redis 连接失败不影响系统启动
    return null;
  }
};

// 获取 Redis 客户端
const getRedisClient = () => redisClient;

// 缓存包装函数 - 当 Redis 不可用时，直接执行函数
const cacheWrapper = async (key, fn, ttl = 3600) => {
  if (!redisClient) {
    // Redis 不可用，直接执行函数
    return await fn();
  }

  try {
    // 尝试从缓存获取
    const cached = await redisClient.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // 执行函数并缓存结果
    const result = await fn();
    await redisClient.setEx(key, ttl, JSON.stringify(result));
    return result;
  } catch (error) {
    logger.error('缓存操作失败:', error);
    // 缓存失败时，直接返回函数结果
    return await fn();
  }
};

export { connectRedis, getRedisClient, cacheWrapper };