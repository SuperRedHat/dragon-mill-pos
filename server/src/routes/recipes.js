import express from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import Recipe from '../models/Recipe.js';
import Material from '../models/Material.js';
import RecipeMaterial from '../models/RecipeMaterial.js';
import Member from '../models/Member.js';
import { authenticate } from '../middleware/auth.js';
import { logMiddleware } from '../utils/operationLog.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// 所有接口都需要认证
router.use(authenticate);

// 获取配方列表
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      keyword = '',
      type = '',
      memberId = ''
    } = req.query;
    
    const offset = (page - 1) * pageSize;
    const where = {};
    
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { recipeNo: { [Op.like]: `%${keyword}%` } }
      ];
    }
    
    if (type) {
      where.type = type;
    }
    
    // 获取公共配方或自己的私人配方
    if (!memberId) {
      where[Op.or] = [
        { type: ['public', 'template'] },
        { memberId: req.user.memberId } // 假设用户关联了会员
      ];
    } else {
      where.memberId = memberId;
    }
    
    const { count, rows } = await Recipe.findAndCountAll({
      where,
      include: [
        {
          model: Material,
          as: 'materials',
          through: { attributes: ['percentage', 'amount'] }
        },
        {
          model: Member,
          as: 'owner',
          attributes: ['id', 'name', 'phone']
        }
      ],
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
    logger.error('获取配方列表失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取配方列表失败' 
    });
  }
});

// 创建配方
router.post('/', logMiddleware('配方管理', '创建配方'), async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { materials, ...recipeData } = req.body;
    
    // 验证材料配比总和是否为100%
    const totalPercentage = materials.reduce((sum, m) => sum + parseFloat(m.percentage), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      await t.rollback();
      return res.status(400).json({ 
        success: false,
        error: '材料配比总和必须为100%' 
      });
    }
    
    // 创建配方
    const recipe = await Recipe.create(recipeData, { transaction: t });
    
    // 添加材料
    for (const material of materials) {
      await RecipeMaterial.create({
        recipeId: recipe.id,
        materialId: material.materialId,
        percentage: material.percentage,
        amount: (recipe.totalWeight * material.percentage / 100).toFixed(2)
      }, { transaction: t });
    }
    
    await t.commit();
    
    // 获取完整配方信息
    const fullRecipe = await Recipe.findByPk(recipe.id, {
      include: [{
        model: Material,
        as: 'materials',
        through: { attributes: ['percentage', 'amount'] }
      }]
    });
    
    res.json({
      success: true,
      data: fullRecipe,
      message: '配方创建成功'
    });
  } catch (error) {
    await t.rollback();
    logger.error('创建配方失败:', error);
    res.status(500).json({ 
      success: false,
      error: '创建配方失败' 
    });
  }
});

// 更新配方
router.put('/:id', logMiddleware('配方管理', '更新配方'), async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const recipe = await Recipe.findByPk(req.params.id);
    if (!recipe) {
      return res.status(404).json({ 
        success: false,
        error: '配方不存在' 
      });
    }
    
    // 检查权限（私人配方只能自己修改）
    if (recipe.type === 'private' && recipe.memberId !== req.user.memberId) {
      return res.status(403).json({ 
        success: false,
        error: '无权修改此配方' 
      });
    }
    
    const { materials, ...recipeData } = req.body;
    
    // 更新配方基本信息
    await recipe.update(recipeData, { transaction: t });
    
    // 如果有材料更新
    if (materials) {
      // 删除原有材料
      await RecipeMaterial.destroy({
        where: { recipeId: recipe.id },
        transaction: t
      });
      
      // 添加新材料
      for (const material of materials) {
        await RecipeMaterial.create({
          recipeId: recipe.id,
          materialId: material.materialId,
          percentage: material.percentage,
          amount: (recipe.totalWeight * material.percentage / 100).toFixed(2)
        }, { transaction: t });
      }
    }
    
    await t.commit();
    
    res.json({
      success: true,
      data: recipe,
      message: '配方更新成功'
    });
  } catch (error) {
    await t.rollback();
    logger.error('更新配方失败:', error);
    res.status(500).json({ 
      success: false,
      error: '更新配方失败' 
    });
  }
});

// 复制配方
router.post('/:id/copy', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const sourceRecipe = await Recipe.findByPk(req.params.id, {
      include: [{
        model: Material,
        as: 'materials',
        through: { attributes: ['percentage'] }
      }]
    });
    
    if (!sourceRecipe) {
      return res.status(404).json({ 
        success: false,
        error: '源配方不存在' 
      });
    }
    
    // 创建新配方
    const newRecipe = await Recipe.create({
      name: req.body.name || `${sourceRecipe.name} - 副本`,
      type: req.body.type || 'private',
      memberId: req.user.memberId,
      description: sourceRecipe.description,
      totalWeight: sourceRecipe.totalWeight,
      processingFee: sourceRecipe.processingFee,
      nutrition: sourceRecipe.nutrition,
      suitableFor: sourceRecipe.suitableFor
    }, { transaction: t });
    
    // 复制材料
    for (const material of sourceRecipe.materials) {
      await RecipeMaterial.create({
        recipeId: newRecipe.id,
        materialId: material.id,
        percentage: material.RecipeMaterial.percentage,
        amount: (newRecipe.totalWeight * material.RecipeMaterial.percentage / 100).toFixed(2)
      }, { transaction: t });
    }
    
    await t.commit();
    
    res.json({
      success: true,
      data: newRecipe,
      message: '配方复制成功'
    });
  } catch (error) {
    await t.rollback();
    logger.error('复制配方失败:', error);
    res.status(500).json({ 
      success: false,
      error: '复制配方失败' 
    });
  }
});

// 计算配方价格
router.post('/:id/calculate-price', async (req, res) => {
  try {
    const { weight = 100 } = req.body;
    
    const recipe = await Recipe.findByPk(req.params.id, {
      include: [{
        model: Material,
        as: 'materials',
        through: { attributes: ['percentage'] }
      }]
    });
    
    if (!recipe) {
      return res.status(404).json({ 
        success: false,
        error: '配方不存在' 
      });
    }
    
    // 计算材料成本
    let materialCost = 0;
    const materialDetails = [];
    
    for (const material of recipe.materials) {
      const materialWeight = weight * material.RecipeMaterial.percentage / 100;
      const materialPrice = materialWeight * material.price / 1000; // 假设价格按千克计算
      
      materialCost += materialPrice;
      materialDetails.push({
        name: material.name,
        weight: materialWeight,
        price: materialPrice
      });
    }
    
    // 总价 = 材料成本 + 加工费
    const totalPrice = materialCost + recipe.processingFee;
    
    res.json({
      success: true,
      data: {
        weight,
        materialCost: materialCost.toFixed(2),
        processingFee: recipe.processingFee,
        totalPrice: totalPrice.toFixed(2),
        materialDetails
      }
    });
  } catch (error) {
    logger.error('计算配方价格失败:', error);
    res.status(500).json({ 
      success: false,
      error: '计算配方价格失败' 
    });
  }
});

export default router;