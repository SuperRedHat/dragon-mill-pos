import express from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import Product from '../models/Product.js';
import ProductCategory from '../models/ProductCategory.js';
import OrderItem from '../models/OrderItem.js';
import StockRecord from '../models/StockRecord.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logMiddleware } from '../utils/operationLog.js';
import { logger } from '../utils/logger.js';
import multer from 'multer';
import path from 'path';
import { ensureDir } from '../utils/ensureDir.js';

const router = express.Router();

// 所有接口都需要认证
router.use(authenticate);

// 确保商品图片目录存在
const productImagesDir = path.join(process.cwd(), 'uploads', 'products');
ensureDir(productImagesDir);

// 配置商品图片上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, productImagesDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});



// 获取商品列表
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      keyword = '',
      categoryId = '',
      status = '',
      stockWarning = ''
    } = req.query;
    
    const offset = (page - 1) * pageSize;
    const where = {};
    
    // 搜索条件
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { shortName: { [Op.like]: `%${keyword}%` } },
        { barcode: { [Op.like]: `%${keyword}%` } }
      ];
    }
    
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    if (status) {
      where.status = status;
    }
    
    // 库存预警筛选
    if (stockWarning === 'out') {
    // 已缺货
    where.stock = 0;
    } else if (stockWarning === 'low') {
    // 库存不足
    where.stock = {
        [Op.and]: [
        { [Op.gt]: 0 },
        { [Op.lte]: sequelize.col('min_stock') }
        ]
    };
    } else if (stockWarning === 'normal') {
    // 库存正常
    where.stock = {
        [Op.and]: [
        { [Op.gt]: sequelize.col('min_stock') },
        { [Op.lt]: sequelize.col('max_stock') }
        ]
    };
    } else if (stockWarning === 'high') {
    // 库存充足/过量
    where.stock = {
        [Op.gte]: sequelize.col('max_stock')
    };
    }
    
    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [{
        model: ProductCategory,
        as: 'category',
        attributes: ['id', 'name']
      }],
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
    logger.error('获取商品列表失败:', error);
    res.status(500).json({ error: '获取商品列表失败' });
  }
});

// 获取补货建议（仅管理员）- 必须在通用的 GET 路由之前
router.get('/replenish-suggestions', authorize('admin'), async (req, res) => {
  try {
    console.log('获取补货建议 API 被调用'); // 调试日志
    
    // 查找需要补货的商品
    const products = await Product.findAll({
      where: {
        status: 'on_sale',
        stock: {
          [Op.lte]: sequelize.col('min_stock')
        }
      },
      include: [{
        model: ProductCategory,
        as: 'category',
        attributes: ['name']
      }],
      order: [
        ['stock', 'ASC'],
        ['name', 'ASC']
      ]
    });
    
    // 计算建议补货量
    const suggestions = products.map(product => {
      const p = product.toJSON();
      const targetStock = Math.floor(p.maxStock * 0.8);
      const suggestedQuantity = Math.max(0, targetStock - p.stock);
      
      return {
        ...p,
        suggestedQuantity,
        urgencyLevel: p.stock === 0 ? 'critical' : 'warning',
        estimatedCost: suggestedQuantity * (p.cost || 0)
      };
    });
    
    const summary = {
      totalProducts: suggestions.length,
      criticalCount: suggestions.filter(p => p.urgencyLevel === 'critical').length,
      warningCount: suggestions.filter(p => p.urgencyLevel === 'warning').length,
      totalQuantity: suggestions.reduce((sum, p) => sum + p.suggestedQuantity, 0),
      totalCost: suggestions.reduce((sum, p) => sum + p.estimatedCost, 0)
    };
    
    console.log(`找到 ${suggestions.length} 个需要补货的商品`); // 调试日志
    
    res.json({
      success: true,
      data: {
        suggestions,
        summary
      }
    });
  } catch (error) {
    logger.error('获取补货建议失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取补货建议失败' 
    });
  }
});

