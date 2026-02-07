# Sprint 1 — P0/P1 Fix Log

> Dragon Mill POS 神龙磨坊收银管理系统
> Period: 2026-02-07

---

## Completed Fixes

### P0-1/P0-2: Remove Unauthenticated Test Routes
- **Status**: FIXED
- **Files**: `server/src/routes/test.js` (deleted), `server/src/index.js`
- **Test**: `app.test.js` (3 tests)
- **Rollback**: `git checkout server/src/routes/test.js server/src/index.js`

### P0-3: JWT_SECRET Mandatory
- **Status**: FIXED
- **Files**: `server/src/index.js`, `server/src/middleware/auth.js`, `server/src/routes/auth.js`
- **Test**: `jwt-auth.test.js` (3 tests)
- **Rollback**: `git checkout` the 3 files

### P0-4: Remove Leaked Default Passwords
- **Status**: FIXED
- **Files**: `client/src/pages/Login/index.jsx`, `server/src/database/init.js`, `server/src/database/seed.js`, `server/.env.example`, `database/init.sql`, `server/readme.md`, all `docs/audit/*.md`
- **Test**: `no-leaked-passwords.test.js` (4 tests)
- **Rollback**: `git checkout` the files above

### P0-7: Recipe Copy Crash (undefined Material model)
- **Status**: FIXED
- **Files**: `server/src/routes/recipes.js` (4 replacements in copy, 1 in update)
- **Test**: `recipe-copy.test.js` (3 tests), `recipe-update.test.js` (4 tests)
- **Rollback**: `git checkout server/src/routes/recipes.js`

### P0-9: Checkout Schema Crash (missing order_items columns)
- **Status**: FIXED
- **Files**: `server/src/database/migrate.js` (new), `server/src/models/OrderItem.js`, `server/src/routes/cashier.js`
- **Test**: `checkout.test.js` (6 tests)
- **Migration**: `cd server && npm run db:migrate`
- **Rollback**: `git checkout` + `ALTER TABLE order_items DROP COLUMN recipe_id, recipe_details, is_recipe`

### P1-NEW-1/2: Checkout recipe_usage_logs bugs
- **Status**: FIXED
- **Files**: `server/src/routes/cashier.js` (QueryTypes import, orderNo pre-generation, deferred INSERT)
- **Test**: `cashier-checkout-flow.test.js` (6 tests)
- **Rollback**: `git checkout server/src/routes/cashier.js`

---

## P1-1: Stock Concurrency — Atomic Deduction (This Sprint)

### Problem

All stock updates used a read-then-write pattern vulnerable to concurrent overselling:

```javascript
// VULNERABLE — two concurrent requests read stock=10, both succeed
const beforeStock = product.stock;             // READ
const afterStock = beforeStock - quantity;
await product.update({ stock: afterStock });   // WRITE (stale value)
```

### Root Cause

Sequelize `findByPk()` + `update()` is not atomic. Even within a transaction, MySQL's default `REPEATABLE READ` isolation doesn't prevent lost updates when two transactions read the same row before either writes.

### Fix: Atomic SQL with WHERE Guard

All 6 stock update sites replaced with:

```javascript
// SAFE — atomic at database level, no read-then-write
const [affected] = await Product.update(
  { stock: sequelize.literal(`stock - ${qty}`) },
  { where: { id: product.id, stock: { [Op.gte]: qty } }, transaction: t }
);
if (affected === 0) {
  return res.status(400).json({ error: '库存不足' });
}
```

MySQL executes `UPDATE products SET stock = stock - N WHERE id = ? AND stock >= N` as a single atomic operation. If stock is insufficient, `affectedRows = 0` and we return a clear error.

### Changed Files

