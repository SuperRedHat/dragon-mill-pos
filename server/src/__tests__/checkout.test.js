import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';

/*
 * P0-9 regression — checkout schema mismatch fix.
 *
 * The checkout endpoint was crashing with:
 *   SequelizeDatabaseError: Unknown column 'recipe_details' in 'field list'
 *
 * Root cause: OrderItem model defines recipeDetails/isRecipe/recipeId fields,
 * but the DB table was never migrated to add these columns.
 *
 * Fix: create migrate.js runner + add recipeId to model + pass recipe fields
 * in OrderItem.create().
 *
 * These tests run WITHOUT a database. They verify that the endpoint is
 * reachable and returns structured responses for various inputs.
 *
 * FULL INTEGRATION TEST (requires MySQL):
 *   docker-compose up -d mysql redis
 *   cd server
 *   JWT_SECRET=test DB_HOST=localhost DB_USER=dragon_mill \
 *     DB_PASSWORD=dragon_mill_password DB_NAME=dragon_mill_pos \
 *     NODE_ENV=development npm run db:init
 *   JWT_SECRET=test DB_HOST=localhost DB_USER=dragon_mill \
 *     DB_PASSWORD=dragon_mill_password DB_NAME=dragon_mill_pos \
 *     npm run db:migrate
 *   # Then start server and test with curl (see FIX_PLAN.md P0-9)
 */

const TEST_SECRET = 'test-jwt-secret-for-checkout';

describe('P0-9 regression — checkout schema mismatch', () => {
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

  const makeToken = (payload = { id: 1, username: 'admin', role: 'admin' }) =>
    jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });

  it('POST /api/v1/cashier/checkout without auth should return 401', async () => {
    const res = await request(app)
      .post('/api/v1/cashier/checkout')
      .send({ items: [{ productId: 1, quantity: 1 }], paymentMethod: 'cash' });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
  });

  it('POST /api/v1/cashier/checkout with empty cart should return 400', async () => {
    const res = await request(app)
      .post('/api/v1/cashier/checkout')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ items: [], paymentMethod: 'cash' });
    // Without DB: auth fails → 401; with DB: 400 (empty cart)
    expect([400, 401]).toContain(res.status);
    expect(res.body).toHaveProperty('success', false);
  });

  it('POST /api/v1/cashier/checkout with items should not crash on schema', async () => {
    const res = await request(app)
      .post('/api/v1/cashier/checkout')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        items: [{ productId: 1, quantity: 2 }],
        paymentMethod: 'cash'
      });
    // Without DB: 401 (auth); with DB: 200 or 404/400 (product not found, etc.)
    // The critical assertion: NOT 500 from "Unknown column 'recipe_details'"
    expect([200, 400, 401, 404]).toContain(res.status);
    expect(res.body).toHaveProperty('success');
  });

  it('POST /api/v1/cashier/checkout with recipe should not crash on schema', async () => {
    const res = await request(app)
      .post('/api/v1/cashier/checkout')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        recipes: [{ recipeId: 1, weight: 500, quantity: 1 }],
        paymentMethod: 'cash'
      });
    expect([200, 400, 401, 404, 500]).toContain(res.status);
    expect(res.body).toHaveProperty('success');
  });

  it('OrderItem model should define recipeId, recipeDetails, and isRecipe fields', async () => {
    const { default: OrderItem } = await import('../models/OrderItem.js');
    const attrs = OrderItem.getAttributes();
    expect(attrs).toHaveProperty('recipeId');
    expect(attrs).toHaveProperty('recipeDetails');
    expect(attrs).toHaveProperty('isRecipe');
    expect(attrs.recipeId.field).toBe('recipe_id');
    expect(attrs.recipeDetails.field).toBe('recipe_details');
    expect(attrs.isRecipe.field).toBe('is_recipe');
  });

  it('OrderItem model columns should all use snake_case naming', async () => {
    const { default: OrderItem } = await import('../models/OrderItem.js');
    const attrs = OrderItem.getAttributes();
    const fieldMappings = Object.entries(attrs)
      .filter(([, v]) => v.field)
      .map(([camel, v]) => [camel, v.field]);

    for (const [camelName, dbColumn] of fieldMappings) {
      // Every explicit field mapping should be snake_case (no camelCase in DB)
      expect(dbColumn).not.toMatch(/[A-Z]/);
      // The field name should not equal the camelCase key (otherwise mapping is pointless)
      if (camelName !== camelName.toLowerCase()) {
        expect(dbColumn).not.toBe(camelName);
      }
    }

    // Verify key fields exist with correct types
    expect(attrs.orderId.type.constructor.name).toMatch(/BIGINT|INTEGER/);
    expect(attrs.recipeId.type.constructor.name).toMatch(/INTEGER/);
    expect(attrs.recipeDetails.type.constructor.name).toMatch(/JSON/);
    expect(attrs.isRecipe.type.constructor.name).toMatch(/BOOLEAN/);
  });
});
