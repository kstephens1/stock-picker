import React, { useEffect, useMemo, useState } from 'react';
import MD5 from 'crypto-js/md5';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LOGIN_CONFIG } from './config/auth';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '');
const apiUrl = (path) => (API_BASE_URL ? `${API_BASE_URL}${path}` : path);
const AUTH_STORAGE_KEY = 'stockpicker.authenticated';

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

const getChangePercentClassName = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'text-muted fw-semibold';
  }

  const numericValue = Number(value);

  if (numericValue > 0) {
    return 'text-success fw-semibold';
  }

  if (numericValue < 0) {
    return 'text-danger fw-semibold';
  }

  return 'text-muted fw-semibold';
};

const formatChangePercentValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(2)}%` : '—';
};

const calculateAverageChangePercent = (stocks = []) => {
  const numericChangePercents = stocks
    .map((stock) => Number(stock.changePercent))
    .filter((value) => Number.isFinite(value));

  if (numericChangePercents.length === 0) {
    return null;
  }

  return numericChangePercents.reduce((sum, value) => sum + value, 0) / numericChangePercents.length;
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

const ProtectedRoute = ({ isAuthenticated, children }) => {
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

const LoginPage = ({ username, password, loginError, onUsernameChange, onPasswordChange, onSubmit }) => (
  <div className="row justify-content-center">
    <div className="col-md-6 col-lg-5">
      <div className="card">
        <div className="card-body">
          <h2 className="h4 mb-4">Log On</h2>
          <form onSubmit={onSubmit} data-testid="login-form">
            <div className="mb-3">
              <label className="form-label" htmlFor="login-username">Username</label>
              <input
                id="login-username"
                className="form-control"
                value={username}
                onChange={onUsernameChange}
                autoComplete="username"
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                className="form-control"
                value={password}
                onChange={onPasswordChange}
                autoComplete="current-password"
              />
            </div>
            {loginError && (
              <div className="alert alert-danger" role="alert" data-testid="login-error">
                {loginError}
              </div>
            )}
            <button className="btn btn-primary" type="submit">Log On</button>
          </form>
        </div>
      </div>
    </div>
  </div>
);

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => window.localStorage.getItem(AUTH_STORAGE_KEY) === 'true'
  );
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeGraphStock, setActiveGraphStock] = useState(null);
  const [activeGraphStrategy, setActiveGraphStrategy] = useState(null);
  const [graphHistory, setGraphHistory] = useState([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState('');
  const [hoveredGraphPoint, setHoveredGraphPoint] = useState(null);

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
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    loadInitialData();
  }, [isAuthenticated]);

  const handleLoginSubmit = (event) => {
    event.preventDefault();

    const normalizedUsername = loginUsername.trim();
    const hashedPassword = MD5(loginPassword).toString();

    const isValidLogin =
      normalizedUsername === LOGIN_CONFIG.username
      && hashedPassword === LOGIN_CONFIG.passwordMd5;

    if (!isValidLogin) {
      setLoginError('Invalid username or password.');
      return;
    }

    setLoginError('');
    setLoginUsername('');
    setLoginPassword('');
    setIsAuthenticated(true);
    window.localStorage.setItem(AUTH_STORAGE_KEY, 'true');

    const redirectPath = location.state?.from?.pathname || '/';
    navigate(redirectPath, { replace: true });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setLoginError('');
    clearMessages();
    navigate('/login', { replace: true });
  };

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

  const closeGraphModal = () => {
    setActiveGraphStock(null);
    setActiveGraphStrategy(null);
    setGraphHistory([]);
    setGraphError('');
    setGraphLoading(false);
    setHoveredGraphPoint(null);
  };

  const handleStockGraphOpen = async (stock) => {
    setActiveGraphStock(stock);
    setActiveGraphStrategy(null);
    setGraphHistory([]);
    setGraphError('');
    setGraphLoading(true);
    setHoveredGraphPoint(null);

    try {
      const history = await requestJson(apiUrl(`/api/stocks/${stock.id}/measurements`));
      setGraphHistory(Array.isArray(history) ? history : []);
    } catch (err) {
      setGraphError(err.message || 'Failed to load graph data.');
    } finally {
      setGraphLoading(false);
    }
  };

  const handleStrategyAverageGraphOpen = async (strategy) => {
    setActiveGraphStock(null);
    setActiveGraphStrategy(strategy);
    setGraphHistory([]);
    setGraphError('');
    setGraphLoading(true);
    setHoveredGraphPoint(null);

    try {
      const history = await requestJson(apiUrl(`/api/strategies/${strategy.id}/measurements/average-change`));
      const mappedHistory = Array.isArray(history)
        ? history.map((entry) => ({
          ...entry,
          changePercent: entry.averageChangePercent
        }))
        : [];
      setGraphHistory(mappedHistory);
    } catch (err) {
      setGraphError(err.message || 'Failed to load graph data.');
    } finally {
      setGraphLoading(false);
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

  const formatGraphTimeLabel = (timestamp) => {
    if (!Number.isFinite(timestamp)) {
      return '—';
    }

    return new Date(timestamp).toLocaleString();
  };

  const graphChartData = useMemo(() => {
    const parsedHistory = graphHistory
      .map((entry) => ({
        ...entry,
        changePercent: Number(entry.changePercent),
        timestamp: new Date(entry.createdAt || entry.measureDate).getTime()
      }))
      .filter((entry) => Number.isFinite(entry.changePercent) && Number.isFinite(entry.timestamp));

    const chartHistory = [...parsedHistory];
    if (activeGraphStock?.buyDate) {
      chartHistory.push({
        measureDate: activeGraphStock.buyDate,
        timestamp: new Date(activeGraphStock.buyDate).getTime(),
        changePercent: 0,
        isBuyBaseline: true
      });
    }

    chartHistory.sort((left, right) => left.timestamp - right.timestamp);

    if (chartHistory.length === 0) {
      return null;
    }

    const width = 1000;
    const height = 340;
    const paddingTop = 30;
    const paddingBottom = 30;
    const paddingLeft = 80;
    const paddingRight = 30;
    const values = chartHistory.map((entry) => entry.changePercent);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;
    const innerHeight = height - paddingTop - paddingBottom;
    const innerWidth = width - paddingLeft - paddingRight;
    const minTimestamp = Math.min(...chartHistory.map((entry) => entry.timestamp));
    const maxTimestamp = Math.max(...chartHistory.map((entry) => entry.timestamp));
    const timestampRange = maxTimestamp - minTimestamp || 1;

    const points = chartHistory.map((entry) => {
      const x = paddingLeft + ((entry.timestamp - minTimestamp) / timestampRange) * innerWidth;
      const y = paddingTop + (1 - ((entry.changePercent - minValue) / range)) * innerHeight;

      return {
        x,
        y,
        measureDate: entry.measureDate,
        timestamp: entry.timestamp,
        timeLabel: formatGraphTimeLabel(entry.timestamp),
        changePercent: entry.changePercent,
        isBuyBaseline: Boolean(entry.isBuyBaseline)
      };
    });

    return {
      width,
      height,
      paddingTop,
      paddingBottom,
      paddingLeft,
      paddingRight,
      points,
      polylinePoints: points.map((point) => `${point.x},${point.y}`).join(' '),
      firstDate: formatGraphTimeLabel(minTimestamp),
      lastDate: formatGraphTimeLabel(maxTimestamp),
      minChangePercent: minValue,
      maxChangePercent: maxValue,
      midChangePercent: (minValue + maxValue) / 2
    };
  }, [activeGraphStock, graphHistory]);

  const activeGraphChangePercent = useMemo(() => {
    if (activeGraphStock) {
      const parsed = Number(activeGraphStock.changePercent);
      return Number.isFinite(parsed) ? parsed : null;
    }

    if (activeGraphStrategy) {
      const numericHistory = graphHistory
        .map((entry) => Number(entry.changePercent))
        .filter((value) => Number.isFinite(value));

      return numericHistory.length > 0 ? numericHistory[numericHistory.length - 1] : null;
    }

    return null;
  }, [activeGraphStock, activeGraphStrategy, graphHistory]);

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

      {strategyRows.map((strategy) => {
          const averageChangePercent = calculateAverageChangePercent(strategy.stocks);

          return (
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
                    <th>% Change</th>
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
                      <td className={getChangePercentClassName(stock.changePercent)}>
                        {formatChangePercentValue(stock.changePercent)}
                      </td>
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
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            type="button"
                            data-testid={`show-stock-graph-${strategy.id}-${stock.id}`}
                            aria-label={`Show graph for ${stock.company}`}
                            onClick={() => handleStockGraphOpen(stock)}
                          >
                            📈
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
                  <tr data-testid={`strategy-average-row-${strategy.id}`}>
                    <td className="fw-semibold">Average</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td
                      className={getChangePercentClassName(averageChangePercent)}
                      data-testid={`strategy-average-change-percent-${strategy.id}`}
                    >
                      {formatChangePercentValue(averageChangePercent)}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        type="button"
                        data-testid={`show-strategy-average-graph-${strategy.id}`}
                        aria-label={`Show average graph for strategy ${strategy.id}`}
                        onClick={() => handleStrategyAverageGraphOpen(strategy)}
                      >
                        📈
                      </button>
                    </td>
                  </tr>
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
          );
      })}

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
      {isAuthenticated && (
        <div className="d-flex gap-2 mb-4">
          <Link className="btn btn-outline-secondary btn-sm" to="/">Home</Link>
          <Link className="btn btn-outline-secondary btn-sm" to="/strategies">Manage Strategies</Link>
          <button
            className="btn btn-outline-danger btn-sm ms-auto"
            type="button"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      )}

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
            <Route
              path="/"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  {renderHomePage()}
                </ProtectedRoute>
              )}
            />
            <Route
              path="/strategies"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  {renderStrategiesPage()}
                </ProtectedRoute>
              )}
            />
            <Route
              path="/login"
              element={isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <LoginPage
                  username={loginUsername}
                  password={loginPassword}
                  loginError={loginError}
                  onUsernameChange={(event) => setLoginUsername(event.target.value)}
                  onPasswordChange={(event) => setLoginPassword(event.target.value)}
                  onSubmit={handleLoginSubmit}
                />
              )}
            />
            <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
          </Routes>

          {(activeGraphStock || activeGraphStrategy) && (
            <div
              className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1050 }}
              data-testid="stock-graph-modal-overlay"
            >
              <div
                className="bg-white rounded shadow d-flex flex-column p-3"
                style={{ width: '70vw', height: '70vh' }}
                data-testid="stock-graph-modal"
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h3 className="h5 mb-1">
                      {activeGraphStock
                        ? `${activeGraphStock.company} (${activeGraphStock.ticker})`
                        : `${activeGraphStrategy.strategy} (Average)`}
                      {activeGraphChangePercent !== null && (
                        <span
                          className={`ms-2 fs-6 fw-semibold ${
                            activeGraphChangePercent > 0
                              ? 'text-success'
                              : activeGraphChangePercent < 0
                                ? 'text-danger'
                                : 'text-muted'
                          }`}
                        >
                          {`${activeGraphChangePercent > 0 ? '+' : ''}${activeGraphChangePercent.toFixed(2)}%`}
                        </span>
                      )}
                    </h3>
                    <div className="text-muted small">
                      {activeGraphStock ? 'Stock growth over time' : 'Average growth over time'}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    type="button"
                    onClick={closeGraphModal}
                    data-testid="close-stock-graph-modal"
                    aria-label="Close graph popup"
                  >
                    ✕
                  </button>
                </div>

                {graphLoading && (
                  <div className="d-flex flex-grow-1 align-items-center justify-content-center">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                )}

                {!graphLoading && graphError && (
                  <div className="alert alert-danger mb-0" role="alert" data-testid="stock-graph-error">
                    {graphError}
                  </div>
                )}

                {!graphLoading && !graphError && !graphChartData && (
                  <div className="text-muted d-flex flex-grow-1 align-items-center justify-content-center">
                    No measurement history available.
                  </div>
                )}

                {!graphLoading && !graphError && graphChartData && (
                  <div className="d-flex flex-column flex-grow-1 border rounded p-3">
                    <div className="small text-muted mb-2">Change %</div>
                    <div className="flex-grow-1">
                      <svg
                        viewBox="0 0 1000 340"
                        className="w-100 h-100"
                        preserveAspectRatio="none"
                        data-testid="stock-growth-graph"
                        onClick={() => setHoveredGraphPoint(null)}
                      >
                        <line
                          x1={graphChartData.paddingLeft}
                          y1={graphChartData.paddingTop}
                          x2={graphChartData.paddingLeft}
                          y2={graphChartData.height - graphChartData.paddingBottom}
                          stroke="#6c757d"
                          strokeWidth="1"
                        />
                        <line
                          x1={graphChartData.paddingLeft}
                          y1={graphChartData.paddingTop}
                          x2={graphChartData.width - graphChartData.paddingRight}
                          y2={graphChartData.paddingTop}
                          stroke="#e9ecef"
                          strokeWidth="1"
                        />
                        <line
                          x1={graphChartData.paddingLeft}
                          y1={(graphChartData.paddingTop + (graphChartData.height - graphChartData.paddingBottom)) / 2}
                          x2={graphChartData.width - graphChartData.paddingRight}
                          y2={(graphChartData.paddingTop + (graphChartData.height - graphChartData.paddingBottom)) / 2}
                          stroke="#e9ecef"
                          strokeWidth="1"
                        />
                        <line
                          x1={graphChartData.paddingLeft}
                          y1={graphChartData.height - graphChartData.paddingBottom}
                          x2={graphChartData.width - graphChartData.paddingRight}
                          y2={graphChartData.height - graphChartData.paddingBottom}
                          stroke="#e9ecef"
                          strokeWidth="1"
                        />
                        <text x={12} y={graphChartData.paddingTop + 4} fontSize="14" fill="#6c757d">
                          {`${graphChartData.maxChangePercent.toFixed(2)}%`}
                        </text>
                        <text
                          x={12}
                          y={(graphChartData.paddingTop + (graphChartData.height - graphChartData.paddingBottom)) / 2 + 4}
                          fontSize="14"
                          fill="#6c757d"
                        >
                          {`${graphChartData.midChangePercent.toFixed(2)}%`}
                        </text>
                        <text x={12} y={graphChartData.height - graphChartData.paddingBottom + 4} fontSize="14" fill="#6c757d">
                          {`${graphChartData.minChangePercent.toFixed(2)}%`}
                        </text>
                        <polyline
                          fill="none"
                          stroke="#0d6efd"
                          strokeWidth="3"
                          points={graphChartData.polylinePoints}
                        />
                        {graphChartData.points.map((point) => (
                          <circle
                            key={`${point.measureDate}-${point.x}`}
                            cx={point.x}
                            cy={point.y}
                            r="5"
                            fill="#0d6efd"
                            onMouseEnter={() => setHoveredGraphPoint(point)}
                            onMouseLeave={() => setHoveredGraphPoint(null)}
                            onTouchStart={(event) => {
                              event.preventDefault();
                              setHoveredGraphPoint(point);
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              setHoveredGraphPoint((prev) => {
                                if (!prev) return point;
                                return prev.measureDate === point.measureDate && prev.x === point.x ? null : point;
                              });
                            }}
                          />
                        ))}
                        {hoveredGraphPoint && (
                          <g style={{ pointerEvents: 'none' }}>
                            <rect
                              x={Math.min(Math.max(hoveredGraphPoint.x - 90, graphChartData.paddingLeft), graphChartData.width - 190)}
                              y={Math.max(hoveredGraphPoint.y - 58, graphChartData.paddingTop)}
                              width="180"
                              height="46"
                              rx="6"
                              fill="#212529"
                              opacity="0.9"
                            />
                            <text
                              x={Math.min(Math.max(hoveredGraphPoint.x, graphChartData.paddingLeft + 90), graphChartData.width - 100)}
                              y={Math.max(hoveredGraphPoint.y - 38, graphChartData.paddingTop + 16)}
                              textAnchor="middle"
                              fontSize="12"
                              fill="#ffffff"
                            >
                              {hoveredGraphPoint.timeLabel}
                            </text>
                            <text
                              x={Math.min(Math.max(hoveredGraphPoint.x, graphChartData.paddingLeft + 90), graphChartData.width - 100)}
                              y={Math.max(hoveredGraphPoint.y - 20, graphChartData.paddingTop + 34)}
                              textAnchor="middle"
                              fontSize="12"
                              fill="#ffffff"
                            >
                              {hoveredGraphPoint.isBuyBaseline
                                ? 'Buy baseline: 0.00%'
                                : `Change: ${hoveredGraphPoint.changePercent.toFixed(2)}%`}
                            </text>
                          </g>
                        )}
                      </svg>
                    </div>
                    <div className="d-flex justify-content-between small text-muted mt-2">
                      <span>{graphChartData.firstDate}</span>
                      <span>{graphChartData.lastDate}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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
