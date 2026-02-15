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
  it('should create a new strategy without linking stocks', async () => {
    const newStrategy = {
      strategy: 'Focus on technology growth'
    };
    const res = await request(app).post('/api/strategies').send(newStrategy);
    expect(res.statusCode).toBe(201);
    expect(res.body.id).toBeDefined();

    const stocksRes = await request(app).get(`/api/strategies/${res.body.id}/stocks`);
    expect(stocksRes.body.length).toBe(0);
  });
});

describe('PUT /api/strategies/:id', () => {
  it('should update strategy text without replacing linked stocks', async () => {
    const created = await request(app).post('/api/strategies').send({
      strategy: 'Original strategy'
    });

    const createdStock = await request(app)
      .post(`/api/strategies/${created.body.id}/stocks`)
      .send({
        sector: 'Utilities',
        company: 'Attached Co',
        ticker: 'ATCH',
        price: 42,
        criteria: 'Stable growth',
        buyPrice: 40,
        buyDate: '2026-02-01',
        measurePrice: 43,
        measureDate: '2026-02-02',
        changePercent: 2.5
      });

    expect(createdStock.statusCode).toBe(201);

    const beforeUpdateStocks = await request(app).get(`/api/strategies/${created.body.id}/stocks`);
    expect(beforeUpdateStocks.body.length).toBe(1);

    const updatedPayload = {
      strategy: 'Updated strategy text'
    };

    const res = await request(app)
      .put(`/api/strategies/${created.body.id}`)
      .send(updatedPayload);

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(String(created.body.id));
    expect(res.body.strategy).toBe(updatedPayload.strategy);

    const stocksRes = await request(app).get(`/api/strategies/${created.body.id}/stocks`);
    expect(stocksRes.body.length).toBe(1);
  });

  it('should return 404 for unknown strategy id', async () => {
    const res = await request(app)
      .put('/api/strategies/999999')
      .send({ strategy: 'Missing strategy' });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Strategy not found');
  });
});

describe('POST /api/strategies/:id/stocks', () => {
  it('should create and link a new stock to strategy', async () => {
    const createdStrategy = await request(app).post('/api/strategies').send({
      strategy: 'Add stocks here'
    });

    const payload = {
      sector: 'Finance',
      company: 'Linked Co',
      ticker: 'LNKD',
      price: 120,
      criteria: 'Value momentum',
      buyPrice: 115,
      buyDate: '2026-02-01',
      measurePrice: 121,
      measureDate: '2026-02-03',
      changePercent: 5.2
    };

    const res = await request(app)
      .post(`/api/strategies/${createdStrategy.body.id}/stocks`)
      .send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.company).toBe('Linked Co');

    const stocksRes = await request(app).get(`/api/strategies/${createdStrategy.body.id}/stocks`);
    expect(stocksRes.statusCode).toBe(200);
    expect(stocksRes.body.length).toBe(1);
    expect(stocksRes.body[0].company).toBe('Linked Co');
  });

  it('should return 404 for unknown strategy id', async () => {
    const res = await request(app)
      .post('/api/strategies/999999/stocks')
      .send({
        sector: 'Finance',
        company: 'Missing strategy stock',
        ticker: 'MISS',
        price: 10,
        criteria: 'Test',
        buyPrice: 10,
        buyDate: '2026-02-01',
        measurePrice: 11,
        measureDate: '2026-02-02',
        changePercent: 10
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Strategy not found');
  });
});

describe('DELETE /api/strategies/:strategyId/stocks/:stockId', () => {
  it('should unlink stock from strategy only', async () => {
    const created = await request(app).post('/api/strategies').send({
      strategy: 'Unlink strategy'
    });

    const createdStock = await request(app)
      .post(`/api/strategies/${created.body.id}/stocks`)
      .send({
        sector: 'Consumer',
        company: 'Unlink Co',
        ticker: 'UNLK',
        price: 88,
        criteria: 'Income',
        buyPrice: 85,
        buyDate: '2026-02-05',
        measurePrice: 89,
        measureDate: '2026-02-06',
        changePercent: 4.7
      });

    const unlinkRes = await request(app)
      .delete(`/api/strategies/${created.body.id}/stocks/${createdStock.body.id}`);

    expect(unlinkRes.statusCode).toBe(200);
    expect(unlinkRes.body.message).toBe('Stock removed from strategy');

    const stocksForStrategy = await request(app).get(`/api/strategies/${created.body.id}/stocks`);
    expect(stocksForStrategy.body.length).toBe(0);

    const stockStillExists = await request(app).get(`/api/stocks/${createdStock.body.id}`);
    expect(stockStillExists.statusCode).toBe(200);
  });

  it('should return 404 when link does not exist', async () => {
    const createdStrategy = await request(app).post('/api/strategies').send({
      strategy: 'No links yet'
    });

    const res = await request(app)
      .delete(`/api/strategies/${createdStrategy.body.id}/stocks/999999`);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Stock link not found');
  });
});

describe('DELETE /api/strategies/:id', () => {
  it('should delete a strategy', async () => {
    const created = await request(app).post('/api/strategies').send({
      strategy: 'Delete this strategy'
    });

    const res = await request(app).delete(`/api/strategies/${created.body.id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Strategy deleted');

    const strategiesRes = await request(app).get('/api/strategies');
    const deleted = strategiesRes.body.find(strategy => strategy.id === created.body.id);
    expect(deleted).toBeUndefined();
  });

  it('should return 404 when deleting an unknown strategy id', async () => {
    const res = await request(app).delete('/api/strategies/999999');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Strategy not found');
  });
});
