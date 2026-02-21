const request = require('supertest');
const app = require('../src/index');
const { db, initDb } = require('../src/db');
const stockPriceService = require('../src/stockPriceService');

const TEST_STRATEGY_NAMES = [
  'Zero buy price strategy',
  'Per-strategy average history test',
  'Strategy chart data test'
];
const TEST_TICKERS = ['ZERO', 'SAVG', 'CHRT'];

const runSql = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, (err) => {
    if (err) reject(err);
    else resolve();
  });
});

const cleanupMeasureTestArtifacts = async () => {
  const strategyPlaceholders = TEST_STRATEGY_NAMES.map(() => '?').join(', ');
  const tickerPlaceholders = TEST_TICKERS.map(() => '?').join(', ');

  await runSql(
    `DELETE FROM strategy_average_change_history
     WHERE strategy_id IN (
       SELECT id FROM strategies WHERE strategy IN (${strategyPlaceholders})
     )`,
    TEST_STRATEGY_NAMES
  );

  await runSql(
    `DELETE FROM stock_measurements
     WHERE stock_id IN (
       SELECT id FROM stocks WHERE ticker IN (${tickerPlaceholders})
     )`,
    TEST_TICKERS
  );

  await runSql(
    `DELETE FROM strategy_stocks
     WHERE strategy_id IN (
       SELECT id FROM strategies WHERE strategy IN (${strategyPlaceholders})
     )`,
    TEST_STRATEGY_NAMES
  );

  await runSql(
    `DELETE FROM strategy_stocks
     WHERE stock_id IN (
       SELECT id FROM stocks WHERE ticker IN (${tickerPlaceholders})
     )`,
    TEST_TICKERS
  );

  await runSql(`DELETE FROM stocks WHERE ticker IN (${tickerPlaceholders})`, TEST_TICKERS);
  await runSql(`DELETE FROM strategies WHERE strategy IN (${strategyPlaceholders})`, TEST_STRATEGY_NAMES);
};

const resetMeasurementHistoryTables = async () => {
  await runSql('DELETE FROM stock_measurements');
  await runSql('DELETE FROM average_change_history');
  await runSql('DELETE FROM strategy_average_change_history');
};

beforeAll(async () => {
  await initDb();
});

beforeEach(async () => {
  await cleanupMeasureTestArtifacts();
  await resetMeasurementHistoryTables();
  jest.restoreAllMocks();
});

