import express from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import Member from '../models/Member.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Recipe from '../models/Recipe.js';
import RecipeProduct from '../models/RecipeProduct.js'; 
import Product from '../models/Product.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logMiddleware } from '../utils/operationLog.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// 所有接口都需要认证
router.use(authenticate);

// 获取会员列表
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      keyword = '',
      status = ''
    } = req.query;
    
    const offset = (page - 1) * pageSize;
    const where = {};
    
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { phone: { [Op.like]: `%${keyword}%` } },
        { memberNo: { [Op.like]: `%${keyword}%` } }
      ];
    }
    
    if (status) {
      where.status = status;
    }
    
    const { count, rows } = await Member.findAndCountAll({
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
    logger.error('获取会员列表失败:', error);
    res.status(500).json({ error: '获取会员列表失败' });
  }
});

// 搜索会员（用于收银台快速搜索）- 增强版
router.get('/search', authenticate, async (req, res) => {
  try {
    const { keyword = '' } = req.query;
    
    if (!keyword) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const members = await Member.findAll({
      where: {
        [Op.or]: [
          { memberNo: { [Op.like]: `%${keyword}%` } },
          { name: { [Op.like]: `%${keyword}%` } },
          { phone: { [Op.like]: `%${keyword}%` } }
        ],
        status: 'active'
      },
      include: [
        {
          model: Recipe,
          as: 'recipes',
          where: {
            status: 'active',
            type: 'private'
          },
          required: false,
          include: [{
            model: Product,
            as: 'products',
            through: { attributes: ['percentage'] },
            required: false
          }]
        }
      ],
      limit: 10,
      order: [['createdAt', 'DESC']]  // 使用简单的排序
    });
    
    // 格式化返回数据
    const results = members.map(member => {
      const memberData = member.toJSON();
      
      // 处理配方信息
      if (memberData.recipes && memberData.recipes.length > 0) {
        memberData.recipes = memberData.recipes.map(recipe => ({
          id: recipe.id,
          name: recipe.name,
          displayName: recipe.name,
          usageCount: recipe.usageCount || 0,
          materials: recipe.products?.map(p => ({
            name: p.name,
            percentage: p.RecipeProduct?.percentage
          })) || []
        }));
      }
      
      return memberData;
    });
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('搜索会员失败:', error);
    res.status(500).json({ 
      success: false,
      error: '搜索会员失败' 
    });
  }
});

// 根据手机号查找会员（收银台使用）
router.get('/phone/:phone', async (req, res) => {
  try {
    const member = await Member.findOne({
      where: { 
        phone: req.params.phone,
        status: 'active'
      }
    });
    
    if (!member) {
      return res.status(404).json({ 
        success: false,
        error: '会员不存在' 
      });
    }
    
    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    logger.error('查找会员失败:', error);
    res.status(500).json({ error: '查找会员失败' });
  }
});

// 创建会员
router.post('/', logMiddleware('会员管理', '创建会员'), async (req, res) => {
  try {
    const { name, phone, birthday, email, remark } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ error: '姓名和手机号为必填项' });
    }
    
    // 检查手机号是否已存在
    const existing = await Member.findOne({ where: { phone } });
    if (existing) {
      return res.status(400).json({ error: '该手机号已注册' });
    }
    
    // 处理空字符串的邮箱
    const memberData = {
      name,
      phone,
      birthday: birthday || null,
      email: email && email.trim() ? email : null,  // 空字符串转为 null
      remark: remark || null
    };
    
    const member = await Member.create(memberData);
    
    res.json({
      success: true,
      data: member,
      message: '会员创建成功'
    });
  } catch (error) {
    logger.error('创建会员失败:', error);
    res.status(500).json({ error: '创建会员失败' });
  }
});

// 更新会员信息
router.put('/:id', logMiddleware('会员管理', '编辑会员'), async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({ error: '会员不存在' });
    }
    
    const { name, phone, birthday, email, status, remark } = req.body;
    
    // 检查手机号是否重复
    if (phone && phone !== member.phone) {
      const existing = await Member.findOne({ where: { phone } });
      if (existing) {
        return res.status(400).json({ error: '该手机号已被使用' });
      }
    }
    
    await member.update({
      ...(name && { name }),
      ...(phone && { phone }),
      ...(birthday !== undefined && { birthday }),
      ...(email !== undefined && { email }),
      ...(status && { status }),
      ...(remark !== undefined && { remark })
    });
    
    res.json({
      success: true,
      data: member,
      message: '会员信息更新成功'
    });
  } catch (error) {
    logger.error('更新会员失败:', error);
    res.status(500).json({ error: '更新会员失败' });
  }
});

// 调整积分（仅管理员）
router.post('/:id/points', authorize('admin'), logMiddleware('会员管理', '调整积分'), async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { points, type, reason } = req.body;
    
    if (!points || !type || !reason) {
      await t.rollback();
      return res.status(400).json({ error: '请填写完整信息' });
    }
    
    const member = await Member.findByPk(req.params.id, { transaction: t });
    if (!member) {
      await t.rollback();
      return res.status(404).json({ error: '会员不存在' });
    }
    
    const oldPoints = member.points;
    let newPoints = oldPoints;
    
    if (type === 'add') {
      newPoints = oldPoints + Math.abs(points);
    } else if (type === 'deduct') {
      newPoints = Math.max(0, oldPoints - Math.abs(points));
    } else {
      await t.rollback();
      return res.status(400).json({ error: '无效的调整类型' });
    }
    
    await member.update({ points: newPoints }, { transaction: t });
    
    // TODO: 记录积分变动日志
    
    await t.commit();
    
    res.json({
      success: true,
      data: {
        oldPoints,
        newPoints,
        change: newPoints - oldPoints
      },
      message: '积分调整成功'
    });
  } catch (error) {
    await t.rollback();
    logger.error('调整积分失败:', error);
    res.status(500).json({ error: '调整积分失败' });
  }
});

// 获取会员消费记录
router.get('/:id/orders', async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;
    
    const { count, rows } = await Order.findAndCountAll({
      where: { 
        memberId: req.params.id,
        status: 'completed'
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
    logger.error('获取消费记录失败:', error);
    res.status(500).json({ error: '获取消费记录失败' });
  }
});

export default router;