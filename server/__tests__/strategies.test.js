const request = require('supertest');
const app = require('../src/index');
const { initDb } = require('../src/db');

beforeAll(async () => {
  await initDb();
});

describe('GET /api/strategies', () => {
  it('should return a list of strategies', async () => {
    const res = await request(app).get('/api/strategies');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].strategy).toContain("diversified short-term portfolio");
  });

  it('should return stocks for a strategy', async () => {
    const res = await request(app).get('/api/strategies/1/stocks');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('POST /api/strategies', () => {
  it('should create a new strategy and link stocks', async () => {
    const newStrategy = {
      strategy: 'Focus on technology growth',
      stockIds: [1, 2]
    };
    const res = await request(app).post('/api/strategies').send(newStrategy);
    expect(res.statusCode).toBe(201);
    expect(res.body.id).toBeDefined();
    
    const stocksRes = await request(app).get(`/api/strategies/${res.body.id}/stocks`);
    expect(stocksRes.body.length).toBe(2);
  });
});
