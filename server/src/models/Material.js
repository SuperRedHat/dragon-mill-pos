import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Material = sequelize.define('Material', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: '材料名称'
  },
  category: {
    type: DataTypes.STRING(50),
    comment: '材料分类'
  },
  unit: {
    type: DataTypes.STRING(20),
    defaultValue: '斤',
    comment: '计量单位'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '采购价格',
    get() {
      const value = this.getDataValue('price');
      return value ? parseFloat(value) : 0;
    }
  },
  stock: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: '当前库存',
    get() {
      const value = this.getDataValue('stock');
      return value ? parseFloat(value) : 0;
    }
  },
  minStock: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 10,
    field: 'min_stock',
    comment: '最低库存',
    get() {
      const value = this.getDataValue('minStock');
      return value ? parseFloat(value) : 0;
    }
  },
  supplier: {
    type: DataTypes.STRING(100),
    comment: '供应商'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
    comment: '状态'
  }
}, {
  tableName: 'materials',
  timestamps: true,
  underscored: true
});

export default Material;