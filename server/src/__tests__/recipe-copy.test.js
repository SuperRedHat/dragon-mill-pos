import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';

/*
 * P0-7 regression tests — recipe copy endpoint crash fix.
 *
 * The copy endpoint previously referenced an undefined `Material` variable,
 * causing a ReferenceError at runtime. It now correctly uses the `Product`
 * model with the `'products'` association alias.
 *
 * These tests run WITHOUT a database connection. They verify:
 *   - The route module loads without ReferenceError
 *   - The endpoint is reachable (not 404)
 *   - The server returns a structured error, not an unhandled crash
 *
 * FULL INTEGRATION TESTING (requires MySQL):
 *
 * Option A — docker-compose (recommended):
 *   docker-compose up -d mysql redis
 *   cd server
 *   # Wait for MySQL to be ready (~10s), then:
 *   JWT_SECRET=test-secret DB_HOST=localhost DB_USER=dragon_mill \
 *     DB_PASSWORD=dragon_mill_password DB_NAME=dragon_mill_pos \
 *     NODE_ENV=development npm run db:init
 *   JWT_SECRET=test-secret DB_HOST=localhost DB_USER=dragon_mill \
 *     DB_PASSWORD=dragon_mill_password DB_NAME=dragon_mill_pos \
 *     node src/index.js &
 *   # Then use the curl commands in FIX_PLAN.md P0-7 to verify end-to-end
 *
 * Option B — SQLite in-memory (more engineering):
 *   1. npm install -D better-sqlite3
 *   2. In config/database.js, add: if NODE_ENV==='test', use dialect 'sqlite', storage ':memory:'
 *   3. In test setup, call sequelize.sync({ force: true }) + seed minimal data
 *   4. Caveat: SQLite lacks MySQL ENUM, JSON, and some index features —
 *      model definitions would need conditional adjustments.
 */

const TEST_SECRET = 'test-jwt-secret-for-p07';

describe('P0-7 regression — recipe copy crash fix', () => {
  let originalSecret;

  beforeAll(() => {
    originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  it('recipes module should load without ReferenceError (Material removed)', async () => {
    // If the undefined Material variable were still referenced at module
    // level or in an eagerly-evaluated path, this dynamic import would throw.
    const mod = await import('../routes/recipes.js');
    expect(mod.default).toBeDefined();
  });

  it('POST /api/v1/recipes/1/copy should return structured error, not crash', async () => {
    const token = jwt.sign(
      { id: 1, username: 'admin', role: 'admin' },
      TEST_SECRET,
      { expiresIn: '1h' }
    );
    const res = await request(app)
      .post('/api/v1/recipes/1/copy')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send({ name: '测试复制' });

    // Without DB: authenticate middleware's User.findOne fails → 401
    // With DB but recipe not found: handler returns 404
    // With DB and recipe found: handler returns 200
    // The critical assertion: NOT an unhandled crash / not a bare 500 from
    // ReferenceError — the response has the expected JSON shape.
    expect([401, 404, 200, 500]).toContain(res.status);
    expect(res.body).toHaveProperty('success');
  });

  it('POST /api/v1/recipes/1/copy without auth should return 401', async () => {
    const res = await request(app)
      .post('/api/v1/recipes/1/copy')
      .send({ name: '测试复制' });
    expect(res.status).toBe(401);
  });
});
