# AUDIT_DATA — Data Layer, Models & Consistency

> Dragon Mill POS 神龙磨坊收银管理系统
> Audit date: 2026-02-07

---

## 1. Sequelize Models

### 1.1 User (`server/src/models/User.js`)

**Table**: `users`

| Column | Type | Null | Default | Constraints | Notes |
|--------|------|:----:|---------|-------------|-------|
| id | INTEGER | N | auto | PK, auto-increment | |
| username | STRING(50) | N | | UNIQUE | |
| password | STRING(255) | N | | | bcrypt hashed (hook) |
| name | STRING(50) | N | | | |
| phone | STRING(20) | Y | | | **No format validation** |
| email | STRING(100) | Y | | validate: isEmail | |
| avatar | STRING(255) | Y | | | URL path |
| role | ENUM('admin','staff') | N | 'staff' | | |
| status | ENUM('active','inactive') | N | 'active' | | |
| lastLoginAt | DATE | Y | | | |
| deletedAt | DATE | Y | | | Manual soft-delete (not `paranoid`) |

**Hooks**:
- `beforeCreate`: bcrypt hash password (salt rounds 10) if not already hashed `:72-76`
- `beforeUpdate`: bcrypt hash on `password` change `:78-83`

**Instance Methods**:
- `validatePassword(password)` — bcrypt compare `:88-90`
- `toJSON()` — removes password from output `:93-97`

**Associations**:
- `hasMany(Order, as: 'orders')` — defined in `Order.js:135`

### 1.2 Member (`server/src/models/Member.js`)

**Table**: `members`

| Column | Type | Null | Default | Constraints | Notes |
|--------|------|:----:|---------|-------------|-------|
| id | INTEGER | N | auto | PK | |
| memberNo | STRING(20) | N | | UNIQUE | Auto-generated in hook |
| name | STRING(50) | N | | | |
| phone | STRING(20) | N | | UNIQUE | **No format validation** |
| birthday | DATEONLY | Y | | | |
| email | STRING(100) | Y | | validate: isEmail, notEmpty, custom | Complex null-handling |
| points | INTEGER | N | 0 | | |
| totalConsumption | DECIMAL(10,2) | N | 0.00 | | getter: parseFloat |
| joinDate | DATEONLY | N | NOW | | |
| status | ENUM('active','inactive') | N | 'active' | | |
| remark | TEXT | Y | | | |

**Hooks**:
- `beforeValidate`: Generate memberNo via `count + 1` pattern `:86-96`
  - Format: `M{YY}{MM}{00001}`
  - **P1 RACE CONDITION**: Two concurrent creates can get the same count

**Associations**:
- `hasMany(Order, as: 'orders')` — `Order.js:130`
- `hasMany(Recipe, as: 'recipes')` — `Recipe.js:101`

### 1.3 Product (`server/src/models/Product.js`)

**Table**: `products`

| Column | Type | Null | Default | Constraints | Notes |
|--------|------|:----:|---------|-------------|-------|
| id | INTEGER | N | auto | PK | |
| categoryId | INTEGER | N | | FK to product_categories | |
| name | STRING(100) | N | | | |
| shortName | STRING(50) | Y | | | |
| barcode | STRING(50) | Y | | UNIQUE | |
| unit | STRING(20) | N | '个' | | |
| price | DECIMAL(10,2) | N | | | **No min:0 validation** |
| cost | DECIMAL(10,2) | Y | | | |
| memberPrice | DECIMAL(10,2) | Y | | | |
| stock | DECIMAL(10,2) | N | 0 | | Changed to support decimals |
| minStock | DECIMAL(10,2) | N | 0 | | |
| maxStock | DECIMAL(10,2) | N | 1000 | | |
| status | ENUM('on_sale','off_sale') | N | 'on_sale' | | |
| image | STRING(255) | Y | | | |

