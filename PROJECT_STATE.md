# Project State (dragon-mill-pos)

## Environment
- OS: Windows
- Repo path: D:\project\managesys\dragon-mill-pos
- Node: 18+
- MySQL: 8.0
- Redis: 7 (optional, degrades gracefully)

## Quick Start

```bash
# 1. Install all dependencies
npm run install:all

# 2. Configure environment
cp server/.env.example server/.env   # Edit: DB credentials, JWT_SECRET (required!)
cp client/.env.example client/.env

# 3. Initialize database (creates tables + seeds demo data)
cd server
npm run db:init

# 4. Run migrations (required for existing databases, idempotent)
npm run db:migrate

# 5. Start development servers
cd ..
npm run dev
# → Backend: http://localhost:3001
# → Frontend: http://localhost:5173 (proxies /api to :3001)
```

**Docker alternative:**
```bash
docker-compose up -d   # MySQL 8 + Redis 7 + Node server + Nginx frontend
```

## What works now
- User auth (login/logout/JWT)
- Product management (CRUD + image upload)
- Category management
- POS checkout (cash/wechat/alipay) with receipt
- Recipe management (create/edit/copy/use in checkout)
- Member management + points system
- Order history + refunds
- Stock records (in/out/check)
- Dashboard with ECharts
- Operation audit logs

## Known bugs (repro steps + logs)
- [x] BUG-001: P0-1/P0-2 — Unauthenticated test routes (FIXED: deleted test.js)
- [x] BUG-002: P0-3 — JWT default secret fallback (FIXED: mandatory JWT_SECRET)
- [x] BUG-003: P0-7 — Recipe copy crash, undefined Material model (FIXED: Material→Product)
- [x] BUG-004: P0-9 — Checkout crash, missing order_items columns (FIXED: migrate.js + model + cashier)
- [ ] BUG-005: P0-4 — Login page shows default admin password in production
- [ ] BUG-006: P0-8 — db:init/seed force:true without production guard
- [ ] BUG-007: P0-5 — Redis without auth in Docker
- [ ] BUG-008: P0-6 — Hardcoded MySQL passwords in docker-compose.yml
- [ ] BUG-009: cashier.js:377 — order.id referenced before order creation (recipe_usage_logs)

## Missing features / TODO
- [ ] FEAT-001: Input validation with Joi (installed but unused)
- [ ] FEAT-002: Role-based route guards on frontend (staff can access admin URLs)
- [ ] FEAT-003: Pessimistic locking for stock operations
- [ ] FEAT-004: Atomic member/recipe number generation (replace count+1 pattern)
- [ ] FEAT-005: CSRF protection
- [ ] FEAT-006: Points rules PUT endpoint (unimplemented)

## Commands
- install: `npm run install:all`
- run dev: `npm run dev` (both) / `npm run dev:server` / `npm run dev:client`
- run tests: `cd server && npm test`
- lint: `cd client && npm run lint`
- build: `npm run build`
- db init: `cd server && npm run db:init` (destructive! drops all tables)
- db migrate: `cd server && npm run db:migrate` (safe, idempotent)
- db seed: `cd server && npm run db:seed` (destructive! drops all tables)
