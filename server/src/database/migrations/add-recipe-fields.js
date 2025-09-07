import { sequelize } from '../../config/database.js';
import { QueryTypes } from 'sequelize';
import { logger } from '../../utils/logger.js';

const addRecipeFields = async () => {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    // 1. 给 order_items 表添加配方相关字段
    logger.info('开始添加 order_items 表字段...');
    
    // 检查字段是否已存在
    const orderItemsTable = await queryInterface.describeTable('order_items');
    
    if (!orderItemsTable.is_recipe) {
      await queryInterface.addColumn('order_items', 'is_recipe', {
        type: sequelize.Sequelize.BOOLEAN,
        defaultValue: false,
        comment: '是否为配方项'
      });
      logger.info('添加 is_recipe 字段成功');
    }
    
    if (!orderItemsTable.recipe_details) {
      await queryInterface.addColumn('order_items', 'recipe_details', {
        type: sequelize.Sequelize.JSON,
        defaultValue: null,
        comment: '配方详情（材料明细等）'
      });
      logger.info('添加 recipe_details 字段成功');
    }
    
    if (!orderItemsTable.recipe_id) {
      await queryInterface.addColumn('order_items', 'recipe_id', {
        type: sequelize.Sequelize.INTEGER,
        defaultValue: null,
        comment: '配方ID（如果是配方项）'
      });
      logger.info('添加 recipe_id 字段成功');
    }
    
    // 2. 给 recipes 表添加使用统计字段
    logger.info('开始添加 recipes 表字段...');
    
    const recipesTable = await queryInterface.describeTable('recipes');
    
    if (!recipesTable.last_used_at) {
      await queryInterface.addColumn('recipes', 'last_used_at', {
        type: sequelize.Sequelize.DATE,
        defaultValue: null,
        comment: '最后使用时间'
      });
      logger.info('添加 last_used_at 字段成功');
    }
    
    if (!recipesTable.last_weight) {
      await queryInterface.addColumn('recipes', 'last_weight', {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        defaultValue: 100,
        comment: '最后使用重量'
      });
      logger.info('添加 last_weight 字段成功');
    }
    
    // 3. 创建配方使用记录表（用于详细统计）
    logger.info('检查配方使用记录表...');
    
    const tableExists = await sequelize.query(
      "SELECT * FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'recipe_usage_logs'",
      { type: QueryTypes.SELECT }
    );
    
    if (tableExists.length === 0) {
      await queryInterface.createTable('recipe_usage_logs', {
        id: {
          type: sequelize.Sequelize.BIGINT,
          primaryKey: true,
          autoIncrement: true
        },
        recipe_id: {
          type: sequelize.Sequelize.INTEGER,
          allowNull: false,
          comment: '配方ID'
        },
        order_id: {
          type: sequelize.Sequelize.BIGINT,
          allowNull: false,
          comment: '订单ID'
        },
        member_id: {
          type: sequelize.Sequelize.INTEGER,
          comment: '会员ID'
        },
        weight: {
          type: sequelize.Sequelize.DECIMAL(10, 2),
          allowNull: false,
          comment: '使用重量'
        },
        price: {
          type: sequelize.Sequelize.DECIMAL(10, 2),
          allowNull: false,
          comment: '价格'
        },
        created_at: {
          type: sequelize.Sequelize.DATE,
          defaultValue: sequelize.Sequelize.NOW
        }
      });
      
      // 添加索引
      await queryInterface.addIndex('recipe_usage_logs', ['recipe_id']);
      await queryInterface.addIndex('recipe_usage_logs', ['member_id']);
      await queryInterface.addIndex('recipe_usage_logs', ['created_at']);
      
      logger.info('创建 recipe_usage_logs 表成功');
    }
    
    logger.info('数据库迁移完成！');
    
  } catch (error) {
    logger.error('数据库迁移失败:', error);
    throw error;
  }
};

// 如果直接运行此文件
if (process.argv[1] === new URL(import.meta.url).pathname) {
  addRecipeFields()
    .then(() => {
      logger.info('迁移脚本执行成功');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('迁移脚本执行失败:', error);
      process.exit(1);
    });
}

export default addRecipeFields;