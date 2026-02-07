# AUDIT_ENV — Environment & Infrastructure

> Dragon Mill POS 神龙磨坊收银管理系统
> Audit date: 2026-02-07

---

## 1. Startup Modes

### 1.1 Development (Local)

```bash
npm run dev              # scripts/dev.mjs — spawns server then client (3s delay)
npm run dev:server       # cd server && nodemon src/index.js
npm run dev:client       # cd client && vite
```

- **Backend**: Express on port `3001` (`server/src/index.js:23`)
- **Frontend**: Vite dev server on port `5173` (`client/vite.config.js:21`)
- **Proxy**: Vite forwards `/api` → `http://localhost:3001` (`client/vite.config.js:22-27`)
- **Dev script** (`scripts/dev.mjs`): Uses `child_process.spawn`, delays client start by 3s to avoid port contention.

### 1.2 Production

```bash
npm run build            # cd client && vite build → client/dist/
npm start                # cd server && node src/index.js
```

- Server reads `NODE_ENV` from env; `development` mode triggers `sequelize.sync({ alter: false })` (`server/src/index.js:106-109`).

### 1.3 Docker Compose

```bash
docker-compose up -d
```

4 services defined in `docker-compose.yml`:

| Service | Image | Container Name | Ports | Notes |
|---------|-------|----------------|-------|-------|
| mysql | mysql:8.0 | dragon-mill-mysql | 3306:3306 | Root password hardcoded |
| redis | redis:7-alpine | dragon-mill-redis | 6379:6379 | **No password** |
| server | ./server/Dockerfile | dragon-mill-server | 3001:3001 | Depends on mysql, redis |
| client | ./client/Dockerfile | dragon-mill-client | 80:80 | Nginx, depends on server |

Volumes: `mysql_data`, `redis_data` (named), `./server/uploads`, `./server/logs` (bind mounts).

---

## 2. Version Requirements

| Component | Required Version | Source |
|-----------|-----------------|--------|
| Node.js | >= 18.0.0 | `package.json:20` |
| npm | >= 8.0.0 | `package.json:21` |
| MySQL | 8.0 | `docker-compose.yml:5` |
| Redis | 7 (alpine) | `docker-compose.yml:22` |

### Key Dependencies (Server)

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | HTTP framework |
| sequelize | ^6.35.2 | ORM |
| mysql2 | ^3.6.5 | MySQL driver |
| jsonwebtoken | ^9.0.2 | JWT auth |
| bcryptjs | ^2.4.3 | Password hashing |
| joi | ^17.11.0 | Validation (**installed but unused**) |
| multer | ^1.4.5-lts.1 | File upload |
| redis | ^4.6.11 | Cache |
| helmet | ^7.1.0 | Security headers |
| express-rate-limit | ^7.1.5 | Rate limiting |
| winston | ^3.11.0 | Logging |
| morgan | ^1.10.0 | HTTP request logging |
| cors | ^2.8.5 | CORS |
| compression | ^1.7.4 | Response compression |

### Key Dependencies (Client)

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.2.0 | UI framework |
| antd | ^5.12.5 | Component library |
| axios | ^1.6.2 | HTTP client |
| echarts | ^5.4.3 | Charts |
| react-router-dom | ^6.20.1 | Routing |
| vite | ^5.0.8 | Build tool |

---

## 3. Environment Variables

### 3.1 Server (`server/.env.example`)

| Variable | Default | Required Change | Description |
|----------|---------|:-:|-------------|
| `NODE_ENV` | `development` | | Environment mode |
| `PORT` | `3001` | | Server port |
| `DB_HOST` | `localhost` | | MySQL host |
| `DB_PORT` | `3306` | | MySQL port |
| `DB_NAME` | `dragon_mill_pos` | | Database name |
| `DB_USER` | `root` | | Database user |
| `DB_PASSWORD` | `你的MySQL密码` | **YES** | Database password |
| `JWT_SECRET` | `your-super-secret-jwt-key-change-this-in-production` | **YES** | JWT signing key. **Fallback in code is `'your-secret-key'`** (`middleware/auth.js:12`) |
| `JWT_EXPIRES_IN` | `7d` | | Token expiry |
| `API_PREFIX` | `/api/v1` | | API prefix |
| `API_RATE_LIMIT_WINDOW` | `15` | | Rate limit window (minutes) |
| `API_RATE_LIMIT_MAX` | `100` | | Max requests per window |
| `UPLOAD_DIR` | `uploads` | | Upload directory |
| `MAX_FILE_SIZE` | `10485760` | | Max upload file size (bytes) |
| `SYSTEM_NAME` | `神龙磨坊收银管理系统` | | System display name |
| `DEFAULT_ADMIN_PASSWORD` | `<YOUR_ADMIN_PASSWORD>` | **YES** | Default admin password |
| `LOG_LEVEL` | `info` | | Winston log level |
| `LOG_DIR` | `logs` | | Log directory |

**Not in `.env.example` but read by code:**

| Variable | Fallback | Source |
|----------|----------|--------|
| `CLIENT_URL` | `http://localhost:5173` | `server/src/index.js:33` |
| `REDIS_HOST` | _(skip if unset)_ | `server/src/config/redis.js:9` |
| `REDIS_PORT` | `6379` | `server/src/config/redis.js:18` |
| `REDIS_PASSWORD` | `undefined` | `server/src/config/redis.js:20` |

