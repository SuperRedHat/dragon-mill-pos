# FIX_PLAN — P0 Critical Issues

> Dragon Mill POS 神龙磨坊收银管理系统
> Generated: 2026-02-07

---

## Recommended Fix Order

| Phase | P0 | Rationale |
|:-----:|:--:|-----------|
| 1 | P0-1, P0-2 | 消除未认证远程攻击面 (test routes) |
| 2 | P0-3 | 消除 JWT 伪造风险 |
| 3 | P0-7 | 修复运行时崩溃 (recipe copy) |
| 4 | P0-4 | 移除前端泄露的默认密码 |
| 5 | P0-8 | 防止生产数据误删 (db:init/seed) |
| 6 | P0-5, P0-6 | Docker 凭据安全 |

---

## P0-1: Unauthenticated File Upload (`/api/test/upload`)

**问题**: 任何人可无认证向服务器上传任意文件（无类型过滤、无大小限制），文件落入 `uploads/avatars/`。

**影响范围**:
- `server/src/routes/test.js` — 整个文件（84 行）
- `server/src/index.js:16` — `import testRoutes`
- `server/src/index.js:76` — `app.use('/api/test', testRoutes)`

**具体改动点**:

| 文件 | 改动 |
|------|------|
| `server/src/index.js:16` | 删除 `import testRoutes from './routes/test.js';` |
| `server/src/index.js:76` | 删除 `app.use('/api/test', testRoutes);` |
| `server/src/routes/test.js` | 删除整个文件 |

> 若需保留 `/api/test/ping` 作为健康检查，已有 `/health` 端点（`index.js:82`）可替代。

**验证步骤**:
```bash
# 修复前（应返回 200）:
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/api/test/upload -F "file=@package.json"
# 预期: 200

# 修复后（应返回 404）:
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/api/test/upload -F "file=@package.json"
# 预期: 404
```

**风险与回滚**: 删除测试路由不影响任何业务功能；回滚只需 `git checkout server/src/routes/test.js server/src/index.js`。

---

## P0-2: Information Leakage (`/api/test/check-dirs`)

**问题**: 无认证端点暴露服务器 `cwd()`、文件系统路径和目录存在性。

**影响范围**:
- `server/src/routes/test.js:67-82`
- `server/src/index.js:76`

**具体改动点**:

与 P0-1 相同 — 删除整个 test routes 文件和其在 `index.js` 中的注册即可同时修复。

**验证步骤**:
```bash
# 修复前（应返回 200 + 路径信息）:
curl -s http://localhost:3001/api/test/check-dirs | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(j.data?.cwd?'LEAK':'OK')})"
# 预期: LEAK

# 修复后（应返回 404）:
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/test/check-dirs
# 预期: 404
```

**风险与回滚**: 同 P0-1。

---

## P0-3: JWT Default Secret Key Fallback

**问题**: 未设置 `JWT_SECRET` 时代码回退到硬编码 `'your-secret-key'`，攻击者可伪造任意 JWT。

**影响范围**:
- `server/src/middleware/auth.js:12` — token 验证
- `server/src/routes/auth.js:53` — token 签发
- `server/src/index.js` — 启动入口（添加校验）

**具体改动点**:

| 文件 | 行号 | 改动 |
|------|------|------|
| `server/src/index.js` | 在 `startServer` 函数开头（`:100` 之后） | 添加: `if (!process.env.JWT_SECRET) { logger.error('FATAL: JWT_SECRET environment variable is not set'); process.exit(1); }` |
| `server/src/middleware/auth.js:12` | 移除 fallback | `jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')` → `jwt.verify(token, process.env.JWT_SECRET)` |
| `server/src/routes/auth.js:53` | 移除 fallback | `process.env.JWT_SECRET || 'your-secret-key'` → `process.env.JWT_SECRET` |

**验证步骤**:
```bash
# 验证 1: 无 JWT_SECRET 时服务器应拒绝启动
cd server
JWT_SECRET= node -e "
  process.env.JWT_SECRET = '';
  import('./src/index.js').catch(e => console.log('BLOCKED:', e.message));
"
# 预期: 进程退出，日志包含 "JWT_SECRET"

# 验证 2: 有 JWT_SECRET 时正常启动
cd server
JWT_SECRET=test-secret-key-123 npx nodemon --once src/index.js &
sleep 3
curl -s http://localhost:3001/health | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).status))"
# 预期: ok
kill %1

# 验证 3: 旧的默认密钥签发的 token 不再生效
node -e "
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({id:1,role:'admin'}, 'your-secret-key');
  console.log(token);
" | xargs -I{} curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/auth/me -H "Authorization: Bearer {}"
# 预期: 401
```

