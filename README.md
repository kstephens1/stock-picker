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

## Production Deployment (Firebase + Google Compute Engine)

The repository includes an automated production deployment script:

- Frontend: Firebase Hosting (`client/build`)
- Backend: Google Compute Engine VM with `systemd`
- Database: SQLite stored on VM disk (`/var/lib/stockpicker/stocks.db` by default)

### Prerequisites

- `gcloud` CLI authenticated to your Google Cloud account
- `firebase` CLI authenticated to your Firebase account
- Access to a Linux Compute Engine VM with Node.js + npm installed
- Firewall rules allowing your backend port and SSH access

### Required Environment Variables

Set these before running deployment:

- `GCP_PROJECT_ID`: Google Cloud project id
- `GCP_ZONE`: Compute Engine zone (example: `us-central1-a`)
- `GCE_INSTANCE`: VM instance name
- `FIREBASE_PROJECT_ID`: Firebase project id
- `BACKEND_URL`: Public backend base URL (example: `https://api.example.com`)
- `FRONTEND_URL`: Public frontend URL (example: `https://yourapp.web.app`)

Optional variables:

- `VM_APP_DIR` (default: `/opt/stockpicker`)
- `VM_SERVICE_NAME` (default: `stock-picker`)
- `VM_RUNTIME_USER` (default: `stockpicker`)
- `VM_RUNTIME_GROUP` (default: `stockpicker`)
- `VM_DB_PATH` (default: `/var/lib/stockpicker/stocks.db`)

### Deploy to Production

From the repo root:

```bash
npm run deploy:prod
```

Deployment steps performed by the script:

1. Runs unit tests
2. Builds frontend with `REACT_APP_API_BASE_URL=$BACKEND_URL`
3. Syncs backend code to VM
4. Installs production dependencies on VM
5. Installs/updates `systemd` service and restarts backend
6. Deploys Firebase Hosting
7. Runs post-deploy smoke checks

### Run Smoke Tests Only

```bash
npm run smoke:prod
```

Smoke checks validate backend health/read/write-delete and frontend routes.

### Run Full UI Tests Against Production

Use Playwright against the live frontend URL without starting local services:

```bash
npm run test:e2e:prod
```

Equivalent direct command:

```bash
cd e2e
PLAYWRIGHT_BASE_URL=https://stockpicker-prod-ks-2026.web.app PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test
```

View the test report:

```bash
cd e2e
npx playwright show-report
```

## UI Flow

- `/`: Home page with one table per strategy, showing linked stock rows.
- Each strategy table includes row-level stock `Edit` and strategy-scoped `Delete` (unlink from this strategy only).
- Each strategy table has an `Add New Stock` button that opens a full stock form and saves the new stock directly to that strategy.
- `/strategies`: Strategy management page for strategy text create/edit/delete.
- New strategies are created without selecting existing stocks via checkboxes.