**Associations**:
- `belongsTo(ProductCategory, as: 'category')` `:108`
- `belongsToMany(Recipe, through: RecipeProduct, as: 'recipes')` — `RecipeProduct.js:59`

### 1.4 ProductCategory (`server/src/models/ProductCategory.js`)

**Table**: `product_categories`

| Column | Type | Null | Default | Constraints | Notes |
|--------|------|:----:|---------|-------------|-------|
| id | INTEGER | N | auto | PK | |
| name | STRING(50) | N | | UNIQUE | |
| description | STRING(200) | Y | | | |
| sortOrder | INTEGER | N | 0 | | |
| status | ENUM('active','inactive') | N | 'active' | | |

**Associations**:
- `hasMany(Product, as: 'products')` — `Product.js:113`

### 1.5 Order (`server/src/models/Order.js`)

**Table**: `orders`

| Column | Type | Null | Default | Constraints | Notes |
|--------|------|:----:|---------|-------------|-------|
| id | BIGINT | N | auto | PK | |
| orderNo | STRING(30) | N | | UNIQUE | Auto-generated in hook |
| memberId | INTEGER | Y | | FK to members | Nullable for non-member orders |
| userId | INTEGER | N | | FK to users | Cashier |
| totalAmount | DECIMAL(10,2) | N | | | getter: parseFloat |
| discountAmount | DECIMAL(10,2) | N | 0.00 | | |
| actualAmount | DECIMAL(10,2) | N | | | |
| paymentMethod | STRING(20) | N | | | **Should be ENUM (P2)** |
| pointsEarned | INTEGER | N | 0 | | |
| pointsUsed | INTEGER | N | 0 | | |
| status | ENUM('pending','completed','cancelled','refunded') | N | 'completed' | | |
| remark | TEXT | Y | | | |
| refundReason | TEXT | Y | | | |
| refundedAt | DATE | Y | | | |

**Hooks**:
- `beforeCreate`: Generate orderNo if not set `:102-114`
  - Format: `{YYYY}{MM}{DD}{HH}{mm}{ss}{random(0-999)}`
  - **P1 COLLISION RISK**: Same-second requests with same random number → duplicate key error

**Associations**:
- `belongsTo(Member, as: 'member')` `:120`
- `belongsTo(User, as: 'cashier')` `:125`
- `hasMany(OrderItem, as: 'items')` — `OrderItem.js:98`

### 1.6 OrderItem (`server/src/models/OrderItem.js`)

**Table**: `order_items` (no `updatedAt`)

| Column | Type | Null | Default | Constraints | Notes |
|--------|------|:----:|---------|-------------|-------|
| id | BIGINT | N | auto | PK | |
| orderId | BIGINT | N | | FK to orders | |
| productId | INTEGER | Y | | FK to products | Nullable for recipe items |
| productName | STRING(100) | N | | | Denormalized |
| unit | STRING(20) | Y | '个' | | |
| price | DECIMAL(10,2) | N | | | getter: parseFloat |
| quantity | DECIMAL(10,2) | N | | | **No min:0 validation** |
| recipeDetails | JSON | Y | null | | Recipe material breakdown |
| isRecipe | BOOLEAN | N | false | | |
| subtotal | DECIMAL(10,2) | N | | | |
| isRefunded | BOOLEAN | N | false | | |

**Associations**:
- `belongsTo(Order, as: 'order')` `:87`
- `belongsTo(Product, as: 'product', constraints: false)` `:92` — **No FK constraint**

### 1.7 Recipe (`server/src/models/Recipe.js`)

**Table**: `recipes`

