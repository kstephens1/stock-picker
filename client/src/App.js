import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '');
const apiUrl = (path) => (API_BASE_URL ? `${API_BASE_URL}${path}` : path);

const initialStockForm = {
  sector: '',
  company: '',
  ticker: '',
  price: '',
  criteria: '',
  buyPrice: '',
  buyDate: '',
  measurePrice: '',
  measureDate: '',
  changePercent: ''
};

const initialStrategyForm = { strategy: '' };

const isValidDateString = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

const parseNumber = (value) => Number(value);

const validateStockForm = (form) => {
  const errors = {};
  const textFields = ['sector', 'company', 'ticker', 'criteria'];
  const numberFields = ['price', 'buyPrice', 'measurePrice', 'changePercent'];
  const dateFields = ['buyDate', 'measureDate'];

  textFields.forEach((field) => {
    if (!form[field].trim()) {
      errors[field] = 'This field is required.';
    }
  });

  numberFields.forEach((field) => {
    if (form[field] === '') {
      errors[field] = 'This field is required.';
      return;
    }
    if (!Number.isFinite(parseNumber(form[field]))) {
      errors[field] = 'Must be a valid number.';
    }
  });

  dateFields.forEach((field) => {
    if (!form[field]) {
      errors[field] = 'This field is required.';
      return;
    }
    if (!isValidDateString(form[field])) {
      errors[field] = 'Must be a valid date (YYYY-MM-DD).';
    }
  });

  return errors;
};

const validateStrategyForm = (form) => {
  const errors = {};

  if (!form.strategy.trim()) {
    errors.strategy = 'Strategy text is required.';
  }

  return errors;
};

const StockFormFields = ({ stockForm, setStockForm, stockErrors }) => {
  const renderFieldError = (errors, field) => (
    errors[field] ? <div className="text-danger small">{errors[field]}</div> : null
  );

  return (
    <div className="row g-3">
      <div className="col-md-6">
        <label className="form-label" htmlFor="stock-sector">Sector</label>
        <input
          id="stock-sector"
          className="form-control"
          value={stockForm.sector}
          onChange={(event) => setStockForm((prev) => ({ ...prev, sector: event.target.value }))}
        />
        {renderFieldError(stockErrors, 'sector')}
      </div>
      <div className="col-md-6">
        <label className="form-label" htmlFor="stock-company">Company</label>
        <input
          id="stock-company"
          className="form-control"
          value={stockForm.company}
          onChange={(event) => setStockForm((prev) => ({ ...prev, company: event.target.value }))}
        />
        {renderFieldError(stockErrors, 'company')}
      </div>
      <div className="col-md-4">
        <label className="form-label" htmlFor="stock-ticker">Ticker</label>
        <input
          id="stock-ticker"
          className="form-control"
          value={stockForm.ticker}
          onChange={(event) => setStockForm((prev) => ({ ...prev, ticker: event.target.value }))}
        />
        {renderFieldError(stockErrors, 'ticker')}
      </div>
      <div className="col-md-4">
        <label className="form-label" htmlFor="stock-price">Price</label>
        <input
          id="stock-price"
          data-testid="stock-price-input"
          type="number"
          step="any"
          className="form-control"
          value={stockForm.price}
          onChange={(event) => setStockForm((prev) => ({ ...prev, price: event.target.value }))}
        />
        {renderFieldError(stockErrors, 'price')}
      </div>
      <div className="col-md-4">
        <label className="form-label" htmlFor="stock-buy-price">Buy Price</label>
        <input
          id="stock-buy-price"
          type="number"
          step="any"
          className="form-control"
          value={stockForm.buyPrice}
          onChange={(event) => setStockForm((prev) => ({ ...prev, buyPrice: event.target.value }))}
        />
        {renderFieldError(stockErrors, 'buyPrice')}
      </div>
      <div className="col-md-6">
        <label className="form-label" htmlFor="stock-buy-date">Buy Date</label>
        <input
          id="stock-buy-date"
          type="date"
          className="form-control"
          value={stockForm.buyDate}
          onChange={(event) => setStockForm((prev) => ({ ...prev, buyDate: event.target.value }))}
        />
        {renderFieldError(stockErrors, 'buyDate')}
      </div>
      <div className="col-md-6">
        <label className="form-label" htmlFor="stock-measure-price">Measure Price</label>
        <input
          id="stock-measure-price"
          type="number"
          step="any"
          className="form-control"
          value={stockForm.measurePrice}
          onChange={(event) => setStockForm((prev) => ({ ...prev, measurePrice: event.target.value }))}
        />
        {renderFieldError(stockErrors, 'measurePrice')}
      </div>
      <div className="col-md-6">
        <label className="form-label" htmlFor="stock-measure-date">Measure Date</label>
        <input
          id="stock-measure-date"
          type="date"
          className="form-control"
          value={stockForm.measureDate}
          onChange={(event) => setStockForm((prev) => ({ ...prev, measureDate: event.target.value }))}
        />
        {renderFieldError(stockErrors, 'measureDate')}
      </div>
      <div className="col-md-6">
        <label className="form-label" htmlFor="stock-change-percent">Change Percent</label>
        <input
          id="stock-change-percent"
          type="number"
          step="any"
          className="form-control"
          value={stockForm.changePercent}
          onChange={(event) => setStockForm((prev) => ({ ...prev, changePercent: event.target.value }))}
        />
        {renderFieldError(stockErrors, 'changePercent')}
      </div>
      <div className="col-12">
        <label className="form-label" htmlFor="stock-criteria">Criteria</label>
        <textarea
          id="stock-criteria"
          className="form-control"
          rows={2}
          value={stockForm.criteria}
          onChange={(event) => setStockForm((prev) => ({ ...prev, criteria: event.target.value }))}
        />
        {renderFieldError(stockErrors, 'criteria')}
      </div>
    </div>
  );
};

