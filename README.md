# ShopifAI

Basic Electron application scaffold for the Merchant Workbench desktop app.

## Prerequisites
- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm (comes with Node.js)

## Installation
1. Install root dependencies for the Electron shell:
   ```bash
   npm install
   ```
2. Install local Shopify MCP server dependencies (run from the repo root):
   ```bash
   cd mcp-server
   npm install
   cd ..
   ```

## Environment Configuration
1. Create `mcp-server/.env` with your Shopify credentials and the port the MCP server should listen on:
   ```bash
   SHOPIFY_ACCESS_TOKEN=your_access_token
   SHOPIFY_DOMAIN=your-shop.myshopify.com
   PORT=3000
   ```
2. Keep this file out of version control; it is already ignored by Git.

## Running the App
You can run the Electron shell and MCP server separately or together. Run these commands from the repo root:

- Preferred dev shortcut (spawns the Electron shell; run the MCP server separately if needed):
  ```bash
  npm run dev
  ```
- Start only the Electron app (uses the MCP HTTP bridge if already running):
  ```bash
  npm start
  ```
- Start only the MCP server (stdio):
  ```bash
  npm run start:mcp
  ```
- Start the MCP server with the HTTP bridge (leave this running in its own terminal when you want HTTP access):
  ```bash
  npm run start:mcp:http
  ```
- Start the MCP server (HTTP bridge) and Electron shell together for local development (two terminals):
  ```bash
  # Terminal 1: start the MCP server over HTTP
  npm run start:mcp:http

  # Terminal 2: launch the Electron shell
  npm start
  ```

If you run the MCP server manually, ensure it is listening on the `PORT` you configured in `.env` before launching the Electron app.

## MCP Server Details
The included MCP server (launched from `mcp-server/index.js`) is a local clone of [`@akson/mcp-shopify`](https://github.com/antoineschaller/shopify-mcp-server). Keeping the source checked into this repo makes it easy to run locally and apply customizations without publishing a new npm package.

### Local Enhancements
- Added a `create_orders` tool to generate Shopify orders directly from Claude, complementing the existing order management commands.
- Expanded `list_orders` filtering to support status, fulfillment state, created-at bounds, email, order ID, order number/name, and customer name.
- Preserved the HTTP bridge (`npm run start:mcp:http`) so the renderer can talk to the MCP server over HTTP during development, while stdio remains the default for Electron.

### Core Tools
The server exposes a Shopify-focused tool set through the Model Context Protocol, including:

- `list_orders`: returns Shopify order data with the filters listed above.
- `create_order`: creates a single order with line items and customer details.

The Electron app connects to this MCP server over stdio by default and can also communicate through the optional HTTP bridge when started with `npm run start:mcp:http`.

## Authentication (private app tokens)
This build uses Shopify private app tokens (no OAuth redirect) because private apps don’t support redirect URLs. To connect:
1) In your Shopify admin: Settings → Apps and sales channels → Develop apps → create/open your custom app.
2) Grant the scopes you need (e.g., read/write orders) and allow required permissions.
3) Under API credentials, copy:
   - Admin API access token (used as the token)
   - Shop domain (e.g., `your-shop.myshopify.com`)
4) In the app, click “Connect Shopify” and enter the shop domain and Admin API access token. These are stored securely via keytar (OS keychain) and never exposed to end-users. Env `.env` is only a dev fallback; search/create flows require a connected shop.

## State Management & Storage
Automations are persisted locally in a SQLite file (via `sql.js`, stored as `automations.sqlite` in the project directory). The schema includes: `id`, `label`, `schedule`, `action`, `search_query`, `orders_snapshot` (JSON string), `created_at`, `last_run`, and `next_run`. No external DB service is required.

## Search date parsing & typo tolerance
The order search bar accepts natural language date phrases: explicit dates (`2025-09-12`), month ranges (`September 2025`), relative ranges (`yesterday`, `last week`, `past month`, `last year`), and weekdays (`last Sunday`). A lightweight fuzzy pass (Levenshtein distance ≤ 2 against known date terms) normalizes minor misspellings (e.g., “yesterdy” → “yesterday”). When a fuzzy correction is applied, a warning string is returned alongside the derived date range so the UI can surface it if desired. This helps avoid overly broad results when users mistype date phrases.

## Project structure
- `main.js`: Electron main process that creates the browser window.
- `preload.js`: Preload script for the renderer.
- `renderer.js`: Renderer-side logic for the UI loaded by `index.html`.
- `index.html`: HTML entry point for the renderer.
- `utils.js`: Shared helpers for date parsing, fuzzy typo handling, and tag parsing.
- `db.js`: sql.js-backed automation storage (writes `automations.sqlite` locally).

## Testing
Unit tests are powered by Jest and live under `tests/`. Current coverage:
- Utils: date range parsing (explicit dates, months, relative ranges, fuzzy typos like “yesterdy”), tag parsing, and normalization helpers.
- Automations DB (sql.js): persistence of automations, JSON snapshots, and scheduling fields (`last_run`, `next_run`).
- Auth helpers: keytar-backed credential storage and active shop tracking.

Run the suite:
```bash
npm test
```
The test runner is headless and does not require the Electron UI to be running.
