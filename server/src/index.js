const express = require('express');
const cors = require('cors');
const { db, initDb } = require('./db');
const stockPriceService = require('./stockPriceService');

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

app.get('/api/stocks/:id/measurements', (req, res) => {
  db.get("SELECT id FROM stocks WHERE id = ?", [req.params.id], (stockErr, stockRow) => {
    if (stockErr) return res.status(500).json({ error: stockErr.message });
    if (!stockRow) return res.status(404).json({ error: "Stock not found" });

    db.all(
      `SELECT id, stock_id as stockId, measurePrice, measureDate, changePercent, source, createdAt
       FROM stock_measurements
       WHERE stock_id = ?
       ORDER BY date(measureDate) DESC, id DESC`,
      [req.params.id],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      }
    );
  });
});

app.get('/api/measurements/average-change', (_req, res) => {
  db.all(
    `SELECT id, measureDate, averageChangePercent, stockCount, createdAt
     FROM average_change_history
     ORDER BY date(measureDate) DESC, id DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
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
  const stockId = req.params.id;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION', (beginErr) => {
      if (beginErr) {
        return res.status(500).json({ error: beginErr.message });
      }

      db.run('DELETE FROM stock_measurements WHERE stock_id = ?', [stockId], (measureErr) => {
        if (measureErr) {
          return db.run('ROLLBACK', () => {
            res.status(500).json({ error: measureErr.message });
          });
        }

        db.run('DELETE FROM stocks WHERE id = ?', [stockId], function (err) {
          if (err) {
            return db.run('ROLLBACK', () => {
              res.status(500).json({ error: err.message });
            });
          }

          if (this.changes === 0) {
            return db.run('ROLLBACK', () => {
              res.status(404).json({ error: 'Stock not found' });
            });
          }

          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              return db.run('ROLLBACK', () => {
                res.status(500).json({ error: commitErr.message });
              });
            }

            res.json({ message: 'Stock deleted', id: stockId });
          });
        });
      });
    });
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

app.get('/api/strategies/:id/measurements/average-change', (req, res) => {
  db.get("SELECT id FROM strategies WHERE id = ?", [req.params.id], (strategyErr, strategyRow) => {
    if (strategyErr) return res.status(500).json({ error: strategyErr.message });
    if (!strategyRow) return res.status(404).json({ error: "Strategy not found" });

    db.all(
      `SELECT id, strategy_id as strategyId, measureDate, averageChangePercent, stockCount, createdAt
       FROM strategy_average_change_history
       WHERE strategy_id = ?
       ORDER BY date(measureDate) DESC, id DESC`,
      [req.params.id],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      }
    );
  });
});

app.get('/api/strategies/:id/measurements/chart-data', (req, res) => {
  db.get("SELECT id FROM strategies WHERE id = ?", [req.params.id], (strategyErr, strategyRow) => {
    if (strategyErr) return res.status(500).json({ error: strategyErr.message });
    if (!strategyRow) return res.status(404).json({ error: "Strategy not found" });

    db.all(
      `SELECT id, strategy_id as strategyId, measureDate, averageChangePercent, stockCount, createdAt
       FROM strategy_average_change_history
       WHERE strategy_id = ?
       ORDER BY date(measureDate) ASC, id ASC`,
      [req.params.id],
      (averageErr, strategyAverageHistory) => {
        if (averageErr) return res.status(500).json({ error: averageErr.message });

        db.all(
          `SELECT s.id as stockId, s.company, s.ticker
           FROM stocks s
           INNER JOIN strategy_stocks ss ON ss.stock_id = s.id
           WHERE ss.strategy_id = ?
           ORDER BY s.id ASC`,
          [req.params.id],
          (stocksErr, strategyStocks) => {
            if (stocksErr) return res.status(500).json({ error: stocksErr.message });

            db.all(
              `SELECT sm.stock_id as stockId, sm.measurePrice, sm.measureDate, sm.changePercent, sm.source, sm.createdAt
               FROM stock_measurements sm
               INNER JOIN strategy_stocks ss ON ss.stock_id = sm.stock_id
               WHERE ss.strategy_id = ?
               ORDER BY sm.stock_id ASC, date(sm.measureDate) ASC, sm.id ASC`,
              [req.params.id],
              (historyErr, stockHistoryRows) => {
                if (historyErr) return res.status(500).json({ error: historyErr.message });

                const historyByStockId = new Map();
                stockHistoryRows.forEach((row) => {
                  if (!historyByStockId.has(row.stockId)) {
                    historyByStockId.set(row.stockId, []);
                  }
                  historyByStockId.get(row.stockId).push({
                    measurePrice: row.measurePrice,
                    measureDate: row.measureDate,
                    changePercent: row.changePercent,
                    source: row.source,
                    createdAt: row.createdAt
                  });
                });

                const stocks = strategyStocks.map((stock) => ({
                  stockId: stock.stockId,
                  company: stock.company,
                  ticker: stock.ticker,
                  measurements: historyByStockId.get(stock.stockId) || []
                }));

                res.json({
                  strategyId: Number(req.params.id),
                  strategyAverageHistory,
                  stocks
                });
              }
            );
          }
        );
      }
    );
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
  const strategyId = req.params.id;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION', (beginErr) => {
      if (beginErr) {
        return res.status(500).json({ error: beginErr.message });
      }

      db.run('DELETE FROM strategy_stocks WHERE strategy_id = ?', [strategyId], (joinErr) => {
        if (joinErr) {
          return db.run('ROLLBACK', () => {
            res.status(500).json({ error: joinErr.message });
          });
        }

        db.run('DELETE FROM strategy_average_change_history WHERE strategy_id = ?', [strategyId], (historyErr) => {
          if (historyErr) {
            return db.run('ROLLBACK', () => {
              res.status(500).json({ error: historyErr.message });
            });
          }

          db.run('DELETE FROM strategies WHERE id = ?', [strategyId], function (err) {
            if (err) {
              return db.run('ROLLBACK', () => {
                res.status(500).json({ error: err.message });
              });
            }

            if (this.changes === 0) {
              return db.run('ROLLBACK', () => {
                res.status(404).json({ error: 'Strategy not found' });
              });
            }

            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                return db.run('ROLLBACK', () => {
                  res.status(500).json({ error: commitErr.message });
                });
              }

              res.json({ message: 'Strategy deleted', id: strategyId });
            });
          });
        });
      });
    });
  });
});

/**
 * Measure Now endpoint - fetches current stock prices for all stocks
 * 
 * This endpoint retrieves the latest stock prices from Yahoo Finance (with Twelve Data fallback)
 * for all stocks in the database, then updates their measurePrice, measureDate, and changePercent fields.
 * 
 * @route POST /api/stocks/measure
 * @returns {Object} Response with:
 *   - message: Summary message of operation
 *   - updated: Number of stocks successfully updated
 *   - total: Total number of stocks processed
 *   - results: Array of successfully updated stocks with their new prices
 *   - errors: Array of stocks that failed to update (if any)
 * 
 * @example
 * Response: {
 *   message: "Successfully measured 8 of 10 stocks",
 *   updated: 8,
 *   total: 10,
 *   results: [{ id: 1, ticker: "AAPL", measurePrice: 150.25, changePercent: 2.5, source: "yahoo" }],
 *   errors: [{ ticker: "INVALID", company: "Bad Stock", error: "No price data available" }]
 * }
 */
app.post('/api/stocks/measure', async (req, res) => {
  try {
    const measuredDate = new Date().toISOString().split('T')[0];

    // Get only stocks currently linked to at least one strategy
    const stocks = await new Promise((resolve, reject) => {
      const sql = `
        SELECT DISTINCT s.*
        FROM stocks s
        INNER JOIN strategy_stocks ss ON ss.stock_id = s.id
      `;
      db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const strategyStockLinks = await new Promise((resolve, reject) => {
      db.all(
        `SELECT strategy_id as strategyId, stock_id as stockId FROM strategy_stocks`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    if (stocks.length === 0) {
      return res.json({ message: "No strategy-linked stocks to measure", updated: 0, total: 0 });
    }

    const results = [];
    const errors = [];
    const successfulChangePercents = [];
    const successfulChangesByStockId = new Map();
    let successCount = 0;

    const measurementCandidates = await Promise.all(
      stocks.map(async (stock) => {
        try {
          const { price, currency, source } = await stockPriceService.fetchStockPrice(stock.ticker);
          const priceInGBP = await stockPriceService.convertToGBP(price, currency);
          const buyPrice = Number(stock.buyPrice);
          const hasValidBuyPrice = Number.isFinite(buyPrice) && buyPrice !== 0;
          const changePercent = hasValidBuyPrice
            ? ((priceInGBP - buyPrice) / buyPrice * 100).toFixed(2)
            : 0;

          return {
            stock,
            source,
            priceInGBP,
            parsedChangePercent: parseFloat(changePercent)
          };
        } catch (err) {
          return {
            stock,
            error: err
          };
        }
      })
    );

    for (const candidate of measurementCandidates) {
      if (candidate.error) {
        errors.push({
          ticker: candidate.stock.ticker,
          company: candidate.stock.company,
          error: candidate.error.message
        });
        continue;
      }

      try {
        await new Promise((resolve, reject) => {
          const sql = `UPDATE stocks SET measurePrice = ?, measureDate = ?, changePercent = ? WHERE id = ?`;
          const params = [candidate.priceInGBP, measuredDate, candidate.parsedChangePercent, candidate.stock.id];

          db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve();
          });
        });

        await new Promise((resolve, reject) => {
          const sql = `INSERT INTO stock_measurements (stock_id, measurePrice, measureDate, changePercent, source) VALUES (?, ?, ?, ?, ?)`;
          const params = [candidate.stock.id, candidate.priceInGBP, measuredDate, candidate.parsedChangePercent, candidate.source];

          db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve();
          });
        });

        successCount++;
        successfulChangePercents.push(candidate.parsedChangePercent);
        successfulChangesByStockId.set(candidate.stock.id, candidate.parsedChangePercent);
        results.push({
          id: candidate.stock.id,
          ticker: candidate.stock.ticker,
          company: candidate.stock.company,
          measurePrice: candidate.priceInGBP,
          changePercent: candidate.parsedChangePercent,
          source: candidate.source
        });
      } catch (err) {
        errors.push({
          ticker: candidate.stock.ticker,
          company: candidate.stock.company,
          error: err.message
        });
      }
    }

    if (successfulChangePercents.length > 0) {
      const averageChangePercent = parseFloat((
        successfulChangePercents.reduce((sum, value) => sum + value, 0) / successfulChangePercents.length
      ).toFixed(2));


      await new Promise((resolve, reject) => {
        const sql = `INSERT INTO average_change_history (measureDate, averageChangePercent, stockCount) VALUES (?, ?, ?)`;
        const params = [measuredDate, averageChangePercent, successfulChangePercents.length];

        db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      const strategyChangePercents = new Map();
      strategyStockLinks.forEach(({ strategyId, stockId }) => {
        if (!successfulChangesByStockId.has(stockId)) {
          return;
        }

        if (!strategyChangePercents.has(strategyId)) {
          strategyChangePercents.set(strategyId, []);
        }

        strategyChangePercents.get(strategyId).push(successfulChangesByStockId.get(stockId));
      });

      for (const [strategyId, changePercents] of strategyChangePercents.entries()) {
        if (changePercents.length === 0) {
          continue;
        }

        const strategyAverageChangePercent = parseFloat((
          changePercents.reduce((sum, value) => sum + value, 0) / changePercents.length
        ).toFixed(2));

        await new Promise((resolve, reject) => {
          const sql = `INSERT INTO strategy_average_change_history (strategy_id, measureDate, averageChangePercent, stockCount) VALUES (?, ?, ?, ?)`;
          const params = [strategyId, measuredDate, strategyAverageChangePercent, changePercents.length];

          db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve();
          });
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

