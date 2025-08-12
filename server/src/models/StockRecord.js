import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const StockRecord = sequelize.define('StockRecord', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'product_id',
    comment: '商品ID'
  },
  type: {
    type: DataTypes.ENUM('purchase', 'sale', 'adjust', 'loss'),
    allowNull: false,
    comment: '类型：采购/销售/调整/报损'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '数量（正数入库，负数出库）'
  },
  beforeStock: {
    type: DataTypes.INTEGER,
    field: 'before_stock',
    comment: '操作前库存'
  },
  afterStock: {
    type: DataTypes.INTEGER,
    field: 'after_stock',
    comment: '操作后库存'
  },
  remark: {
    type: DataTypes.STRING(200),
    comment: '备注'
  },
  operatorId: {
    type: DataTypes.INTEGER,
    field: 'operator_id',
    comment: '操作人ID'
  },
  operatorName: {
    type: DataTypes.STRING(50),
    field: 'operator_name',
    comment: '操作人姓名'
  }
}, {
  tableName: 'stock_records',
  timestamps: true,
  underscored: true,
  updatedAt: false
});

export default StockRecord;