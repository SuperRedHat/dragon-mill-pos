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
    allowNull: true,
    field: 'product_id',
    comment: '商品ID'
  },
  productName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'product_name',
    comment: '商品名称'
  },
  unit: {
    type: DataTypes.STRING(20),
    comment: '单位',
    defaultValue: '个'
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
    type: DataTypes.DECIMAL(10, 2),  // 改为支持小数
    allowNull: false,
    comment: '数量',
    get() {
      const value = this.getDataValue('quantity');
      return value ? parseFloat(value) : 0;
    }
  },
  recipeId: {
    type: DataTypes.INTEGER,
    field: 'recipe_id',
    defaultValue: null,
    comment: '配方ID（如果是配方项）'
  },
  recipeDetails: {
    type: DataTypes.JSON,
    field: 'recipe_details',
    comment: '配方详情（材料明细等）',
    defaultValue: null
  },
  isRecipe: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_recipe',
    comment: '是否为配方项'
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
  as: 'product',
  constraints: false
});

Order.hasMany(OrderItem, {
  foreignKey: 'orderId',
  as: 'items'
});

export default OrderItem;