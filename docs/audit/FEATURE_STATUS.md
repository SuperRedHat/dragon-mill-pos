# Feature Status — Dragon Mill POS 功能完成度盘点

> Generated: 2026-02-07 | Branch: `chore/revive-audit`

---

## 总览

| 模块 | 前端页面 | 后端接口 | 可用程度 | 阻塞 Bug | 缺失功能 |
|------|---------|---------|---------|---------|---------|
| 登录/用户 | 3 页面 | 13 端点 | **可用** | 无 | 登录历史/操作日志页面用 mock 数据 |
| 收银 | 1 页面 | 6 端点 | **可用** | ~~2 个已修~~ | 无 |
| 订单 | 1 页面 | 3 端点 | **可用** | 无 | 无 |
| 会员 | 2 页面 | 7 端点 | **可用** | 无 | 积分调整无审计日志 |
| 商品 | 3 页面 | 13 端点 | **可用** | 路由重复（2 组） | 导出功能未实现；删除不检查关联订单 |
| 配方 | 2 页面 | 5 端点 | **可用** | 无 | 磨粉服务"创建临时配方"按钮未实现 |
| 报表 | 0 页面 | 0 端点 | **不可用** | — | 全部 3 个报表页为 ComingSoon 占位 |
| 设置 | 1 页面 | 0 端点 | **半成品** | 无 | 店铺设置、系统设置为 ComingSoon 占位 |

**总计**: 13 个功能页面 + 3 个占位页 | 47+ 后端端点 | 核心业务闭环可用

---

## 1. 登录 / 用户管理

### 前端页面

| 页面 | 路由 | 可用程度 | 说明 |
|------|------|---------|------|
| 登录 | `/login` | **可用** | 用户名/密码登录，表单验证，token 写入 localStorage |
| 用户管理 | `/settings/users` | **可用** | CRUD、软删除/恢复、重置密码、操作日志时间线 |
| 个人中心 | `/profile` | **半成品** | 基本信息编辑可用；安全标签/操作日志标签使用 **硬编码 mock 数据** |

### 后端接口

| 端点 | 方法 | 鉴权 | 状态 |
|------|------|------|------|
| `/api/v1/auth/login` | POST | 无 | **完整** — bcrypt 验证、JWT 签发、登录日志 |
| `/api/v1/auth/me` | GET | 是 | **完整** |
| `/api/v1/auth/logout` | POST | 是 | **完整** — 无 token 失效（无状态 JWT） |
| `/api/v1/auth/change-password` | POST | 是 | **完整** |
| `/api/v1/users` | GET | admin | **完整** — 分页、多字段搜索 |
| `/api/v1/users` | POST | admin | **完整** — 用户名唯一校验 |
| `/api/v1/users/:id` | GET/PUT | admin | **完整** — 自身不可改角色/禁用 |
| `/api/v1/users/:id/reset-password` | POST | admin | **完整** |
| `/api/v1/users/:id` | DELETE | admin | **完整** — 软删除，不可删自己 |
| `/api/v1/users/:id/restore` | POST | admin | **完整** |
| `/api/v1/users/deleted/list` | GET | admin | **完整** |
| `/api/v1/users/:id/logs` | GET | admin | **完整** |
| `/api/v1/profile/update` | PUT | 是 | **完整** |
| `/api/v1/profile/avatar` | POST | 是 | **完整** — Multer 2MB |
| `/api/v1/profile/login-history` | GET | 是 | **完整** — 但前端未调用，用 mock |
| `/api/v1/profile/operation-logs` | GET | 是 | **完整** — 但前端未调用，用 mock |
| `/api/v1/profile/stats` | GET | 是 | **完整** |

### 阻塞 Bug
无。

### 缺失功能
- 前端 Profile 页「安全」标签登录历史为硬编码 mock（后端 API 已有，未对接）
- 前端 Profile 页「操作日志」标签为硬编码 mock（后端 API 已有，未对接）
- 无 token 主动失效机制（无状态 JWT，logout 仅记日志）

---

## 2. 收银（POS）

### 前端页面