| File | Location | Change |
|------|----------|--------|
| `server/src/routes/cashier.js` | Lines ~196-235 | Normal product checkout: atomic deduction with `stock >= qty` guard |
| `server/src/routes/cashier.js` | Lines ~295-321 | Recipe material deduction: same pattern |
| `server/src/routes/products.js` | Lines ~239-258 | Batch replenish: atomic increment |
| `server/src/routes/products.js` | Lines ~684-756 | Stock adjustment: **added transaction** + atomic update with guard for loss/adjust |
| `server/src/routes/orders.js` | Lines ~181-200 | Partial refund: atomic stock restoration |
| `server/src/routes/orders.js` | Lines ~220-239 | Full refund: atomic stock restoration |

### Key Improvement: products.js `/:id/stock`

This endpoint had **zero transaction protection** — the entire read-check-write happened outside any transaction. Fixed by wrapping in `sequelize.transaction()` + atomic UPDATE.

### Verification Steps

```bash
# 1. Static regression (all 7 source checks pass)
cd server && npm test -- --testPathPattern stock-atomicity

# 2. Full integration test (requires MySQL)
# Set a product to stock=1:
mysql -u dragon_mill -p dragon_mill_pos -e "UPDATE products SET stock = 1 WHERE id = 1;"

# Fire 10 concurrent checkout requests:
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<YOUR_ADMIN_PASSWORD>"}' \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.token))")

for i in $(seq 1 10); do
  curl -s -X POST http://localhost:3001/api/v1/cashier/checkout \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"items":[{"productId":1,"quantity":1}],"paymentMethod":"cash"}' &
done
wait

# Check stock — must be 0, never negative:
mysql -u dragon_mill -p dragon_mill_pos -e "SELECT id, name, stock FROM products WHERE id = 1;"
# Expected: stock = 0

# Check orders — exactly 1 succeeded:
mysql -u dragon_mill -p dragon_mill_pos \
  -e "SELECT COUNT(*) as order_count FROM orders WHERE created_at > NOW() - INTERVAL 1 MINUTE;"
# Expected: order_count = 1
```

### UI Acceptance

1. Open cashier page, select a product with stock = 1
2. Open a second browser tab, same product
3. Both tabs: add 1 unit to cart, click checkout
4. **Expected**: First checkout succeeds; second returns "商品库存不足" error
5. Product stock shows 0 (not negative)

### Rollback

```bash
git checkout server/src/routes/cashier.js server/src/routes/products.js server/src/routes/orders.js
```

No database migration needed — no schema changes.

---

## P1-3: Order Number Collision — Centralized Generator + Retry

### Problem

Order number generation was duplicated in 3 files, all using the same weak pattern:

```javascript
// 3-digit random → only 1,000 possible values per second
const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
return `${year}${month}${day}${hour}${minute}${second}${random}`;
```

Duplicate implementations:
1. `server/src/routes/cashier.js:23-33` (main checkout)
2. `server/src/models/Order.js:102-114` (beforeCreate hook)
3. `server/src/database/init.js:383-393` (seed data)

With ~1/1,000 collision probability per second and no retry logic, concurrent checkouts could crash on the `UNIQUE` constraint.

### Root Cause

- `Math.random()` is not cryptographically random and only provides 3 digits of entropy
- No retry mechanism when the DB rejects a duplicate orderNo
- Three independent copies of the same logic — any fix would need to be applied 3 times

### Fix: Centralized Utility with Counter + Crypto Random + Retry

**New file: `server/src/utils/orderNo.js`**

```javascript
import crypto from 'crypto';

let _seq = 0;

export function generateOrderNo() {
  const ts = /* YYYYMMDDHHMMSS */;        // 14 chars
  const seq = String((_seq++) % 1000).padStart(3, '0');  // 3 chars (monotonic counter)
  const rand = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0'); // 6 chars
  return `${ts}${seq}${rand}`;            // 23 chars total, fits VARCHAR(30)
}
```

