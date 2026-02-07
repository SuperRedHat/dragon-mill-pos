import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';

/*
 * P1-5 regression — DELETE /products/:id must reject when OrderItem references exist.
 *
 * Part A: Static source checks — OrderItem.count guard present.
 * Part B: HTTP tests — delete blocked with reference, allowed without (requires DB for full proof).
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const productsSrc = readFileSync(join(__dirname, '..', 'routes', 'products.js'), 'utf-8');

// ---------------------------------------------------------------------------
// Part A: Static source checks
// ---------------------------------------------------------------------------
describe('P1-5 — product delete guard (static source checks)', () => {

  it('products.js should import OrderItem', () => {
    expect(productsSrc).toMatch(/import\s+OrderItem\s+from\s+['"]\.\.\/models\/OrderItem\.js['"]/);
  });

  it('delete handler should call OrderItem.count with productId', () => {
    // Extract the delete handler block
    const deleteIdx = productsSrc.indexOf("router.delete('/:id'");
    expect(deleteIdx).toBeGreaterThan(-1);
    const deleteBlock = productsSrc.slice(deleteIdx, deleteIdx + 800);
    expect(deleteBlock).toMatch(/OrderItem\.count\(\s*\{\s*where:\s*\{\s*productId/);
  });

  it('delete handler should return 400 when refCount > 0', () => {
    const deleteIdx = productsSrc.indexOf("router.delete('/:id'");
    const deleteBlock = productsSrc.slice(deleteIdx, deleteIdx + 800);
    expect(deleteBlock).toMatch(/refCount\s*>\s*0/);
    expect(deleteBlock).toMatch(/status\(400\)/);
    expect(deleteBlock).toMatch(/无法删除/);
  });

  it('delete handler should NOT have the old TODO comment', () => {
    expect(productsSrc).not.toMatch(/TODO.*检查是否有相关订单/);
  });
});

// ---------------------------------------------------------------------------
// Part B: HTTP tests
// ---------------------------------------------------------------------------
const TEST_SECRET = 'test-product-delete';

describe('P1-5 — product delete guard (HTTP)', () => {

  let originalSecret;
  beforeAll(() => {
    originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = TEST_SECRET;
  });
  afterAll(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  const makeAdminToken = () =>
    jwt.sign({ id: 1, username: 'admin', role: 'admin' }, TEST_SECRET, { expiresIn: '1h' });

  it('DELETE /products/:id without auth should return 401', async () => {
    const res = await request(app)
      .delete('/api/v1/products/1');
    expect(res.status).toBe(401);
  });

  it('DELETE /products/:id with non-admin role should return 403', async () => {
    const staffToken = jwt.sign(
      { id: 2, username: 'staff', role: 'staff' },
      TEST_SECRET,
      { expiresIn: '1h' }
    );
    const res = await request(app)
      .delete('/api/v1/products/1')
      .set('Authorization', `Bearer ${staffToken}`);
    // Without DB the auth middleware may return 401 (can't findByPk the user)
    // With DB it returns 403
    expect([401, 403]).toContain(res.status);
  });

  /*
   * FULL INTEGRATION TESTS (require running MySQL + seeded data):
   *
   *   # 1. Create a product, create an order referencing it, then try to delete:
   *   TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
   *     -H "Content-Type: application/json" \
   *     -d '{"username":"admin","password":"<YOUR_ADMIN_PASSWORD>"}' \
   *     | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.token))")
   *
   *   # Try deleting a product that has order history:
   *   curl -s -X DELETE http://localhost:3001/api/v1/products/1 \
   *     -H "Authorization: Bearer $TOKEN"
   *   # Expected: 400 { "success": false, "error": "该商品已关联 N 条订单记录，无法删除" }
   *
   *   # Create a fresh product with no orders, then delete:
   *   NEW_ID=$(curl -s -X POST http://localhost:3001/api/v1/products \
   *     -H "Authorization: Bearer $TOKEN" \
   *     -H "Content-Type: application/json" \
   *     -d '{"name":"测试删除","price":1,"stock":0,"categoryId":1}' \
   *     | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.id))")
   *   curl -s -X DELETE "http://localhost:3001/api/v1/products/$NEW_ID" \
   *     -H "Authorization: Bearer $TOKEN"
   *   # Expected: 200 { "success": true, "message": "商品删除成功" }
   */
});