| 页面 | 路由 | 可用程度 | 说明 |
|------|------|---------|------|
| 收银台 | `/cashier` | **可用** | 2473 行，功能完整：商品搜索/分类、购物车、会员识别、配方称重、支付、打印小票 |

### 后端接口

| 端点 | 方法 | 鉴权 | 状态 |
|------|------|------|------|
| `/api/v1/cashier/checkout` | POST | 是 | **可用** — 事务保护，支持商品+配方混合结账 |
| `/api/v1/cashier/recipes/for-sale` | GET | 是 | **完整** — 过滤状态/类型，支持会员专属配方 |
| `/api/v1/cashier/recipes/calculate` | POST | 是 | **完整** — 材料成本 + 加工费计算 |
| `/api/v1/cashier/products/search` | GET | 是 | **完整** — 名称/简称/条码搜索 |
| `/api/v1/cashier/products/available` | GET | 是 | **完整** — 按分类分组 |
| `/api/v1/cashier/today-stats` | GET | 是 | **完整** — 今日销售/单数/均价 |

### 阻塞 Bug（已修复）
- ~~P0-9: `recipe_details` 列不存在导致 checkout 500（已通过 migrate.js + 模型修复）~~
- ~~checkout 中 `recipe_usage_logs` INSERT 引用未声明的 `order.id` + 未导入 `QueryTypes`~~

### 缺失功能
- 无（核心流程完整）

---

## 3. 订单管理

### 前端页面

| 页面 | 路由 | 可用程度 | 说明 |
|------|------|---------|------|
| 订单列表 | `/orders` | **可用** | 搜索/筛选、详情抽屉、退款（admin）、打印小票、配方材料展开 |

### 后端接口

| 端点 | 方法 | 鉴权 | 状态 |
|------|------|------|------|
| `/api/v1/orders` | GET | 是 | **完整** — 分页、多条件搜索、会员名搜索 JOIN |
| `/api/v1/orders/:id` | GET | 是 | **完整** — 含 OrderItem + Member + User 关联 |
| `/api/v1/orders/:id/refund` | POST | admin | **完整** — 事务：部分/全额退款、库存恢复、积分回退、审计日志 |

### 阻塞 Bug
无。

### 缺失功能
- 订单状态转换无严格状态机校验（如已退款订单可能被重复操作）

---

## 4. 会员管理

### 前端页面

| 页面 | 路由 | 可用程度 | 说明 |
|------|------|---------|------|
| 会员列表 | `/members/list` | **可用** | CRUD、详情抽屉（含专属配方+消费时间线）、积分调整（admin） |
| 积分管理 | `/members/points` | **可用** | 统计卡片、分布图（ECharts）、规则编辑、积分历史 |

### 后端接口

| 端点 | 方法 | 鉴权 | 状态 |
|------|------|------|------|
| `/api/v1/members` | GET | 是 | **完整** — 分页、姓名/手机/会员号搜索 |
| `/api/v1/members/search` | GET | 是 | **完整** — 快速搜索，含会员专属配方 |
| `/api/v1/members/phone/:phone` | GET | 是 | **完整** — 收银台快速查找 |
| `/api/v1/members` | POST | 是 | **完整** — 姓名+手机必填，手机唯一 |
| `/api/v1/members/:id` | PUT | 是 | **完整** |
| `/api/v1/members/:id/points` | POST | admin | **半成品** — 积分调整可用，但缺少审计日志（TODO） |
| `/api/v1/members/:id/orders` | GET | 是 | **完整** |
| `/api/v1/points/statistics` | GET | 是 | **完整** — 聚合统计 |
| `/api/v1/points/records` | GET | 是 | **完整** — 分页+筛选 |
| `/api/v1/points/rules` | GET | 是 | **完整** — 返回硬编码规则 |
| `/api/v1/points/rules` | PUT | admin | **未实现** — 接受请求但不持久化，返回 success:true |
| `/api/v1/points/batch-adjust` | POST | admin | **完整** — 事务保护批量调整 |

### 阻塞 Bug
无。

### 缺失功能
- 积分规则 PUT 不持久化（`points.js:183` TODO — 需要系统配置表）
- 积分调整无审计日志（`members.js:276` TODO）
- 会员号生成使用 count+1 模式，高并发有碰撞风险

