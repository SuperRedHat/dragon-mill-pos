import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import Order from './Order.js';
import Product from './Product.js';

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  orderId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'order_id',
    comment: '订单ID'
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'product_id',
    comment: '商品ID'
  },
  productName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'product_name',
    comment: '商品名称'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '单价',
    get() {
      const value = this.getDataValue('price');
      return value ? parseFloat(value) : 0;
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '数量'
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '小计',
    get() {
      const value = this.getDataValue('subtotal');
      return value ? parseFloat(value) : 0;
    }
  },
  isRefunded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_refunded',
    comment: '是否已退货'
  }
}, {
  tableName: 'order_items',
  timestamps: true,
  underscored: true,
  updatedAt: false
});

// 设置关联关系
OrderItem.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order'
});

OrderItem.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

Order.hasMany(OrderItem, {
  foreignKey: 'orderId',
  as: 'items'
});

export default OrderItem;