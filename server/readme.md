# 神龙磨坊收银管理系统 - 后端开发指南

> 本文档旨在让开发者（或 AI 助手）在不阅读全部源码的情况下，快速理解后端架构并继续开发。

---

## 一、技术栈总览

| 层级 | 技术 | 版本/说明 |
|------|------|-----------|
| 运行时 | Node.js | ES Module (`"type": "module"`) |
| 框架 | Express | ^4.18.2 |
| ORM | Sequelize | ^6.35.2 |
| 数据库 | MySQL | 8.0，时区 `+08:00`，字符集 `utf8mb4` |
| 缓存 | Redis | ^4.6.11，可选，不可用时自动降级 |
| 认证 | JWT | jsonwebtoken ^9.0.2，默认7天过期 |
| 密码 | bcryptjs | ^2.4.3，10轮 salt |
| 验证 | Joi | ^17.11.0（已引入，部分接口尚未使用） |
| 日志 | Winston + Morgan | 文件 + 控制台双输出 |
| 文件上传 | Multer | 头像 2MB / 商品图片 5MB |

## 二、项目目录结构

```
server/
├── .env                      # 环境变量（参考 .env.example）
├── package.json              # type: "module"，所有文件使用 import/export
├── uploads/                  # 静态文件目录（自动创建）
│   ├── avatars/              # 用户头像
│   └── products/             # 商品图片
├── logs/                     # 日志目录
└── src/
    ├── index.js              # 应用入口 & 服务器启动
    ├── config/
    │   ├── database.js       # Sequelize 实例配置
    │   └── redis.js          # Redis 连接 + 缓存包装函数
    ├── database/
    │   ├── init.js           # 数据库初始化（force:true 重建所有表+种子数据）
    │   ├── seed.js           # 简化版种子数据（仅用户+日志）
    │   └── migrations/
    │       └── add-recipe-fields.js  # 配方相关字段迁移
    ├── middleware/
    │   ├── auth.js           # authenticate + authorize 中间件
    │   └── errorHandler.js   # 全局错误处理
    ├── models/               # Sequelize 模型（含关联关系定义）
    │   ├── User.js
    │   ├── Member.js
    │   ├── Product.js
    │   ├── ProductCategory.js
    │   ├── Recipe.js
    │   ├── RecipeProduct.js  # 配方-商品多对多中间表
    │   ├── Order.js
    │   ├── OrderItem.js
    │   ├── StockRecord.js
    │   └── OperationLog.js
    ├── routes/               # API 路由
    │   ├── index.js          # 路由汇总注册
    │   ├── auth.js           # 登录/登出/改密
    │   ├── users.js          # 用户管理（仅管理员）
    │   ├── profile.js        # 个人信息 & 头像
    │   ├── products.js       # 商品 CRUD + 库存管理 + 补货
    │   ├── productCategories.js  # 商品分类
    │   ├── members.js        # 会员管理 + 搜索
    │   ├── recipes.js        # 配方管理
    │   ├── cashier.js        # 收银台（结算/搜索/统计）
    │   ├── orders.js         # 订单查询 + 退货
    │   ├── points.js         # 积分统计/明细/规则
    │   └── test.js           # 测试路由（ping/upload）
    └── utils/
        ├── logger.js         # Winston 日志配置
        ├── operationLog.js   # 操作日志记录 + 中间件
        ├── ensureDir.js      # 目录创建工具
        └── unitConverter.js  # 单位换算（克/斤/千克/两）
```

## 三、数据模型与关联关系

### 3.1 模型关系图

```
User (用户)
 ├── hasMany Order (收银员)
 └── OperationLog (操作日志，userId 关联)

Member (会员)
 ├── hasMany Order (会员订单)
 └── hasMany Recipe (专属配方，type='private')

ProductCategory (商品分类)
 └── hasMany Product

Product (商品)
 ├── belongsTo ProductCategory
 ├── belongsToMany Recipe (通过 RecipeProduct)
 └── StockRecord (库存变动，productId 关联)

Recipe (配方)
 ├── belongsTo Member (owner，专属配方)
 └── belongsToMany Product (通过 RecipeProduct)

RecipeProduct (配方材料中间表)
 ├── belongsTo Recipe
 └── belongsTo Product

Order (订单)
 ├── belongsTo Member
 ├── belongsTo User (cashier)
 └── hasMany OrderItem

OrderItem (订单明细)
 ├── belongsTo Order
 └── belongsTo Product (constraints: false，允许 null)
```

