import express from 'express';
import { Op } from 'sequelize';
import User from '../models/User.js';
import OperationLog from '../models/OperationLog.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logMiddleware } from '../utils/operationLog.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// 所有用户管理接口都需要管理员权限
router.use(authenticate, authorize('admin'));

// 获取用户列表
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      keyword = '',
      role = '',
      status = ''
    } = req.query;
    
    const offset = (page - 1) * pageSize;
    const where = { deletedAt: null };
    
    // 搜索条件
    if (keyword) {
      where[Op.or] = [
        { username: { [Op.like]: `%${keyword}%` } },
        { name: { [Op.like]: `%${keyword}%` } },
        { phone: { [Op.like]: `%${keyword}%` } }
      ];
    }
    
    if (role) {
      where.role = role;
    }
    
    if (status) {
      where.status = status;
    }
    
    const { count, rows } = await User.findAndCountAll({
      where,
      limit: parseInt(pageSize),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['password'] }
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
    logger.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 创建用户
router.post('/', logMiddleware('用户管理', '创建用户'), async (req, res) => {
  try {
    const { username, password, name, phone, role } = req.body;
    
    // 验证必填字段
    if (!username || !password || !name) {
      return res.status(400).json({ 
        error: '用户名、密码和姓名为必填项' 
      });
    }
    
    // 密码长度验证
    if (password.length < 6) {
      return res.status(400).json({ 
        error: '密码长度至少6位' 
      });
    }
    
    // 检查用户名是否已存在
    const existingUser = await User.findOne({ 
      where: { username } 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: '用户名已存在' 
      });
    }
    
    // 创建用户
    const user = await User.create({
      username,
      password,
      name,
      phone,
      role: role || 'staff'
    });
    
    res.json({
      success: true,
      data: user.toJSON(),
      message: '用户创建成功'
    });
  } catch (error) {
    logger.error('创建用户失败:', error);
    res.status(500).json({ error: '创建用户失败' });
  }
});

// 获取单个用户信息
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findOne({
      where: { 
        id: req.params.id,
        deletedAt: null
      },
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 更新用户信息
router.put('/:id', logMiddleware('用户管理', '编辑用户'), async (req, res) => {
  try {
    const { name, phone, role, status } = req.body;
    
    const user = await User.findOne({
      where: { 
        id: req.params.id,
        deletedAt: null
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 不能修改自己的角色
    if (user.id === req.user.id && role && role !== user.role) {
      return res.status(400).json({ 
        error: '不能修改自己的角色' 
      });
    }
    
    // 不能禁用自己
    if (user.id === req.user.id && status === 'inactive') {
      return res.status(400).json({ 
        error: '不能禁用自己的账号' 
      });
    }
    
    await user.update({
      ...(name && { name }),
      ...(phone !== undefined && { phone }),
      ...(role && { role }),
      ...(status && { status })
    });
    
    res.json({
      success: true,
      data: user.toJSON(),
      message: '用户信息更新成功'
    });
  } catch (error) {
    logger.error('更新用户失败:', error);
    res.status(500).json({ error: '更新用户失败' });
  }
});

// 重置用户密码
router.post('/:id/reset-password', logMiddleware('用户管理', '重置密码'), async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({ 
        error: '密码长度至少6位' 
      });
    }
    
    const user = await User.findOne({
      where: { 
        id: req.params.id,
        deletedAt: null
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    await user.update({ password });
    
    res.json({
      success: true,
      message: '密码重置成功'
    });
  } catch (error) {
    logger.error('重置密码失败:', error);
    res.status(500).json({ error: '重置密码失败' });
  }
});

// 删除用户（软删除）
router.delete('/:id', logMiddleware('用户管理', '删除用户'), async (req, res) => {
  try {
    const user = await User.findOne({
      where: { 
        id: req.params.id,
        deletedAt: null
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 不能删除自己
    if (user.id === req.user.id) {
      return res.status(400).json({ 
        error: '不能删除自己的账号' 
      });
    }
    
    await user.update({ 
      deletedAt: new Date(),
      status: 'inactive'
    });
    
    res.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    logger.error('删除用户失败:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

// 恢复已删除的用户
router.post('/:id/restore', logMiddleware('用户管理', '恢复用户'), async (req, res) => {
  try {
    const user = await User.findOne({
      where: { 
        id: req.params.id,
        deletedAt: { [Op.not]: null }
      }
    });
    
    if (!user) {
      return res.status(404).json({ 
        error: '用户不存在或未被删除' 
      });
    }
    
    await user.update({ 
      deletedAt: null,
      status: 'active'
    });
    
    res.json({
      success: true,
      data: user.toJSON(),
      message: '用户恢复成功'
    });
  } catch (error) {
    logger.error('恢复用户失败:', error);
    res.status(500).json({ error: '恢复用户失败' });
  }
});

// 获取已删除的用户列表
router.get('/deleted/list', async (req, res) => {
  try {
    const users = await User.findAll({
      where: { 
        deletedAt: { [Op.not]: null }
      },
      attributes: { exclude: ['password'] },
      order: [['deletedAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('获取已删除用户列表失败:', error);
    res.status(500).json({ error: '获取已删除用户列表失败' });
  }
});

// 获取用户操作日志
router.get('/:id/logs', async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    
    const { count, rows } = await OperationLog.findAndCountAll({
      where: { userId: req.params.id },
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
    res.status(500).json({ error: '获取操作日志失败' });
  }
});

export default router;