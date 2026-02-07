import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';

const TEST_SECRET = 'test-jwt-secret-for-p03';

describe('P0-3 regression — JWT default secret removed', () => {
  let originalSecret;

  beforeAll(() => {
    originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterAll(() => {
    // Restore original value (or delete if was unset)
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  it('token signed with old fallback "your-secret-key" should be rejected', async () => {
    const token = jwt.sign(
      { id: 1, username: 'admin', role: 'admin' },
      'your-secret-key'
    );
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('token signed with arbitrary wrong key should be rejected', async () => {
    const token = jwt.sign(
      { id: 1, username: 'admin', role: 'admin' },
      'totally-wrong-key'
    );
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('token signed with correct JWT_SECRET should pass verification', () => {
    const payload = { id: 1, username: 'admin', role: 'admin' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(1);
    expect(decoded.username).toBe('admin');
  });
});
