import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import Recipe from './Recipe.js';
import Product from './Product.js';

const RecipeProduct = sequelize.define('RecipeProduct', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  recipeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'recipe_id',
    comment: '配方ID'
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'product_id',
    comment: '商品ID'
  },
  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    comment: '占比（%）',
    validate: {
      min: 0,
      max: 100
    },
    get() {
      const value = this.getDataValue('percentage');
      return value ? parseFloat(value) : 0;
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    comment: '重量（克）',
    get() {
      const value = this.getDataValue('amount');
      return value ? parseFloat(value) : 0;
    }
  }
}, {
  tableName: 'recipe_products',
  timestamps: true,
  underscored: true
});

// 设置关联关系
Recipe.belongsToMany(Product, {
  through: RecipeProduct,
  foreignKey: 'recipeId',
  otherKey: 'productId',
  as: 'products'
});

Product.belongsToMany(Recipe, {
  through: RecipeProduct,
  foreignKey: 'productId',
  otherKey: 'recipeId',
  as: 'recipes'
});

RecipeProduct.belongsTo(Recipe, {
  foreignKey: 'recipeId',
  as: 'recipe'
});

RecipeProduct.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

export default RecipeProduct;