### 3.2 关键模型字段速查

**User** - 用户表 (`users`)
- `role`: ENUM `'admin'` | `'staff'`
- `status`: ENUM `'active'` | `'inactive'`
- `deletedAt`: 软删除标记（非 paranoid 模式，手动管理）
- 密码在 `beforeCreate` / `beforeUpdate` 钩子中自动 bcrypt 加密

**Product** - 商品表 (`products`)
- `stock` / `minStock` / `maxStock`: DECIMAL(10,2)，**支持小数**（称重商品）
- `price` / `cost` / `memberPrice`: DECIMAL(10,2)，所有 getter 返回 `parseFloat`
- `unit`: 默认 `'个'`，配方材料常用 `'斤'`
- `status`: ENUM `'on_sale'` | `'off_sale'`

**Member** - 会员表 (`members`)
- `memberNo`: 自动生成，格式 `M{YY}{MM}{XXXXX}`
- `points`: INTEGER，积分余额
- `totalConsumption`: DECIMAL(10,2)，累计消费

**Recipe** - 配方表 (`recipes`)
- `type`: ENUM `'public'`（公共）| `'private'`（专属）| `'template'`（模板）
- `recipeNo`: 自动生成，格式 `R{YY}{MM}{XXXX}`
- `memberId`: 仅 private 类型使用
- `totalWeight`: 默认 100（克），配方基准重量
- `processingFee`: 默认 5.00，加工费
- `usageCount`: 使用次数统计

**RecipeProduct** - 配方材料中间表 (`recipe_products`)
- `percentage`: DECIMAL(5,2)，占比百分比，所有材料合计 = 100
- `amount`: DECIMAL(10,2)，基于 totalWeight 计算的克数

**Order** - 订单表 (`orders`)
- `orderNo`: 自动生成，格式 `{YYYYMMDDHHMMSS}{随机3位}`
- `pointsEarned` / `pointsUsed`: 积分变动
- `status`: ENUM `'pending'` | `'completed'` | `'cancelled'` | `'refunded'`

**OrderItem** - 订单明细 (`order_items`)
- `productId`: **允许 null**（配方项无对应商品）
- `quantity`: DECIMAL(10,2)，**支持小数**
- `isRecipe`: BOOLEAN，标记是否为配方项
- `recipeDetails`: JSON，存储配方材料明细
- `isRefunded`: BOOLEAN，退货标记

## 四、API 路由清单

所有 API 前缀为 `/api/v1`，除登录外均需 JWT 认证（`Authorization: Bearer <token>`）。

### 4.1 认证 (`/api/v1/auth`)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/login` | 公开 | 登录，返回 token + 用户信息 |
| GET | `/me` | 登录 | 获取当前用户信息 |
| POST | `/logout` | 登录 | 登出（记录日志） |
| POST | `/change-password` | 登录 | 修改密码（需旧密码） |

### 4.2 用户管理 (`/api/v1/users`) - 仅管理员

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 用户列表（分页/搜索） |
| POST | `/` | 创建用户 |
| GET | `/:id` | 获取用户详情 |
| PUT | `/:id` | 更新用户信息 |
| POST | `/:id/reset-password` | 重置密码 |
| DELETE | `/:id` | 软删除用户 |
| POST | `/:id/restore` | 恢复已删除用户 |
| GET | `/deleted/list` | 已删除用户列表 |
| GET | `/:id/logs` | 用户操作日志 |

### 4.3 个人信息 (`/api/v1/profile`)

| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | `/update` | 更新个人信息 |
| POST | `/avatar` | 上传头像（multipart `avatar`） |
| GET | `/login-history` | 登录历史 |
| GET | `/operation-logs` | 个人操作日志 |
| GET | `/stats` | 个人统计信息 |

### 4.4 商品分类 (`/api/v1/product-categories`)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/` | 登录 | 分类列表（含商品数量） |
| POST | `/` | 管理员 | 创建分类 |
| PUT | `/:id` | 管理员 | 更新分类 |
| DELETE | `/:id` | 管理员 | 删除分类（有商品时禁止） |

### 4.5 商品管理 (`/api/v1/products`)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/` | 登录 | 商品列表（分页/搜索/库存预警筛选） |
| GET | `/replenish-suggestions` | 管理员 | 补货建议 |
| POST | `/batch-replenish` | 管理员 | 批量补货 |
| GET | `/:id` | 登录 | 商品详情 |
| POST | `/` | 管理员 | 创建商品 |
| PUT | `/:id` | 管理员 | 更新商品 |
| DELETE | `/:id` | 管理员 | 删除商品 |
| POST | `/:id/image` | 管理员 | 上传商品图片（multipart `image`） |
| POST | `/:id/stock` | 管理员 | 库存调整（purchase/adjust/loss） |
| GET | `/:id/stock-records` | 登录 | 库存变动记录 |

