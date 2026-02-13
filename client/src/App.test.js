import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

beforeEach(() => {
  jest.spyOn(global, 'fetch');
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders the StockPicker title', async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ message: 'Stock Picker', timestamp: new Date().toISOString() }),
  });

  await act(async () => {
    render(<App />);
  });

  expect(screen.getByText('StockPicker')).toBeInTheDocument();
});

test('displays the hello message from the API', async () => {
  const mockTimestamp = new Date().toISOString();
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ message: 'Stock Picker', timestamp: mockTimestamp }),
  });

  await act(async () => {
    render(<App />);
  });

  await waitFor(() => {
    expect(screen.getByTestId('hello-message')).toHaveTextContent('Stock Picker');
    expect(screen.getByTestId('timestamp')).toHaveTextContent(/Last updated:/);
  });
});

test('displays an error when the API call fails', async () => {
  global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

  await act(async () => {
    render(<App />);
  });

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('Error: Failed to fetch');
  });
});

test('shows loading spinner initially', async () => {
  global.fetch.mockReturnValueOnce(new Promise(() => {})); // never resolves

  await act(async () => {
    render(<App />);
  });
  
  expect(screen.getByRole('status')).toBeInTheDocument();
});
