import OperationLog from '../models/OperationLog.js';
import { logger } from './logger.js';

/**
 * 记录操作日志
 * @param {Object} params - 日志参数
 * @param {number} params.userId - 用户ID
 * @param {string} params.username - 用户名
 * @param {string} params.module - 模块名称
 * @param {string} params.action - 操作名称
 * @param {string} params.content - 操作内容
 * @param {string} params.ip - IP地址
 * @param {string} params.userAgent - 用户代理
 */
export const logOperation = async (params) => {
  try {
    await OperationLog.create({
      userId: params.userId,
      username: params.username,
      module: params.module,
      action: params.action,
      content: params.content,
      ip: params.ip,
      userAgent: params.userAgent
    });
  } catch (error) {
    // 记录日志失败不影响主业务
    logger.error('记录操作日志失败:', error);
  }
};

/**
 * Express中间件 - 自动记录操作日志
 * @param {string} module - 模块名称
 * @param {string} action - 操作名称
 */
export const logMiddleware = (module, action) => {
  return async (req, res, next) => {
    // 保存原始的json方法
    const originalJson = res.json;
    
    // 重写json方法以捕获响应
    res.json = function(data) {
      // 只有成功的响应才记录日志
      if (data.success || (!data.error && res.statusCode < 400)) {
        const content = generateContent(action, req, data);
        
        logOperation({
          userId: req.user?.id || 0,
          username: req.user?.username || 'system',
          module,
          action,
          content,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        });
      }
      
      // 调用原始方法
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * 生成操作内容描述
 */
function generateContent(action, req, res) {
  const contents = {
    '创建用户': () => `创建用户：${req.body.username}`,
    '编辑用户': () => `编辑用户：ID=${req.params.id}`,
    '删除用户': () => `删除用户：ID=${req.params.id}`,
    '恢复用户': () => `恢复用户：ID=${req.params.id}`,
    '重置密码': () => `重置用户密码：ID=${req.params.id}`,
    '修改密码': () => `修改自己的密码`,
    '用户登录': () => `用户登录：${req.body.username}`,
    '用户登出': () => `用户登出`
  };
  
  const generator = contents[action];
  return generator ? generator() : action;
}