### 4.6 会员管理 (`/api/v1/members`)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/` | 登录 | 会员列表（分页/搜索） |
| GET | `/search` | 登录 | 收银台会员搜索（含专属配方） |
| GET | `/phone/:phone` | 登录 | 按手机号查会员 |
| POST | `/` | 登录 | 创建会员 |
| PUT | `/:id` | 登录 | 更新会员 |
| POST | `/:id/points` | 管理员 | 调整积分（add/deduct） |
| GET | `/:id/orders` | 登录 | 会员消费记录 |

### 4.7 配方管理 (`/api/v1/recipes`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 配方列表（分页/按类型/按会员） |
| POST | `/` | 创建配方（含材料配比） |
| PUT | `/:id` | 更新配方 |
| POST | `/:id/copy` | 复制配方（⚠️ 有 bug，引用了不存在的 Material 模型） |
| POST | `/:id/calculate-price` | 计算配方价格 |

**⚠️ 注意**：`recipes.js` 在 `index.js` 中被**注册了两次**：
1. `app.use('/api/v1/recipes', recipesRouter)` — 在 index.js 顶部，无认证
2. `router.use('/recipes', recipeRoutes)` — 在 routes/index.js 中，有认证

应删除 `index.js` 中的重复注册，仅保留 `routes/index.js` 中的版本。

### 4.8 收银台 (`/api/v1/cashier`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/recipes/for-sale` | 获取可用配方（含会员专属） |
| POST | `/recipes/calculate` | 计算配方价格 |
| POST | `/checkout` | **核心：结算下单** |
| GET | `/products/search` | 快速商品搜索 |
| GET | `/products/available` | 所有在售商品（按分类分组） |
| GET | `/today-stats` | 今日销售统计 |

### 4.9 订单管理 (`/api/v1/orders`)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/` | 登录 | 订单列表（支持会员搜索/日期/状态筛选） |
| GET | `/:id` | 登录 | 订单详情（含明细/会员/收银员） |
| POST | `/:id/refund` | 管理员 | 退货处理（全单/部分，恢复库存+积分） |

### 4.10 积分管理 (`/api/v1/points`)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/statistics` | 登录 | 积分总览 + 分布 + 月度统计 |
| GET | `/records` | 登录 | 积分明细（从订单表派生） |
| GET | `/rules` | 登录 | 积分规则（目前返回硬编码默认值） |
| PUT | `/rules` | 管理员 | 更新积分规则（TODO：需持久化） |
| POST | `/batch-adjust` | 管理员 | 批量调整积分 |

## 五、核心业务逻辑

### 5.1 结算流程 (`POST /api/v1/cashier/checkout`)

这是系统最核心的接口，处理整个收银结算流程：

```
请求体:
{
  memberId?: number,        // 会员ID（可选）
  items?: [{                // 普通商品
    productId: number,
    quantity: number
  }],
  recipes?: [{              // 配方项
    recipeId: number|string,  // 正式ID或 "temp-xxx"（临时配方）
    weight: number,           // 重量（克）
    quantity: number,         // 份数
    name?: string,            // 临时配方名称
    price?: number,           // 临时配方价格
    materials?: array         // 临时配方材料
  }],
  paymentMethod: string,    // 'cash'|'wechat'|'alipay'|'card'
  pointsUsed?: number,      // 使用积分抵扣
  remark?: string
}
```

**处理步骤**（在数据库事务中）：
1. 验证会员、检查积分余额
2. **普通商品**：查商品→检库存→计算价格（会员价优先）→扣库存→记录库存变动
3. **配方项**：
   - 临时配方：直接使用提供的价格
   - 正式配方：查配方→遍历材料→**单位换算**（克→斤等）→检库存→扣库存→计算材料成本+加工费
4. 计算积分抵扣（100积分=1元）
5. 创建订单 + 订单明细
6. 更新会员积分和累计消费
7. 提交事务

**⚠️ 已知 Bug**：checkout 中 `recipe_usage_logs` 的插入引用了 `order.id`，但 order 是在后面才创建的。需要调整代码顺序。

### 5.2 单位换算系统 (`utils/unitConverter.js`)

