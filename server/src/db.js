const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = process.env.STOCKPICKER_DB_PATH
  ? path.resolve(process.env.STOCKPICKER_DB_PATH)
  : path.resolve(__dirname, 'stocks.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new sqlite3.Database(dbPath);

const initDb = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS stocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sector TEXT,
        company TEXT,
        ticker TEXT,
        price REAL,
        criteria TEXT,
        buyPrice REAL,
        buyDate TEXT,
        measurePrice REAL,
        measureDate TEXT,
        changePercent REAL
      )`, (err) => {
        if (err) return reject(err);
      });

      db.run(`CREATE TABLE IF NOT EXISTS strategies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategy TEXT
      )`, (err) => {
        if (err) return reject(err);
      });

      db.run(`CREATE TABLE IF NOT EXISTS strategy_stocks (
        strategy_id INTEGER,
        stock_id INTEGER,
        FOREIGN KEY (strategy_id) REFERENCES strategies (id),
        FOREIGN KEY (stock_id) REFERENCES stocks (id),
        PRIMARY KEY (strategy_id, stock_id)
      )`, (err) => {
        if (err) return reject(err);
      });

      db.run(`CREATE TABLE IF NOT EXISTS stock_measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stock_id INTEGER NOT NULL,
        measurePrice REAL,
        measureDate TEXT,
        changePercent REAL,
        source TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (stock_id) REFERENCES stocks (id)
      )`, (err) => {
        if (err) return reject(err);
      });

      db.run(`CREATE TABLE IF NOT EXISTS average_change_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        measureDate TEXT NOT NULL,
        averageChangePercent REAL NOT NULL,
        stockCount INTEGER NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) return reject(err);
      });

      db.run(`CREATE TABLE IF NOT EXISTS strategy_average_change_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategy_id INTEGER NOT NULL,
        measureDate TEXT NOT NULL,
        averageChangePercent REAL NOT NULL,
        stockCount INTEGER NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (strategy_id) REFERENCES strategies (id)
      )`, (err) => {
        if (err) return reject(err);
      });

      // Check if data exists
      db.get("SELECT COUNT(*) as count FROM stocks", (err, row) => {
        if (err) return reject(err);
        
        if (row.count === 0) {
          console.log("Seeding database...");
          const stocksData = [
            ['Technology', 'Computacenter', 'CCC', 30.98, 'Momentum, Upgrades, Cash Flow', 30.98, '2026-02-10', 30.21, '2026-02-11', -2.49],
            ['Technology', 'Kainos Group', 'KNOS', 7.74, 'Upgrades, Cash Flow, Under Fair Value', 7.74, '2026-02-10', 7.24, '2026-02-11', -6.46],
            ['Aerospace', 'BAE Systems', 'BA.', 19.14, 'Momentum, EPS Surprise, Wide Moat', 19.14, '2026-02-10', 19.20, '2026-02-11', 0.31],
            ['Aerospace', 'Rolls-Royce', 'RR.', 12.44, 'Momentum, Upgrades, EPS Surprise', 12.44, '2026-02-10', 12.48, '2026-02-11', 0.32],
            ['Defense', 'QinetiQ Group', 'QQ.', 4.95, 'Under Fair Value, Cash Flow, EPS Surprise', 4.95, '2026-02-10', 4.82, '2026-02-11', -2.63],
            ['Discretionary', 'Greggs', 'GRG', 16.46, 'Under Fair Value, Upgrades, Momentum', 16.46, '2026-02-10', 16.07, '2026-02-11', -2.37],
            ['Discretionary', 'Victorian Plumbing', 'VIC', 0.86, 'Under Fair Value, Upgrades, Market Share', 0.86, '2026-02-10', 0.87, '2026-02-11', 1.16],
            ['Staples', 'Tesco', 'TSCO', 4.57, 'Momentum, Under Fair Value, Market Share', 4.57, '2026-02-10', 4.72, '2026-02-11', 3.28],
            ['Financials', 'Legal & General', 'LGEN', 2.65, 'Cash Flow, Upgrades, Momentum', 2.65, '2026-02-10', 2.67, '2026-02-11', 0.75],
            ['Financials', 'M&G', 'MNG', 3.10, 'Under Fair Value, Cash Flow, Upgrades', 3.10, '2026-02-10', 3.10, '2026-02-11', 0.00]
          ];

          const stockStmt = db.prepare(`INSERT INTO stocks (sector, company, ticker, price, criteria, buyPrice, buyDate, measurePrice, measureDate, changePercent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
          stocksData.forEach(stock => stockStmt.run(stock));
          stockStmt.finalize();

          const exampleStrategy = "Create a diversified short-term portfolio of 8-10 UK stocks across different sectors, each meeting at least 3 of these criteria: trading below fair value estimates, positive earnings surprises, strong cash flow, recent analyst upgrades, and momentum indicators showing upward trends.";
          db.run(`INSERT INTO strategies (strategy) VALUES (?)`, [exampleStrategy], function(err) {
            if (err) return reject(err);
            const strategyId = this.lastID;
            
            // Link all seeded stocks to this strategy
            db.all("SELECT id FROM stocks", (err, rows) => {
              if (err) return reject(err);
              const linkStmt = db.prepare(`INSERT INTO strategy_stocks (strategy_id, stock_id) VALUES (?, ?)`);
              rows.forEach(row => linkStmt.run([strategyId, row.id]));
              linkStmt.finalize((err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          });
        } else {
          resolve();
        }
      });
    });
  });
};

module.exports = { db, initDb };