// 批量补货（仅管理员）
router.post('/batch-replenish', authorize('admin'), logMiddleware('库存管理', '批量补货'), async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { products, remark } = req.body;
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: '请选择要补货的商品' });
    }
    
    const results = [];
    const errors = [];
    
    // 处理每个商品的补货
    for (const item of products) {
      try {
        const { productId, quantity } = item;
        
        if (!productId || !quantity || quantity <= 0) {
          errors.push({
            productId,
            error: '无效的商品ID或数量'
          });
          continue;
        }
        
        // 查找商品
        const product = await Product.findByPk(productId, { transaction: t });
        if (!product) {
          errors.push({
            productId,
            error: '商品不存在'
          });
          continue;
        }
        
        // 原子增加库存
        const addQty = Number(quantity);
        await Product.update(
          { stock: sequelize.literal(`stock + ${addQty}`) },
          { where: { id: productId }, transaction: t }
        );
        await product.reload({ transaction: t });
        const afterStock = parseFloat(product.stock);
        const beforeStock = afterStock - addQty;

        // 记录库存变动
        await StockRecord.create({
          productId: product.id,
          type: 'purchase',
          quantity: addQty,
          beforeStock,
          afterStock,
          remark: `批量补货${remark ? ': ' + remark : ''}`,
          operatorId: req.user.id,
          operatorName: req.user.name
        }, { transaction: t });

        results.push({
          productId: product.id,
          productName: product.name,
          beforeStock,
          afterStock,
          addedQuantity: quantity
        });
      } catch (error) {
        errors.push({
          productId: item.productId,
          error: error.message
        });
      }
    }
    
    // 如果所有商品都失败了，回滚事务
    if (results.length === 0 && errors.length > 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: '批量补货失败',
        errors
      });
    }
    
    // 提交事务
    await t.commit();
    
    res.json({
      success: true,
      message: `批量补货完成：成功 ${results.length} 个，失败 ${errors.length} 个`,
      data: {
        successful: results,
        failed: errors,
        summary: {
          total: products.length,
          success: results.length,
          failed: errors.length
        }
      }
    });
  } catch (error) {
    await t.rollback();
    logger.error('批量补货失败:', error);
    res.status(500).json({ error: '批量补货失败' });
  }
});

// 获取补货建议（仅管理员）
router.get('/replenish-suggestions', authenticate, authorize('admin'), async (req, res) => {
  try {
    // 查找需要补货的商品（库存低于最低库存）
    const products = await Product.findAll({
      where: {
        status: 'on_sale',
        stock: {
          [Op.lte]: sequelize.col('min_stock')
        }
      },
      include: [{
        model: ProductCategory,
        as: 'category',
        attributes: ['name']
      }],
      order: [
        // 优先显示缺货商品
        ['stock', 'ASC'],
        ['name', 'ASC']
      ]
    });
    
    // 计算建议补货量
    const suggestions = products.map(product => {
      const p = product.toJSON();
      // 建议补货到最高库存的80%
      const targetStock = Math.floor(p.maxStock * 0.8);
      const suggestedQuantity = Math.max(0, targetStock - p.stock);
      
      return {
        ...p,
        suggestedQuantity,
        urgencyLevel: p.stock === 0 ? 'critical' : 'warning',
        estimatedCost: suggestedQuantity * (p.cost || 0)
      };
    });
    
    // 计算汇总信息
    const summary = {
      totalProducts: suggestions.length,
      criticalCount: suggestions.filter(p => p.urgencyLevel === 'critical').length,
      warningCount: suggestions.filter(p => p.urgencyLevel === 'warning').length,
      totalQuantity: suggestions.reduce((sum, p) => sum + p.suggestedQuantity, 0),
      totalCost: suggestions.reduce((sum, p) => sum + p.estimatedCost, 0)
    };
    
    res.json({
      success: true,
      data: {
        suggestions,
        summary
      }
    });
  } catch (error) {
    logger.error('获取补货建议失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取补货建议失败' 
    });
  }
});