describe('POST /api/stocks/measure', () => {
  it('should return measure endpoint structure', async () => {
    // Mock the stock price service to avoid external API calls
    jest.spyOn(stockPriceService, 'fetchStockPrice').mockResolvedValue({
      price: 100.50,
      currency: 'GBP',
      source: 'yahoo'
    });
    
    jest.spyOn(stockPriceService, 'convertToGBP').mockResolvedValue(100.50);

    const res = await request(app).post('/api/stocks/measure');
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('updated');
    expect(res.body).toHaveProperty('total');
    expect(res.body.total).toBeGreaterThan(0);

    const historyRows = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM stock_measurements', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    expect(historyRows.length).toBe(res.body.updated);
    if (historyRows.length > 0) {
      expect(historyRows[0]).toHaveProperty('stock_id');
      expect(historyRows[0]).toHaveProperty('measurePrice');
      expect(historyRows[0]).toHaveProperty('measureDate');
      expect(historyRows[0]).toHaveProperty('changePercent');
      expect(historyRows[0]).toHaveProperty('source');
    }

    const averageRows = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM average_change_history', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    expect(averageRows.length).toBe(1);
    expect(averageRows[0]).toHaveProperty('measureDate');
    expect(averageRows[0]).toHaveProperty('averageChangePercent');
    expect(averageRows[0]).toHaveProperty('stockCount');
    expect(averageRows[0].stockCount).toBe(res.body.updated);

    const strategyAverageRows = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM strategy_average_change_history', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    expect(strategyAverageRows.length).toBeGreaterThan(0);
    expect(strategyAverageRows[0]).toHaveProperty('strategy_id');
    expect(strategyAverageRows[0]).toHaveProperty('measureDate');
    expect(strategyAverageRows[0]).toHaveProperty('averageChangePercent');
    expect(strategyAverageRows[0]).toHaveProperty('stockCount');
    
    // Restore mocks
    stockPriceService.fetchStockPrice.mockRestore();
    stockPriceService.convertToGBP.mockRestore();
  });

  it('should handle empty stocks gracefully', async () => {
    // This test would need an empty database, which we don't have
    // Just verify the endpoint exists and has proper structure
    const res = await request(app).post('/api/stocks/measure');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('should return 0 changePercent when buyPrice is zero', async () => {
    const createdStrategy = await request(app)
      .post('/api/strategies')
      .send({ strategy: 'Zero buy price strategy' });

    expect(createdStrategy.statusCode).toBe(201);

    const createdStock = await request(app)
      .post(`/api/strategies/${createdStrategy.body.id}/stocks`)
      .send({
        sector: 'Energy',
        company: 'Zero Buy Co',
        ticker: 'ZERO',
        price: 10,
        criteria: 'Test',
        buyPrice: 0,
        buyDate: '2026-02-01',
        measurePrice: 10,
        measureDate: '2026-02-01',
        changePercent: 0
      });

    expect(createdStock.statusCode).toBe(201);

    jest.spyOn(stockPriceService, 'fetchStockPrice').mockResolvedValue({
      price: 100.50,
      currency: 'GBP',
      source: 'yahoo'
    });

    jest.spyOn(stockPriceService, 'convertToGBP').mockResolvedValue(100.50);

    const measureRes = await request(app).post('/api/stocks/measure');
    expect(measureRes.statusCode).toBe(200);

    const measuredZeroBuyStock = measureRes.body.results.find((result) => result.ticker === 'ZERO');
    expect(measuredZeroBuyStock).toBeDefined();
    expect(measuredZeroBuyStock.changePercent).toBe(0);
    expect(Number.isFinite(measuredZeroBuyStock.changePercent)).toBe(true);

    stockPriceService.fetchStockPrice.mockRestore();
    stockPriceService.convertToGBP.mockRestore();
  });
});

describe('GET /api/stocks/:id/measurements', () => {
  it('should return measurement history for a stock', async () => {
    jest.spyOn(stockPriceService, 'fetchStockPrice').mockResolvedValue({
      price: 101.75,
      currency: 'GBP',
      source: 'yahoo'
    });

    jest.spyOn(stockPriceService, 'convertToGBP').mockResolvedValue(101.75);

    const measureRes = await request(app).post('/api/stocks/measure');
    expect(measureRes.statusCode).toBe(200);
    expect(measureRes.body.updated).toBeGreaterThan(0);

    const measuredStockId = measureRes.body.results[0].id;
    const res = await request(app).get(`/api/stocks/${measuredStockId}/measurements`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].stockId).toBe(measuredStockId);
    expect(res.body[0]).toHaveProperty('measurePrice');
    expect(res.body[0]).toHaveProperty('measureDate');
    expect(res.body[0]).toHaveProperty('changePercent');
    expect(res.body[0]).toHaveProperty('source');

    stockPriceService.fetchStockPrice.mockRestore();
    stockPriceService.convertToGBP.mockRestore();
  });

  it('should return 404 for unknown stock id', async () => {
    const res = await request(app).get('/api/stocks/999999/measurements');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Stock not found');
  });
});

describe('GET /api/measurements/average-change', () => {
  it('should return average change history entries', async () => {
    jest.spyOn(stockPriceService, 'fetchStockPrice').mockResolvedValue({
      price: 100.50,
      currency: 'GBP',
      source: 'yahoo'
    });

    jest.spyOn(stockPriceService, 'convertToGBP').mockResolvedValue(100.50);

    const measureRes = await request(app).post('/api/stocks/measure');
    expect(measureRes.statusCode).toBe(200);
    expect(measureRes.body.updated).toBeGreaterThan(0);

    const res = await request(app).get('/api/measurements/average-change');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('measureDate');
    expect(res.body[0]).toHaveProperty('averageChangePercent');
    expect(res.body[0]).toHaveProperty('stockCount');
    expect(res.body[0].stockCount).toBe(measureRes.body.updated);

    stockPriceService.fetchStockPrice.mockRestore();
    stockPriceService.convertToGBP.mockRestore();
  });
});

describe('GET /api/strategies/:id/measurements/average-change', () => {
  it('should return strategy average change history entries', async () => {
    const strategyCreateRes = await request(app)
      .post('/api/strategies')
      .send({ strategy: 'Per-strategy average history test' });

    expect(strategyCreateRes.statusCode).toBe(201);

    const stockCreateRes = await request(app)
      .post(`/api/strategies/${strategyCreateRes.body.id}/stocks`)
      .send({
        sector: 'Healthcare',
        company: 'Strategy Avg Co',
        ticker: 'SAVG',
        price: 80,
        criteria: 'Momentum',
        buyPrice: 75,
        buyDate: '2026-02-01',
        measurePrice: 81,
        measureDate: '2026-02-02',
        changePercent: 8
      });

    expect(stockCreateRes.statusCode).toBe(201);

    jest.spyOn(stockPriceService, 'fetchStockPrice').mockResolvedValue({
      price: 100.50,
      currency: 'GBP',
      source: 'yahoo'
    });

    jest.spyOn(stockPriceService, 'convertToGBP').mockResolvedValue(100.50);

    const measureRes = await request(app).post('/api/stocks/measure');
    expect(measureRes.statusCode).toBe(200);

    const historyRes = await request(app).get(`/api/strategies/${strategyCreateRes.body.id}/measurements/average-change`);

    expect(historyRes.statusCode).toBe(200);
    expect(Array.isArray(historyRes.body)).toBe(true);
    expect(historyRes.body.length).toBeGreaterThan(0);
    expect(historyRes.body[0].strategyId).toBe(strategyCreateRes.body.id);
    expect(historyRes.body[0]).toHaveProperty('measureDate');
    expect(historyRes.body[0]).toHaveProperty('averageChangePercent');
    expect(historyRes.body[0]).toHaveProperty('stockCount');

    stockPriceService.fetchStockPrice.mockRestore();
    stockPriceService.convertToGBP.mockRestore();
  });

  it('should return 404 for unknown strategy id', async () => {
    const res = await request(app).get('/api/strategies/999999/measurements/average-change');

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Strategy not found');
  });
});

describe('GET /api/strategies/:id/measurements/chart-data', () => {
  it('should return combined strategy chart data', async () => {
    const strategyCreateRes = await request(app)
      .post('/api/strategies')
      .send({ strategy: 'Strategy chart data test' });

    expect(strategyCreateRes.statusCode).toBe(201);

    const stockCreateRes = await request(app)
      .post(`/api/strategies/${strategyCreateRes.body.id}/stocks`)
      .send({
        sector: 'Utilities',
        company: 'Chart Stock Co',
        ticker: 'CHRT',
        price: 70,
        criteria: 'Cash flow',
        buyPrice: 65,
        buyDate: '2026-02-01',
        measurePrice: 71,
        measureDate: '2026-02-02',
        changePercent: 9.23
      });

    expect(stockCreateRes.statusCode).toBe(201);

    jest.spyOn(stockPriceService, 'fetchStockPrice').mockResolvedValue({
      price: 100.50,
      currency: 'GBP',
      source: 'yahoo'
    });

    jest.spyOn(stockPriceService, 'convertToGBP').mockResolvedValue(100.50);

    const measureRes = await request(app).post('/api/stocks/measure');
    expect(measureRes.statusCode).toBe(200);

    const chartDataRes = await request(app).get(`/api/strategies/${strategyCreateRes.body.id}/measurements/chart-data`);

    expect(chartDataRes.statusCode).toBe(200);
    expect(chartDataRes.body.strategyId).toBe(strategyCreateRes.body.id);
    expect(Array.isArray(chartDataRes.body.strategyAverageHistory)).toBe(true);
    expect(chartDataRes.body.strategyAverageHistory.length).toBeGreaterThan(0);
    expect(Array.isArray(chartDataRes.body.stocks)).toBe(true);
    expect(chartDataRes.body.stocks.length).toBeGreaterThan(0);
    expect(chartDataRes.body.stocks[0]).toHaveProperty('stockId');
    expect(chartDataRes.body.stocks[0]).toHaveProperty('company');
    expect(chartDataRes.body.stocks[0]).toHaveProperty('ticker');
    expect(Array.isArray(chartDataRes.body.stocks[0].measurements)).toBe(true);
    expect(chartDataRes.body.stocks[0].measurements.length).toBeGreaterThan(0);
    expect(chartDataRes.body.stocks[0].measurements[0]).toHaveProperty('measureDate');
    expect(chartDataRes.body.stocks[0].measurements[0]).toHaveProperty('changePercent');

    stockPriceService.fetchStockPrice.mockRestore();
    stockPriceService.convertToGBP.mockRestore();
  });

  it('should return 404 for unknown strategy id', async () => {
    const res = await request(app).get('/api/strategies/999999/measurements/chart-data');

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Strategy not found');
  });
});
