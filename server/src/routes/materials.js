import express from 'express';
import { Op } from 'sequelize';
import Material from '../models/Material.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logMiddleware } from '../utils/operationLog.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// 所有接口都需要认证
router.use(authenticate);

// 获取材料列表
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      keyword = '',
      category = '',
      status = ''
    } = req.query;
    
    const offset = (page - 1) * pageSize;
    const where = {};
    
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { supplier: { [Op.like]: `%${keyword}%` } }
      ];
    }
    
    if (category) {
      where.category = category;
    }
    
    if (status) {
      where.status = status;
    }
    
    const { count, rows } = await Material.findAndCountAll({
      where,
      limit: parseInt(pageSize),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
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
    logger.error('获取材料列表失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取材料列表失败' 
    });
  }
});

// 创建材料（仅管理员）
router.post('/', authorize('admin'), logMiddleware('配方管理', '创建材料'), async (req, res) => {
  try {
    const material = await Material.create(req.body);
    res.json({
      success: true,
      data: material,
      message: '材料创建成功'
    });
  } catch (error) {
    logger.error('创建材料失败:', error);
    res.status(500).json({ 
      success: false,
      error: '创建材料失败' 
    });
  }
});

// 更新材料（仅管理员）
router.put('/:id', authorize('admin'), logMiddleware('配方管理', '更新材料'), async (req, res) => {
  try {
    const material = await Material.findByPk(req.params.id);
    if (!material) {
      return res.status(404).json({ 
        success: false,
        error: '材料不存在' 
      });
    }
    
    await material.update(req.body);
    res.json({
      success: true,
      data: material,
      message: '材料更新成功'
    });
  } catch (error) {
    logger.error('更新材料失败:', error);
    res.status(500).json({ 
      success: false,
      error: '更新材料失败' 
    });
  }
});

// 删除材料（仅管理员）
router.delete('/:id', authorize('admin'), logMiddleware('配方管理', '删除材料'), async (req, res) => {
  try {
    const material = await Material.findByPk(req.params.id);
    if (!material) {
      return res.status(404).json({ 
        success: false,
        error: '材料不存在' 
      });
    }
    
    await material.destroy();
    res.json({
      success: true,
      message: '材料删除成功'
    });
  } catch (error) {
    logger.error('删除材料失败:', error);
    res.status(500).json({ 
      success: false,
      error: '删除材料失败' 
    });
  }
});

export default router;