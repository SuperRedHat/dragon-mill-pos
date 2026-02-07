# Release Checklist — `chore/revive-audit`

> Dragon Mill POS 神龙磨坊收银管理系统
> Branch: `chore/revive-audit` → merge to `main`

---

## 0. Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| Node.js | >= 18.0.0 | `node -v` |
| npm | >= 8.0.0 | `npm -v` |
| MySQL | 8.0 | `mysql --version` |
| Redis (optional) | 7.x | `redis-cli ping` — system works without it |

---

## 1. Install Dependencies

```bash
# From repo root
npm run install:all
```

Verify: no `npm ERR!` in output; `server/node_modules` and `client/node_modules` both exist.

---

## 2. Configure Environment

### Server (`server/.env`)

```bash
cp server/.env.example server/.env
```

**Must change** before first run:

| Variable | Why |
|----------|-----|
| `DB_PASSWORD` | Your MySQL root/user password |
| `JWT_SECRET` | Server **refuses to start** without it (P0-3 fix) |
| `DEFAULT_ADMIN_PASSWORD` | Seed script uses this for admin account; no more hardcoded default |

Optional:
- `REDIS_HOST` — leave unset to skip Redis (graceful fallback)
- `DB_USER` / `DB_NAME` — defaults to `root` / `dragon_mill_pos`

### Client (`client/.env`)

```bash
cp client/.env.example client/.env
```

Defaults are fine for local dev (`VITE_API_BASE_URL=http://localhost:3001/api/v1`).

---

## 3. Database Setup

### Option A: Fresh install (drops all data)

```bash
# Create the database first if it doesn't exist
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS dragon_mill_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Initialize tables + seed data (WARNING: force:true — destroys existing data)
cd server && npm run db:init
```

### Option B: Existing database — migrate only

```bash
cd server && npm run db:migrate
```

This is **idempotent** — safe to run repeatedly. It adds:
- `order_items.is_recipe`, `order_items.recipe_details`, `order_items.recipe_id`
- `recipes.last_used_at`, `recipes.last_weight`
- `recipe_usage_logs` table
- `_migrations` tracking table

Verify: no errors; log ends with `所有迁移执行完成`.

---

## 4. Run Automated Tests

```bash
cd server
npx --node-options="--experimental-vm-modules" jest --forceExit
```

### Expected results

| Outcome | Count | Note |
|---------|:-----:|------|
| **Pass** | 55+ | All static + unit tests |
| **Fail (DB-only)** | 5 | `checkout.test.js` (2) + `stock-atomicity.test.js` (3) — require live MySQL, expected to fail without DB |
| **Total** | 60 | 11 test files |

**Green** = all non-DB tests pass. If any **static source check** or **rate-limit** test fails, do not proceed.

### Test files and what they cover

| File | Tests | Category |
|------|:-----:|----------|
| `app.test.js` | 3 | Health, test routes removed |
| `jwt-auth.test.js` | 3 | JWT_SECRET enforcement |
| `no-leaked-passwords.test.js` | 4 | No hardcoded passwords |
| `recipe-copy.test.js` | 3 | Recipe copy model fix |
| `recipe-update.test.js` | 4 | Recipe update model fix |
| `cashier-checkout-flow.test.js` | 6 | orderNo flow, QueryTypes, recipe logs |
| `checkout.test.js` | 6 | OrderItem schema (2 need DB) |
| `stock-atomicity.test.js` | 8 | Atomic stock patterns (1 needs DB) |
| `order-no-uniqueness.test.js` | 11 | orderNo format, uniqueness, retry |
| `login-rate-limit.test.js` | 6 | Login 429 after 5 attempts |
| `product-delete-guard.test.js` | 6 | Delete blocked by OrderItem refs |

---

## 5. Start Dev Server

```bash
# From repo root
npm run dev
```

This starts:
- **Server** on `http://localhost:3001` (Express + Sequelize)
- **Client** on `http://localhost:5173` (Vite dev server, proxies `/api` to :3001)

Verify: server log shows `服务器运行在端口 3001` and `数据库连接成功`.

---

## 6. Manual Smoke Test

### 6.1 Login

1. Open `http://localhost:5173`
2. Login as `admin` / `<the password you set in DEFAULT_ADMIN_PASSWORD>`
3. **Expected**: redirected to dashboard; top-right shows user name
4. **Fail check**: if 429 — you hit the login rate limit (5/15min), wait 15 minutes or restart server

### 6.2 Browse Products

1. Navigate to **商品管理** (Products)
2. Verify product list loads with images, prices, stock counts
3. **Expected**: table with paginated data

### 6.3 Cashier — Normal Product Checkout

1. Navigate to **收银台** (Cashier)
2. Select a product with stock > 0, add to cart (quantity = 1)
3. Select payment method (cash)
4. Click **结算** (Checkout)
5. **Expected**: order success dialog with order number (20-digit format `YYYYMMDDHHMMSSNNNrrrrrr`)
6. Go to **商品管理**, verify the product's stock decreased by 1

### 6.4 Cashier — Recipe Checkout

1. On **收银台**, switch to **配方** tab
2. Select a recipe, set weight (e.g. 500g), add to cart
3. Checkout
4. **Expected**: order created; recipe materials' stock deducted proportionally

### 6.5 Cashier — Insufficient Stock

1. Set a product's stock to 0 (via **商品管理** → edit)
2. On **收银台**, try to checkout that product
3. **Expected**: `400 商品库存不足: <product name>` — not a 500 crash

### 6.6 Order List + Detail

1. Navigate to **订单管理** (Orders)
2. Verify the orders from 6.3/6.4 appear with correct amounts
3. Click an order to view detail
4. **Expected**: order items, member info (if any), payment method visible

