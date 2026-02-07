# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Primary Goal

Perform a comprehensive code audit of the Dragon Mill POS system and produce structured documentation in `docs/audit/`.

## Hard Rules

1. **Read-only audit** — Do NOT modify any source code. Only create/update documentation files.
2. **Evidence-based** — Every finding must cite file path + line number.
3. **Prioritized** — Use P0 (critical) / P1 (high) / P2 (medium) severity levels.
4. **Actionable** — Each risk item includes: phenomenon, impact, root cause, evidence, minimal fix, and verification steps.
5. **Chinese + English** — Section headers in English; body text may use Chinese where it aids clarity.

## Deliverables

| File | Content |
|------|---------|
| `docs/audit/AUDIT_ENV.md` | Environment setup, versions, env vars, Docker |
| `docs/audit/AUDIT_API.md` | Route tree, auth, validation, error handling, file uploads |
| `docs/audit/AUDIT_DATA.md` | Models, DB config, seeds, migrations, Redis, data consistency |
| `docs/audit/AUDIT_RISKS_TODOS.md` | Risk registry (P0/P1/P2) with evidence and fix plans |

## Project Overview

Dragon Mill POS (神龙磨坊收银管理系统) — a full-stack point-of-sale management system for a grain mill business. Monorepo with separate `server/` (backend) and `client/` (frontend) directories. Pure JavaScript (ES Modules throughout, `"type": "module"`). No TypeScript.

## Commands

### Development
```bash
npm run dev              # Start both server (port 3001) and client (port 5173)
npm run dev:server       # Backend only
npm run dev:client       # Frontend only (Vite dev server with proxy to :3001)
```

### Build & Production
```bash
npm run build            # Build client (outputs to client/dist/)
npm start                # Start server in production mode
```

### Install
```bash
npm run install:all      # Install root + server + client dependencies
```

### Database
```bash
cd server
npm run db:init          # Initialize DB (force:true — drops and recreates all tables + seeds)
npm run db:migrate       # Run migrations only
npm run db:seed          # Seed data only
```

### Lint & Test
```bash
cd client && npm run lint    # ESLint for client (JS/JSX)
cd server && npm test        # Jest (server)
```

### Docker
```bash
docker-compose up -d     # Full stack: MySQL 8, Redis 7, Node server, Nginx frontend
```

## Architecture

### Backend (`server/src/`)
- **Framework**: Express 4 on Node.js 18+
- **ORM**: Sequelize 6 with MySQL 8.0 (utf8mb4, timezone +08:00)
- **Auth**: JWT (7-day expiry) with bcrypt password hashing. `authenticate()` and `authorize(role)` middleware in `middleware/auth.js`.
- **Cache**: Redis via `config/redis.js` with `cacheWrapper()` — optional, degrades gracefully if unavailable.
- **Business logic lives in route files** (`routes/`), not in controllers or services (those directories exist but are empty).
- **Key routes**: `auth.js` (login/logout/me), `cashier.js` (POS checkout), `products.js` (inventory), `orders.js` (transactions), `members.js` (customers), `recipes.js` (mill formulas), `points.js` (loyalty).
- **Error handling**: Global `middleware/errorHandler.js`. Response shape: `{ success: bool, data?, error?, details? }`.
- **Logging**: Winston (file + console) + Morgan (HTTP requests). Audit trail via `operation_logs` table.
- **File uploads**: Multer — avatars (2MB, `/uploads/avatars/`), product images (5MB, `/uploads/products/`).
- **Rate limiting**: 100 requests per 15 minutes on `/api/` (configurable via env).

### Frontend (`client/src/`)
- **Framework**: React 18 + Vite 5
- **UI**: Ant Design 5 with Chinese locale (zh_CN)
- **Routing**: React Router v6, lazy-loaded pages via `React.lazy` + `Suspense`. Route guards in `routes/index.jsx` (`ProtectedRoute`/`PublicRoute`).
- **HTTP**: Axios instance in `utils/request.js` with token injection and 401 auto-logout.
- **State**: No centralized store (no Redux/Zustand). Token in localStorage. Cross-component communication via `utils/eventBus.js`.
- **Path alias**: `@` → `src/` (configured in vite.config.js).
- **Vite chunks**: vendor (react), antd, charts (echarts), utils (axios/dayjs/lodash).

### Database Models (Sequelize)
10 models in `server/src/models/`: User, Member, Product, ProductCategory, Order, OrderItem, Recipe, RecipeProduct, StockRecord, OperationLog. All use snake_case columns (`underscored: true`), timestamps, and soft-delete where applicable.

## Environment Setup

Server config: `server/.env` (copy from `server/.env.example`) — DB connection, JWT secret, rate limits, upload settings.
Client config: `client/.env` (copy from `client/.env.example`) — API base URL, app name, session timeout.

The dev proxy in `client/vite.config.js` forwards `/api` requests to `http://localhost:3001`.

## Git Conventions

Commit prefixes: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
Branch model: `main` (production), `develop`, `feature/*`, `hotfix/*`.
