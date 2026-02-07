import 'dotenv/config';
import User from '../models/User.js';
import OperationLog from '../models/OperationLog.js';
import { sequelize } from '../config/database.js';
import { logger } from '../utils/logger.js';

const seedDatabase = async () => {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 同步数据库表（生产环境请使用迁移）
    await sequelize.sync({ force: true });
    logger.info('数据库表创建成功');

    // 创建默认管理员账户
    const admin = await User.create({
      username: 'admin',
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'changeme',
      name: '系统管理员',
      role: 'admin',
      phone: '13800138000',
      status: 'active'
    });

    logger.info('默认管理员账户创建成功:', {
      username: admin.username,
      name: admin.name
    });

    // 创建测试员工账户
    const staff = await User.create({
      username: 'staff01',
      password: process.env.DEFAULT_STAFF_PASSWORD || 'changeme',
      name: '测试员工',
      role: 'staff',
      phone: '13800138001',
      status: 'active'
    });

    logger.info('测试员工账户创建成功:', {
      username: staff.username,
      name: staff.name
    });

    // 创建一些测试操作日志
    await OperationLog.create({
      userId: admin.id,
      username: admin.username,
      module: '系统',
      action: '初始化',
      content: '系统初始化完成',
      ip: '127.0.0.1'
    });

    logger.info('数据库初始化完成');
    logger.info('===================');
    logger.info('默认账号信息：');
    logger.info('管理员 - 用户名: admin（密码见 DEFAULT_ADMIN_PASSWORD 环境变量）');
    logger.info('员工 - 用户名: staff01（密码见 DEFAULT_STAFF_PASSWORD 环境变量）');
    logger.info('===================');
    
    process.exit(0);
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    process.exit(1);
  }
};

seedDatabase();