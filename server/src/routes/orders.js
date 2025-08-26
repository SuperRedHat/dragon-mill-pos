import express from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Member from '../models/Member.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import StockRecord from '../models/StockRecord.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logOperation } from '../utils/operationLog.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// 所有接口都需要认证
router.use(authenticate);

// 获取订单列表
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 10,
      orderNo = '',
      memberId = '',
      userId = '',
      status = '',
      startDate = '',
      endDate = ''
    } = req.query;
    
    const offset = (page - 1) * pageSize;
    const where = {};
    
    if (orderNo) {
      where.orderNo = { [Op.like]: `%${orderNo}%` };
    }
    
    if (memberId) {
      where.memberId = memberId;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        { model: Member, as: 'member', attributes: ['name', 'phone'] },
        { model: User, as: 'cashier', attributes: ['name'] }
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
    logger.error('获取订单列表失败:', error);
    res.status(500).json({ error: '获取订单列表失败' });
  }
});

// 获取订单详情
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: Member, as: 'member' },
        { model: User, as: 'cashier', attributes: ['name', 'username'] }
      ]
    });
    
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('获取订单详情失败:', error);
    res.status(500).json({ error: '获取订单详情失败' });
  }
});

// 退货处理（仅管理员）
router.post('/:id/refund', authorize('admin'), async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { reason, items } = req.body;
    
    if (!reason) {
      await t.rollback();
      return res.status(400).json({ error: '请填写退货原因' });
    }
    
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: Member, as: 'member' }
      ],
      transaction: t
    });
    
    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: '订单不存在' });
    }
    
    if (order.status !== 'completed') {
      await t.rollback();
      return res.status(400).json({ error: '该订单状态不允许退货' });
    }
    
    // 如果是部分退货
    if (items && items.length > 0) {
      let refundAmount = 0;
      
      for (const itemId of items) {
        const orderItem = order.items.find(item => item.id === itemId);
        if (!orderItem) {
          await t.rollback();
          return res.status(400).json({ error: '退货商品不存在' });
        }
        
        if (orderItem.isRefunded) {
          await t.rollback();
          return res.status(400).json({ error: '商品已退货' });
        }
        
        // 恢复库存
        const product = await Product.findByPk(orderItem.productId, { transaction: t });
        if (product) {
          const beforeStock = product.stock;
          const afterStock = beforeStock + orderItem.quantity;
          
          await product.update({ stock: afterStock }, { transaction: t });
          
          // 记录库存变动
          await StockRecord.create({
            productId: product.id,
            type: 'adjust',
            quantity: orderItem.quantity,
            beforeStock,
            afterStock,
            remark: `退货入库，订单号: ${order.orderNo}`,
            operatorId: req.user.id,
            operatorName: req.user.name
          }, { transaction: t });
        }
        
        // 标记商品已退货
        await orderItem.update({ isRefunded: true }, { transaction: t });
        refundAmount += orderItem.subtotal;
      }
      
      // 更新订单金额
      const newActualAmount = order.actualAmount - refundAmount;
      await order.update({
        actualAmount: newActualAmount,
        status: newActualAmount <= 0 ? 'refunded' : 'completed',
        refundReason: reason,
        refundedAt: new Date()
      }, { transaction: t });
      
    } else {
      // 全单退货
      for (const item of order.items) {
        if (!item.isRefunded) {
          // 恢复库存
          const product = await Product.findByPk(item.productId, { transaction: t });
          if (product) {
            const beforeStock = product.stock;
            const afterStock = beforeStock + item.quantity;
            
            await product.update({ stock: afterStock }, { transaction: t });
            
            // 记录库存变动
            await StockRecord.create({
              productId: product.id,
              type: 'adjust',
              quantity: item.quantity,
              beforeStock,
              afterStock,
              remark: `退货入库，订单号: ${order.orderNo}`,
              operatorId: req.user.id,
              operatorName: req.user.name
            }, { transaction: t });
          }
          
          await item.update({ isRefunded: true }, { transaction: t });
        }
      }
      
      // 更新订单状态
      await order.update({
        status: 'refunded',
        refundReason: reason,
        refundedAt: new Date()
      }, { transaction: t });
    }
    
    // 退还积分
    if (order.member) {
      const member = order.member;
      const newPoints = member.points - order.pointsEarned + order.pointsUsed;
      const newTotalConsumption = Math.max(0, parseFloat(member.totalConsumption) - order.actualAmount);
      
      await member.update({
        points: newPoints,
        totalConsumption: newTotalConsumption
      }, { transaction: t });
    }
    
    // 记录操作日志
    await logOperation({
      userId: req.user.id,
      username: req.user.username,
      module: '订单管理',
      action: '订单退货',
      content: `订单号: ${order.orderNo}, 退货原因: ${reason}`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    await t.commit();
    
    res.json({
      success: true,
      message: '退货处理成功'
    });
    
  } catch (error) {
    await t.rollback();
    logger.error('退货处理失败:', error);
    res.status(500).json({ error: '退货处理失败' });
  }
});

export default router;