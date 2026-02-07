# AUDIT_RISKS_TODOS — Risk Registry

> Dragon Mill POS 神龙磨坊收银管理系统
> Audit date: 2026-02-07

---

## P0 — Critical (Security / Data Loss / System Crash)

### P0-1: Unauthenticated File Upload Endpoint

| Item | Detail |
|------|--------|
| **现象** | `/api/test/upload` accepts file uploads without any authentication |
| **影响** | Attackers can upload arbitrary files (no type filter, no size limit) to the server filesystem |
| **根因** | Test route registered in production with no auth middleware |
| **证据** | `server/src/routes/test.js:35` — `router.post('/upload', testUpload.single('file'), ...)` — no `authenticate` middleware; `testUpload` has no `fileFilter` or `limits` config (`:13-23`) |
| **最小修复** | Remove the test routes file or add `authenticate` + `authorize('admin')` middleware. At minimum: `router.post('/upload', authenticate, authorize('admin'), testUpload.single('file'), ...)` |
| **验证** | `curl -X POST http://localhost:3001/api/test/upload -F "file=@test.txt"` should return 401 |

### P0-2: Information Leakage — Directory Check Endpoint

| Item | Detail |
|------|--------|
| **现象** | `/api/test/check-dirs` exposes server filesystem paths (cwd, upload directories, existence checks) |
| **影响** | Attackers learn server directory structure for path traversal or targeted attacks |
| **根因** | Debug route left in production |
| **证据** | `server/src/routes/test.js:67-82` — Returns `process.cwd()`, full filesystem paths, and existence booleans |
| **最小修复** | Delete the `/check-dirs` route or guard it with `authenticate, authorize('admin')` |
| **验证** | `curl http://localhost:3001/api/test/check-dirs` should return 401 or 404 |

### P0-3: JWT Default Secret Key Fallback

| Item | Detail |
|------|--------|
| **现象** | If `JWT_SECRET` env var is not set, the code falls back to `'your-secret-key'` |
| **影响** | Attackers knowing the default key can forge valid JWT tokens for any user, including admin |
| **根因** | Fallback string in `||` expression instead of failing fast |
| **证据** | `server/src/middleware/auth.js:12` — `jwt.verify(token, process.env.JWT_SECRET \|\| 'your-secret-key')` and `server/src/routes/auth.js:53` — same fallback in token signing |
| **最小修复** | Remove the fallback; throw an error at startup if `JWT_SECRET` is not set. Add to `server/src/index.js` startup: `if (!process.env.JWT_SECRET) { throw new Error('JWT_SECRET must be set'); }` |
| **验证** | Start server without `JWT_SECRET` → should fail with clear error message |

### P0-4: Default Admin Password Displayed on Login Page

| Item | Detail |
|------|--------|
| **现象** | Login page shows `默认管理员账号：admin / Admin@123456` in the UI |
| **影响** | Anyone accessing the login page knows the admin credentials |
| **根因** | Hardcoded hint text in login component |
| **证据** | `client/src/pages/Login/index.jsx:82` — `<p>默认管理员账号：admin / Admin@123456</p>` |
| **最小修复** | Remove the hint text. Wrap it with `import.meta.env.DEV &&` check at minimum: `{import.meta.env.DEV && <p>...</p>}` |
| **验证** | Build for production (`npm run build`) and check the login page — no credentials should be visible |

### P0-5: Redis Without Authentication (Docker)

| Item | Detail |
|------|--------|
| **现象** | Docker Compose Redis service has no password configured |
| **影响** | Any process or container on the Docker network (or host if port-mapped) can access Redis |
| **根因** | Missing `requirepass` or `--requirepass` in Docker config |
| **证据** | `docker-compose.yml:22-28` — no `command: redis-server --requirepass` and no `REDIS_PASSWORD` env |
| **最小修复** | Add `command: redis-server --requirepass yourpassword` to Redis service and set `REDIS_PASSWORD` env on server service |
| **验证** | `redis-cli -h localhost -p 6379 PING` should return `NOAUTH` error |

### P0-6: Hardcoded MySQL Passwords in Docker Compose

| Item | Detail |
|------|--------|
| **现象** | MySQL root and user passwords are hardcoded in `docker-compose.yml` |
| **影响** | Anyone with repo access knows all database credentials |
| **根因** | Passwords directly in YAML instead of `.env` or secrets management |
| **证据** | `docker-compose.yml:9-12` — `MYSQL_ROOT_PASSWORD: rootpassword`, `MYSQL_PASSWORD: dragon_mill_password` |
| **最小修复** | Use `.env` file variables: `MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}` and add `.env` to `.gitignore` |
| **验证** | `grep -r "rootpassword" docker-compose.yml` should return empty |