Key improvements:
- **Process-local counter** (`_seq++`) guarantees uniqueness within a single Node.js process, even in tight loops
- **`crypto.randomInt`** provides uniform, cryptographically strong 6-digit random (vs `Math.random` 3-digit)
- **Combined entropy**: counter prevents same-second collisions within process; 6-digit random prevents cross-process collisions
- **DB retry**: `Order.create` wrapped in 3-attempt loop catching `SequelizeUniqueConstraintError`

### Changed Files

| File | Change |
|------|--------|
| `server/src/utils/orderNo.js` | **NEW** — centralized generator |
| `server/src/routes/cashier.js` | Import from utils; removed local function; `let orderNo` + retry loop (max 3) around `Order.create` |
| `server/src/models/Order.js` | Import from utils; beforeCreate hook uses `generateOrderNo()` |
| `server/src/database/init.js` | Import from utils; removed local duplicate |
| `server/src/__tests__/cashier-checkout-flow.test.js` | Updated `const orderNo` → `let orderNo` check |
| `server/src/__tests__/order-no-uniqueness.test.js` | **NEW** — 11 tests (format, uniqueness, source checks, retry logic) |

### Retry Logic (cashier.js)

```javascript
let order;
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    order = await Order.create({ orderNo, ... }, { transaction: t });
    break;
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError' && attempt < 3) {
      orderNo = generateOrderNo();
      continue;
    }
    throw err;
  }
}
```

### Verification Steps

```bash
# 1. Run all orderNo tests (11 tests — no DB required)
cd server && npx --node-options="--experimental-vm-modules" jest --forceExit --testPathPattern order-no-uniqueness

# 2. Run updated cashier-checkout-flow tests (6 tests)
cd server && npx --node-options="--experimental-vm-modules" jest --forceExit --testPathPattern cashier-checkout-flow

# 3. Full integration test (requires MySQL)
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<YOUR_ADMIN_PASSWORD>"}' \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.token))")

# Fire 20 concurrent checkouts:
for i in $(seq 1 20); do
  curl -s -X POST http://localhost:3001/api/v1/cashier/checkout \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"items":[{"productId":1,"quantity":1}],"paymentMethod":"cash"}' &
done
wait

# Check: all orders should have distinct orderNo values:
mysql -u dragon_mill -p dragon_mill_pos \
  -e "SELECT order_no, COUNT(*) c FROM orders GROUP BY order_no HAVING c > 1;"
# Expected: empty result (no duplicates)
```

### Rollback

```bash
git checkout server/src/routes/cashier.js server/src/models/Order.js server/src/database/init.js
rm server/src/utils/orderNo.js
```

No database migration needed — no schema changes.

---

## P1-4: Login Brute-Force Protection — Dedicated Rate Limit

### Problem

The `/api/v1/auth/login` endpoint had no dedicated rate limit. The global API limiter (100 req/15min) was too permissive for login — an attacker could attempt 100 passwords every 15 minutes per IP.

### Fix: Login-Specific Rate Limiter

Added a dedicated `loginLimiter` in `server/src/routes/auth.js`:

```javascript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 5,                      // 5 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: '登录尝试过于频繁，请15分钟后再试'
    });
  },
});

router.post('/login', loginLimiter, async (req, res) => { ... });
```