配方计算涉及单位换算，这是一个关键工具类：

```javascript
// 换算表：单位 → 克
'g'/'克': 1, 'kg'/'千克'/'公斤': 1000, '斤': 500, '两': 50

// 核心方法
UnitConverter.toGram(value, unit)      // 任意单位 → 克
UnitConverter.fromGram(grams, unit)    // 克 → 任意单位
UnitConverter.format(value, unit)      // 格式化显示
UnitConverter.calculateRecipeAmount(recipeWeight, percentage, stockUnit)
```

**使用场景**：配方材料按百分比算出克数后，需要转换为商品的库存单位（斤）来扣减库存。

### 5.3 积分规则

当前硬编码规则（未持久化到数据库）：
- 消费1元 = 获得1积分
- 100积分 = 抵扣1元
- 最多抵扣30%订单金额（代码中未强制限制）
- 积分12个月过期（未实现）
- 生日翻倍（未实现）

### 5.4 配方价格计算

```
材料成本 = Σ(材料重量g × 材料成本价 / 1000)
总价 = 材料成本 + 加工费(processingFee)
```

注意：价格按**千克**计算（除以1000），因为商品的 `cost`/`price` 单位通常是"斤"或"千克"。

## 六、认证与权限

### 6.1 JWT 认证

```javascript
// Token 载荷
{ id: user.id, username: user.username, role: user.role }

// 请求头
Authorization: Bearer <token>
```

### 6.2 权限中间件

```javascript
// 仅需登录
router.use(authenticate);

// 需要特定角色
router.use(authenticate, authorize('admin'));

// 路由级别权限
router.post('/', authorize('admin'), handler);
```

### 6.3 角色说明

| 角色 | 说明 | 可访问模块 |
|------|------|-----------|
| `admin` | 管理员 | 所有功能 |
| `staff` | 员工 | 收银、商品查看、会员查看/创建、配方查看 |

## 七、已知问题与 TODO

### 7.1 已知 Bug

1. **recipes 路由重复注册**：`index.js` 中 `app.use('/api/v1/recipes', recipesRouter)` 绕过了认证中间件，应删除此行
2. **checkout 中 order 引用顺序错误**：`recipe_usage_logs` 插入在 order 创建之前引用了 `order.id`
3. **recipes.js 中复制配方引用了不存在的 Material 模型**：`copy` 路由中使用了 `Material` 而非 `Product`
4. **recipes.js 更新配方使用了 `materialId`**：应为 `productId`
5. **products.js 中 `replenish-suggestions` 和 `batch-replenish` 路由各重复定义了两次**

### 7.2 待开发功能

| 模块 | 功能 | 优先级 |
|------|------|--------|
| 积分 | 积分规则持久化到系统配置表 | 高 |
| 积分 | 积分变动日志表（独立于订单） | 高 |
| 积分 | 积分过期机制 | 中 |
| 积分 | 生日积分翻倍 | 低 |
| 收银 | 混合支付支持 | 高 |
| 收银 | 小票打印接口 | 高 |
| 收银 | 交班管理 | 中 |
| 订单 | 订单作废功能 | 中 |
| 订单 | 订单导出（Excel/PDF） | 中 |
| 报表 | 日/周/月/年报表 | 高 |
| 报表 | 商品销售排行 | 中 |
| 报表 | 会员分析（RFM） | 低 |
| 报表 | 配方使用统计 | 中 |
| 系统 | 系统配置表（店铺信息/业务参数） | 高 |
| 系统 | 数据备份/恢复 | 中 |
| 系统 | 数据导入导出 | 中 |
| 配方 | 修复复制/更新配方的 Bug | 高 |
| 商品 | 删除前检查关联订单 | 中 |
| 会员 | 批量导入 | 低 |
| 会员 | 会员标签系统 | 低 |

## 八、开发指南

### 8.1 环境搭建

```bash
# 1. 安装依赖
cd server && npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，设置 DB_PASSWORD 等

# 3. 初始化数据库（⚠️ 会清空所有数据）
npm run db:init

# 4. 启动开发服务器
npm run dev
# 服务运行在 http://localhost:3001

# 默认账号
# 管理员: admin / <YOUR_ADMIN_PASSWORD>  (见 DEFAULT_ADMIN_PASSWORD 环境变量)
# 员工: staff / <YOUR_STAFF_PASSWORD>  (见 DEFAULT_STAFF_PASSWORD 环境变量)
```

### 8.2 新增 API 路由模板