// 批量补货（仅管理员）
router.post('/batch-replenish', authenticate, authorize('admin'), logMiddleware('库存管理', '批量补货'), async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { products, remark } = req.body;
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      await t.rollback();
      return res.status(400).json({ 
        success: false,
        error: '请选择要补货的商品' 
      });
    }
    
    const results = [];
    const errors = [];
    
    // 处理每个商品的补货
    for (const item of products) {
      try {
        const { productId, quantity } = item;
        
        if (!productId || !quantity || quantity <= 0) {
          errors.push({
            productId,
            error: '无效的商品ID或数量'
          });
          continue;
        }
        
        // 查找商品
        const product = await Product.findByPk(productId, { transaction: t });
        if (!product) {
          errors.push({
            productId,
            error: '商品不存在'
          });
          continue;
        }
        
        // 更新库存
        const beforeStock = product.stock;
        const afterStock = beforeStock + quantity;
        
        await product.update(
          { stock: afterStock },
          { transaction: t }
        );
        
        // 记录库存变动
        await StockRecord.create({
          productId: product.id,
          type: 'purchase',
          quantity: quantity,
          beforeStock,
          afterStock,
          remark: remark ? `批量补货: ${remark}` : '批量补货',
          operatorId: req.user.id,
          operatorName: req.user.name
        }, { transaction: t });
        
        results.push({
          productId: product.id,
          productName: product.name,
          beforeStock,
          afterStock,
          addedQuantity: quantity
        });
        
        logger.info(`商品 ${product.name} 补货成功: ${beforeStock} -> ${afterStock}`);
      } catch (error) {
        logger.error(`商品 ${item.productId} 补货失败:`, error);
        errors.push({
          productId: item.productId,
          error: error.message
        });
      }
    }
    
    // 如果所有商品都失败了，回滚事务
    if (results.length === 0 && errors.length > 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: '批量补货失败',
        errors
      });
    }
    
    // 提交事务
    await t.commit();
    
    res.json({
      success: true,
      message: `批量补货完成：成功 ${results.length} 个，失败 ${errors.length} 个`,
      data: {
        successful: results,
        failed: errors,
        summary: {
          total: products.length,
          success: results.length,
          failed: errors.length
        }
      }
    });
  } catch (error) {
    await t.rollback();
    logger.error('批量补货失败:', error);
    res.status(500).json({ 
      success: false,
      error: '批量补货失败' 
    });
  }
});

// 获取单个商品信息
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{
        model: ProductCategory,
        as: 'category'
      }]
    });
    
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    logger.error('获取商品信息失败:', error);
    res.status(500).json({ error: '获取商品信息失败' });
  }
});

// 创建商品（仅管理员）
router.post('/', authorize('admin'), logMiddleware('商品管理', '创建商品'), async (req, res) => {
  try {
    const {
      categoryId,
      name,
      shortName,
      barcode,
      unit,
      price,
      cost,
      memberPrice,
      stock,
      minStock,
      maxStock
    } = req.body;
    
    // 验证必填字段
    if (!categoryId || !name || !price) {
      return res.status(400).json({ error: '分类、名称和价格为必填项' });
    }
    
    // 检查条码是否重复
    if (barcode) {
      const existing = await Product.findOne({ where: { barcode } });
      if (existing) {
        return res.status(400).json({ error: '条形码已存在' });
      }
    }
    
    const product = await Product.create({
      categoryId,
      name,
      shortName,
      barcode,
      unit: unit || '个',
      price,
      cost,
      memberPrice,
      stock: stock || 0,
      minStock: minStock || 0,
      maxStock: maxStock || 1000
    });
    
    // 记录初始库存
    if (stock > 0) {
      await StockRecord.create({
        productId: product.id,
        type: 'purchase',
        quantity: stock,
        beforeStock: 0,
        afterStock: stock,
        remark: '初始库存',
        operatorId: req.user.id,
        operatorName: req.user.name
      });
    }
    
    res.json({
      success: true,
      data: product,
      message: '商品创建成功'
    });
  } catch (error) {
    logger.error('创建商品失败:', error);
    res.status(500).json({ error: '创建商品失败' });
  }
});