### 3.2 Client (`client/.env.example`)

| Variable | Default | Required Change | Description |
|----------|---------|:-:|-------------|
| `VITE_API_BASE_URL` | `http://localhost:3001/api/v1` | | API base URL |
| `VITE_API_TIMEOUT` | `30000` | | Request timeout (ms) |
| `VITE_APP_NAME` | `神龙磨坊收银管理系统` | | App display name |
| `VITE_APP_VERSION` | `1.0.0` | | Version string |
| `VITE_ENABLE_MOCK` | `false` | | Enable mock data |
| `VITE_ENABLE_DEBUG` | `false` | | Enable debug mode |
| `VITE_MAX_UPLOAD_SIZE` | `10485760` | | Max upload size (bytes) |
| `VITE_ALLOWED_FILE_TYPES` | `image/jpeg,image/png,image/gif` | | Allowed upload MIME types |
| `VITE_DEFAULT_PAGE_SIZE` | `20` | | Default pagination size |
| `VITE_SESSION_TIMEOUT` | `30` | | Session timeout (minutes) |

---

## 4. Dependency Installation

```bash
# Install all (root + server + client)
npm run install:all

# Or individually
npm install                  # Root (concurrently)
cd server && npm install     # Server dependencies
cd client && npm install     # Client dependencies
```

---

## 5. Database Initialization

```bash
cd server

# Full reset (DESTRUCTIVE — drops all tables)
npm run db:init          # node src/database/init.js — sync({force:true}) + full seed

# Seed only (ALSO DESTRUCTIVE — uses force:true)
npm run db:seed          # node src/database/seed.js — sync({force:true}) + minimal seed

# Run migrations (additive)
npm run db:migrate       # node src/database/migrate.js — NOT IMPLEMENTED (file missing)
```

**WARNING**: Both `db:init` and `db:seed` use `sequelize.sync({ force: true })`, which **drops and recreates all tables**. There is no production guard. See AUDIT_RISKS_TODOS.md P0-8.

### Default Accounts Created by `db:init`

| Username | Password | Role |
|----------|----------|------|
| `admin` | `<YOUR_ADMIN_PASSWORD>` | admin |
| `staff` | `<YOUR_STAFF_PASSWORD>` | staff |

### Default Accounts Created by `db:seed`

| Username | Password | Role |
|----------|----------|------|
| `admin` | `<YOUR_ADMIN_PASSWORD>` | admin |
| `staff01` | `<YOUR_STAFF_PASSWORD>` | staff |

---

## 6. Running & Testing Commands

```bash
# Development
npm run dev              # Full stack (backend + frontend)

# Lint
cd client && npm run lint    # ESLint (JS/JSX)

# Test
cd server && npm test        # Jest

# Production build
npm run build                # Vite build → client/dist/
npm start                    # Node server (serves API only)
```

---

## 7. Docker Compose Services

```yaml
# docker-compose.yml (version '3.8')
services:
  mysql:        # mysql:8.0, port 3306, MYSQL_ROOT_PASSWORD=rootpassword
  redis:        # redis:7-alpine, port 6379, NO AUTH
  server:       # Custom Dockerfile, port 3001, NODE_ENV=production
  client:       # Custom Dockerfile (Nginx), port 80
```

### Port Mapping Summary

| Service | Container Port | Host Port |
|---------|---------------|-----------|
| MySQL | 3306 | 3306 |
| Redis | 6379 | 6379 |
| Server | 3001 | 3001 |
| Client (Nginx) | 80 | 80 |

### Docker Environment Variables (`docker-compose.yml`)

| Variable | Value | Security Concern |
|----------|-------|:---:|
| `MYSQL_ROOT_PASSWORD` | `rootpassword` | **YES** — hardcoded |
| `MYSQL_DATABASE` | `dragon_mill_pos` | |
| `MYSQL_USER` | `dragon_mill` | |
| `MYSQL_PASSWORD` | `dragon_mill_password` | **YES** — hardcoded |
| `NODE_ENV` | `production` | |
| `DB_HOST` | `mysql` | |
| `REDIS_HOST` | `redis` | |

---

## 8. Middleware Load Order

As defined in `server/src/index.js`:

1. `helmet()` — Security headers (crossOriginResourcePolicy disabled) `:29-31`
2. `cors()` — CORS config `:32-35`
3. `compression()` — Response compression `:36`
4. `express.json({ limit: '10mb' })` — JSON body parser `:37`
5. `express.urlencoded()` — URL-encoded body parser `:38`
6. **Recipes router** mounted at `/api/v1/recipes` `:41` — **BEFORE morgan, BEFORE rate limit**
7. `morgan('combined')` — HTTP logging `:43-49`
8. `rateLimit()` — Rate limiting on `/api/` `:52-61`
9. Static file serving for `/uploads` `:63-73`
10. Test routes at `/api/test` `:76`
11. API routes at `/api/v1` `:79`
12. Health check at `/health` `:82-88`
13. 404 handler `:91-93`
14. Error handler middleware `:96`

**Note**: The recipes router at line 41 is mounted **before** the rate limiter at line 61, meaning recipe endpoints bypass rate limiting. This is a duplicate mount — recipes are also registered inside `routes/index.js:47`.
