# AUDIT_API — API Routes, Auth & Validation

> Dragon Mill POS 神龙磨坊收银管理系统
> Audit date: 2026-02-07

---

## 1. Complete Route Tree

### 1.1 Test Routes (`/api/test`) — `server/src/routes/test.js`

| Method | Path | Auth | Validation | Notes |
|--------|------|:----:|:----------:|-------|
| GET | `/api/test/ping` | NONE | None | Health check |
| POST | `/api/test/upload` | **NONE** | Multer only | **P0: Unauthenticated file upload** |
| GET | `/api/test/check-dirs` | **NONE** | None | **P0: Leaks server path info (cwd, fs structure)** |

### 1.2 Auth Routes (`/api/v1/auth`) — `server/src/routes/auth.js`

| Method | Path | Auth | Validation | Notes |
|--------|------|:----:|:----------:|-------|
| POST | `/auth/login` | NONE | Manual (empty check) | No brute-force protection, no Joi |
| GET | `/auth/me` | JWT | None | Returns current user |
| POST | `/auth/logout` | JWT | None | Logs operation, no token invalidation |
| POST | `/auth/change-password` | JWT | Manual (length >= 6) | Weak password policy |

### 1.3 User Management (`/api/v1/users`) — `server/src/routes/users.js`

All routes require `authenticate + authorize('admin')`.

| Method | Path | Auth | Validation | Notes |
|--------|------|:----:|:----------:|-------|
| GET | `/users/` | Admin | Query params | List users (paginated) |
| POST | `/users/` | Admin | Manual (username, password, name required; password >= 6) | Create user |
| GET | `/users/deleted/list` | Admin | None | List soft-deleted users |
| GET | `/users/:id` | Admin | None | Get single user |
| PUT | `/users/:id` | Admin | Manual (self-role/self-disable checks) | Update user |
| POST | `/users/:id/reset-password` | Admin | Manual (password >= 6) | Reset password |
| DELETE | `/users/:id` | Admin | Manual (self-delete check) | Soft delete |
| POST | `/users/:id/restore` | Admin | None | Restore deleted user |
| GET | `/users/:id/logs` | Admin | None | User operation logs |

### 1.4 Profile Routes (`/api/v1/profile`) — `server/src/routes/profile.js`

All routes require `authenticate`.

| Method | Path | Auth | Validation | Notes |
|--------|------|:----:|:----------:|-------|
| PUT | `/profile/update` | JWT | None (no field validation) | Update personal info |
| POST | `/profile/avatar` | JWT | Multer (2MB, image types) | Upload avatar |
| GET | `/profile/login-history` | JWT | None | Login history from operation_logs |
| GET | `/profile/operation-logs` | JWT | None | Personal operation logs |
| GET | `/profile/stats` | JWT | None | Personal statistics |

### 1.5 Product Categories (`/api/v1/product-categories`) — `server/src/routes/productCategories.js`

All routes require `authenticate`.

| Method | Path | Auth | Validation | Notes |
|--------|------|:----:|:----------:|-------|
| GET | `/product-categories/` | JWT | None | List categories |
| POST | `/product-categories/` | Admin | Manual (name required, unique check) | Create category |
| PUT | `/product-categories/:id` | Admin | Manual (name unique check) | Update category |
| DELETE | `/product-categories/:id` | Admin | Product count check | Delete category |

### 1.6 Products (`/api/v1/products`) — `server/src/routes/products.js`

All routes require `authenticate`.

| Method | Path | Auth | Validation | Notes |
|--------|------|:----:|:----------:|-------|
| GET | `/products/` | JWT | None | List products (paginated, filterable) |
| GET | `/products/replenish-suggestions` | Admin | None | **Duplicated** (defined twice: lines 139 and 309) |
| POST | `/products/batch-replenish` | Admin | Manual (array check) | **Duplicated** (defined twice: lines 203 and 372). Uses transaction. |
| GET | `/products/:id` | JWT | None | Get single product |
| POST | `/products/` | Admin | Manual (categoryId, name, price required) | Create product |
| PUT | `/products/:id` | Admin | Manual (barcode unique check) | Update product |
| DELETE | `/products/:id` | Admin | **TODO: No order check** | **P1: Delete without checking related orders** |
| POST | `/products/:id/image` | Admin | Multer (5MB, image types) | Upload product image |
| POST | `/products/:id/stock` | Admin | Manual (type, quantity required) | Stock adjustment |
| GET | `/products/:id/stock-records` | JWT | None | Stock history |

### 1.7 Members (`/api/v1/members`) — `server/src/routes/members.js`

All routes require `authenticate`.

| Method | Path | Auth | Validation | Notes |
|--------|------|:----:|:----------:|-------|
| GET | `/members/` | JWT | None | List members |
| GET | `/members/search` | JWT | None | Search members (with recipes) |
| GET | `/members/phone/:phone` | JWT | None | Find by phone |
| POST | `/members/` | JWT | Manual (name, phone required, phone unique) | Create member. **No phone format validation.** |
| PUT | `/members/:id` | JWT | Manual (phone unique check) | Update member |
| POST | `/members/:id/points` | Admin | Manual (points, type, reason required) | Adjust points |
| GET | `/members/:id/orders` | JWT | None | Member order history |

