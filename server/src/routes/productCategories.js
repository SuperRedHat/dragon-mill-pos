import express from 'express';
import { Op } from 'sequelize';
import ProductCategory from '../models/ProductCategory.js';
import Product from '../models/Product.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logMiddleware } from '../utils/operationLog.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// 所有接口都需要认证
router.use(authenticate);

// 获取分类列表（所有用户可访问）
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    
    const where = {};
    if (status) {
      where.status = status;
    }
    
    const categories = await ProductCategory.findAll({
      where,
      include: [{
        model: Product,
        as: 'products',
        attributes: ['id'],
        required: false
      }],
      order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']]
    });
    
    // 添加商品数量统计
    const data = categories.map(category => {
      const categoryData = category.toJSON();
      categoryData.productCount = categoryData.products ? categoryData.products.length : 0;
      delete categoryData.products;
      return categoryData;
    });
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('获取分类列表失败:', error);
    res.status(500).json({ error: '获取分类列表失败' });
  }
});

// 创建分类（仅管理员）
router.post('/', authorize('admin'), logMiddleware('商品管理', '创建分类'), async (req, res) => {
  try {
    const { name, description, sortOrder } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: '分类名称不能为空' });
    }
    
    // 检查名称是否已存在
    const existing = await ProductCategory.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: '分类名称已存在' });
    }
    
    const category = await ProductCategory.create({
      name,
      description,
      sortOrder: sortOrder || 0
    });
    
    res.json({
      success: true,
      data: category,
      message: '分类创建成功'
    });
  } catch (error) {
    logger.error('创建分类失败:', error);
    res.status(500).json({ error: '创建分类失败' });
  }
});

// 更新分类（仅管理员）
router.put('/:id', authorize('admin'), logMiddleware('商品管理', '编辑分类'), async (req, res) => {
  try {
    const { name, description, sortOrder, status } = req.body;
    
    const category = await ProductCategory.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }
    
    // 检查名称是否重复
    if (name && name !== category.name) {
      const existing = await ProductCategory.findOne({ where: { name } });
      if (existing) {
        return res.status(400).json({ error: '分类名称已存在' });
      }
    }
    
    await category.update({
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(status && { status })
    });
    
    res.json({
      success: true,
      data: category,
      message: '分类更新成功'
    });
  } catch (error) {
    logger.error('更新分类失败:', error);
    res.status(500).json({ error: '更新分类失败' });
  }
});

// 删除分类（仅管理员）
router.delete('/:id', authorize('admin'), logMiddleware('商品管理', '删除分类'), async (req, res) => {
  try {
    const category = await ProductCategory.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }
    
    // 检查是否有商品使用此分类
    const productCount = await Product.count({
      where: { categoryId: req.params.id }
    });
    
    if (productCount > 0) {
      return res.status(400).json({ 
        error: `该分类下还有 ${productCount} 个商品，无法删除` 
      });
    }
    
    await category.destroy();
    
    res.json({
      success: true,
      message: '分类删除成功'
    });
  } catch (error) {
    logger.error('删除分类失败:', error);
    res.status(500).json({ error: '删除分类失败' });
  }
});

export default router;