### P0-7: Recipe Copy References Undefined Model — Runtime Crash

| Item | Detail |
|------|--------|
| **现象** | `POST /recipes/:id/copy` references `Material` model which is never imported or defined |
| **影响** | Any call to this endpoint will crash with `ReferenceError: Material is not defined` |
| **根因** | Code was written against a different model structure but never updated |
| **证据** | `server/src/routes/recipes.js:235` — `model: Material` (undefined variable). The correct model is `Product` with alias `'products'`. Also uses `as: 'materials'` instead of `as: 'products'` |
| **最小修复** | Change `Material` to `Product` and `as: 'materials'` to `as: 'products'` on line 235. Fix `sourceRecipe.materials` to `sourceRecipe.products` on line 261. Fix `materialId` to `productId` on line 264. |
| **验证** | `curl -X POST http://localhost:3001/api/v1/recipes/1/copy -H "Authorization: Bearer <token>"` should return recipe copy, not 500 |

### P0-8: `db:init` and `db:seed` Use `force:true` Without Production Guard

| Item | Detail |
|------|--------|
| **现象** | Both `init.js` and `seed.js` execute `sequelize.sync({ force: true })` which drops all tables |
| **影响** | Accidentally running in production = **complete data loss** |
| **根因** | No `NODE_ENV` check before destructive operation |
| **证据** | `server/src/database/init.js:22` — `sequelize.sync({ force: true })`; `server/src/database/seed.js:14` — `sequelize.sync({ force: true })` |
| **最小修复** | Add guard: `if (process.env.NODE_ENV === 'production') { console.error('REFUSING to run db:init in production'); process.exit(1); }` |
| **验证** | Set `NODE_ENV=production` and run `npm run db:init` — should refuse and exit |

---

## P1 — High (Business Logic Defects / Data Inconsistency)

### P1-1: Stock Management Race Condition (No Pessimistic Lock)

| Item | Detail |
|------|--------|
| **现象** | Stock read-then-write pattern allows concurrent transactions to oversell |
| **影响** | Inventory goes negative; financial discrepancy |
| **根因** | Uses `findByPk()` → read stock → `update({ stock: newValue })` instead of atomic decrement |
| **证据** | `server/src/routes/cashier.js:184-221` — `const beforeStock = product.stock; await product.update({ stock: afterStock })`. Same pattern in `products.js:697-720`, `products.js:240-246`, `orders.js:184-199` |
| **最小修复** | Use Sequelize `increment`/`decrement` or raw SQL: `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`. Check affected rows. |
| **验证** | Write a load test: 10 concurrent checkout requests for same product with stock=1. Only 1 should succeed. |

### P1-2: Member Number Generation Race Condition

| Item | Detail |
|------|--------|
| **现象** | `Member.count() + 1` pattern for generating `memberNo` is not atomic |
| **影响** | Two concurrent member creations → duplicate `memberNo` → unique constraint error (500 to user) |
| **根因** | `beforeValidate` hook uses non-atomic count |
| **证据** | `server/src/models/Member.js:86-96` — `const count = await Member.count(); member.memberNo = \`M${year}${month}${sequence}\`` |
| **最小修复** | Use a database sequence, UUID, or `MAX(member_no) + 1` within a transaction with row-level lock. Alternatively use a retry loop on unique constraint error. |
| **验证** | Concurrent test: 5 simultaneous `POST /members/` — all should succeed with unique `memberNo` |

### P1-3: Order Number Collision Risk

| Item | Detail |
|------|--------|
| **现象** | Order number = `{timestamp}{random(0-999)}`, giving 1/1000 collision probability per second |
| **影响** | Duplicate key error → checkout failure for customer |
| **根因** | Insufficient randomness in order number generation |
| **证据** | `server/src/models/Order.js:112` — `Math.floor(Math.random() * 1000)` and `server/src/routes/cashier.js:31` — same logic duplicated |
| **最小修复** | Use `uuid` (already a dependency) or increase random range to 6+ digits. Add retry logic on unique constraint error. |
| **验证** | Concurrent test: 20 simultaneous checkouts → all should get unique order numbers |

### P1-4: No Brute-Force Login Protection

