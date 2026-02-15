const express = require('express');
const cors = require('cors');
const { db, initDb } = require('./db');
const { fetchStockPrice, convertToGBP } = require('./stockPriceService');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/hello', (_req, res) => {
  res.json({ message: 'Stock Picker', timestamp: new Date().toISOString() });
});

// CRUD for stocks
app.get('/api/stocks', (req, res) => {
  db.all("SELECT * FROM stocks", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/stocks/:id', (req, res) => {
  db.get("SELECT * FROM stocks WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Stock not found" });
    res.json(row);
  });
});

app.post('/api/stocks', (req, res) => {
  const { sector, company, ticker, price, criteria, buyPrice, buyDate, measurePrice, measureDate, changePercent } = req.body;
  const sql = `INSERT INTO stocks (sector, company, ticker, price, criteria, buyPrice, buyDate, measurePrice, measureDate, changePercent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [sector, company, ticker, price, criteria, buyPrice, buyDate, measurePrice, measureDate, changePercent];
  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, ...req.body });
  });
});

app.put('/api/stocks/:id', (req, res) => {
  const { sector, company, ticker, price, criteria, buyPrice, buyDate, measurePrice, measureDate, changePercent } = req.body;
  const sql = `UPDATE stocks SET sector = ?, company = ?, ticker = ?, price = ?, criteria = ?, buyPrice = ?, buyDate = ?, measurePrice = ?, measureDate = ?, changePercent = ? WHERE id = ?`;
  const params = [sector, company, ticker, price, criteria, buyPrice, buyDate, measurePrice, measureDate, changePercent, req.params.id];
  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Stock not found" });
    res.json({ id: req.params.id, ...req.body });
  });
});

app.delete('/api/stocks/:id', (req, res) => {
  db.run("DELETE FROM stocks WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Stock not found" });
    res.json({ message: "Stock deleted", id: req.params.id });
  });
});

// Strategy endpoints
app.get('/api/strategies', (req, res) => {
  db.all("SELECT * FROM strategies", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/strategies/:id/stocks', (req, res) => {
  const sql = `
    SELECT s.* FROM stocks s
    JOIN strategy_stocks ss ON s.id = ss.stock_id
    WHERE ss.strategy_id = ?
  `;
  db.all(sql, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/strategies', (req, res) => {
  const { strategy } = req.body;

  db.run("INSERT INTO strategies (strategy) VALUES (?)", [strategy], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, strategy });
  });
});

app.put('/api/strategies/:id', (req, res) => {
  const { strategy } = req.body;

  db.run("UPDATE strategies SET strategy = ? WHERE id = ?", [strategy, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Strategy not found" });
    res.json({ id: req.params.id, strategy });
  });
});

app.post('/api/strategies/:id/stocks', (req, res) => {
  const strategyId = req.params.id;
  const { sector, company, ticker, price, criteria, buyPrice, buyDate, measurePrice, measureDate, changePercent } = req.body;

  db.get("SELECT id FROM strategies WHERE id = ?", [strategyId], (strategyErr, strategyRow) => {
    if (strategyErr) return res.status(500).json({ error: strategyErr.message });
    if (!strategyRow) return res.status(404).json({ error: "Strategy not found" });

    const sql = `INSERT INTO stocks (sector, company, ticker, price, criteria, buyPrice, buyDate, measurePrice, measureDate, changePercent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [sector, company, ticker, price, criteria, buyPrice, buyDate, measurePrice, measureDate, changePercent];

    db.run(sql, params, function(stockErr) {
      if (stockErr) return res.status(500).json({ error: stockErr.message });

      const stockId = this.lastID;
      db.run("INSERT INTO strategy_stocks (strategy_id, stock_id) VALUES (?, ?)", [strategyId, stockId], function(linkErr) {
        if (linkErr) return res.status(500).json({ error: linkErr.message });

        res.status(201).json({
          id: stockId,
          sector,
          company,
          ticker,
          price,
          criteria,
          buyPrice,
          buyDate,
          measurePrice,
          measureDate,
          changePercent
        });
      });
    });
  });
});

app.delete('/api/strategies/:strategyId/stocks/:stockId', (req, res) => {
  const { strategyId, stockId } = req.params;

  db.get("SELECT id FROM strategies WHERE id = ?", [strategyId], (strategyErr, strategyRow) => {
    if (strategyErr) return res.status(500).json({ error: strategyErr.message });
    if (!strategyRow) return res.status(404).json({ error: "Strategy not found" });

    db.run("DELETE FROM strategy_stocks WHERE strategy_id = ? AND stock_id = ?", [strategyId, stockId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: "Stock link not found" });
      res.json({ message: "Stock removed from strategy", strategyId, stockId });
    });
  });
});

app.delete('/api/strategies/:id', (req, res) => {
  db.run("DELETE FROM strategy_stocks WHERE strategy_id = ?", [req.params.id], (joinErr) => {
    if (joinErr) return res.status(500).json({ error: joinErr.message });

    db.run("DELETE FROM strategies WHERE id = ?", [req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: "Strategy not found" });
      res.json({ message: "Strategy deleted", id: req.params.id });
    });
  });
});

// Measure Now endpoint - fetches current prices for all stocks
app.post('/api/stocks/measure', async (req, res) => {
  try {
    // Get all stocks
    const stocks = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM stocks", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (stocks.length === 0) {
      return res.json({ message: "No stocks to measure", updated: 0 });
    }

    const results = [];
    const errors = [];
    let successCount = 0;

    // Fetch prices for all stocks
    for (const stock of stocks) {
      try {
        const { price, currency, source } = await fetchStockPrice(stock.ticker);
        const priceInGBP = await convertToGBP(price, currency);
        
        // Calculate change percentage
        const changePercent = stock.buyPrice 
          ? ((priceInGBP - stock.buyPrice) / stock.buyPrice * 100).toFixed(2)
          : 0;

        // Update stock with new measure data
        await new Promise((resolve, reject) => {
          const sql = `UPDATE stocks SET measurePrice = ?, measureDate = ?, changePercent = ? WHERE id = ?`;
          const params = [priceInGBP, new Date().toISOString().split('T')[0], parseFloat(changePercent), stock.id];
          
          db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve();
          });
        });

        successCount++;
        results.push({
          id: stock.id,
          ticker: stock.ticker,
          company: stock.company,
          measurePrice: priceInGBP,
          changePercent: parseFloat(changePercent),
          source
        });
      } catch (err) {
        errors.push({
          ticker: stock.ticker,
          company: stock.company,
          error: err.message
        });
      }
    }

    res.json({
      message: `Successfully measured ${successCount} of ${stocks.length} stocks`,
      updated: successCount,
      total: stocks.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  initDb().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error("Failed to initialize database", err);
  });
}

module.exports = app;

