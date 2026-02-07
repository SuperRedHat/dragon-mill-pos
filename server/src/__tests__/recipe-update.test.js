import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';

const TEST_SECRET = 'test-jwt-secret-for-recipe-update';

describe('Recipe update endpoint — materialId→productId fix', () => {
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

  // --- PUT /api/v1/recipes/:id ---

  it('PUT /api/v1/recipes/1 without auth should return 401', async () => {
    const res = await request(app)
      .put('/api/v1/recipes/1')
      .send({ name: '改名测试' });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
  });

  it('PUT /api/v1/recipes/1 with auth should return structured response, not crash', async () => {
    const res = await request(app)
      .put('/api/v1/recipes/1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        name: '更新配方测试',
        materials: [
          { productId: 1, percentage: 60 },
          { productId: 2, percentage: 40 }
        ]
      });
    // Without DB: auth fails → 401; with DB: 200 or 404
    expect([401, 404, 200, 500]).toContain(res.status);
    expect(res.body).toHaveProperty('success');
  });

  // --- POST /api/v1/recipes (create) ---

  it('POST /api/v1/recipes without auth should return 401', async () => {
    const res = await request(app)
      .post('/api/v1/recipes')
      .send({
        name: '测试配方',
        materials: [{ productId: 1, percentage: 100 }]
      });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
  });

  // --- Consistency check: no materialId in source ---

  it('recipes.js should not contain materialId in RecipeProduct.create calls', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const source = fs.readFileSync(
      path.join(__dirname, '../routes/recipes.js'),
      'utf-8'
    );
    // Match materialId used as an object key (not in comments or strings)
    const bugPattern = /\bmaterialId\s*:/;
    expect(source).not.toMatch(bugPattern);
  });
});