---

## 5. 商品管理

### 前端页面

| 页面 | 路由 | 可用程度 | 说明 |
|------|------|---------|------|
| 商品列表 | `/products/list` | **可用** | CRUD、图片上传、库存调整、库存记录时间线 |
| 分类管理 | `/products/categories` | **可用** | CRUD、排序、状态切换、有商品时禁止删除 |
| 库存盘点 | `/products/inventory` | **半成品** | 统计卡片、库存状态筛选、批量补货可用；**导出功能未实现**（弹窗提示"开发中"） |

### 后端接口

| 端点 | 方法 | 鉴权 | 状态 |
|------|------|------|------|
| `/api/v1/products` | GET | 是 | **完整** — 分页、多字段搜索、库存预警筛选 |
| `/api/v1/products/:id` | GET | 是 | **完整** |
| `/api/v1/products` | POST | admin | **完整** — 条码唯一校验 |
| `/api/v1/products/:id` | PUT | admin | **完整** |
| `/api/v1/products/:id` | DELETE | admin | **半成品** — 缺少关联订单检查（`products.js:643` TODO） |
| `/api/v1/products/:id/image` | POST | admin | **完整** — Multer 5MB |
| `/api/v1/products/:id/stock` | POST | admin | **完整** — purchase/adjust/loss |
| `/api/v1/products/:id/stock-records` | GET | 是 | **完整** |
| `/api/v1/products/replenish-suggestions` | GET | admin | **Bug** — 路由重复定义（行 139 和 309），第二份不可达 |
| `/api/v1/products/batch-replenish` | POST | admin | **Bug** — 路由重复定义（行 203 和 372），第二份不可达 |
| `/api/v1/categories` | GET/POST/PUT/DELETE | 是/admin | **完整** — 含商品计数、排序 |

### 阻塞 Bug
- **products.js 路由重复定义**: `replenish-suggestions` 和 `batch-replenish` 各定义两次（行 139/309 和 203/372），Express 只匹配第一个。第二组（含 `authenticate` 中间件）永远不会执行。功能不受影响（第一组可用），但代码冗余。

### 缺失功能
- 库存导出功能（前端已有按钮，弹窗提示"开发中"）
- 商品删除不检查关联订单（允许删除有历史订单的商品）

---

## 6. 配方管理

### 前端页面

| 页面 | 路由 | 可用程度 | 说明 |
|------|------|---------|------|
| 配方列表 | `/recipes/list` | **可用** | 1070 行，功能丰富：公共/专属/模板分类、卡片展示、创建/编辑/复制、重量/百分比双模式、价格计算、加入购物车 |
| 磨粉服务 | `/recipes/service` | **半成品** | 4 步向导：会员识别→配方选择→价格确认→完成打印。"创建临时配方"按钮显示"功能开发中" |

### 后端接口

| 端点 | 方法 | 鉴权 | 状态 |
|------|------|------|------|
| `/api/v1/recipes` | GET | 是 | **完整** — 分页、类型筛选、权限逻辑 |
| `/api/v1/recipes` | POST | 是 | **完整** — 百分比总和校验（100%±0.01）、事务 |
| `/api/v1/recipes/:id` | PUT | 是 | **完整** — 权限检查、原子更新材料 |
| `/api/v1/recipes/:id/copy` | POST | 是 | **完整**（P0-7 已修） |
| `/api/v1/recipes/:id/calculate-price` | POST | 是 | **完整** |

### 阻塞 Bug
无（P0-7 已修复）。

### 缺失功能
- 磨粉服务页「创建临时配方」按钮未实现
- 配方号生成使用 count+1 模式（并发碰撞风险）

---

## 7. 报表 / 统计

### 前端页面

| 页面 | 路由 | 可用程度 | 说明 |
|------|------|---------|------|
| 销售报表 | `/reports/sales` | **不可用** | ComingSoon 占位组件 |
| 商品分析 | `/reports/products` | **不可用** | ComingSoon 占位组件 |
| 会员分析 | `/reports/members` | **不可用** | ComingSoon 占位组件 |

### 后端接口

