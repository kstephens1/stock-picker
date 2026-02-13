const request = require('supertest');
const app = require('../src/index');
const { initDb } = require('../src/db');

beforeAll(async () => {
  await initDb();
});

describe('GET /api/stocks', () => {
  it('should return a list of stocks', async () => {
    const res = await request(app).get('/api/stocks');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('POST /api/stocks', () => {
  it('should create a new stock', async () => {
    const newStock = {
      sector: 'Technology',
      company: 'Apples',
      ticker: 'AAPL',
      price: 150.00,
      criteria: 'Growth',
      buyPrice: 145.00,
      buyDate: '2026-01-01',
      measurePrice: 155.00,
      measureDate: '2026-02-01',
      changePercent: 3.4
    };
    const res = await request(app).post('/api/stocks').send(newStock);
    expect(res.statusCode).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.company).toBe('Apples');
  });
});
