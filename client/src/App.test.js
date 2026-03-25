import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import App from './App';

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body
});

const createMockApi = () => {
  let stocks = [
    {
      id: 1,
      sector: 'Technology',
      company: 'Seed Tech',
      ticker: 'SEED',
      price: 10.5,
      criteria: 'Momentum',
      buyPrice: 10.2,
      buyDate: '2026-02-10',
      measurePrice: 10.8,
      measureDate: '2026-02-11',
      changePercent: 2.9
    }
  ];

  let strategies = [{ id: 1, strategy: 'Seed strategy' }];
  let strategyStocks = { 1: [1] };
  let nextStockId = 2;
  let nextStrategyId = 2;

  return jest.fn(async (url, options = {}) => {
    const path = typeof url === 'string' ? url : url.toString();
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : null;

    if (path === '/api/strategies' && method === 'GET') {
      return jsonResponse(200, strategies);
    }

    if (path === '/api/strategies' && method === 'POST') {
      const strategy = { id: nextStrategyId++, strategy: body.strategy };
      strategies = [...strategies, strategy];
      strategyStocks[strategy.id] = [];
      return jsonResponse(201, strategy);
    }

    const strategyMatch = path.match(/^\/api\/strategies\/(\d+)$/);
    if (strategyMatch && method === 'PUT') {
      const id = Number(strategyMatch[1]);
      const existing = strategies.find((strategy) => strategy.id === id);
      if (!existing) return jsonResponse(404, { error: 'Strategy not found' });
      strategies = strategies.map((strategy) => (
        strategy.id === id ? { ...strategy, strategy: body.strategy } : strategy
      ));
      return jsonResponse(200, { id, strategy: body.strategy });
    }

    if (strategyMatch && method === 'DELETE') {
      const id = Number(strategyMatch[1]);
      const exists = strategies.some((strategy) => strategy.id === id);
      if (!exists) return jsonResponse(404, { error: 'Strategy not found' });
      strategies = strategies.filter((strategy) => strategy.id !== id);
      delete strategyStocks[id];
      return jsonResponse(200, { message: 'Strategy deleted', id });
    }

    const strategyStocksMatch = path.match(/^\/api\/strategies\/(\d+)\/stocks$/);
    if (strategyStocksMatch && method === 'GET') {
      const strategyId = Number(strategyStocksMatch[1]);
      const linkedIds = strategyStocks[strategyId] || [];
      return jsonResponse(200, stocks.filter((stock) => linkedIds.includes(stock.id)));
    }

    const strategyAverageMeasurementsMatch = path.match(/^\/api\/strategies\/(\d+)\/measurements\/average-change$/);
    if (strategyAverageMeasurementsMatch && method === 'GET') {
      const strategyId = Number(strategyAverageMeasurementsMatch[1]);
      if (!strategies.some((strategy) => strategy.id === strategyId)) {
        return jsonResponse(404, { error: 'Strategy not found' });
      }

      return jsonResponse(200, [
        {
          id: 1,
          strategyId,
          measureDate: '2026-02-10',
          averageChangePercent: -1.1,
          stockCount: 1,
          createdAt: '2026-02-10T12:00:00.000Z'
        },
        {
          id: 2,
          strategyId,
          measureDate: '2026-02-11',
          averageChangePercent: 2.9,
          stockCount: 1,
          createdAt: '2026-02-11T12:00:00.000Z'
        }
      ]);
    }

    if (strategyStocksMatch && method === 'POST') {
      const strategyId = Number(strategyStocksMatch[1]);
      const stock = { id: nextStockId++, ...body };
      stocks = [...stocks, stock];
      strategyStocks[strategyId] = [...(strategyStocks[strategyId] || []), stock.id];
      return jsonResponse(201, stock);
    }

    const strategyStockLinkMatch = path.match(/^\/api\/strategies\/(\d+)\/stocks\/(\d+)$/);
    if (strategyStockLinkMatch && method === 'DELETE') {
      const strategyId = Number(strategyStockLinkMatch[1]);
      const stockId = Number(strategyStockLinkMatch[2]);
      const existingLinks = strategyStocks[strategyId] || [];
      if (!existingLinks.includes(stockId)) {
        return jsonResponse(404, { error: 'Stock link not found' });
      }
      strategyStocks[strategyId] = existingLinks.filter((id) => id !== stockId);
      return jsonResponse(200, { message: 'Stock removed from strategy', strategyId, stockId });
    }

    const stockMatch = path.match(/^\/api\/stocks\/(\d+)$/);
    const stockMeasurementsMatch = path.match(/^\/api\/stocks\/(\d+)\/measurements$/);

    if (stockMeasurementsMatch && method === 'GET') {
      const id = Number(stockMeasurementsMatch[1]);
      const existing = stocks.find((stock) => stock.id === id);
      if (!existing) return jsonResponse(404, { error: 'Stock not found' });

      return jsonResponse(200, [
        {
          id: 1,
          stockId: id,
          measurePrice: existing.measurePrice,
          measureDate: existing.measureDate,
          changePercent: existing.changePercent,
          source: 'yahoo',
          createdAt: '2026-02-11T12:00:00.000Z'
        }
      ]);
    }

    if (stockMatch && method === 'PUT') {
      const id = Number(stockMatch[1]);
      const existing = stocks.find((stock) => stock.id === id);
      if (!existing) return jsonResponse(404, { error: 'Stock not found' });
      stocks = stocks.map((stock) => (stock.id === id ? { id, ...body } : stock));
      return jsonResponse(200, { id, ...body });
    }

    if (path === '/api/stocks' && method === 'GET') {
      return jsonResponse(200, stocks);
    }

    return jsonResponse(500, { error: `Unhandled route: ${method} ${path}` });
  });
};

