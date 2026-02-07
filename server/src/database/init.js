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
import Recipe from '../models/Recipe.js';
import RecipeProduct from '../models/RecipeProduct.js';
import { logger } from '../utils/logger.js';
import { generateOrderNo } from '../utils/orderNo.js';

const initDatabase = async () => {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 同步数据库表（force: true 会删除并重建所有表）
    await sequelize.sync({ force: true });
    logger.info('数据库表同步完成');

    // 创建默认管理员
    const adminUser = await User.create({
      username: 'admin',
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'changeme',
      name: '系统管理员',
      role: 'admin',
      phone: '13800138000',
      status: 'active'
    });
    logger.info('默认管理员创建成功');

    // 创建测试员工账号
    const staffUser = await User.create({
      username: 'staff',
      password: process.env.DEFAULT_STAFF_PASSWORD || 'changeme',
      name: '测试员工',
      role: 'staff',
      phone: '13800138001',
      status: 'active'
    });
    logger.info('测试员工创建成功');

    // 创建商品分类
    const categories = await ProductCategory.bulkCreate([
      { name: '五谷杂粮', description: '各类五谷杂粮及其制品', sortOrder: 1 },
      { name: '养生粉类', description: '各种养生保健粉类产品', sortOrder: 2 },
      { name: '坚果炒货', description: '各类坚果和炒货制品', sortOrder: 3 },
      { name: '调味香料', description: '各种调味品和香料', sortOrder: 4 },
      { name: '配方材料', description: '用于配方的原材料', sortOrder: 5 },
      { name: '其他商品', description: '其他商品分类', sortOrder: 99 }
    ]);
    logger.info('商品分类创建成功');

    // 创建普通商品
    const products = await Product.bulkCreate([
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
        price: 45.00,
        cost: 35.00,
        memberPrice: 42.00,
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
    logger.info('普通商品创建成功');

    // 创建配方材料商品
    const materials = await Product.bulkCreate([
      {
        categoryId: categories[4].id,
        name: '黑芝麻',
        shortName: '黑芝麻',
        barcode: '6901234567895',
        unit: '斤',
        price: 15.00,
        cost: 10.00,
        memberPrice: 14.00,
        stock: 200,
        minStock: 20,
        status: 'on_sale'
      },
      {
        categoryId: categories[4].id,
        name: '核桃仁',
        shortName: '核桃',
        barcode: '6901234567896',
        unit: '斤',
        price: 40.00,
        cost: 30.00,
        memberPrice: 38.00,
        stock: 100,
        minStock: 10,
        status: 'on_sale'
      },
      {
        categoryId: categories[4].id,
        name: '红豆',
        shortName: '红豆',
        barcode: '6901234567897',
        unit: '斤',
        price: 12.00,
        cost: 8.00,
        memberPrice: 11.00,
        stock: 150,
        minStock: 15,
        status: 'on_sale'
      },
      {
        categoryId: categories[4].id,
        name: '薏米',
        shortName: '薏米',
        barcode: '6901234567898',
        unit: '斤',
        price: 18.00,
        cost: 12.00,
        memberPrice: 16.00,
        stock: 120,
        minStock: 12,
        status: 'on_sale'
      },
      {
        categoryId: categories[4].id,
        name: '燕麦',
        shortName: '燕麦',
        barcode: '6901234567899',
        unit: '斤',
        price: 10.00,
        cost: 6.00,
        memberPrice: 9.00,
        stock: 180,
        minStock: 18,
        status: 'on_sale'
      }
    ]);
    logger.info('配方材料创建成功');

    // 创建测试会员
    const membersData = [
      {
        name: '张三',
        phone: '13900139001',
        birthday: '1990-01-01',
        points: 1000,
        totalConsumption: 5000,
        status: 'active'
      },
      {
        name: '李四',
        phone: '13900139002',
        birthday: '1985-06-15',
        points: 500,
        totalConsumption: 2500,
        status: 'active'
      },
      {
        name: '王五',
        phone: '13900139003',
        birthday: '1992-12-20',
        points: 200,
        totalConsumption: 1000,
        status: 'active'
      }
    ];

    const members = [];
    for (const memberData of membersData) {
      const member = await Member.create(memberData);
      members.push(member);
    }
    logger.info('测试会员创建成功');

    // 创建公共配方
    const publicRecipe1 = await Recipe.create({
      name: '养生五谷粉',
      type: 'public',
      description: '营养均衡的五谷杂粮粉，适合日常养生',
      totalWeight: 100,
      processingFee: 5.00,
      suitableFor: '所有人群'
    });

    // 为公共配方添加材料
    await RecipeProduct.bulkCreate([
      {
        recipeId: publicRecipe1.id,
        productId: materials[0].id, // 黑芝麻
        percentage: 30,
        amount: 30
      },
      {
        recipeId: publicRecipe1.id,
        productId: materials[1].id, // 核桃仁
        percentage: 20,
        amount: 20
      },
      {
        recipeId: publicRecipe1.id,
        productId: materials[2].id, // 红豆
        percentage: 20,
        amount: 20
      },
      {
        recipeId: publicRecipe1.id,
        productId: materials[3].id, // 薏米
        percentage: 15,
        amount: 15
      },
      {
        recipeId: publicRecipe1.id,
        productId: materials[4].id, // 燕麦
        percentage: 15,
        amount: 15
      }
    ]);
    logger.info('公共配方1创建成功');

    // 创建第二个公共配方
    const publicRecipe2 = await Recipe.create({
      name: '补肾养生粉',
      type: 'public',
      description: '黑色食品为主，补肾养生',
      totalWeight: 100,
      processingFee: 5.00,
      suitableFor: '中老年人'
    });

    await RecipeProduct.bulkCreate([
      {
        recipeId: publicRecipe2.id,
        productId: materials[0].id, // 黑芝麻
        percentage: 50,
        amount: 50
      },
      {
        recipeId: publicRecipe2.id,
        productId: materials[1].id, // 核桃仁
        percentage: 30,
        amount: 30
      },
      {
        recipeId: publicRecipe2.id,
        productId: materials[2].id, // 红豆
        percentage: 20,
        amount: 20
      }
    ]);
    logger.info('公共配方2创建成功');

    // 为张三创建专属配方
    const privateRecipe = await Recipe.create({
      name: '张三专属配方',
      type: 'private',
      memberId: members[0].id,
      description: '根据个人体质定制的配方',
      totalWeight: 100,
      processingFee: 8.00,
      suitableFor: '个人定制'
    });

    await RecipeProduct.bulkCreate([
      {
        recipeId: privateRecipe.id,
        productId: materials[0].id, // 黑芝麻
        percentage: 25,
        amount: 25
      },
      {
        recipeId: privateRecipe.id,
        productId: materials[1].id, // 核桃仁
        percentage: 25,
        amount: 25
      },
      {
        recipeId: privateRecipe.id,
        productId: materials[3].id, // 薏米
        percentage: 30,
        amount: 30
      },
      {
        recipeId: privateRecipe.id,
        productId: materials[4].id, // 燕麦
        percentage: 20,
        amount: 20
      }
    ]);
    logger.info('专属配方创建成功');

    // 创建模板配方
    const templateRecipe = await Recipe.create({
      name: '儿童营养粉模板',
      type: 'template',
      description: '适合儿童的营养配方模板，可根据需要调整',
      totalWeight: 100,
      processingFee: 5.00,
      suitableFor: '儿童'
    });

    await RecipeProduct.bulkCreate([
      {
        recipeId: templateRecipe.id,
        productId: materials[1].id, // 核桃仁
        percentage: 30,
        amount: 30
      },
      {
        recipeId: templateRecipe.id,
        productId: materials[4].id, // 燕麦
        percentage: 40,
        amount: 40
      },
      {
        recipeId: templateRecipe.id,
        productId: materials[0].id, // 黑芝麻
        percentage: 30,
        amount: 30
      }
    ]);
    logger.info('模板配方创建成功');

    // 创建一些测试订单

    const order1 = await Order.create({
      orderNo: generateOrderNo(),  // 手动生成订单号
      memberId: members[0].id,
      userId: staffUser.id,
      totalAmount: 100.00,
      discountAmount: 5.00,
      actualAmount: 95.00,
      paymentMethod: 'cash',
      pointsEarned: 95,
      pointsUsed: 0,
      status: 'completed'
    });

    await OrderItem.bulkCreate([
      {
        orderId: order1.id,
        productId: products[0].id,
        productName: products[0].name,
        price: products[0].memberPrice || products[0].price,
        quantity: 2,
        subtotal: (products[0].memberPrice || products[0].price) * 2,
        unit: products[0].unit
      },
      {
        orderId: order1.id,
        productId: products[1].id,
        productName: products[1].name,
        price: products[1].memberPrice || products[1].price,
        quantity: 1,
        subtotal: products[1].memberPrice || products[1].price,
        unit: products[1].unit
      }
    ]);
    logger.info('测试订单创建成功');

    logger.info('=================================');
    logger.info('数据库初始化完成！');
    logger.info('默认管理员账号：admin（密码见 DEFAULT_ADMIN_PASSWORD 环境变量）');
    logger.info('测试员工账号：staff（密码见 DEFAULT_STAFF_PASSWORD 环境变量）');
    logger.info('=================================');
    
    process.exit(0);
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    process.exit(1);
  }
};

initDatabase();