### 1.8 Cashier Routes (`/api/v1/cashier`) — `server/src/routes/cashier.js`

All routes require `authenticate`.

| Method | Path | Auth | Validation | Notes |
|--------|------|:----:|:----------:|-------|
| GET | `/cashier/recipes/for-sale` | JWT | None | Get recipes for POS |
| POST | `/cashier/recipes/calculate` | JWT | None | Calculate recipe price |
| POST | `/cashier/checkout` | JWT | Manual (items/recipes not empty, paymentMethod required) | **Main checkout. No price/quantity validation.** Uses transaction. |
| GET | `/cashier/products/search` | JWT | None | Quick product search |
| GET | `/cashier/products/available` | JWT | None | All products by category |
| GET | `/cashier/today-stats` | JWT | None | Today's sales summary |

### 1.9 Orders (`/api/v1/orders`) — `server/src/routes/orders.js`

All routes require `authenticate`.

| Method | Path | Auth | Validation | Notes |
|--------|------|:----:|:----------:|-------|
| GET | `/orders/` | JWT | None | List orders (filterable) |
| GET | `/orders/:id` | JWT | None | Order detail |
| POST | `/orders/:id/refund` | Admin | Manual (reason required, status check) | Refund with transaction |

### 1.10 Points (`/api/v1/points`) — `server/src/routes/points.js`

All routes require `authenticate`.

| Method | Path | Auth | Validation | Notes |
|--------|------|:----:|:----------:|-------|
| GET | `/points/statistics` | JWT | None | Points overview + distribution |
| GET | `/points/records` | JWT | None | Points records (from orders) |
| GET | `/points/rules` | JWT | None | Get point rules (hardcoded defaults) |
| PUT | `/points/rules` | Admin | None | **P2: Not implemented** (TODO in code) |
| POST | `/points/batch-adjust` | Admin | Manual (memberIds required) | Batch adjust points |

### 1.11 Recipes (`/api/v1/recipes`) — `server/src/routes/recipes.js`

**Mounted twice**: at `server/src/index.js:41` and via `routes/index.js:47`.
All routes require `authenticate`.

| Method | Path | Auth | Validation | Notes |
|--------|------|:----:|:----------:|-------|
| GET | `/recipes/` | JWT | None | List recipes |
| POST | `/recipes/` | JWT | Manual (percentage sum = 100%) | Create recipe |
| PUT | `/recipes/:id` | JWT | Manual (private ownership check) | Update recipe |
| POST | `/recipes/:id/copy` | JWT | None | **P0: References undefined `Material` model — will crash** |
| POST | `/recipes/:id/calculate-price` | JWT | None | Calculate recipe price |

### 1.12 Other Routes

| Method | Path | Auth | Source |
|--------|------|:----:|--------|
| GET | `/health` | NONE | `server/src/index.js:82-88` |
| GET | `/api/v1/` | NONE | `server/src/routes/index.js:16-22` — Welcome message |

---

## 2. Authentication Mechanism

### 2.1 JWT Flow

**Source**: `server/src/middleware/auth.js`

1. Client sends `Authorization: Bearer <token>` header
2. `authenticate()` middleware extracts token (`:6`)
3. Token verified with `process.env.JWT_SECRET || 'your-secret-key'` (`:12`)
4. User looked up by `decoded.id` with `status: 'active'` (`:13-18`)
5. `req.user` and `req.token` set on request object (`:24-25`)

**Token generation** (`server/src/routes/auth.js:51-55`):
```javascript
jwt.sign(
  { id: user.id, username: user.username, role: user.role },
  process.env.JWT_SECRET || 'your-secret-key',
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);
```

### 2.2 Authorization

**Source**: `server/src/middleware/auth.js:35-52`

`authorize(...roles)` checks `req.user.role` against the allowed roles array. Returns 403 if not matched.

### 2.3 Security Concerns

| Issue | Evidence | Severity |
|-------|----------|:--------:|
| Default JWT secret fallback | `auth.js:12` — `'your-secret-key'` | **P0** |
| Same fallback in token signing | `routes/auth.js:53` — `'your-secret-key'` | **P0** |
| No token blacklist on logout | `routes/auth.js:111-129` — only logs, no invalidation | P2 |
| No login attempt throttling | `routes/auth.js:11-94` — no rate limit on login endpoint | **P1** |
| 7-day token expiry | `routes/auth.js:54` — long-lived tokens | P2 |

---

## 3. Input Validation Summary

### 3.1 Joi — Installed but Unused

- `joi@^17.11.0` is listed in `server/package.json:26`
- **No import or usage** found anywhere in the codebase
- All validation is done with manual `if` checks

### 3.2 Manual Validation Coverage