```javascript
// server/src/routes/newModule.js
import express from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logMiddleware } from '../utils/operationLog.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// GET 列表（分页模板）
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, keyword = '' } = req.query;
    const offset = (page - 1) * pageSize;
    const where = {};
    
    if (keyword) {
      where.name = { [Op.like]: `%${keyword}%` };
    }
    
    const { count, rows } = await Model.findAndCountAll({
      where,
      limit: parseInt(pageSize),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: { list: rows, total: count, page: parseInt(page), pageSize: parseInt(pageSize) }
    });
  } catch (error) {
    logger.error('操作失败:', error);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

export default router;
```

注册路由（在 `routes/index.js` 中）：
```javascript
import newModuleRoutes from './newModule.js';
router.use('/new-module', newModuleRoutes);
```

### 8.3 新增模型模板

```javascript
// server/src/models/NewModel.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const NewModel = sequelize.define('NewModel', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  // DECIMAL 字段统一加 getter 返回 parseFloat
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    get() {
      const value = this.getDataValue('amount');
      return value ? parseFloat(value) : 0;
    }
  },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' }
}, {
  tableName: 'new_models',     // 显式指定表名
  timestamps: true,             // 自动 createdAt/updatedAt
  underscored: true             // 数据库字段使用下划线命名
});

export default NewModel;
```

**重要**：新模型必须在 `database/init.js` 中 import，否则 `sequelize.sync()` 不会创建该表。

### 8.4 数据库迁移（生产环境）

对于不想重建数据库的变更，参考 `migrations/add-recipe-fields.js` 的模式：

```javascript
import { sequelize } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

const migrate = async () => {
  const queryInterface = sequelize.getQueryInterface();
  
  // 检查字段是否已存在再添加
  const tableDesc = await queryInterface.describeTable('table_name');
  if (!tableDesc.new_column) {
    await queryInterface.addColumn('table_name', 'new_column', {
      type: sequelize.Sequelize.STRING(100),
      defaultValue: null
    });
  }
};

export default migrate;
```

### 8.5 编码规范

1. **响应格式统一**：`{ success: true/false, data: ..., message: '...' }` 或 `{ error: '...' }`
2. **DECIMAL 字段**：模型中必须加 `get()` 返回 `parseFloat`，否则返回字符串
3. **事务使用**：涉及多表写操作必须用事务，失败时 rollback
4. **操作日志**：重要操作使用 `logMiddleware('模块', '操作')` 中间件自动记录
5. **错误处理**：catch 中使用 `logger.error`，返回用户友好的错误信息
6. **分页参数**：统一使用 `page` + `pageSize`，返回 `{ list, total, page, pageSize }`
7. **ES Module**：全部使用 `import/export`，不使用 `require`

### 8.6 静态文件访问

上传的文件通过 Express 静态中间件提供：
- URL 路径：`http://localhost:3001/uploads/avatars/xxx.jpg`
- 物理路径：`server/uploads/avatars/xxx.jpg`
- 数据库存储：`/uploads/avatars/xxx.jpg`（相对路径）

## 九、数据库初始化数据概览

运行 `npm run db:init` 后的初始数据：

| 数据 | 数量 | 说明 |
|------|------|------|
| 用户 | 2 | admin + staff |
| 商品分类 | 6 | 五谷杂粮、养生粉类、坚果炒货、调味香料、配方材料、其他 |
| 普通商品 | 5 | 五谷杂粮粉、黑芝麻糊等 |
| 配方材料 | 5 | 黑芝麻、核桃仁、红豆、薏米、燕麦 |
| 会员 | 3 | 张三、李四、王五 |
| 配方 | 4 | 2个公共 + 1个张三专属 + 1个模板 |
| 订单 | 1 | 测试订单 |

## 十、环境变量说明

```env
# 必须配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=dragon_mill_pos
DB_USER=root
DB_PASSWORD=你的MySQL密码
JWT_SECRET=生产环境必须修改

# 可选配置
PORT=3001                    # 服务端口
NODE_ENV=development         # 环境
REDIS_HOST=                  # Redis 主机，留空则不使用 Redis
REDIS_PORT=6379
CLIENT_URL=http://localhost:5173  # 前端地址（CORS）
JWT_EXPIRES_IN=7d            # Token 过期时间
API_RATE_LIMIT_WINDOW=15     # 限流窗口（分钟）
API_RATE_LIMIT_MAX=100       # 窗口内最大请求数
LOG_LEVEL=info
```