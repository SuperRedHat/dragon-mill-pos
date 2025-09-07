import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import Recipe from './Recipe.js';
import Material from './Material.js';

const RecipeMaterial = sequelize.define('RecipeMaterial', {
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
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'material_id',
    comment: '材料ID'
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
  tableName: 'recipe_materials',
  timestamps: true,
  underscored: true
});

// 设置关联关系
Recipe.belongsToMany(Material, {
  through: RecipeMaterial,
  foreignKey: 'recipeId',
  otherKey: 'materialId',
  as: 'materials'
});

Material.belongsToMany(Recipe, {
  through: RecipeMaterial,
  foreignKey: 'materialId',
  otherKey: 'recipeId',
  as: 'recipes'
});

RecipeMaterial.belongsTo(Recipe, {
  foreignKey: 'recipeId',
  as: 'recipe'
});

RecipeMaterial.belongsTo(Material, {
  foreignKey: 'materialId',
  as: 'material'
});

export default RecipeMaterial;