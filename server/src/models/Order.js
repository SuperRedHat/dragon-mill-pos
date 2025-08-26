import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import Member from './Member.js';
import User from './User.js';

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  orderNo: {
    type: DataTypes.STRING(30),
    unique: true,
    allowNull: false,
    field: 'order_no',
    comment: '订单号'
  },
  memberId: {
    type: DataTypes.INTEGER,
    field: 'member_id',
    comment: '会员ID'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    comment: '收银员ID'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_amount',
    comment: '总金额',
    get() {
      const value = this.getDataValue('totalAmount');
      return value ? parseFloat(value) : 0;
    }
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    field: 'discount_amount',
    comment: '优惠金额',
    get() {
      const value = this.getDataValue('discountAmount');
      return value ? parseFloat(value) : 0;
    }
  },
  actualAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'actual_amount',
    comment: '实付金额',
    get() {
      const value = this.getDataValue('actualAmount');
      return value ? parseFloat(value) : 0;
    }
  },
  paymentMethod: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'payment_method',
    comment: '支付方式'
  },
  pointsEarned: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'points_earned',
    comment: '获得积分'
  },
  pointsUsed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'points_used',
    comment: '使用积分'
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'cancelled', 'refunded'),
    defaultValue: 'completed',
    comment: '状态'
  },
  remark: {
    type: DataTypes.TEXT,
    comment: '备注'
  },
  refundReason: {
    type: DataTypes.TEXT,
    field: 'refund_reason',
    comment: '退款原因'
  },
  refundedAt: {
    type: DataTypes.DATE,
    field: 'refunded_at',
    comment: '退款时间'
  }
}, {
  tableName: 'orders',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (order) => {
      // 生成订单号
      if (!order.orderNo) {
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        const second = date.getSeconds().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        order.orderNo = `${year}${month}${day}${hour}${minute}${second}${random}`;
      }
    }
  }
});

// 设置关联关系
Order.belongsTo(Member, {
  foreignKey: 'memberId',
  as: 'member'
});

Order.belongsTo(User, {
  foreignKey: 'userId',
  as: 'cashier'
});

Member.hasMany(Order, {
  foreignKey: 'memberId',
  as: 'orders'
});

User.hasMany(Order, {
  foreignKey: 'userId',
  as: 'orders'
});

export default Order;