### 6.7 Refund

1. In **订单管理**, select a completed order
2. Click **退货** (Refund), enter reason, confirm
3. **Expected**: order status changes to `refunded`; product stock restored (atomic increment)
4. Verify in **商品管理** that stock went back up

### 6.8 Product Delete Guard

1. Try to delete a product that has order history
2. **Expected**: `400 该商品已关联 N 条订单记录，无法删除`
3. Create a new product (no orders), delete it
4. **Expected**: `200 商品删除成功`

### 6.9 Login Rate Limit

1. Logout
2. Attempt login with wrong password 5 times rapidly
3. **Expected**: attempts 1-5 return `用户名或密码错误`
4. Attempt 6: **Expected**: `429 登录尝试过于频繁，请15分钟后再试`

---

## 7. Docker Deploy (Optional)

```bash
# From repo root
docker-compose up -d

# Verify all 4 services running:
docker-compose ps
# Expected: mysql (3306), redis (6379), server (3001), client (80)

# Run migrations inside container:
docker exec dragon-mill-server node src/database/migrate.js

# Seed data (first deploy only — WARNING: destroys existing data):
docker exec dragon-mill-server node src/database/init.js
```

Access at `http://localhost` (port 80 via nginx).

---

## 8. Troubleshooting

### 8.1 Server Won't Start

| Symptom | Cause | Fix |
|---------|-------|-----|
| `FATAL: JWT_SECRET environment variable is not set` | Missing `.env` or empty `JWT_SECRET` | Set `JWT_SECRET` in `server/.env` |
| `SequelizeAccessDeniedError` | Wrong DB credentials | Check `DB_USER` / `DB_PASSWORD` in `server/.env` |
| `SequelizeConnectionRefusedError` | MySQL not running | `systemctl start mysql` or `docker start dragon-mill-mysql` |
| `EADDRINUSE :3001` | Port in use | `lsof -i :3001` then kill the process, or change `PORT` in `.env` |

### 8.2 Server Logs

```bash
# Real-time console (dev mode)
npm run dev:server

# Log files (production)
tail -f server/logs/combined.log     # All logs
tail -f server/logs/error.log        # Errors only

# Filter by keyword
grep "订单" server/logs/combined.log
grep "error" server/logs/error.log | tail -20
```

Winston log format: `<level>: <message> {"service":"dragon-mill-pos","timestamp":"..."}`.

Operation audit trail: check `operation_logs` table in MySQL.

### 8.3 MySQL Debugging

```bash
# Connect to database
mysql -u root -p dragon_mill_pos

# Check recent orders
SELECT id, order_no, actual_amount, status, created_at
FROM orders ORDER BY created_at DESC LIMIT 10;

# Check if migrations ran
SELECT * FROM _migrations;

# Check stock for a product
SELECT id, name, stock FROM products WHERE id = 1;

# Find orphaned order items (should be empty after P1-5 fix)
SELECT oi.id, oi.product_id
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
WHERE p.id IS NULL AND oi.product_id IS NOT NULL;

# Check for duplicate order numbers (should be empty after P1-3 fix)
SELECT order_no, COUNT(*) c FROM orders GROUP BY order_no HAVING c > 1;
```

### 8.4 Redis Debugging

```bash
# Check if Redis is reachable
redis-cli ping
# Expected: PONG

# Check cached keys
redis-cli KEYS "*"

# Flush cache (safe — system rebuilds on next request)
redis-cli FLUSHDB
```

Redis is **optional** — if unavailable, the system falls back to direct DB queries. Log message: `Redis 未配置，跳过连接`.

### 8.5 Client Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Blank page / network errors | API proxy misconfigured | Verify `VITE_API_BASE_URL` in `client/.env` matches server port |
| 401 on every request | Token expired or invalid | Clear localStorage (`localStorage.clear()` in console), re-login |
| Login shows no password hint | `VITE_DEMO_ADMIN_PASSWORD` not set | This is **intentional** (P0-4 fix) — set it in `client/.env` only for demo environments |

---

## 9. Sprint 1 Fixes Included in This Release

| ID | Priority | Fix | Test File |
|----|----------|-----|-----------|
| P0-1/P0-2 | Critical | Removed unauthenticated test routes | `app.test.js` |
| P0-3 | Critical | JWT_SECRET mandatory (no default fallback) | `jwt-auth.test.js` |
| P0-4 | Critical | Removed leaked default passwords | `no-leaked-passwords.test.js` |
| P0-7 | Critical | Recipe copy crash (undefined model) | `recipe-copy.test.js` |
| P0-9 | Critical | Checkout schema crash (missing columns) | `checkout.test.js` |
| P1-NEW-1/2 | High | Checkout recipe_usage_logs bugs | `cashier-checkout-flow.test.js` |
| P1-1 | High | Stock concurrency — atomic deduction | `stock-atomicity.test.js` |
| P1-3 | High | Order number collision — centralized generator + retry | `order-no-uniqueness.test.js` |
| P1-4 | High | Login brute-force protection (5 req/15min) | `login-rate-limit.test.js` |
| P1-5 | High | Product delete blocked by order references | `product-delete-guard.test.js` |

Full details: [`docs/audit/SPRINT_1.md`](SPRINT_1.md)

---

## 10. Sign-Off

- [ ] All static/unit tests pass (55+/60)
- [ ] `npm run dev` — server starts without errors
- [ ] Login → dashboard loads
- [ ] Cashier → checkout → order created with correct stock deduction
- [ ] Refund → stock restored
- [ ] Product with orders → delete blocked (400)
- [ ] 6th wrong login → 429
- [ ] No hardcoded passwords visible in UI