| Item | Detail |
|------|--------|
| **现象** | Login endpoint has no per-user rate limiting or account lockout |
| **影响** | Attackers can attempt unlimited password guesses |
| **根因** | Global rate limit (100/15min) applies to all `/api/` routes combined, not per-user or per-endpoint |
| **证据** | `server/src/routes/auth.js:11-94` — no login attempt counter; `server/src/index.js:52-61` — global rate limit only |
| **最小修复** | Add `express-rate-limit` specifically for `/auth/login` with lower limits (e.g., 5 attempts per 15 min per IP). Alternatively, add account lockout after N failed attempts in the User model. |
| **验证** | Attempt 10 rapid logins with wrong password — should get blocked after 5 |

### P1-5: Product Deletion Without Order Association Check

| Item | Detail |
|------|--------|
| **现象** | `DELETE /products/:id` deletes the product without checking if it's referenced by existing orders |
| **影响** | OrderItems reference a deleted product; historical order data becomes inconsistent |
| **根因** | Explicit TODO comment left unimplemented |
| **证据** | `server/src/routes/products.js:643` — `// TODO: 检查是否有相关订单，有则不允许删除` followed immediately by `await product.destroy()` at `:645` |
| **最小修复** | Add: `const orderCount = await OrderItem.count({ where: { productId: req.params.id } }); if (orderCount > 0) return res.status(400).json({ error: '该商品已有订单记录，无法删除' });` |
| **验证** | Create an order with product X, then try `DELETE /products/X` — should return 400 |

### P1-6: No Client-Side Role-Based Route Guard

| Item | Detail |
|------|--------|
| **现象** | Frontend routing only checks if user is logged in, not if their role matches the page |
| **影响** | Staff users can navigate to admin-only pages (e.g., `/users`) by typing the URL; API will reject, but UI renders |
| **根因** | `ProtectedRoute` only checks for token presence, not role |
| **证据** | `client/src/routes/index.jsx` — `ProtectedRoute` / `PublicRoute` — no role check in route guards |
| **最小修复** | Add role-based route guard: `if (route.requireAdmin && user.role !== 'admin') return <Navigate to="/cashier" />` |
| **验证** | Login as staff → navigate to `/users` → should redirect, not render the admin page |

### P1-7: Weak Password Policy

| Item | Detail |
|------|--------|
| **现象** | Password validation only checks `length >= 6` |
| **影响** | Users can set easily guessable passwords like `123456` or `aaaaaa` |
| **根因** | No complexity rules (uppercase, number, special char) |
| **证据** | `server/src/routes/auth.js:143` — `newPassword.length < 6`; `server/src/routes/users.js:81` — `password.length < 6` |
| **最小修复** | Add regex check: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/` or use `joi` (already installed) |
| **验证** | Try `POST /users/` with password `123456` — should fail with complexity error |

### P1-8: Seed Script Uses Extremely Weak Staff Password

| Item | Detail |
|------|--------|
| **现象** | `seed.js` creates staff user with password `123456` |
| **影响** | If seed is run in any deployed environment, the staff account is trivially compromised |
| **根因** | Hardcoded weak password for testing convenience |
| **证据** | `server/src/database/seed.js:34` — `password: '123456'` |
| **最小修复** | Use environment variable: `password: process.env.DEFAULT_STAFF_PASSWORD \|\| 'Staff@123456'` |
| **验证** | Run `npm run db:seed` and check the staff password is not `123456` |

### P1-9: Token Stored in localStorage (XSS Risk)

| Item | Detail |
|------|--------|
| **现象** | JWT token is stored in `localStorage` |
| **影响** | If any XSS vulnerability exists, attacker JavaScript can read the token and impersonate the user |
| **根因** | Design choice — localStorage is accessible to any JS on the page |
| **证据** | Client-side auth pattern using localStorage (referenced in CLAUDE.md architecture section; `client/src/utils/request.js` token injection) |
| **最小修复** | Move token to `httpOnly` cookie (requires server-side changes: `res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' })`) |
| **验证** | Open browser devtools → `localStorage.getItem('token')` should return null; token should be in cookies |

### P1-10: No CSRF Protection

| Item | Detail |
|------|--------|
| **现象** | No CSRF token validation on state-changing endpoints |
| **影响** | Malicious websites can forge requests on behalf of authenticated users (if cookies are used for auth) |
| **根因** | Currently mitigated by Bearer token auth (localStorage), but becomes critical if P1-9 fix is implemented |
| **证据** | `server/src/index.js` — no `csurf` or similar middleware; no CSRF token in any route |
| **最小修复** | If moving to cookie-based auth: add `csurf` middleware. Current Bearer token auth provides implicit CSRF protection. |
| **验证** | N/A if staying with Bearer tokens. If cookies: verify cross-origin POST requests are rejected |

