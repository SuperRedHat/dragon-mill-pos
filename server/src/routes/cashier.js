import express from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Member from '../models/Member.js';
import Product from '../models/Product.js';
import ProductCategory from '../models/ProductCategory.js';
import StockRecord from '../models/StockRecord.js';
import { authenticate } from '../middleware/auth.js';
import { logOperation } from '../utils/operationLog.js';
import { logger } from '../utils/logger.js';
import Recipe from '../models/Recipe.js';
import RecipeProduct from '../models/RecipeProduct.js';

const router = express.Router();

// 所有接口都需要认证
router.use(authenticate);

// 生成订单号
const generateOrderNo = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  const second = date.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${year}${month}${day}${hour}${minute}${second}${random}`;
};

// 获取配方用于收银
router.get('/recipes/for-sale', async (req, res) => {
  try {
    const { memberId } = req.query;
    
    const where = {
      status: 'active',
      [Op.or]: [
        { type: 'public' },
        ...(memberId ? [{ memberId: memberId }] : [])
      ]
    };
    
    const recipes = await Recipe.findAll({
      where,
      include: [{
        model: Product,
        as: 'products',
        through: { attributes: ['percentage'] }
      }],
      order: [['usageCount', 'DESC'], ['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: recipes
    });
  } catch (error) {
    logger.error('获取配方失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取配方失败' 
    });
  }
});

// 计算配方价格（用于收银）
router.post('/recipes/calculate', async (req, res) => {
  try {
    const { recipeId, weight } = req.body;
    
    const recipe = await Recipe.findByPk(recipeId, {
      include: [{
        model: Product,
        as: 'products',
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
    for (const product of recipe.products) {
      const materialWeight = weight * product.RecipeProduct.percentage / 100;
      const unitPrice = product.cost || product.price;
      materialCost += materialWeight * unitPrice / 1000;
    }
    
    const totalPrice = materialCost + recipe.processingFee;
    
    res.json({
      success: true,
      data: {
        recipeId: recipe.id,
        recipeName: recipe.name,
        weight,
        materialCost: materialCost.toFixed(2),
        processingFee: recipe.processingFee,
        totalPrice: totalPrice.toFixed(2)
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

// 创建订单（收银结算）
router.post('/checkout', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const {
      memberId,
      items,
      recipes,
      paymentMethod,
      pointsUsed = 0,
      remark
    } = req.body;
    
    // 验证购物车
    if ((!items || items.length === 0) && (!recipes || recipes.length === 0)) {
      await t.rollback();
      return res.status(400).json({ 
        success: false,
        error: '购物车不能为空' 
      });
    }
    
    if (!paymentMethod) {
      await t.rollback();
      return res.status(400).json({ 
        success: false,
        error: '请选择支付方式' 
      });
    }
    
    let member = null;
    let memberPoints = 0;
    
    // 如果有会员ID，查找会员信息
    if (memberId) {
      member = await Member.findByPk(memberId, { transaction: t });
      if (!member) {
        await t.rollback();
        return res.status(404).json({ 
          success: false,
          error: '会员不存在' 
        });
      }
      memberPoints = member.points;
      
      // 检查积分是否足够
      if (pointsUsed > memberPoints) {
        await t.rollback();
        return res.status(400).json({ 
          success: false,
          error: '积分余额不足' 
        });
      }
    }
    
    // 计算订单金额
    let totalAmount = 0;
    const orderItems = [];
    
    // 处理普通商品
    if (items && items.length > 0) {
      for (const item of items) {
        const product = await Product.findByPk(item.productId, { transaction: t });
        
        if (!product) {
          await t.rollback();
          return res.status(404).json({ 
            success: false,
            error: `商品不存在: ID=${item.productId}` 
          });
        }
        
        // 检查库存
        if (product.stock < item.quantity) {
          await t.rollback();
          return res.status(400).json({ 
            success: false,
            error: `商品库存不足: ${product.name}` 
          });
        }
        
        // 计算价格（会员价或普通价）
        const price = (member && product.memberPrice) ? product.memberPrice : product.price;
        const subtotal = price * item.quantity;
        totalAmount += subtotal;
        
        orderItems.push({
          productId: product.id,
          productName: product.name,
          price,
          quantity: item.quantity,
          subtotal,
          unit: product.unit
        });
        
        // 扣减库存
        const beforeStock = product.stock;
        const afterStock = beforeStock - item.quantity;
        
        await product.update({ stock: afterStock }, { transaction: t });
        
        // 记录库存变动
        await StockRecord.create({
          productId: product.id,
          type: 'sale',
          quantity: -item.quantity,
          beforeStock,
          afterStock,
          remark: `销售出库，订单号: ${generateOrderNo()}`,
          operatorId: req.user.id,
          operatorName: req.user.name
        }, { transaction: t });
      }
    }
    
    // 处理配方
    if (recipes && recipes.length > 0) {
      for (const recipeItem of recipes) {
        // 处理临时配方
        if (recipeItem.recipeId && recipeItem.recipeId.toString().startsWith('temp-')) {
          // 临时配方直接使用前端传来的价格，不扣减库存
          const recipePrice = recipeItem.price || 10;
          const subtotal = recipePrice * recipeItem.quantity;
          totalAmount += subtotal;
          
          orderItems.push({
            productId: null,
            productName: `临时配方：${recipeItem.name || '自定义配方'}`,
            price: recipePrice,
            quantity: recipeItem.quantity,
            subtotal,
            unit: '份'
          });
          
          continue; // 跳过后续处理
        }
        
        // 处理正常配方
        const recipe = await Recipe.findByPk(recipeItem.recipeId, {
          include: [{
            model: Product,
            as: 'products',
            through: { attributes: ['percentage'] }
          }],
          transaction: t
        });
        
        if (!recipe) {
          await t.rollback();
          return res.status(404).json({ 
            success: false,
            error: `配方不存在: ID=${recipeItem.recipeId}` 
          });
        }
        
        // 检查商品库存并扣减
        for (const product of recipe.products) {
          const materialWeight = recipeItem.weight * product.RecipeProduct.percentage / 100;
          const materialQuantity = materialWeight / 1000; // 转换为公斤或其他单位
          
          if (product.stock < materialQuantity) {
            await t.rollback();
            return res.status(400).json({ 
              success: false,
              error: `商品库存不足: ${product.name}` 
            });
          }
          
          // 扣减库存
          const beforeStock = product.stock;
          const afterStock = beforeStock - materialQuantity;
          
          await product.update({
            stock: afterStock
          }, { transaction: t });
          
          // 记录库存变动
          await StockRecord.create({
            productId: product.id,
            type: 'sale',
            quantity: -materialQuantity,
            beforeStock,
            afterStock,
            remark: `配方使用：${recipe.name}`,
            operatorId: req.user.id,
            operatorName: req.user.name
          }, { transaction: t });
        }
        
        // 计算配方价格
        let materialCost = 0;
        for (const product of recipe.products) {
          const materialWeight = recipeItem.weight * product.RecipeProduct.percentage / 100;
          const unitPrice = product.cost || product.price;
          materialCost += materialWeight * unitPrice / 1000;
        }
        
        const recipePrice = materialCost + recipe.processingFee;
        const subtotal = recipePrice * recipeItem.quantity;
        totalAmount += subtotal;
        
        // 添加到订单项
        orderItems.push({
          productId: null,
          productName: `配方：${recipe.name}`,
          price: recipePrice,
          quantity: recipeItem.quantity,
          subtotal,
          unit: '份'
        });
        
        // 更新配方使用次数
        await recipe.update({
          usageCount: recipe.usageCount + 1
        }, { transaction: t });
      }
    }

    // 计算积分抵扣金额（假设100积分=1元）
    const pointsValue = pointsUsed / 100;
    const discountAmount = Math.min(pointsValue, totalAmount);
    const actualAmount = totalAmount - discountAmount;
    
    // 计算获得积分（假设消费1元获得1积分）
    const pointsEarned = Math.floor(actualAmount);
    
    // 创建订单
    const order = await Order.create({
      orderNo: generateOrderNo(), 
      memberId: member?.id,
      userId: req.user.id,
      totalAmount,
      discountAmount,
      actualAmount,
      paymentMethod,
      pointsEarned,
      pointsUsed,
      status: 'completed',
      remark
    }, { transaction: t });
    
    // 创建订单明细
    for (const item of orderItems) {
      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
        unit: item.unit
      }, { transaction: t });
    }
    
    // 更新会员积分和消费金额
    if (member) {
      const newPoints = memberPoints - pointsUsed + pointsEarned;
      const newTotalConsumption = parseFloat(member.totalConsumption) + actualAmount;
      
      await member.update({
        points: newPoints,
        totalConsumption: newTotalConsumption
      }, { transaction: t });
    }
    
    // 记录操作日志
    await logOperation({
      userId: req.user.id,
      username: req.user.username,
      module: '收银管理',
      action: '收银结算',
      content: `订单号: ${order.orderNo}, 金额: ¥${actualAmount}`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // 提交事务
    await t.commit();
    
    // 获取完整订单信息返回
    const fullOrder = await Order.findByPk(order.id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: Member, as: 'member' }
      ]
    });
    
    res.json({
      success: true,
      data: fullOrder,
      message: '订单创建成功'
    });
    
  } catch (error) {
    await t.rollback();
    logger.error('创建订单失败:', error);
    res.status(500).json({ 
      success: false,
      error: '创建订单失败' 
    });
  }
});

// 快速商品搜索（支持拼音）
router.get('/products/search', async (req, res) => {
  try {
    const { keyword = '' } = req.query;
    
    if (!keyword) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const products = await Product.findAll({
      where: {
        status: 'on_sale',
        [Op.or]: [
          { name: { [Op.like]: `%${keyword}%` } },
          { shortName: { [Op.like]: `%${keyword}%` } },
          { barcode: keyword }
        ]
      },
      limit: 20
    });
    
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    logger.error('搜索商品失败:', error);
    res.status(500).json({ 
      success: false,
      error: '搜索商品失败' 
    });
  }
});

// 获取所有在售商品（按分类）
router.get('/products/available', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { status: 'on_sale' },
      include: [{
        model: ProductCategory,
        as: 'category',
        attributes: ['id', 'name']
      }],
      order: [
        ['categoryId', 'ASC'],
        ['name', 'ASC']
      ]
    });
    
    // 按分类分组
    const groupedProducts = products.reduce((acc, product) => {
      const categoryName = product.category?.name || '未分类';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(product);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: groupedProducts
    });
  } catch (error) {
    logger.error('获取商品失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取商品失败' 
    });
  }
});

// 获取今日统计
router.get('/today-stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 今日订单统计
    const orders = await Order.findAll({
      where: {
        createdAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        },
        status: 'completed'
      }
    });
    
    const totalAmount = orders.reduce((sum, order) => sum + parseFloat(order.actualAmount), 0);
    const orderCount = orders.length;
    const averageAmount = orderCount > 0 ? totalAmount / orderCount : 0;
    
    res.json({
      success: true,
      data: {
        totalAmount: totalAmount.toFixed(2),
        orderCount,
        averageAmount: averageAmount.toFixed(2),
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error('获取统计失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取统计失败' 
    });
  }
});

export default router;