**风险与回滚**: 所有 `.env` 文件必须包含 `JWT_SECRET`；回滚 = `git checkout` 两个文件。

---

## P0-7: Recipe Copy References Undefined `Material` Model — Runtime Crash

**问题**: `POST /recipes/:id/copy` 引用了从未导入的 `Material` 变量，任何调用直接 500 崩溃。

**影响范围**:
- `server/src/routes/recipes.js:229-285` — copy 端点

**具体改动点**:

| 文件 | 行号 | 原代码 | 改为 |
|------|------|--------|------|
| `recipes.js:235` | include model | `model: Material` | `model: Product` |
| `recipes.js:236` | alias | `as: 'materials'` | `as: 'products'` |
| `recipes.js:261` | iterate | `sourceRecipe.materials` | `sourceRecipe.products` |
| `recipes.js:264` | FK field | `materialId: material.id` | `productId: material.id` |

共 4 处替换，全部在同一个函数体内。

**验证步骤**:
```bash
# 准备: 获取 token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<YOUR_ADMIN_PASSWORD>"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.token))")

# 修复前（应返回 500）:
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/api/v1/recipes/1/copy \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
# 预期: 500

# 修复后（应返回 200 + 新配方数据）:
curl -s -X POST http://localhost:3001/api/v1/recipes/1/copy \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"测试复制"}' | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(j.success?'OK: id='+j.data.id:'FAIL: '+j.error)})"
# 预期: OK: id=<新ID>
```

**风险与回滚**: 仅改 4 个标识符，不影响其他端点；回滚 = `git checkout server/src/routes/recipes.js`。

---

## P0-4: Default Admin Password Displayed on Login Page

> **STATUS: FIXED** (2026-02-07)

**问题**: 生产环境登录页明文显示默认管理员密码。

**修复范围（全仓库清理）**:

| 类别 | 文件 | 改动 |
|------|------|------|
| **前端** | `client/src/pages/Login/index.jsx:82` | 密码改为仅当 `VITE_DEMO_ADMIN_PASSWORD` 环境变量存在时才显示，缺省为空不渲染 |
| **种子脚本** | `server/src/database/init.js:28,39,432,433` | 硬编码密码 → `process.env.DEFAULT_ADMIN_PASSWORD \|\| 'changeme'`；日志不再泄露密码 |
| **种子脚本** | `server/src/database/seed.js:20,35,60,61` | 同上，staff 密码 `'123456'` → env var |
| **配置模板** | `server/.env.example:27` | `=<YOUR_ADMIN_PASSWORD>` 占位符 |
| **SQL** | `database/init.sql:26` | 注释移除密码 |
| **文档** | `server/readme.md`, `docs/audit/` 全部 5 文件 | 所有明文密码替换为 `<YOUR_ADMIN_PASSWORD>` 占位符 |

**验证步骤**:
```bash
# 1. 全仓库搜索（应仅在本 FIX_PLAN 描述段出现占位符，不再有明文密码）
rg "Admin@123456" .
# 预期: 无输出

# 2. Jest 静态测试
cd server && npm test -- --testPathPattern no-leaked-passwords

# 3. 前端构建无密码泄露
cd client && npm run build
rg "Admin@123456" dist/
# 预期: 无输出
```

**风险与回滚**: 前端改为环境变量驱动，缺省不显示；种子脚本用 `changeme` 作为安全兜底。

---

## P0-8: `db:init` / `db:seed` 使用 `force:true` 无生产保护

**问题**: 两个脚本直接 `sequelize.sync({ force: true })` 删除全部表，无环境检查，生产环境误执行 = 全量数据丢失。

**影响范围**:
- `server/src/database/init.js:15-22`
- `server/src/database/seed.js:7-14`

**具体改动点**:

| 文件 | 位置 | 改动 |
|------|------|------|
| `server/src/database/init.js` | 函数体最前面（`:16` 之前插入） | 添加生产环境检测：`if (process.env.NODE_ENV === 'production') { logger.error('REFUSED: db:init cannot run in production. Set NODE_ENV=development to proceed.'); process.exit(1); }` |
| `server/src/database/seed.js` | 函数体最前面（`:8` 之前插入） | 添加相同的检测逻辑 |