---

## P2 — Medium (Validation Gaps / Code Quality)

### P2-1: Phone Number Has No Format Validation

| Item | Detail |
|------|--------|
| **现象** | `phone` field in User and Member models accepts any string up to 20 chars |
| **影响** | Invalid phone numbers stored; SMS features (if added) will fail |
| **根因** | No `validate` block on phone fields |
| **证据** | `server/src/models/User.js:32-34` — `phone: { type: DataTypes.STRING(20) }` — no validate; `server/src/models/Member.js:22-26` — same |
| **最小修复** | Add Sequelize validation: `validate: { is: /^1[3-9]\d{9}$/ }` for Chinese mobile numbers |
| **验证** | `POST /members/` with `phone: "abc"` — should return 400 |

### P2-2: Price/Quantity/Stock Fields Allow Negative Values

| Item | Detail |
|------|--------|
| **现象** | `price`, `cost`, `memberPrice`, `stock`, `quantity` fields have no minimum value validation |
| **影响** | Negative prices or quantities could create nonsensical orders; financial reporting errors |
| **根因** | No `validate: { min: 0 }` on DECIMAL fields |
| **证据** | `server/src/models/Product.js:38-45` — `price: { type: DataTypes.DECIMAL(10,2), allowNull: false }` — no min; `server/src/models/OrderItem.js:45-52` — `quantity` same |
| **最小修复** | Add `validate: { min: 0 }` to all monetary and quantity fields |
| **验证** | `POST /products/` with `price: -10` — should return 400 |

### P2-3: `paymentMethod` Should Be ENUM Not STRING

| Item | Detail |
|------|--------|
| **现象** | `paymentMethod` is `STRING(20)` — any value accepted |
| **影响** | Inconsistent data: `"cash"`, `"Cash"`, `"CASH"`, `"现金"` could all be stored |
| **根因** | Schema design oversight |
| **证据** | `server/src/models/Order.js:60-64` — `type: DataTypes.STRING(20)` with comment "支付方式" |
| **最小修复** | Change to `DataTypes.ENUM('cash', 'wechat', 'alipay', 'card')` and add migration |
| **验证** | `POST /cashier/checkout` with `paymentMethod: "bitcoin"` — should return 400 |

### P2-4: Recipe Percentage Sum Not Validated in Update

| Item | Detail |
|------|--------|
| **现象** | Recipe creation validates percentage sum = 100%, but update does not |
| **影响** | Updating a recipe can result in materials summing to more or less than 100% |
| **根因** | Validation only in `POST /recipes/`, not in `PUT /recipes/:id` |
| **证据** | `server/src/routes/recipes.js:118-125` — validates in POST; `recipes.js:167-225` — no percentage validation in PUT |
| **最小修复** | Add same validation to PUT handler: `if (materials) { const total = materials.reduce(...); if (Math.abs(total - 100) > 0.01) return 400; }` |
| **验证** | `PUT /recipes/1` with materials summing to 80% — should return 400 |

### P2-5: `/points/rules` PUT Not Implemented

| Item | Detail |
|------|--------|
| **现象** | `PUT /points/rules` handler accepts the request but does nothing |
| **影响** | Admin thinks rules are saved, but they reset on next server restart |
| **根因** | TODO left unfinished |
| **证据** | `server/src/routes/points.js:179-193` — `// TODO: 保存到系统配置表` followed by success response |
| **最小修复** | Either implement with a `system_config` table or return `501 Not Implemented` |
| **验证** | `PUT /points/rules` → restart server → `GET /points/rules` — should return the updated values |

### P2-6: Error Handler May Leak Database Table/Column Names

| Item | Detail |
|------|--------|
| **现象** | `SequelizeValidationError` and `SequelizeUniqueConstraintError` responses include `field` (path) directly |
| **影响** | Attackers learn internal database structure |
| **根因** | `err.errors.map(e => ({ field: e.path, message: e.message }))` exposes ORM path names |
| **证据** | `server/src/middleware/errorHandler.js:31-34` and `:41-44` |
| **最小修复** | Map field names to user-friendly labels: `const friendlyField = fieldMap[e.path] \|\| '字段'; return { field: friendlyField, message: '数据验证失败' }` |
| **验证** | Trigger a unique constraint error → response should not contain DB column names like `username` or `member_no` |