Key points:
- **Only affects POST /login** — other auth endpoints (`/me`, `/logout`, `/change-password`) and all other API routes are unaffected
- **Uses the unified error structure** `{ success: false, error }` (not `express-rate-limit`'s default plain-text response)
- **`express-rate-limit@7.5.1`** already installed — no new dependencies
- **In-memory store** is sufficient for single-process deployment; upgrade to Redis store if horizontally scaled

### Changed Files

| File | Change |
|------|--------|
| `server/src/routes/auth.js` | Added `rateLimit` import, `loginLimiter` middleware, applied to `POST /login` |
| `server/src/__tests__/login-rate-limit.test.js` | **NEW** — 6 tests (source checks + HTTP 429 verification) |

### Verification Steps

```bash
# 1. Run rate limit tests (6 tests — no DB required)
cd server && npx --node-options="--experimental-vm-modules" jest --forceExit --testPathPattern login-rate-limit

# 2. Manual test (requires running server)
for i in $(seq 1 6); do
  echo "--- Attempt $i ---"
  curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"attacker","password":"wrong"}'
done
# Expected: attempts 1-5 return 401/500, attempt 6 returns 429

# 3. Verify other endpoints are NOT affected
curl -s -w "\nHTTP %{http_code}\n" http://localhost:3001/api/v1/auth/me
# Expected: 401 (not 429)
```

### Rollback

```bash
git checkout server/src/routes/auth.js
```

No database migration needed.

---

## P1-5: Product Delete Guard — Reject When Order References Exist

### Problem

`DELETE /api/v1/products/:id` unconditionally destroyed the product row, even when `order_items` rows referenced it. This caused:
- Orphaned `order_items` records pointing to a non-existent `product_id`
- Historical order data loss (product name/price no longer resolvable)
- The code even had `// TODO: 检查是否有相关订单，有则不允许删除` at line 644

### Fix

Added `OrderItem.count()` check before `product.destroy()` in `server/src/routes/products.js`:

```javascript
import OrderItem from '../models/OrderItem.js';

// Inside DELETE /:id handler:
const refCount = await OrderItem.count({ where: { productId: product.id } });
if (refCount > 0) {
  return res.status(400).json({
    success: false,
    error: `该商品已关联 ${refCount} 条订单记录，无法删除`
  });
}
```

### Changed Files

| File | Change |
|------|--------|
| `server/src/routes/products.js` | Added `OrderItem` import + count guard in delete handler |
| `server/src/__tests__/product-delete-guard.test.js` | **NEW** — 6 tests (source checks + HTTP auth gates) |

### Verification Steps

```bash
# 1. Run guard tests (6 tests — no DB required for source checks)
cd server && npx --node-options="--experimental-vm-modules" jest --forceExit --testPathPattern product-delete-guard

# 2. Integration test (requires MySQL + seeded data)
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<YOUR_ADMIN_PASSWORD>"}' \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.token))")

# Try deleting a product that has orders:
curl -s -X DELETE http://localhost:3001/api/v1/products/1 \
  -H "Authorization: Bearer $TOKEN"
# Expected: 400 { "success": false, "error": "该商品已关联 N 条订单记录，无法删除" }

# Create a product with no orders, then delete:
NEW_ID=$(curl -s -X POST http://localhost:3001/api/v1/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"测试删除","price":1,"stock":0,"categoryId":1}' \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.id))")
curl -s -X DELETE "http://localhost:3001/api/v1/products/$NEW_ID" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 { "success": true, "message": "商品删除成功" }
```

### Rollback

```bash
git checkout server/src/routes/products.js
```

No database migration needed.

---

## Test Matrix

| Test File | Tests | Covers |
|-----------|:-----:|--------|
| `app.test.js` | 3 | Health check, test routes removed |
| `jwt-auth.test.js` | 3 | JWT secret enforcement |
| `recipe-copy.test.js` | 3 | Recipe copy model fix |
| `recipe-update.test.js` | 4 | Recipe update model fix |
| `checkout.test.js` | 6 | OrderItem model fields, checkout shape |
| `cashier-checkout-flow.test.js` | 6 | orderNo, QueryTypes, recipe_usage_logs |
| `no-leaked-passwords.test.js` | 4 | No hardcoded passwords in source |
| `stock-atomicity.test.js` | 8 | Atomic stock patterns + concurrent shape |
| `order-no-uniqueness.test.js` | 11 | orderNo format, uniqueness, centralization, retry |
| `login-rate-limit.test.js` | 6 | Login rate limit + 429 response |
| `product-delete-guard.test.js` | 6 | Product delete OrderItem guard + auth gates |
| **Total** | **60** | |
