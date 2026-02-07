import request from 'supertest';
import app from '../app.js';

describe('P0-1/P0-2 regression — test routes removed', () => {
  it('GET /health should return 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('dragon-mill-pos-server');
  });

  it('GET /api/test/check-dirs should return 404 (removed)', async () => {
    const res = await request(app).get('/api/test/check-dirs');
    expect(res.status).toBe(404);
  });

  it('POST /api/test/upload should return 404 (removed)', async () => {
    const res = await request(app).post('/api/test/upload');
    expect(res.status).toBe(404);
  });
});