const clickWithAct = async (user, element) => user.click(element);

const typeWithAct = async (_user, element, value) => {
  fireEvent.change(element, { target: { value } });
};

const clearWithAct = async (_user, element) => {
  fireEvent.change(element, { target: { value: '' } });
};

const loginAsDefaultUser = async (user) => {
  await user.type(screen.getByLabelText('Username'), 'keith');
  await user.type(screen.getByLabelText('Password'), 'ferret');
  await clickWithAct(user, screen.getByRole('button', { name: 'Log On' }));
};

const fillStockForm = async (user, values) => {
  const setValue = async (label, value) => {
    const input = screen.getByLabelText(label);
    await clearWithAct(user, input);
    await typeWithAct(user, input, value);
  };

  await setValue('Sector', values.sector);
  await setValue('Company', values.company);
  await setValue('Ticker', values.ticker);
  await setValue('Price', values.price);
  await setValue('Criteria', values.criteria);
  await setValue('Buy Price', values.buyPrice);
  await setValue('Buy Date', values.buyDate);
  await setValue('Measure Price', values.measurePrice);
  await setValue('Measure Date', values.measureDate);
  await setValue('Change Percent', values.changePercent);
};

describe('App routed flows', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    window.localStorage.clear();
    global.fetch = createMockApi();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders header title with release number when REACT_APP_VERSION is set', () => {
    const originalVersion = process.env.REACT_APP_VERSION;
    process.env.REACT_APP_VERSION = '2.3.1';
    render(<App />);
    expect(screen.getByTestId('app-title')).toHaveTextContent('StockPicker v2.3.1');
    process.env.REACT_APP_VERSION = originalVersion;
  });

  test('renders header title without release number when REACT_APP_VERSION is not set', () => {
    const originalVersion = process.env.REACT_APP_VERSION;
    delete process.env.REACT_APP_VERSION;
    render(<App />);
    expect(screen.getByTestId('app-title').textContent).toBe('StockPicker');
    process.env.REACT_APP_VERSION = originalVersion;
  });

  test('requires login before loading protected pages', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Log On' })).toBeInTheDocument();
    expect(screen.queryByTestId('strategy-table-1')).not.toBeInTheDocument();

    await loginAsDefaultUser(user);

    await waitFor(() => {
      expect(screen.getByTestId('strategy-table-1')).toBeInTheDocument();
      expect(screen.getByTestId('strategy-stock-row-1-1')).toBeInTheDocument();
    });
  });

  test('adds, edits, and unlinks stock from a strategy table', async () => {
    const user = userEvent.setup();
    render(<App />);

    await loginAsDefaultUser(user);
    await waitFor(() => expect(screen.getByTestId('show-create-stock-form-1')).toBeInTheDocument());

    await clickWithAct(user, screen.getByTestId('show-create-stock-form-1'));
    await clickWithAct(user, screen.getByRole('button', { name: 'Create Stock' }));

    await waitFor(() => {
      expect(screen.getAllByText('This field is required.').length).toBeGreaterThan(0);
    });

    await fillStockForm(user, {
      sector: 'Utilities',
      company: 'New Co',
      ticker: 'NEW',
      price: '12.5',
      criteria: 'Cash Flow',
      buyPrice: '12.2',
      buyDate: '2026-02-14',
      measurePrice: '12.8',
      measureDate: '2026-02-15',
      changePercent: '2.5'
    });

    await clickWithAct(user, screen.getByRole('button', { name: 'Create Stock' }));

    await waitFor(() => {
      expect(screen.getByText('Created stock successfully.')).toBeInTheDocument();
      expect(screen.getByText('New Co')).toBeInTheDocument();
    });

    const newStockEditButton = screen.getByTestId('edit-strategy-stock-1-2');
    await clickWithAct(user, newStockEditButton);
    await clearWithAct(user, screen.getByLabelText('Company'));
    await typeWithAct(user, screen.getByLabelText('Company'), 'New Co Updated');
    await clickWithAct(user, screen.getByRole('button', { name: 'Update Stock' }));

    await waitFor(() => {
      expect(screen.getByText('Updated stock successfully.')).toBeInTheDocument();
      expect(screen.getByText('New Co Updated')).toBeInTheDocument();
    });

    await clickWithAct(user, screen.getByTestId('delete-strategy-stock-1-2'));
    await waitFor(() => {
      expect(screen.getByText('Removed stock from strategy successfully.')).toBeInTheDocument();
      expect(screen.queryByText('New Co Updated')).not.toBeInTheDocument();
    });
  });

  test('manages strategies on /strategies page without stock checkboxes', async () => {
    const user = userEvent.setup();
    render(<App />);

    await loginAsDefaultUser(user);
    await waitFor(() => expect(screen.getByRole('link', { name: 'Manage Strategies' })).toBeInTheDocument());
    await clickWithAct(user, screen.getByRole('link', { name: 'Manage Strategies' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Manage Strategies' })).toBeInTheDocument();
    });

    await clickWithAct(user, screen.getByRole('button', { name: 'Create Strategy' }));
    await waitFor(() => {
      expect(screen.getByText('Strategy text is required.')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('strategy-stock-checkbox-1')).not.toBeInTheDocument();

    await typeWithAct(user, screen.getByLabelText('Strategy'), 'Growth plan');
    await clickWithAct(user, screen.getByRole('button', { name: 'Create Strategy' }));

    await waitFor(() => {
      expect(screen.getByText('Created strategy successfully.')).toBeInTheDocument();
      expect(screen.getByText('Growth plan')).toBeInTheDocument();
    });

    await clickWithAct(user, screen.getByTestId('edit-strategy-2'));
    await clearWithAct(user, screen.getByLabelText('Strategy'));
    await typeWithAct(user, screen.getByLabelText('Strategy'), 'Growth plan updated');
    await clickWithAct(user, screen.getByRole('button', { name: 'Update Strategy' }));

    await waitFor(() => {
      expect(screen.getByText('Updated strategy successfully.')).toBeInTheDocument();
      expect(screen.getByText('Growth plan updated')).toBeInTheDocument();
    });

    await clickWithAct(user, screen.getByTestId('delete-strategy-2'));
    await waitFor(() => {
      expect(screen.getByText('Deleted strategy successfully.')).toBeInTheDocument();
      expect(screen.queryByText('Growth plan updated')).not.toBeInTheDocument();
    });
  });

  test('keeps focus while typing multiple characters in stock edit form', async () => {
    const user = userEvent.setup();
    render(<App />);

    await loginAsDefaultUser(user);
    await waitFor(() => expect(screen.getByTestId('edit-strategy-stock-1-1')).toBeInTheDocument());
    await clickWithAct(user, screen.getByTestId('edit-strategy-stock-1-1'));

    const companyInput = screen.getByLabelText('Company');
    await user.click(companyInput);
    await user.clear(companyInput);
    await user.type(companyInput, 'Updated Multi Char Name');

    expect(companyInput).toHaveValue('Updated Multi Char Name');
    expect(companyInput).toHaveFocus();
  });

  test('opens and closes stock graph popup from graph button', async () => {
    const user = userEvent.setup();
    render(<App />);

    await loginAsDefaultUser(user);
    await waitFor(() => expect(screen.getByTestId('show-stock-graph-1-1')).toBeInTheDocument());

    await clickWithAct(user, screen.getByTestId('show-stock-graph-1-1'));

    await waitFor(() => {
      expect(screen.getByTestId('stock-graph-modal')).toBeInTheDocument();
      expect(screen.getByTestId('stock-growth-graph')).toBeInTheDocument();
    });

    await clickWithAct(user, screen.getByTestId('close-stock-graph-modal'));

    await waitFor(() => {
      expect(screen.queryByTestId('stock-graph-modal')).not.toBeInTheDocument();
    });
  });

  test('opens and closes strategy average graph popup from average row action', async () => {
    const user = userEvent.setup();
    render(<App />);

    await loginAsDefaultUser(user);
    await waitFor(() => expect(screen.getByTestId('show-strategy-average-graph-1')).toBeInTheDocument());

    await clickWithAct(user, screen.getByTestId('show-strategy-average-graph-1'));

    await waitFor(() => {
      expect(screen.getByTestId('stock-graph-modal')).toBeInTheDocument();
      expect(screen.getByText('Average growth over time')).toBeInTheDocument();
      expect(screen.getByTestId('stock-growth-graph')).toBeInTheDocument();
    });

    await clickWithAct(user, screen.getByTestId('close-stock-graph-modal'));

    await waitFor(() => {
      expect(screen.queryByTestId('stock-graph-modal')).not.toBeInTheDocument();
    });
  });

  test('shows average change percent row for each strategy table', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn(async (url, options = {}) => {
      const path = typeof url === 'string' ? url : url.toString();
      const method = (options.method || 'GET').toUpperCase();

      if (path === '/api/strategies' && method === 'GET') {
        return jsonResponse(200, [
          { id: 1, strategy: 'Momentum picks' },
          { id: 2, strategy: 'Income picks' }
        ]);
      }

      const strategyStocksMatch = path.match(/^\/api\/strategies\/(\d+)\/stocks$/);
      if (strategyStocksMatch && method === 'GET') {
        const strategyId = Number(strategyStocksMatch[1]);
        if (strategyId === 1) {
          return jsonResponse(200, [
            {
              id: 11,
              sector: 'Technology',
              company: 'Alpha',
              ticker: 'ALP',
              price: 100,
              criteria: 'Momentum',
              buyPrice: 95,
              buyDate: '2026-02-10',
              measurePrice: 102,
              measureDate: '2026-02-12',
              changePercent: 2
            },
            {
              id: 12,
              sector: 'Utilities',
              company: 'Beta',
              ticker: 'BET',
              price: 50,
              criteria: 'Value',
              buyPrice: 48,
              buyDate: '2026-02-10',
              measurePrice: 49,
              measureDate: '2026-02-12',
              changePercent: 'n/a'
            },
            {
              id: 13,
              sector: 'Financials',
              company: 'Gamma',
              ticker: 'GAM',
              price: 75,
              criteria: 'Value',
              buyPrice: 70,
              buyDate: '2026-02-10',
              measurePrice: 78,
              measureDate: '2026-02-12',
              changePercent: 4
            }
          ]);
        }

        return jsonResponse(200, []);
      }

      if (path === '/api/stocks' && method === 'GET') {
        return jsonResponse(200, []);
      }

      return jsonResponse(500, { error: `Unhandled route: ${method} ${path}` });
    });

    render(<App />);

    await loginAsDefaultUser(user);

    await waitFor(() => {
      expect(screen.getByTestId('strategy-average-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('strategy-average-row-2')).toBeInTheDocument();
    });

    expect(screen.getByTestId('strategy-average-change-percent-1')).toHaveTextContent('3.00');
    expect(screen.getByTestId('strategy-average-change-percent-2')).toHaveTextContent('—');
  });
});