### P2-7: Development Mode Exposes Stack Traces

| Item | Detail |
|------|--------|
| **现象** | When `NODE_ENV=development`, error responses include full stack traces |
| **影响** | If accidentally deployed in dev mode, stack traces reveal file paths, dependencies, and code structure |
| **根因** | Intentional debug feature, but no safeguard against accidental dev-mode deployment |
| **证据** | `server/src/middleware/errorHandler.js:54` — `...(process.env.NODE_ENV === 'development' && { stack: err.stack })` |
| **最小修复** | This is acceptable for local dev. Ensure deployment always sets `NODE_ENV=production`. Add a warning log at startup if `NODE_ENV !== 'production'` in server context. |
| **验证** | Start with `NODE_ENV=production`, trigger a 500 error → response should not contain `stack` |

### P2-8: File Upload Only Validates MIME/Extension, Not Content

| Item | Detail |
|------|--------|
| **现象** | Upload validation checks `file.mimetype` and extension regex, not actual file content (magic bytes) |
| **影响** | A malicious file renamed to `.jpg` with spoofed MIME could bypass the filter |
| **根因** | Multer `fileFilter` only has access to declared MIME type and filename |
| **证据** | `server/src/routes/products.js:37-47` — `const mimetype = allowedTypes.test(file.mimetype)` and `const extname = allowedTypes.test(path.extname(...))`; same in `profile.js:33-48` |
| **最小修复** | Add post-upload magic byte validation using a library like `file-type`: `import { fileTypeFromFile } from 'file-type'; const type = await fileTypeFromFile(req.file.path); if (!type \|\| !['image/jpeg','image/png','image/gif'].includes(type.mime)) { fs.unlinkSync(req.file.path); return 400; }` |
| **验证** | Upload a `.txt` file renamed to `.jpg` — should be rejected |

### P2-9: Order Status Transitions Have No State Machine Validation

| Item | Detail |
|------|--------|
| **现象** | Order `status` is an ENUM but there's no enforcement of valid transitions |
| **影响** | A `cancelled` order could theoretically be set to `completed` |
| **根因** | No state machine logic; only the refund endpoint checks `status === 'completed'` |
| **证据** | `server/src/models/Order.js:78-82` — `ENUM('pending','completed','cancelled','refunded')` with no transition validation |
| **最小修复** | Add a `beforeUpdate` hook: `const validTransitions = { pending: ['completed','cancelled'], completed: ['refunded'] }; if (!validTransitions[prev]?.includes(next)) throw new Error('Invalid status transition');` |
| **验证** | Try to update a `cancelled` order to `completed` — should fail |

### P2-10: Joi Installed but Never Used

| Item | Detail |
|------|--------|
| **现象** | `joi@^17.11.0` is in `server/package.json` dependencies but never imported |
| **影响** | Unnecessary dependency; missed opportunity for proper validation |
| **根因** | Planned but never implemented |
| **证据** | `server/package.json:26` — `"joi": "^17.11.0"`; No `import Joi` or `require('joi')` found in any source file |
| **最小修复** | Either implement Joi validation schemas for all endpoints or remove the dependency |
| **验证** | `grep -r "joi" server/src/` should show Joi imports if implemented, or the package should be removed from `package.json` |

---

## Summary

| Severity | Count | Key Theme |
|:--------:|:-----:|-----------|
| **P0** | 8 | Security vulnerabilities, crash bugs, data loss risks |
| **P1** | 10 | Race conditions, weak auth, data consistency |
| **P2** | 10 | Validation gaps, code quality, dead code |
| **Total** | **28** | |

### Recommended Fix Order

1. **Immediate** (P0-1, P0-2): Remove or secure test routes
2. **Immediate** (P0-3): Fail fast on missing JWT_SECRET
3. **Immediate** (P0-4): Remove default credentials from login page
4. **Immediate** (P0-7): Fix recipe copy crash
5. **Before deployment** (P0-5, P0-6): Secure Docker credentials
6. **Before deployment** (P0-8): Add production guard on db:init/seed
7. **Sprint 1** (P1-1, P1-2, P1-3): Fix race conditions with atomic operations
8. **Sprint 1** (P1-4, P1-7, P1-8): Strengthen auth (login throttling, password policy)
9. **Sprint 2** (P1-5, P1-6): Association checks, role-based routing
10. **Backlog** (P2-*): Validation improvements, code cleanup