**验证步骤**:
```bash
# 验证 1: production 模式拒绝执行
cd server
NODE_ENV=production node src/database/init.js 2>&1 | grep -i "REFUSED"
echo "Exit code: $?"
# 预期: 输出包含 REFUSED，exit code = 1

NODE_ENV=production node src/database/seed.js 2>&1 | grep -i "REFUSED"
echo "Exit code: $?"
# 预期: 输出包含 REFUSED，exit code = 1

# 验证 2: development 模式正常执行（测试环境下）
cd server
NODE_ENV=development node src/database/init.js 2>&1 | tail -3
# 预期: "数据库初始化完成" 正常输出
```

**风险与回滚**: 仅在函数开头加了 guard，不影响 dev 环境正常使用；回滚 = `git checkout server/src/database/init.js server/src/database/seed.js`。

---

## P0-5: Redis Without Authentication (Docker)

**问题**: Docker Compose 中 Redis 无密码，任何同网络进程可直接访问。

**影响范围**:
- `docker-compose.yml:21-30` — redis service
- `docker-compose.yml:41-44` — server service environment

**具体改动点**:

| 文件 | 位置 | 改动 |
|------|------|------|
| `docker-compose.yml` | redis service（`:24` 后添加） | 添加 `command: redis-server --requirepass ${REDIS_PASSWORD}` |
| `docker-compose.yml` | server environment（`:44` 后添加） | 添加 `REDIS_PASSWORD: ${REDIS_PASSWORD}` |
| `.env.docker`（新建） | 根目录 | 添加 `REDIS_PASSWORD=<生成的强密码>` |
| `.gitignore` | 末尾 | 确认 `.env*` 已被忽略（当前 `.env` 已在 `.gitignore:15`，`.env.docker` 匹配 `.env*` 需确认） |

**验证步骤**:
```bash
# 验证（Docker 环境）:
docker-compose up -d redis
redis-cli -h localhost -p 6379 PING
# 预期: (error) NOAUTH Authentication required.

redis-cli -h localhost -p 6379 -a "$REDIS_PASSWORD" PING
# 预期: PONG

docker-compose down
```

**风险与回滚**: 需确保 server 容器的 `REDIS_PASSWORD` 与 redis 的 `--requirepass` 一致；回滚 = `git checkout docker-compose.yml`。

---

## P0-6: Hardcoded MySQL Passwords in Docker Compose

**问题**: MySQL root 密码 `rootpassword` 和用户密码 `dragon_mill_password` 硬编码在版本控制的 YAML 中。

**影响范围**:
- `docker-compose.yml:9-12` — mysql environment
- `docker-compose.yml:41-44` — server environment

**具体改动点**:

| 文件 | 行号 | 原值 | 改为 |
|------|------|------|------|
| `docker-compose.yml:9` | MYSQL_ROOT_PASSWORD | `rootpassword` | `${MYSQL_ROOT_PASSWORD}` |
| `docker-compose.yml:12` | MYSQL_PASSWORD | `dragon_mill_password` | `${MYSQL_PASSWORD}` |
| `docker-compose.yml` | server environment | (无 DB 密码) | 添加 `DB_PASSWORD: ${MYSQL_PASSWORD}`, `DB_USER: ${MYSQL_USER:-dragon_mill}`, `DB_NAME: ${MYSQL_DATABASE:-dragon_mill_pos}` |
| `.env.docker`（新建或追加） | 根目录 | — | 添加 `MYSQL_ROOT_PASSWORD=<强密码>`, `MYSQL_PASSWORD=<强密码>` |

**验证步骤**:
```bash
# 验证 1: YAML 中不再包含明文密码
grep -E "(rootpassword|dragon_mill_password)" docker-compose.yml
# 预期: 无输出

# 验证 2: Docker 变量替换生效
docker-compose config | grep MYSQL_ROOT_PASSWORD
# 预期: 显示的是 .env.docker 中的实际密码值，非 "rootpassword"
```

**风险与回滚**: 已运行的 Docker 数据卷中 MySQL 密码不会自动更改，需 `docker-compose down -v` 重建或手动 ALTER USER；回滚 = `git checkout docker-compose.yml`。

---

## P0-9: Checkout Crash — `order_items` Table Missing `recipe_details`/`is_recipe`/`recipe_id` Columns

> **MIGRATION REQUIRED**: 已有数据库必须执行 `cd server && npm run db:migrate` 才能修复此问题。
> 迁移是幂等的（可重复执行），使用 `information_schema` 检查列是否存在，跳过已有列。
> `_migrations` 追踪表记录已执行的迁移，防止重复应用。

**问题**: 收银台结账时，Sequelize 生成的 INSERT 语句包含 `recipe_details`、`is_recipe`、`recipe_id` 列，但数据库表 `order_items` 中不存在这些列。报错：
```
SequelizeDatabaseError: Unknown column 'recipe_details' in 'field list'
```