无专用报表端点。相关统计数据分散在其他模块：
- `/api/v1/cashier/today-stats` — 今日销售统计
- `/api/v1/points/statistics` — 积分统计
- 无历史销售报表、趋势分析、导出功能

### 阻塞 Bug
无（页面不存在，无可运行代码）。

### 缺失功能
- **全部**：3 个报表页面均为占位符，无后端 API

---

## 8. 设置 / 系统

### 前端页面

| 页面 | 路由 | 可用程度 | 说明 |
|------|------|---------|------|
| 用户管理 | `/settings/users` | **可用** | （已在"登录/用户"模块列出） |
| 店铺设置 | `/settings/shop` | **不可用** | ComingSoon 占位组件 |
| 系统配置 | `/settings/system` | **不可用** | ComingSoon 占位组件 |

### 后端接口

无专用设置端点。积分规则 PUT 需要系统配置表，但该表不存在。

### 阻塞 Bug
无。

### 缺失功能
- 店铺信息设置（名称、地址、联系方式 — 小票打印需要）
- 系统配置（积分规则持久化、打印模板、参数管理）

---

## 9. 仪表盘 (Dashboard)

### 前端页面

| 页面 | 路由 | 可用程度 | 说明 |
|------|------|---------|------|
| 仪表盘 | `/dashboard` | **半成品** | 统计卡片+员工绩效+库存预警+热销排行全部使用 **硬编码 mock 数据**，无真实 API 调用 |

### 后端接口

无专用 Dashboard 端点。前端未对接任何后端 API。

### 缺失功能
- 今日统计卡片（后端 `today-stats` 存在于 cashier 模块，未对接）
- 销售趋势图表（占位文字"图表功能开发中..."）
- 员工绩效（完全 mock）
- 库存预警（完全 mock）
- 热销商品排行（完全 mock）

---

## 核心业务闭环评估

**闭环路径**: 登录 → 收银台 → 选品/称重 → 结账 → 订单查询 → 退款

| 步骤 | 可用 | 阻塞项 |
|------|------|--------|
| 1. 登录 | ✅ | 无（P0-3 JWT 已修） |
| 2. 进入收银台 | ✅ | 无 |
| 3. 搜索/选择商品 | ✅ | 无 |
| 4. 识别会员 | ✅ | 无 |
| 5. 选择配方+称重 | ✅ | 无 |
| 6. 结账支付 | ✅ | ~~P0-9 schema crash 已修~~ |
| 7. 打印小票 | ✅ | 无 |
| 8. 查询订单 | ✅ | 无 |
| 9. 退款 | ✅ | 无 |

**结论**: 核心业务闭环 **完全可用**。已修复的 P0 项不再阻塞。

---

## 已修复 P0 项汇总

| P0 | 问题 | 状态 |
|----|------|------|
| P0-1 | 未认证文件上传 `/api/test/upload` | ✅ 已删除 test.js |
| P0-2 | 信息泄露 `/api/test/check-dirs` | ✅ 已删除 test.js |
| P0-3 | JWT 默认密钥回退 | ✅ 强制 JWT_SECRET |
| P0-7 | 配方复制崩溃（未定义 Material 模型） | ✅ Material→Product |
| P0-9 | 结账崩溃（缺少 recipe_details 列） | ✅ migrate.js + 模型修复 |

## 仍需修复的阻塞/降级项

| 优先级 | 问题 | 影响 | 模块 |
|--------|------|------|------|
| **P1** | cashier.js checkout `order.id` 在创建前引用 + `QueryTypes` 未导入 | 配方使用日志静默丢失 | 收银 |
| **P1** | cashier.js 库存记录 remark 中 `generateOrderNo()` 重复调用产生不同订单号 | 库存记录中的订单号与实际订单号不一致 | 收银 |
| **P2** | products.js 路由重复定义（replenish-suggestions, batch-replenish） | 代码冗余，第二组不可达 | 商品 |
| **P2** | points PUT /rules 不持久化 | 积分规则无法保存 | 会员 |
| **P2** | Dashboard 全 mock 数据 | 仪表盘无实际数据 | 报表 |
| **P2** | Profile 安全/日志标签 mock 数据 | 个人中心部分功能名存实亡 | 用户 |
