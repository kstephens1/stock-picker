const express = require('express');
const cors = require('cors');
const { db, initDb } = require('./db');

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
  const { strategy, stockIds } = req.body;
  
  db.run("INSERT INTO strategies (strategy) VALUES (?)", [strategy], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    const strategyId = this.lastID;
    
    if (stockIds && Array.isArray(stockIds)) {
      const stmt = db.prepare("INSERT INTO strategy_stocks (strategy_id, stock_id) VALUES (?, ?)");
      stockIds.forEach(stockId => stmt.run([strategyId, stockId]));
      stmt.finalize((err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: strategyId, strategy, stockIds });
      });
    } else {
      res.status(201).json({ id: strategyId, strategy });
    }
  });
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

