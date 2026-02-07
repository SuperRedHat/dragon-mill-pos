import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import request from 'supertest';
import app from '../app.js';

/*
 * P1-4 regression — login brute-force protection.
 *
 * Part A: Static source checks — loginLimiter exists, applied to POST /login.
 * Part B: HTTP test — 6 consecutive requests, 6th must return 429.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const authSrc = readFileSync(join(__dirname, '..', 'routes', 'auth.js'), 'utf-8');

// ---------------------------------------------------------------------------
// Part A: Static source checks
// ---------------------------------------------------------------------------
describe('P1-4 — login rate limit (static source checks)', () => {

  it('auth.js should import express-rate-limit', () => {
    expect(authSrc).toMatch(/import\s+rateLimit\s+from\s+['"]express-rate-limit['"]/);
  });

  it('auth.js should define a loginLimiter with max: 5', () => {
    expect(authSrc).toMatch(/const loginLimiter\s*=\s*rateLimit\(/);
    expect(authSrc).toMatch(/max:\s*5/);
  });

  it('auth.js should apply loginLimiter to POST /login', () => {
    expect(authSrc).toMatch(/router\.post\(\s*['"]\/login['"]\s*,\s*loginLimiter\s*,/);
  });

  it('auth.js should return 429 with { success: false, error } structure', () => {
    expect(authSrc).toMatch(/429/);
    expect(authSrc).toMatch(/success:\s*false/);
  });
});

// ---------------------------------------------------------------------------
// Part B: HTTP test — 6 consecutive logins, 6th must be 429
// ---------------------------------------------------------------------------
describe('P1-4 — login rate limit (HTTP)', () => {

  it('should return 429 after 5 failed login attempts', async () => {
    const payload = { username: 'attacker', password: 'wrong' };

    // Send 5 requests — all should be allowed (401 or 500, not 429)
    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(payload);
      // Without DB: might be 401 or 500 (DB connection), but NOT 429 yet
      expect(res.status).not.toBe(429);
    }

    // 6th request — must be 429
    const blocked = await request(app)
      .post('/api/v1/auth/login')
      .send(payload);

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      success: false,
      error: '登录尝试过于频繁，请15分钟后再试'
    });
  });

  it('rate limit should NOT affect other auth endpoints', async () => {
    // GET /api/v1/auth/me should not be rate-limited by loginLimiter
    const res = await request(app)
      .get('/api/v1/auth/me');

    // Should be 401 (no token), NOT 429
    expect(res.status).not.toBe(429);
  });
});
