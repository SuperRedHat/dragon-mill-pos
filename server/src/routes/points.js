import express from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import Member from '../models/Member.js';
import Order from '../models/Order.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// 所有接口都需要认证
router.use(authenticate);

// 获取积分统计数据
router.get('/statistics', async (req, res) => {
  try {
    // 会员积分总览
    const totalPoints = await Member.sum('points') || 0;
    const avgPoints = await Member.findOne({
      attributes: [[sequelize.fn('AVG', sequelize.col('points')), 'avg']]
    });
    
    // 积分分布
    const distribution = await sequelize.query(
      `SELECT 
        CASE 
          WHEN points = 0 THEN '0'
          WHEN points BETWEEN 1 AND 100 THEN '1-100'
          WHEN points BETWEEN 101 AND 500 THEN '101-500'
          WHEN points BETWEEN 501 AND 1000 THEN '501-1000'
          WHEN points BETWEEN 1001 AND 5000 THEN '1001-5000'
          ELSE '5000+'
        END as range_label,
        COUNT(*) as member_count
      FROM members
      WHERE status = 'active'
      GROUP BY range_label
      ORDER BY 
        CASE range_label
          WHEN '0' THEN 1
          WHEN '1-100' THEN 2
          WHEN '101-500' THEN 3
          WHEN '501-1000' THEN 4
          WHEN '1001-5000' THEN 5
          ELSE 6
        END`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    // 本月积分变动
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const monthlyStats = await Order.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('points_earned')), 'earned'],
        [sequelize.fn('SUM', sequelize.col('points_used')), 'used']
      ],
      where: {
        createdAt: { [Op.gte]: currentMonth },
        status: 'completed'
      }
    });
    
    res.json({
      success: true,
      data: {
        overview: {
          totalPoints: parseInt(totalPoints),
          averagePoints: Math.round(avgPoints?.dataValues?.avg || 0),
          monthlyEarned: parseInt(monthlyStats?.dataValues?.earned || 0),
          monthlyUsed: parseInt(monthlyStats?.dataValues?.used || 0)
        },
        distribution
      }
    });
  } catch (error) {
    logger.error('获取积分统计失败:', error);
    res.status(500).json({ error: '获取积分统计失败' });
  }
});

// 获取积分明细
router.get('/records', async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 10,
      memberId,
      type,
      startDate,
      endDate
    } = req.query;
    
    const offset = (page - 1) * pageSize;
    const where = {};
    
    if (memberId) {
      where.memberId = memberId;
    }
    
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    // 获取积分变动记录（从订单表）
    const { count, rows } = await Order.findAndCountAll({
      where: {
        ...where,
        [Op.or]: [
          { pointsEarned: { [Op.gt]: 0 } },
          { pointsUsed: { [Op.gt]: 0 } }
        ],
        status: 'completed'
      },
      include: [{
        model: Member,
        as: 'member',
        attributes: ['name', 'phone', 'memberNo']
      }],
      limit: parseInt(pageSize),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    // 格式化数据
    const records = rows.map(order => ({
      id: order.id,
      orderNo: order.orderNo,
      member: order.member,
      type: order.pointsEarned > 0 ? 'earn' : 'use',
      points: order.pointsEarned > 0 ? order.pointsEarned : -order.pointsUsed,
      balance: 0, // 需要计算余额
      reason: order.pointsEarned > 0 ? `消费获得积分` : `积分抵扣`,
      createdAt: order.createdAt
    }));
    
    res.json({
      success: true,
      data: {
        list: records,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    logger.error('获取积分明细失败:', error);
    res.status(500).json({ error: '获取积分明细失败' });
  }
});

// 获取积分规则
router.get('/rules', async (req, res) => {
  try {
    // 从系统配置表获取，这里先返回默认值
    const rules = {
      earnRate: 1,        // 消费1元获得1积分
      useRate: 100,       // 100积分抵扣1元
      maxUsePercent: 30,  // 最多使用积分抵扣30%
      expireMonths: 12,   // 积分12个月后过期
      birthdayMultiple: 2 // 生日当天积分翻倍
    };
    
    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    logger.error('获取积分规则失败:', error);
    res.status(500).json({ error: '获取积分规则失败' });
  }
});

// 更新积分规则（仅管理员）
router.put('/rules', authorize('admin'), async (req, res) => {
  try {
    const { earnRate, useRate, maxUsePercent, expireMonths, birthdayMultiple } = req.body;
    
    // TODO: 保存到系统配置表
    
    res.json({
      success: true,
      message: '积分规则更新成功'
    });
  } catch (error) {
    logger.error('更新积分规则失败:', error);
    res.status(500).json({ error: '更新积分规则失败' });
  }
});

// 批量调整积分（仅管理员）
router.post('/batch-adjust', authorize('admin'), async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { memberIds, type, points, reason } = req.body;
    
    if (!memberIds || memberIds.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: '请选择会员' });
    }
    
    for (const memberId of memberIds) {
      const member = await Member.findByPk(memberId, { transaction: t });
      if (member) {
        let newPoints = member.points;
        if (type === 'add') {
          newPoints += Math.abs(points);
        } else if (type === 'deduct') {
          newPoints = Math.max(0, newPoints - Math.abs(points));
        }
        await member.update({ points: newPoints }, { transaction: t });
      }
    }
    
    await t.commit();
    
    res.json({
      success: true,
      message: `成功调整 ${memberIds.length} 个会员的积分`
    });
  } catch (error) {
    await t.rollback();
    logger.error('批量调整积分失败:', error);
    res.status(500).json({ error: '批量调整积分失败' });
  }
});

export default router;