// 更新商品（仅管理员）
router.put('/:id', authorize('admin'), logMiddleware('商品管理', '编辑商品'), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    const {
      categoryId,
      name,
      shortName,
      barcode,
      unit,
      price,
      cost,
      memberPrice,
      minStock,
      maxStock,
      status
    } = req.body;
    
    // 检查条码是否重复
    if (barcode && barcode !== product.barcode) {
      const existing = await Product.findOne({ where: { barcode } });
      if (existing) {
        return res.status(400).json({ error: '条形码已存在' });
      }
    }
    
    await product.update({
      ...(categoryId && { categoryId }),
      ...(name && { name }),
      ...(shortName !== undefined && { shortName }),
      ...(barcode !== undefined && { barcode }),
      ...(unit && { unit }),
      ...(price !== undefined && { price }),
      ...(cost !== undefined && { cost }),
      ...(memberPrice !== undefined && { memberPrice }),
      ...(minStock !== undefined && { minStock }),
      ...(maxStock !== undefined && { maxStock }),
      ...(status && { status })
    });
    
    res.json({
      success: true,
      data: product,
      message: '商品更新成功'
    });
  } catch (error) {
    logger.error('更新商品失败:', error);
    res.status(500).json({ error: '更新商品失败' });
  }
});

// 删除商品（仅管理员）
router.delete('/:id', authorize('admin'), logMiddleware('商品管理', '删除商品'), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }

    // P1-5: 存在订单引用时拒绝删除
    const refCount = await OrderItem.count({ where: { productId: product.id } });
    if (refCount > 0) {
      return res.status(400).json({
        success: false,
        error: `该商品已关联 ${refCount} 条订单记录，无法删除`
      });
    }

    await product.destroy();
    
    res.json({
      success: true,
      message: '商品删除成功'
    });
  } catch (error) {
    logger.error('删除商品失败:', error);
    res.status(500).json({ error: '删除商品失败' });
  }
});

// 上传商品图片（仅管理员）
router.post('/:id/image', authorize('admin'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的图片' });
    }
    
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    const imageUrl = `/uploads/products/${req.file.filename}`;
    await product.update({ image: imageUrl });
    
    res.json({
      success: true,
      data: { image: imageUrl },
      message: '图片上传成功'
    });
  } catch (error) {
    logger.error('上传商品图片失败:', error);
    res.status(500).json({ error: error.message || '上传图片失败' });
  }
});

// 库存调整（仅管理员）
router.post('/:id/stock', authorize('admin'), logMiddleware('库存管理', '调整库存'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { type, quantity, remark } = req.body;

    if (!type || !quantity) {
      await t.rollback();
      return res.status(400).json({ error: '请选择调整类型和数量' });
    }

    const product = await Product.findByPk(req.params.id, { transaction: t });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ error: '商品不存在' });
    }

    // 计算变化量
    let delta;
    switch (type) {
      case 'purchase':
        delta = Math.abs(quantity);
        break;
      case 'adjust':
        delta = quantity;
        break;
      case 'loss':
        delta = -Math.abs(quantity);
        break;
      default:
        await t.rollback();
        return res.status(400).json({ error: '无效的调整类型' });
    }

    // 原子更新库存（扣减时检查库存充足）
    let updated;
    if (delta < 0) {
      [updated] = await Product.update(
        { stock: sequelize.literal(`stock + (${delta})`) },
        { where: { id: product.id, stock: { [Op.gte]: Math.abs(delta) } }, transaction: t }
      );
    } else {
      [updated] = await Product.update(
        { stock: sequelize.literal(`stock + ${delta}`) },
        { where: { id: product.id }, transaction: t }
      );
    }
    if (updated === 0) {
      await t.rollback();
      return res.status(400).json({ error: '库存不能为负数' });
    }

    await product.reload({ transaction: t });
    const afterStock = parseFloat(product.stock);
    const beforeStock = afterStock - delta;

    // 记录库存变动
    await StockRecord.create({
      productId: product.id,
      type,
      quantity: delta,
      beforeStock,
      afterStock,
      remark,
      operatorId: req.user.id,
      operatorName: req.user.name
    }, { transaction: t });

    await t.commit();
    res.json({
      success: true,
      data: { beforeStock, afterStock, change: delta },
      message: '库存调整成功'
    });
  } catch (error) {
    await t.rollback();
    logger.error('库存调整失败:', error);
    res.status(500).json({ error: '库存调整失败' });
  }
});

// 获取库存记录
router.get('/:id/stock-records', async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    
    const { count, rows } = await StockRecord.findAndCountAll({
      where: { productId: req.params.id },
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
    logger.error('获取库存记录失败:', error);
    res.status(500).json({ error: '获取库存记录失败' });
  }
});



export default router;