function AppContent() {
  const [strategies, setStrategies] = useState([]);
  const [strategyStocks, setStrategyStocks] = useState({});
  const [stockForm, setStockForm] = useState(initialStockForm);
  const [strategyForm, setStrategyForm] = useState(initialStrategyForm);
  const [activeStockFormStrategyId, setActiveStockFormStrategyId] = useState(null);
  const [editingStockId, setEditingStockId] = useState(null);
  const [editingStrategyId, setEditingStrategyId] = useState(null);
  const [stockErrors, setStockErrors] = useState({});
  const [strategyErrors, setStrategyErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [measuring, setMeasuring] = useState(false);

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    let data = null;
    try {
      data = await response.json();
    } catch (_ignored) {
      data = null;
    }

    if (!response.ok) {
      throw new Error(data?.error || 'Request failed');
    }

    return data;
  };

  const fetchStrategies = async () => {
    const data = await requestJson(apiUrl('/api/strategies'));
    setStrategies(data);
    return data;
  };

  const fetchStocksForStrategy = async (strategyId) => {
    const data = await requestJson(apiUrl(`/api/strategies/${strategyId}/stocks`));
    setStrategyStocks((prev) => ({ ...prev, [strategyId]: data }));
  };

  const fetchAllStrategyStocks = async (strategiesToLoad = strategies) => {
    const pairs = await Promise.all(
      strategiesToLoad.map(async (strategy) => {
        const stocks = await requestJson(apiUrl(`/api/strategies/${strategy.id}/stocks`));
        return [strategy.id, stocks];
      })
    );
    setStrategyStocks(Object.fromEntries(pairs));
  };

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const loadedStrategies = await fetchStrategies();
      await fetchAllStrategyStocks(loadedStrategies);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const clearMessages = () => {
    setError(null);
    setSuccessMessage('');
  };

  const buildStockPayload = () => ({
    sector: stockForm.sector.trim(),
    company: stockForm.company.trim(),
    ticker: stockForm.ticker.trim(),
    price: parseNumber(stockForm.price),
    criteria: stockForm.criteria.trim(),
    buyPrice: parseNumber(stockForm.buyPrice),
    buyDate: stockForm.buyDate,
    measurePrice: parseNumber(stockForm.measurePrice),
    measureDate: stockForm.measureDate,
    changePercent: parseNumber(stockForm.changePercent)
  });

  const resetStockForm = () => {
    setActiveStockFormStrategyId(null);
    setEditingStockId(null);
    setStockForm(initialStockForm);
    setStockErrors({});
  };

  const handleStockSubmit = async (event, strategyId) => {
    event.preventDefault();
    clearMessages();

    const validationErrors = validateStockForm(stockForm);
    setStockErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const payload = buildStockPayload();

    try {
      if (editingStockId) {
        await requestJson(apiUrl(`/api/stocks/${editingStockId}`), {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setSuccessMessage('Updated stock successfully.');
        await fetchAllStrategyStocks();
      } else {
        await requestJson(apiUrl(`/api/strategies/${strategyId}/stocks`), {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setSuccessMessage('Created stock successfully.');
        await fetchStocksForStrategy(strategyId);
      }

      resetStockForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStockEdit = (strategyId, stock) => {
    clearMessages();
    setActiveStockFormStrategyId(strategyId);
    setEditingStockId(stock.id);
    setStockErrors({});
    setStockForm({
      sector: stock.sector || '',
      company: stock.company || '',
      ticker: stock.ticker || '',
      price: stock.price?.toString() || '',
      criteria: stock.criteria || '',
      buyPrice: stock.buyPrice?.toString() || '',
      buyDate: stock.buyDate || '',
      measurePrice: stock.measurePrice?.toString() || '',
      measureDate: stock.measureDate || '',
      changePercent: stock.changePercent?.toString() || ''
    });
  };

  const openCreateStockForm = (strategyId) => {
    clearMessages();
    setActiveStockFormStrategyId(strategyId);
    setEditingStockId(null);
    setStockForm(initialStockForm);
    setStockErrors({});
  };

  const handleStockRemoveFromStrategy = async (strategyId, stockId) => {
    clearMessages();

    try {
      await requestJson(apiUrl(`/api/strategies/${strategyId}/stocks/${stockId}`), { method: 'DELETE' });
      if (editingStockId === stockId && activeStockFormStrategyId === strategyId) {
        resetStockForm();
      }
      await fetchStocksForStrategy(strategyId);
      setSuccessMessage('Removed stock from strategy successfully.');
    } catch (err) {
      setError(err.message);
    }
  };

  const resetStrategyForm = () => {
    setEditingStrategyId(null);
    setStrategyForm(initialStrategyForm);
    setStrategyErrors({});
  };

  const handleStrategySubmit = async (event) => {
    event.preventDefault();
    clearMessages();

    const validationErrors = validateStrategyForm(strategyForm);
    setStrategyErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const payload = {
      strategy: strategyForm.strategy.trim()
    };

    try {
      if (editingStrategyId) {
        await requestJson(apiUrl(`/api/strategies/${editingStrategyId}`), {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setSuccessMessage('Updated strategy successfully.');
      } else {
        await requestJson(apiUrl('/api/strategies'), {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setSuccessMessage('Created strategy successfully.');
      }

      await fetchStrategies();
      resetStrategyForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStrategyEdit = (strategy) => {
    clearMessages();
    setEditingStrategyId(strategy.id);
    setStrategyErrors({});
    setStrategyForm({
      strategy: strategy.strategy || ''
    });
  };

  const handleStrategyDelete = async (id) => {
    clearMessages();

    try {
      await requestJson(apiUrl(`/api/strategies/${id}`), { method: 'DELETE' });
      if (editingStrategyId === id) {
        resetStrategyForm();
      }
      const loadedStrategies = await fetchStrategies();
      await fetchAllStrategyStocks(loadedStrategies);
      setSuccessMessage('Deleted strategy successfully.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMeasureNow = async () => {
    clearMessages();
    setMeasuring(true);

    try {
      const data = await requestJson(apiUrl('/api/stocks/measure'), {
        method: 'POST'
      });

      // Refresh all stock data to show updated prices
      await fetchAllStrategyStocks();

      if (data.errors && data.errors.length > 0) {
        const failedTickers = data.errors
          .filter(e => e && e.ticker)
          .map(e => e.ticker)
          .join(', ');
        setError(`${data.message}. Some stocks failed: ${failedTickers || 'unknown'}`);
      } else {
        setSuccessMessage(data.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setMeasuring(false);
    }
  };

  const strategyRows = useMemo(
    () => strategies.map((strategy) => ({
      ...strategy,
      stocks: strategyStocks[strategy.id] || []
    })),
    [strategies, strategyStocks]
  );

  const renderFieldError = (errors, field) => (
    errors[field] ? <div className="text-danger small">{errors[field]}</div> : null
  );

  const renderHomePage = () => (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h4 mb-0">Strategies</h2>
        <button
          className="btn btn-success"
          type="button"
          onClick={handleMeasureNow}
          disabled={measuring}
          data-testid="measure-now-button"
        >
          {measuring ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Measuring...
            </>
          ) : (
            'Measure Now'
          )}
        </button>
      </div>

      {strategyRows.map((strategy) => (
        <div className="card mb-4" key={strategy.id} data-testid={`strategy-table-${strategy.id}`}>
          <div className="card-body">
            <h3 className="h5 mb-3">{strategy.strategy}</h3>

            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Ticker</th>
                    <th>Price</th>
                    <th>Buy Price</th>
                    <th>Buy Date</th>
                    <th>Measure Price</th>
                    <th>Measure Date</th>
                    <th>Change %</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {strategy.stocks.map((stock) => (
                    <tr key={`${strategy.id}-${stock.id}`} data-testid={`strategy-stock-row-${strategy.id}-${stock.id}`}>
                      <td>{stock.company}</td>
                      <td>{stock.ticker}</td>
                      <td>{stock.price}</td>
                      <td>{stock.buyPrice}</td>
                      <td>{stock.buyDate}</td>
                      <td>{stock.measurePrice}</td>
                      <td>{stock.measureDate}</td>
                      <td>{stock.changePercent}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            type="button"
                            data-testid={`edit-strategy-stock-${strategy.id}-${stock.id}`}
                            onClick={() => handleStockEdit(strategy.id, stock)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            type="button"
                            data-testid={`delete-strategy-stock-${strategy.id}-${stock.id}`}
                            onClick={() => handleStockRemoveFromStrategy(strategy.id, stock.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {strategy.stocks.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-muted text-center py-3">No stocks in this strategy yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {activeStockFormStrategyId === strategy.id ? (
              <form
                onSubmit={(event) => handleStockSubmit(event, strategy.id)}
                data-testid={`strategy-stock-form-${strategy.id}`}
              >
                <StockFormFields
                  stockForm={stockForm}
                  setStockForm={setStockForm}
                  stockErrors={stockErrors}
                />
                <div className="d-flex gap-2 mt-3">
                  <button className="btn btn-primary" type="submit">
                    {editingStockId ? 'Update Stock' : 'Create Stock'}
                  </button>
                  <button className="btn btn-outline-secondary" type="button" onClick={resetStockForm}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                className="btn btn-primary"
                type="button"
                data-testid={`show-create-stock-form-${strategy.id}`}
                onClick={() => openCreateStockForm(strategy.id)}
              >
                Add New Stock
              </button>
            )}
          </div>
        </div>
      ))}

      {strategyRows.length === 0 && <div className="text-muted">No strategies yet.</div>}
    </>
  );

  const renderStrategiesPage = () => (
    <>
      <h2 className="h4 mb-4">Manage Strategies</h2>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleStrategySubmit} data-testid="strategy-form">
            <div className="mb-3">
              <label className="form-label" htmlFor="strategy-text">Strategy</label>
              <textarea
                id="strategy-text"
                data-testid="strategy-text-input"
                className="form-control"
                rows={3}
                value={strategyForm.strategy}
                onChange={(event) => setStrategyForm((prev) => ({ ...prev, strategy: event.target.value }))}
              />
              {renderFieldError(strategyErrors, 'strategy')}
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-primary" type="submit">
                {editingStrategyId ? 'Update Strategy' : 'Create Strategy'}
              </button>
              {editingStrategyId && (
                <button className="btn btn-outline-secondary" type="button" onClick={resetStrategyForm}>
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <ul className="list-group mt-4">
            {strategies.map((strategy) => (
              <li
                className="list-group-item d-flex justify-content-between align-items-start gap-3"
                key={strategy.id}
                data-testid={`strategy-row-${strategy.id}`}
              >
                <span>{strategy.strategy}</span>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    type="button"
                    data-testid={`edit-strategy-${strategy.id}`}
                    onClick={() => handleStrategyEdit(strategy)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    type="button"
                    data-testid={`delete-strategy-${strategy.id}`}
                    onClick={() => handleStrategyDelete(strategy.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
            {strategies.length === 0 && (
              <li className="list-group-item text-muted text-center">No strategies yet.</li>
            )}
          </ul>
        </div>
      </div>
    </>
  );

  return (
    <div className="container py-4">
      <h1 className="mb-2">StockPicker</h1>
      <div className="d-flex gap-2 mb-4">
        <Link className="btn btn-outline-secondary btn-sm" to="/">Home</Link>
        <Link className="btn btn-outline-secondary btn-sm" to="/strategies">Manage Strategies</Link>
      </div>

      {loading && (
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      )}

      {!loading && (
        <>
          {error && (
            <div className="alert alert-danger" role="alert" aria-live="assertive" data-testid="global-error">
              Error: {error}
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success" role="status" aria-live="polite">
              {successMessage}
            </div>
          )}

          <Routes>
            <Route path="/" element={renderHomePage()} />
            <Route path="/strategies" element={renderStrategiesPage()} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
