const request = require('supertest');
const app = require('../src/index');

describe('GET /api/hello', () => {
  it('should return a Hello World message', async () => {
    const res = await request(app).get('/api/hello');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Stock Picker');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('should return JSON content type', async () => {
    const res = await request(app).get('/api/hello');
    expect(res.headers['content-type']).toMatch(/json/);
  });
});