| Column | Type | Null | Default | Constraints | Notes |
|--------|------|:----:|---------|-------------|-------|
| id | INTEGER | N | auto | PK | |
| recipeNo | STRING(20) | Y | | UNIQUE | Auto-generated in hook |
| name | STRING(100) | N | | | |
| type | ENUM('public','private','template') | N | 'public' | | |
| memberId | INTEGER | Y | | FK to members | For private recipes |
| description | TEXT | Y | | | |
| totalWeight | DECIMAL(10,2) | N | 100 | | |
| processingFee | DECIMAL(10,2) | N | 5.00 | | |
| nutrition | JSON | Y | | | |
| suitableFor | STRING(200) | Y | | | |
| status | ENUM('active','inactive') | N | 'active' | | |
| usageCount | INTEGER | N | 0 | | |

**Hooks**:
- `beforeCreate`: Generate recipeNo via `count + 1` `:81-92`
  - Format: `R{YY}{MM}{0001}`
  - **P1 RACE CONDITION**: Same as member number generation

**Associations**:
- `belongsTo(Member, as: 'owner')` `:96`
- `belongsToMany(Product, through: RecipeProduct, as: 'products')` — `RecipeProduct.js:52`

### 1.8 RecipeProduct (`server/src/models/RecipeProduct.js`)

**Table**: `recipe_products` (junction table)

| Column | Type | Null | Default | Constraints | Notes |
|--------|------|:----:|---------|-------------|-------|
| id | INTEGER | N | auto | PK | |
| recipeId | INTEGER | N | | FK to recipes | |
| productId | INTEGER | N | | FK to products | |
| percentage | DECIMAL(5,2) | N | | validate: min 0, max 100 | |
| amount | DECIMAL(10,2) | Y | | | Weight in grams |

### 1.9 StockRecord (`server/src/models/StockRecord.js`)

**Table**: `stock_records` (no `updatedAt`)

| Column | Type | Null | Default | Constraints | Notes |
|--------|------|:----:|---------|-------------|-------|
| id | BIGINT | N | auto | PK | |
| productId | INTEGER | N | | FK to products | **No FK constraint defined** |
| type | ENUM('purchase','sale','adjust','loss') | N | | | |
| quantity | DECIMAL(10,2) | N | | | Positive = in, negative = out |
| beforeStock | DECIMAL(10,2) | Y | | | |
| afterStock | DECIMAL(10,2) | Y | | | |
| remark | STRING(200) | Y | | | |
| operatorId | INTEGER | Y | | | **No FK constraint** |
| operatorName | STRING(50) | Y | | | Denormalized |

### 1.10 OperationLog (`server/src/models/OperationLog.js`)

**Table**: `operation_logs` (no `updatedAt`)

| Column | Type | Null | Default | Constraints | Notes |
|--------|------|:----:|---------|-------------|-------|
| id | BIGINT | N | auto | PK | |
| userId | INTEGER | N | | | **No FK constraint** |
| username | STRING(50) | N | | | Denormalized |
| module | STRING(50) | N | | | |
| action | STRING(50) | N | | | |
| content | TEXT | Y | | | |
| ip | STRING(50) | Y | | | |
| userAgent | TEXT | Y | | | |

---

## 2. Database Configuration

**Source**: `server/src/config/database.js`

```javascript
const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || 'dragon_mill_pos',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  timezone: '+08:00',
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
});
```

| Setting | Value | Notes |
|---------|-------|-------|
| Dialect | mysql | MySQL 8.0 |
| Pool max | 5 | May be insufficient under high load |
| Pool min | 0 | |
| Acquire timeout | 30s | |
| Idle timeout | 10s | |
| Timezone | +08:00 | Beijing time |
| Charset | utf8mb4 | Full Unicode support |
| Collation | utf8mb4_unicode_ci | |
| Timestamps | true | `created_at`, `updated_at` |
| Underscored | true | snake_case columns |
| freezeTableName | true | No pluralization |
| dateStrings | true | Return dates as strings |

---

## 3. Initialization Scripts

### 3.1 `db:init` — `server/src/database/init.js`