**根因链条**:
1. `OrderItem` 模型（`models/OrderItem.js:53-63`）定义了 `recipeDetails`(JSON)、`isRecipe`(BOOLEAN) 字段
2. Sequelize 的 `create()` 即使未显式传入这些字段，也会在 INSERT 中包含它们（因为有 `defaultValue`）
3. 迁移脚本 `migrations/add-recipe-fields.js` 存在且正确，但 `package.json` 的 `db:migrate` 指向不存在的 `migrate.js` → **迁移从未执行**
4. 同时，`cashier.js:412-421` 的 `OrderItem.create()` 调用缺少 `isRecipe`、`recipeDetails`、`recipeId` 字段 → 即使表结构正确，配方信息也不会被保存
5. 模型缺少 `recipeId` 字段定义 → 与迁移/cashier 代码不一致

**影响范围**:
- `server/src/database/migrate.js` — **不存在**（package.json 引用了但文件未创建）
- `server/src/models/OrderItem.js:53-63` — 缺少 `recipeId` 字段
- `server/src/routes/cashier.js:412-421` — `OrderItem.create()` 未传入配方字段

**具体改动点**:

| 文件 | 改动 |
|------|------|
| `server/src/database/migrate.js` | **新建** — 迁移运行器，导入并执行 `add-recipe-fields.js` |
| `server/src/models/OrderItem.js` | **新增** `recipeId` 字段（`field: 'recipe_id'`, INTEGER, 默认 null）；给 `recipeDetails` 添加显式 `field: 'recipe_details'` |
| `server/src/routes/cashier.js:412-421` | `OrderItem.create()` 增加 `isRecipe: item.isRecipe \|\| false`, `recipeId: item.recipeId \|\| null`, `recipeDetails: item.recipeDetails \|\| null` |

**修复步骤（已有数据库，不想 force:true 重建）**:
```bash
cd server
# 运行迁移（幂等，可多次执行）
JWT_SECRET=xxx npm run db:migrate
# 重启服务器
JWT_SECRET=xxx node src/index.js
```

**修复步骤（全新环境）**:
```bash
cd server
JWT_SECRET=xxx npm run db:init    # force:true 重建，模型已包含新字段
```

**验证步骤**:
```bash
# 1. 获取 token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<YOUR_ADMIN_PASSWORD>"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.token))")

# 2. 普通商品结账（应返回 200 + 订单数据）
curl -s -X POST http://localhost:3001/api/v1/cashier/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":1,"quantity":1}],"paymentMethod":"cash"}' \
  | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(j.success?'OK: order='+j.data.orderNo:'FAIL: '+j.error)})"
# 预期: OK: order=<订单号>

# 3. 配方结账（应返回 200 + 订单数据，不再报 Unknown column）
curl -s -X POST http://localhost:3001/api/v1/cashier/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipes":[{"recipeId":1,"weight":500,"quantity":1}],"paymentMethod":"cash"}' \
  | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(j.success?'OK: order='+j.data.orderNo:'FAIL: '+j.error)})"
# 预期: OK: order=<订单号>

# 4. 验证订单项包含配方信息
curl -s http://localhost:3001/api/v1/orders/2 \
  -H "Authorization: Bearer $TOKEN" \
  | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);const item=j.data.items[0];console.log('isRecipe:',item.is_recipe,'recipeDetails:',!!item.recipe_details)})"
# 预期: isRecipe: true recipeDetails: true
```

**已知残留问题**: 全部已修复（见 P1-NEW-1/2）。

**风险与回滚**: 迁移仅添加列（`ADD COLUMN`），不改动现有数据；回滚 = `git checkout` 三个文件 + `ALTER TABLE order_items DROP COLUMN recipe_id, DROP COLUMN recipe_details, DROP COLUMN is_recipe`。

---

## P1-NEW-1: Checkout — `order.id` Referenced Before `Order.create()` + Missing `QueryTypes` Import

> **STATUS: FIXED** (2026-02-07)

**问题**: `cashier.js` checkout 端点在处理配方时，`recipe_usage_logs` INSERT 语句在 `Order.create()` 之前执行，导致 `order.id` 为 `undefined`。同时 `QueryTypes` 未导入，`QueryTypes.INSERT` 抛出 `ReferenceError`。两个 bug 叠加导致配方使用日志**始终静默丢失**。

**根因**: recipe_usage_logs INSERT 位于配方处理循环内（在 `Order.create()` 之前），但它需要 `order.id` 作为外键。

**修复改动点**:

| 文件 | 行号 | 改动 |
|------|------|------|
| `cashier.js:2` | import | `{ Op }` → `{ Op, QueryTypes }` |
| `cashier.js:180` | 新增 | `const pendingRecipeUsageLogs = [];` — 在循环前声明收集数组 |
| `cashier.js:371-384` | 替换 | 将 INSERT 改为收集数据到 `pendingRecipeUsageLogs` |
| `cashier.js:421` 后 | 新增 | 在 `Order.create()` + `OrderItem.create()` 之后，遍历 `pendingRecipeUsageLogs` 写入 |

**验证步骤**:
```bash
# 静态验证 (Jest)
cd server && npm test -- --testPathPattern cashier-checkout-flow

# 集成验证（需要 MySQL）
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<YOUR_ADMIN_PASSWORD>"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.token))")

curl -s -X POST http://localhost:3001/api/v1/cashier/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipes":[{"recipeId":1,"weight":500,"quantity":1}],"paymentMethod":"cash"}'
# 预期: 200 + 订单数据

# 验证 recipe_usage_logs 是否写入
mysql -u dragon_mill -p dragon_mill_pos -e "SELECT * FROM recipe_usage_logs ORDER BY id DESC LIMIT 1;"
# 预期: 有记录，order_id 非 NULL
```

---

## P1-NEW-2: Checkout — Stock Record Remark Contains Wrong Order Number

> **STATUS: FIXED** (2026-02-07)

**问题**: `cashier.js:230` 在库存记录的 remark 中调用 `generateOrderNo()` 生成了一个**与实际订单号不同**的随机编号。原因是 `generateOrderNo()` 在 line 230 和 line 398 被调用了两次，每次产生不同的时间戳+随机后缀。

**影响**: 库存变动记录中的"订单号"字段与真实订单号不匹配，导致库存追溯无法关联到正确订单。

**修复改动点**:

| 文件 | 行号 | 改动 |
|------|------|------|
| `cashier.js:180` | 新增 | `const orderNo = generateOrderNo();` — 在循环前一次性生成 |
| `cashier.js:230` | 修改 | `generateOrderNo()` → `orderNo`（引用预生成的变量） |
| `cashier.js:398` | 修改 | `orderNo: generateOrderNo()` → `orderNo`（引用同一变量） |

**验证步骤**:
```bash
# 静态验证 (Jest)
cd server && npm test -- --testPathPattern cashier-checkout-flow

# 集成验证（需要 MySQL）
# 结账后检查库存记录的 remark 中的订单号与实际订单号是否一致
mysql -u dragon_mill -p dragon_mill_pos -e "
  SELECT o.order_no, sr.remark
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN stock_records sr ON sr.product_id = oi.product_id
    AND sr.created_at >= o.created_at
  ORDER BY o.id DESC LIMIT 5;
"
# 预期: remark 中的订单号与 order_no 一致
```

---

## Checklist Summary

| P0 | 文件数 | 改动行数 | 验证命令 |
|:--:|:------:|:--------:|----------|
| P0-1 | 2 (删 test.js, 改 index.js) | -84, -2 | `curl -w "%{http_code}" POST /api/test/upload` → 404 |
| P0-2 | 同 P0-1 | 同 P0-1 | `curl -w "%{http_code}" GET /api/test/check-dirs` → 404 |
| P0-3 | 3 (index.js, auth.js middleware, auth.js route) | +3, ~2 | 无 JWT_SECRET 启动 → exit 1；伪造 token → 401 |
| P0-7 | 1 (recipes.js) | ~4 替换 | `POST /recipes/1/copy` → 200 + 新配方 |
| P0-4 | 1 (Login/index.jsx) | ~1 | `grep "<YOUR_ADMIN_PASSWORD>" client/dist/` → 无输出 |
| P0-8 | 2 (init.js, seed.js) | +6 | `NODE_ENV=production node init.js` → exit 1 |
| P0-5 | 1 (docker-compose.yml) + 1 (.env.docker) | +3 | `redis-cli PING` → NOAUTH |
| P0-6 | 1 (docker-compose.yml) + 1 (.env.docker) | ~4 | `grep rootpassword docker-compose.yml` → 空 |
| P0-9 | 3 (migrate.js 新建, OrderItem.js, cashier.js) | +25, ~5 | `POST /cashier/checkout` 含配方 → 200 + 订单号 |
| P1-NEW-1 | 1 (cashier.js) | ~15 | `npm test -- cashier-checkout-flow` → 6 pass |
| P1-NEW-2 | 1 (cashier.js) | ~3 | 同上 |
