# StockPicker

A simple full-stack application featuring a React frontend, a Node.js microservice backend, and automated testing with Jest and Playwright.

## Project Structure

- **root**: Orchestrates global scripts and dependencies.
- **/client**: React.js frontend (Bootstrap CSS).
- **/server**: Node.js/Express microservice.
- **/e2e**: Playwright end-to-end UI tests.

## Key NPM Commands

Run these commands from the root directory:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts both server (port 4000) and client (port 3000) concurrently. |
| `npm run build` | Runs all unit tests and builds the React app for production. |
| `npm run test` | Alias for `npm run test:unit`. |
| `npm run test:unit` | Runs Jest unit tests for both server and client. |
| `npm run test:e2e` | Runs Playwright end-to-end tests (auto-boots services). Run `cd e2e && npx playwright show-report` to view test report|
| `npm run install:all` | Installs dependencies for root, server, and client folders. |
| `npm run start:server` | Starts only the Node.js microservice. |
| `npm run start:client` | Starts only the React development server. |

## Development

The frontend is configured with a proxy in [client/package.json](client/package.json) to route `/api/*` requests to the backend at `http://localhost:4000`.

## UI Flow

- `/`: Home page with one table per strategy, showing linked stock rows.
- Each strategy table includes row-level stock `Edit` and strategy-scoped `Delete` (unlink from this strategy only).
- Each strategy table has an `Add New Stock` button that opens a full stock form and saves the new stock directly to that strategy.
- `/strategies`: Strategy management page for strategy text create/edit/delete.
- New strategies are created without selecting existing stocks via checkboxes.