**Behavior**:
1. `sequelize.authenticate()` — test connection
2. `sequelize.sync({ force: true })` — **DROP ALL TABLES and recreate**
3. Create admin user (`admin` / `<YOUR_ADMIN_PASSWORD>`)
4. Create staff user (`staff` / `<YOUR_STAFF_PASSWORD>`)
5. Create 6 product categories
6. Create 5 regular products + 5 recipe materials
7. Create 3 test members
8. Create 4 recipes (2 public, 1 private, 1 template) with materials
9. Create 1 test order with 2 items

**Risk**: `force: true` at line `:22` will destroy all data with no environment check.

### 3.2 `db:seed` — `server/src/database/seed.js`

**Behavior**:
1. `sequelize.sync({ force: true })` — **ALSO drops all tables**
2. Create admin user (`admin` / `<YOUR_ADMIN_PASSWORD>` or from env)
3. Create staff user (`staff01` / `<YOUR_STAFF_PASSWORD>`) — password from env var
4. Create 1 test operation log

**Risk**: Same `force: true` issue. The staff password `123456` is extremely weak.

### 3.3 `db:migrate` — `server/src/database/migrate.js`

**File does not exist**. The `package.json` script references it but it's not implemented. The only migration file is:

### 3.4 Migration: `add-recipe-fields.js` (`server/src/database/migrations/add-recipe-fields.js`)

Adds fields to existing tables (idempotent — checks before adding):

1. `order_items.is_recipe` (BOOLEAN)
2. `order_items.recipe_details` (JSON)
3. `order_items.recipe_id` (INTEGER)
4. `recipes.last_used_at` (DATE)
5. `recipes.last_weight` (DECIMAL)
6. Creates `recipe_usage_logs` table (if not exists) with indexes

---

## 4. Default Accounts & Passwords

| Script | Username | Password | Role | Security |
|--------|----------|----------|------|:--------:|
| `init.js:27` | admin | <YOUR_ADMIN_PASSWORD> | admin | Moderate |
| `init.js:38` | staff | <YOUR_STAFF_PASSWORD> | staff | Moderate |
| `seed.js:18` | admin | <YOUR_ADMIN_PASSWORD> (or env) | admin | Moderate |
| `seed.js:33` | staff01 | `<YOUR_STAFF_PASSWORD>` (env var) | staff | Fixed |

The login page at `client/src/pages/Login/index.jsx:82` displays:
```
默认管理员账号：admin / <YOUR_ADMIN_PASSWORD>
```

---

## 5. Redis Cache

**Source**: `server/src/config/redis.js`

### 5.1 Connection

- Connects only if `REDIS_HOST` env is set (`:9`)
- Connection failure does not prevent server startup (`:34-37`)
- Optional password via `REDIS_PASSWORD` (`:20`)

### 5.2 `cacheWrapper(key, fn, ttl)`

```javascript
const cacheWrapper = async (key, fn, ttl = 3600) => {
  if (!redisClient) return await fn();        // Redis unavailable → direct exec
  const cached = await redisClient.get(key);
  if (cached) return JSON.parse(cached);      // Cache hit
  const result = await fn();
  await redisClient.setEx(key, ttl, JSON.stringify(result));  // Cache miss → store
  return result;
};
```

- Default TTL: 3600 seconds (1 hour)
- Graceful degradation: falls back to direct execution on error
- **No cache invalidation logic** found in route files

### 5.3 Docker Redis

- `docker-compose.yml:22-28`: Redis 7 Alpine
- **No `requirepass`** — accessible without authentication
- Exposed on host port `6379`

---

## 6. Data Consistency Risks

### 6.1 Race Conditions — Number Generation

**Member Number** (`server/src/models/Member.js:86-96`):
```javascript
const count = await Member.count();
const sequence = (count + 1).toString().padStart(5, '0');
member.memberNo = `M${year}${month}${sequence}`;
```

