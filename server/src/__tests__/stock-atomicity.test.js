import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';

/*
 * P1-1 regression — stock operations must be atomic.
 *
 * Part A: Static source checks — verify no read-then-write patterns remain.
 * Part B: Concurrent checkout regression — 10 parallel requests, stock=1,
 *         at most 1 should succeed (requires real MySQL for full proof,
 *         but the source-level guarantees are testable without DB).
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROUTES = join(__dirname, '..', 'routes');

const readRoute = (name) => readFileSync(join(ROUTES, name), 'utf-8');

// ---------------------------------------------------------------------------
// Part A: Static source verification — atomic stock patterns
// ---------------------------------------------------------------------------
describe('P1-1 — stock atomicity (static source checks)', () => {

  const cashierSrc = readRoute('cashier.js');
  const productsSrc = readRoute('products.js');
  const ordersSrc   = readRoute('orders.js');

  it('cashier.js should not use read-then-write for stock deduction', () => {
    // Old pattern: "const beforeStock = product.stock" followed by "product.update({ stock: afterStock })"
    // New pattern: Product.update with sequelize.literal('stock - N')
    const oldPattern = /const beforeStock = product\.stock[\s\S]{0,200}product\.update\(\s*\{\s*stock:\s*afterStock/;
    expect(cashierSrc).not.toMatch(oldPattern);
  });

  it('cashier.js should use atomic Product.update with sequelize.literal for stock deduction', () => {
    // Must contain the atomic pattern
    expect(cashierSrc).toMatch(/Product\.update\(\s*\{[^}]*sequelize\.literal\(`stock - /);
    // Must check Op.gte for sufficient stock
    expect(cashierSrc).toMatch(/Op\.gte/);
  });

  it('cashier.js should check affectedCount === 0 for insufficient stock', () => {
    // deducted === 0 or matDeducted === 0 checks
    const checks = cashierSrc.match(/=== 0\)/g) || [];
    expect(checks.length).toBeGreaterThanOrEqual(2); // normal items + recipe materials
  });

  it('products.js stock adjustment should use transaction', () => {
    // The /:id/stock handler must create a transaction
    const stockHandler = productsSrc.slice(productsSrc.indexOf("'/:id/stock'"));
    expect(stockHandler).toMatch(/sequelize\.transaction\(\)/);
  });

  it('products.js stock adjustment should use atomic update', () => {
    const stockHandler = productsSrc.slice(productsSrc.indexOf("'/:id/stock'"));
    expect(stockHandler).toMatch(/sequelize\.literal\(`stock \+/);
    expect(stockHandler).not.toMatch(/const beforeStock = product\.stock[\s\S]{0,100}product\.update\(\s*\{\s*stock:\s*afterStock/);
  });

  it('products.js batch replenish should use atomic update', () => {
    const batchHandler = productsSrc.slice(
      productsSrc.indexOf("'/batch-replenish'"),
      productsSrc.indexOf("'/batch-replenish'") + 3000
    );
    expect(batchHandler).toMatch(/sequelize\.literal\(`stock \+/);
  });

  it('orders.js refund should use atomic stock restoration', () => {
    // Must use Product.update with sequelize.literal for stock increment
    expect(ordersSrc).toMatch(/Product\.update\(\s*\{[^}]*sequelize\.literal\(`stock \+/);
    // Must NOT use the old pattern
    expect(ordersSrc).not.toMatch(/const beforeStock = product\.stock[\s\S]{0,200}product\.update\(\s*\{\s*stock:\s*afterStock/);
  });
});

// ---------------------------------------------------------------------------
// Part B: Concurrent checkout regression (no real DB — tests auth gate + shape)
// ---------------------------------------------------------------------------
const TEST_SECRET = 'test-stock-concurrency';

describe('P1-1 — concurrent checkout regression', () => {

  let originalSecret;
  beforeAll(() => {
    originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = TEST_SECRET;
  });
  afterAll(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  const makeToken = () =>
    jwt.sign({ id: 1, username: 'admin', role: 'admin' }, TEST_SECRET, { expiresIn: '1h' });

  it('10 concurrent checkouts for same product — none should 500 (schema crash)', async () => {
    const token = makeToken();
    const payload = {
      items: [{ productId: 1, quantity: 1 }],
      paymentMethod: 'cash'
    };

    // Fire 10 requests in parallel
    const requests = Array.from({ length: 10 }, () =>
      request(app)
        .post('/api/v1/cashier/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
    );

    const responses = await Promise.all(requests);

    for (const res of responses) {
      // Without DB: 401 (auth middleware can't verify user in DB)
      // With DB: 200 (success) or 400 (stock insufficient) — never 500
      expect([200, 400, 401, 404]).toContain(res.status);
      // Response must always be well-formed JSON
      expect(res.body).toHaveProperty('success');
    }
  });

  /*
   * FULL CONCURRENCY TEST (requires running MySQL + seeded data):
   *
   *   # Set product stock to 1:
   *   mysql -e "UPDATE products SET stock = 1 WHERE id = 1;" dragon_mill_pos
   *
   *   # Run this test with DB env vars:
   *   JWT_SECRET=test DB_HOST=localhost DB_USER=dragon_mill \
   *     DB_PASSWORD=dragon_mill_password DB_NAME=dragon_mill_pos \
   *     npm test -- --testPathPattern stock-atomicity
   *
   *   # Verify stock did not go negative:
   *   mysql -e "SELECT id, stock FROM products WHERE id = 1;" dragon_mill_pos
   *   # Expected: stock = 0 (exactly 1 order succeeded)
   */
});
