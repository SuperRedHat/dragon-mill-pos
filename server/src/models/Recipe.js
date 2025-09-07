import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import Member from './Member.js';

const Recipe = sequelize.define('Recipe', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  recipeNo: {
    type: DataTypes.STRING(20),
    unique: true,
    field: 'recipe_no',
    comment: '配方编号'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '配方名称'
  },
  type: {
    type: DataTypes.ENUM('public', 'private', 'template'),
    defaultValue: 'public',
    comment: '配方类型'
  },
  memberId: {
    type: DataTypes.INTEGER,
    field: 'member_id',
    comment: '会员ID（专属配方）'
  },
  description: {
    type: DataTypes.TEXT,
    comment: '配方说明'
  },
  totalWeight: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 100,
    field: 'total_weight',
    comment: '总重量（克）',
    get() {
      const value = this.getDataValue('totalWeight');
      return value ? parseFloat(value) : 100;
    }
  },
  processingFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 5.00,
    field: 'processing_fee',
    comment: '加工费',
    get() {
      const value = this.getDataValue('processingFee');
      return value ? parseFloat(value) : 5;
    }
  },
  nutrition: {
    type: DataTypes.JSON,
    comment: '营养成分'
  },
  suitableFor: {
    type: DataTypes.STRING(200),
    field: 'suitable_for',
    comment: '适用人群'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
    comment: '状态'
  },
  usageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'usage_count',
    comment: '使用次数'
  }
}, {
  tableName: 'recipes',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (recipe) => {
      // 生成配方编号
      if (!recipe.recipeNo) {
        const count = await Recipe.count();
        const date = new Date();
        const year = date.getFullYear().toString().substr(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const sequence = (count + 1).toString().padStart(4, '0');
        recipe.recipeNo = `R${year}${month}${sequence}`;
      }
    }
  }
});

// 设置关联关系
Recipe.belongsTo(Member, {
  foreignKey: 'memberId',
  as: 'owner'
});

Member.hasMany(Recipe, {
  foreignKey: 'memberId',
  as: 'recipes'
});

export default Recipe;