**Recipe Number** (`server/src/models/Recipe.js:81-92`):
```javascript
const count = await Recipe.count();
const sequence = (count + 1).toString().padStart(4, '0');
recipe.recipeNo = `R${year}${month}${sequence}`;
```

**Problem**: `count()` + create is not atomic. Two concurrent requests get the same count → duplicate key error.

**Order Number** (`server/src/models/Order.js:102-114` and `server/src/routes/cashier.js:23-33`):
```javascript
const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
order.orderNo = `${year}${month}${day}${hour}${minute}${second}${random}`;
```

**Problem**: Two orders in the same second have a 1/1000 chance of collision.

### 6.2 Stock Operations Without Pessimistic Locking

**Stock Deduction in Checkout** (`server/src/routes/cashier.js:218-221`):
```javascript
const beforeStock = product.stock;
const afterStock = beforeStock - item.quantity;
await product.update({ stock: afterStock }, { transaction: t });
```

**Problem**: The `findByPk` at line `:184` reads stock, then the `update` at `:221` sets it. Between the read and write, another transaction could also read the same stock value → both deduct from the same starting value → overselling.

**Same pattern in**: `products.js:697-720` (stock adjust), `products.js:240-246` (batch replenish), `orders.js:184-199` (refund stock restore).

**Fix needed**: Use `product.increment/decrement` or `UPDATE ... SET stock = stock - ? WHERE stock >= ?`.

### 6.3 Missing Transactions

| Operation | Has Transaction? | Risk |
|-----------|:----------------:|------|
| Cashier checkout | Yes | Adequate (but no pessimistic lock) |
| Order refund | Yes | Adequate |
| Batch replenish | Yes | Adequate |
| Member points adjust | Yes | Adequate |
| **Product creation + initial stock record** | **No** | Partial data on failure |
| **Product stock adjust** | **No** | StockRecord could be created without stock update or vice versa |
| **Recipe creation + materials** | Yes | Adequate |

### 6.4 Missing Foreign Key Constraints

The following relationships are defined in Sequelize model code but **do not create actual FK constraints in the database** (Sequelize `constraints: false` or simply no explicit FK):

| Table | Column | Should Reference | Evidence |
|-------|--------|-----------------|----------|
| `order_items` | `product_id` | `products.id` | `OrderItem.js:92-96` — `constraints: false` |
| `stock_records` | `product_id` | `products.id` | `StockRecord.js` — No association defined |
| `stock_records` | `operator_id` | `users.id` | `StockRecord.js` — No association defined |
| `operation_logs` | `user_id` | `users.id` | `OperationLog.js` — No association defined |

### 6.5 Order Status Transitions

The `Order.status` field accepts `ENUM('pending','completed','cancelled','refunded')` but there is **no state machine validation**. Any update can set any status. The refund endpoint only checks `status === 'completed'` (`orders.js:160`), but direct DB updates could put orders in invalid states.

### 6.6 Cashier Checkout — `order` Used Before Declaration

In `server/src/routes/cashier.js:374-381`, the code tries to insert into `recipe_usage_logs` referencing `order.id`, but the `order` variable is declared later at line `:397`. This code block is wrapped in try-catch so it silently fails, but it means recipe usage logs are never actually recorded.

---

## 7. Model Associations Summary

```
User ─────┐
           │ hasMany → Order (userId → cashier)
           │
Member ────┤
           │ hasMany → Order (memberId → member)
           │ hasMany → Recipe (memberId → owner)
           │
ProductCategory ──── hasMany → Product (categoryId → category)
           │
Product ───┤
           │ belongsToMany Recipe (through RecipeProduct)
           │
Recipe ────┤
           │ belongsToMany Product (through RecipeProduct)
           │
Order ─────┤
           │ hasMany → OrderItem (orderId → items)
           │
OrderItem ─┤
           │ belongsTo → Product (constraints: false)
           │
StockRecord      (standalone — no FK associations)
OperationLog     (standalone — no FK associations)
```
