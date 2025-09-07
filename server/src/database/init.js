import 'dotenv/config';
import { sequelize } from '../config/database.js';
import User from '../models/User.js';
import OperationLog from '../models/OperationLog.js';
import ProductCategory from '../models/ProductCategory.js';
import Product from '../models/Product.js';
import StockRecord from '../models/StockRecord.js';
import Member from '../models/Member.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import { logger } from '../utils/logger.js';
import Material from '../models/Material.js';
import Recipe from '../models/Recipe.js';
import RecipeMaterial from '../models/RecipeMaterial.js';



const initDatabase = async () => {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 同步数据库表（注意顺序）
    await sequelize.sync({ alter: true });
    logger.info('数据库表同步完成');

    // 检查是否需要创建默认数据
    const adminCount = await User.count({ where: { role: 'admin' } });
    
    if (adminCount === 0) {
      // 创建默认管理员
      await User.create({
        username: 'admin',
        password: 'Admin@123456',
        name: '系统管理员',
        role: 'admin',
        phone: '13800138000',
        status: 'active'
      });
      logger.info('默认管理员创建成功');
    }

    // 检查是否有原材料
    const materialCount = await Material.count();

    if (materialCount === 0) {
      // 创建默认原材料
      const materials = await Material.bulkCreate([
        { name: '黑芝麻', category: '谷物', unit: '斤', price: 15.00, stock: 100 },
        { name: '核桃', category: '坚果', unit: '斤', price: 35.00, stock: 50 },
        { name: '红豆', category: '豆类', unit: '斤', price: 8.00, stock: 80 },
        { name: '薏米', category: '谷物', unit: '斤', price: 12.00, stock: 60 },
        { name: '燕麦', category: '谷物', unit: '斤', price: 6.00, stock: 100 }
      ]);
      
      logger.info('默认原材料创建成功');
      
      // 创建示例配方
      const recipe = await Recipe.create({
        name: '养生五谷粉',
        type: 'public',
        description: '营养均衡的五谷杂粮粉',
        totalWeight: 100,
        processingFee: 5.00
      });
      
      // 添加配方材料
      await RecipeMaterial.bulkCreate([
        { recipeId: recipe.id, materialId: materials[0].id, percentage: 30, amount: 30 },
        { recipeId: recipe.id, materialId: materials[1].id, percentage: 20, amount: 20 },
        { recipeId: recipe.id, materialId: materials[2].id, percentage: 20, amount: 20 },
        { recipeId: recipe.id, materialId: materials[3].id, percentage: 15, amount: 15 },
        { recipeId: recipe.id, materialId: materials[4].id, percentage: 15, amount: 15 }
      ]);
      
      logger.info('示例配方创建成功');
    }

    // 检查是否有商品分类
    const categoryCount = await ProductCategory.count();
    
    if (categoryCount === 0) {
      // 创建默认分类
      const categories = await ProductCategory.bulkCreate([
        { name: '五谷杂粮', description: '各类五谷杂粮及其制品', sortOrder: 1 },
        { name: '养生粉类', description: '各种养生保健粉类产品', sortOrder: 2 },
        { name: '坚果炒货', description: '各类坚果和炒货制品', sortOrder: 3 },
        { name: '调味香料', description: '各种调味品和香料', sortOrder: 4 },
        { name: '其他商品', description: '其他商品分类', sortOrder: 99 }
      ]);
      
      logger.info('默认分类创建成功');

      // 创建一些示例商品
      await Product.bulkCreate([
        {
          categoryId: categories[0].id,
          name: '五谷杂粮粉',
          shortName: '五谷粉',
          barcode: '6901234567890',
          unit: '斤',
          price: 30.00,
          cost: 20.00,
          memberPrice: 28.00,
          stock: 100,
          minStock: 10,
          status: 'on_sale'
        },
        {
          categoryId: categories[1].id,
          name: '黑芝麻糊',
          shortName: '芝麻糊',
          barcode: '6901234567891',
          unit: '包',
          price: 35.00,
          cost: 25.00,
          memberPrice: 32.00,
          stock: 50,
          minStock: 5,
          status: 'on_sale'
        },
        {
          categoryId: categories[1].id,
          name: '红豆薏米粉',
          shortName: '红豆粉',
          barcode: '6901234567892',
          unit: '斤',
          price: 28.00,
          cost: 18.00,
          memberPrice: 26.00,
          stock: 80,
          minStock: 10,
          status: 'on_sale'
        },
        {
          categoryId: categories[2].id,
          name: '核桃粉',
          shortName: '核桃粉',
          barcode: '6901234567893',
          unit: '斤',
          price: 40.00,
          cost: 30.00,
          memberPrice: 38.00,
          stock: 30,
          minStock: 5,
          status: 'on_sale'
        },
        {
          categoryId: categories[0].id,
          name: '营养早餐粉',
          shortName: '早餐粉',
          barcode: '6901234567894',
          unit: '包',
          price: 25.00,
          cost: 15.00,
          memberPrice: 23.00,
          stock: 60,
          minStock: 10,
          status: 'on_sale'
        }
      ]);
      
      logger.info('示例商品创建成功');
    }

    // 创建一个测试会员
    const memberCount = await Member.count();
    if (memberCount === 0) {
      await Member.create({
        name: '张三',
        phone: '13800138001',
        birthday: '1990-01-01',
        points: 1000,
        totalConsumption: 5000,
        status: 'active'
      });
      logger.info('测试会员创建成功');
    }

    logger.info('数据库初始化完成');
    process.exit(0);
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    process.exit(1);
  }
};

initDatabase();