| Route | What's Validated | What's Missing |
|-------|-----------------|----------------|
| `POST /auth/login` | username & password not empty | No format checks |
| `POST /auth/change-password` | oldPassword & newPassword not empty, newPassword >= 6 chars | No complexity rules |
| `POST /users/` | username, password, name required; password >= 6 | No username format, no password complexity |
| `POST /products/` | categoryId, name, price required | **No price >= 0 check, no stock >= 0 check** |
| `POST /members/` | name, phone required; phone uniqueness | **No phone format validation** |
| `POST /cashier/checkout` | items or recipes not empty; paymentMethod required | **No quantity > 0, no price validation** |
| `POST /recipes/` | materials percentage sum = 100% | No material count validation |
| `POST /orders/:id/refund` | reason required; order status = completed | Adequate |

---

## 4. Error Codes & Response Format

### 4.1 Standard Response Shape

**Success**:
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

**Error**:
```json
{
  "success": false,
  "error": "错误描述"
}
```

**Note**: Not all responses consistently include `success` field. Some use `{ error: "..." }` without `success: false`.

### 4.2 Error Handler (`server/src/middleware/errorHandler.js`)

| Error Type | HTTP Status | Response |
|-----------|:-----------:|---------|
| `ValidationError` | 400 | `{ error, details }` |
| `UnauthorizedError` | 401 | `{ error }` |
| `SequelizeValidationError` | 400 | `{ error, details: [{field, message}] }` |
| `SequelizeUniqueConstraintError` | 400 | `{ error, details: [{field, message}] }` — **Leaks field names (table structure)** |
| Default | 500 (or err.statusCode) | `{ error: message }` + **`stack` in dev mode** |

**Risk**: Dev mode exposes stack traces (`errorHandler.js:54`). Sequelize errors may leak DB column names (`errorHandler.js:31,42`).

---

## 5. File Upload Configuration

### 5.1 Product Images (`server/src/routes/products.js:24-48`)

| Setting | Value |
|---------|-------|
| Destination | `uploads/products/` |
| Filename | `product-{timestamp}-{random}.{ext}` |
| Max size | 5 MB |
| Allowed types | MIME + extension regex: `/jpeg|jpg|png|gif/` |
| Auth required | Yes (authenticate + admin) |
| Content validation | **None** — only MIME type and extension checked |

### 5.2 Profile Avatars (`server/src/routes/profile.js:18-49`)

| Setting | Value |
|---------|-------|
| Destination | `uploads/avatars/` |
| Filename | `avatar-{userId}-{timestamp}-{random}.{ext}` |
| Max size | 2 MB |
| Allowed types | MIME + extension regex: `/jpeg|jpg|png|gif/` |
| Auth required | Yes (authenticate) |
| Content validation | **None** |

### 5.3 Test Upload (`server/src/routes/test.js:13-23`)

| Setting | Value |
|---------|-------|
| Destination | `uploads/avatars/` |
| Filename | `test-{timestamp}-{random}.{ext}` |
| Max size | **Unlimited** (no limits config) |
| Allowed types | **ANY** (no fileFilter) |
| Auth required | **NONE** |
| Content validation | **None** |

---

## 6. Rate Limiting

**Source**: `server/src/index.js:52-61`

```javascript
const limiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW || 15) * 60 * 1000,  // 15 min
  max: parseInt(process.env.API_RATE_LIMIT_MAX || 100),                       // 100 requests
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);
```

**Applies to**: All routes under `/api/`.
**Exceptions**:
- `/health` — not under `/api/`
- Recipes router at `index.js:41` is mounted **before** rate limiter at line 61, bypassing rate limiting

**Note**: Rate limiting is **per IP** (default `express-rate-limit` behavior). No per-user or per-endpoint limiting. The `/auth/login` endpoint shares the same general 100-request pool.

---

## 7. Example Requests

### 7.1 Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123456"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "admin",
      "name": "系统管理员",
      "role": "admin"
    }
  }
}
```

### 7.2 Create Product (Admin)

```bash
curl -X POST http://localhost:3001/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "categoryId": 1,
    "name": "新商品",
    "price": 25.00,
    "unit": "斤",
    "stock": 50
  }'
```

### 7.3 Cashier Checkout

```bash
curl -X POST http://localhost:3001/api/v1/cashier/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "memberId": 1,
    "items": [
      {"productId": 1, "quantity": 2},
      {"productId": 2, "quantity": 1}
    ],
    "paymentMethod": "cash",
    "pointsUsed": 0
  }'
```

### 7.4 Upload Product Image (Admin)

```bash
curl -X POST http://localhost:3001/api/v1/products/1/image \
  -H "Authorization: Bearer <token>" \
  -F "image=@/path/to/product.jpg"
```

### 7.5 Unauthenticated Test Upload (P0 Risk)

```bash
curl -X POST http://localhost:3001/api/test/upload \
  -F "file=@/path/to/any-file.txt"
```

### 7.6 Unauthenticated Directory Check (P0 Risk)

```bash
curl http://localhost:3001/api/test/check-dirs
```

Response:
```json
{
  "success": true,
  "data": {
    "cwd": "/app",
    "uploadsPath": "/app/uploads",
    "avatarsPath": "/app/uploads/avatars",
    "uploadsExists": true,
    "avatarsExists": true
  }
}
```
