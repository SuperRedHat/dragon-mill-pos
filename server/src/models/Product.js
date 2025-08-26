import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import ProductCategory from './ProductCategory.js';

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'category_id',
    comment: '分类ID'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '商品名称'
  },
  shortName: {
    type: DataTypes.STRING(50),
    field: 'short_name',
    comment: '商品简称'
  },
  barcode: {
    type: DataTypes.STRING(50),
    unique: true,
    comment: '条形码'
  },
  unit: {
    type: DataTypes.STRING(20),
    defaultValue: '个',
    comment: '单位'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '售价',
    get() {
      const value = this.getDataValue('price');
      return value ? parseFloat(value) : 0;
    }
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    comment: '成本价',
    get() {
      const value = this.getDataValue('cost');
      return value ? parseFloat(value) : 0;
    }
  },
  memberPrice: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'member_price',
    comment: '会员价',
    get() {
      const value = this.getDataValue('memberPrice');
      return value ? parseFloat(value) : null;
    }
  },
  stock: {
    type: DataTypes.DECIMAL(10, 2),  // 改为支持小数
    defaultValue: 0,
    comment: '库存',
    get() {
      const value = this.getDataValue('stock');
      return value ? parseFloat(value) : 0;
    }
  },
  minStock: {
    type: DataTypes.DECIMAL(10, 2),  // 改为支持小数
    defaultValue: 0,
    field: 'min_stock',
    comment: '最低库存',
    get() {
      const value = this.getDataValue('minStock');
      return value ? parseFloat(value) : 0;
    }
  },
  maxStock: {
    type: DataTypes.DECIMAL(10, 2),  // 改为支持小数
    defaultValue: 1000,
    field: 'max_stock',
    comment: '最高库存',
    get() {
      const value = this.getDataValue('maxStock');
      return value ? parseFloat(value) : 1000;
    }
  },
  status: {
    type: DataTypes.ENUM('on_sale', 'off_sale'),
    defaultValue: 'on_sale',
    comment: '状态'
  },
  image: {
    type: DataTypes.STRING(255),
    comment: '商品图片'
  }
}, {
  tableName: 'products',
  timestamps: true,
  underscored: true
});

// 设置关联关系
Product.belongsTo(ProductCategory, {
  foreignKey: 'categoryId',
  as: 'category'
});

ProductCategory.hasMany(Product, {
  foreignKey: 'categoryId',
  as: 'products'
});

export default Product;