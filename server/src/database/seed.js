import 'dotenv/config';
import User from '../models/User.js';
import { sequelize } from '../config/database.js';
import { logger } from '../utils/logger.js';

const seedDatabase = async () => {
  try {
    await sequelize.sync({ force: true });
    logger.info('数据库表创建成功');

    // 创建默认管理员账户
    const admin = await User.create({
      username: 'admin',
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456',
      name: '系统管理员',
      role: 'admin',
      phone: '13800138000'
    });

    logger.info('默认管理员账户创建成功:', {
      username: admin.username,
      name: admin.name
    });

    // 创建测试员工账户
    const staff = await User.create({
      username: 'staff01',
      password: '123456',
      name: '测试员工',
      role: 'staff',
      phone: '13800138001'
    });

    logger.info('测试员工账户创建成功:', {
      username: staff.username,
      name: staff.name
    });

    logger.info('数据库初始化完成');
    process.exit(0);
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    process.exit(1);
  }
};

seedDatabase();