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

- Preferred dev shortcut (runs MCP over stdio with stored creds + Electron together in one terminal):
  ```bash
  npm run dev
  ```
  This starts the MCP server over stdio in the background using the Shopify domain/token saved via the Connect Shopify flow (keytar), then launches Electron. When you’re done, stop the terminal to kill both.
- Start only the Electron app (connects to the MCP server over stdio):
  ```bash
  npm start
  ```
- Start only the MCP server (stdio):
  ```bash
  npm run start:mcp
  ```

If you run the MCP server manually, ensure it is listening on the `PORT` you configured in `.env` before launching the Electron app.

## MCP Server Details
The included MCP server (launched from `mcp-server/index.js`) is a local clone of [`@akson/mcp-shopify`](https://github.com/antoineschaller/shopify-mcp-server). Keeping the source checked into this repo makes it easy to run locally and apply customizations without publishing a new npm package.

### Core Tools
The UI currently relies on these MCP tools:
- `list_orders`: fetches orders with filters (status, fulfillment, date range, email, ID/number/name, SKU).
- `create_order`: creates a single order with line items and customer details.
- `update_order`: used by the bulk/single edit flows to update notes, tags, email/phone.
- `search_products`: finds products/variants by query (used for SKUs/variant IDs).
- `list_products`: fallback listing of products/variants when no query is provided.

The full tool catalog (including customer and analytics helpers) is documented in `mcp-server/TOOLS.md`.

The Electron app connects to this MCP server over stdio by default.

### Local Enhancements
- Added a `create_order` tool to generate Shopify orders directly from Claude, complementing the existing order management commands.
- Added an `update_order` tool to edit tags, notes, and contact fields for existing orders (used by the bulk/single edit flows).
- Expanded `list_orders` filtering to support status, fulfillment state, created-at bounds, email, order ID, order number/name, and customer name.

## Authentication (private app tokens)
This build uses Shopify private app tokens (no OAuth redirect) because private apps don’t support redirect URLs. To connect:
1) In your Shopify admin: Settings → Apps and sales channels → Develop apps → create/open your custom app.
2) Grant the scopes you need (e.g., read/write orders) and allow required permissions.
3) Under API credentials, copy:
   - Admin API access token (used as the token)
   - Shop domain (e.g., `your-shop.myshopify.com`)
4) In the app, click “Connect Shopify” and enter the shop domain and Admin API access token. These are stored securely via keytar (OS keychain) and never exposed to end-users. Env `.env` is only a dev fallback; search/create flows require a connected shop.

## State Management & Storage
Automations are persisted locally in a SQLite file (via `sql.js`, stored as `automations.sqlite` in the project directory). The schema includes: `id`, `label`, `schedule`, `action`, `search_query`, `orders_snapshot` (JSON string), `created_at`, `last_run`, `next_run`, `start_at`, `end_at`, `enabled`, `interval_days`. No external DB service is required. Order search and created-order snapshots are also stored locally for “recent” views.

### Automation scheduler
- A lightweight scheduler loop runs in `main.js` (~60s tick). It loads enabled automations, checks `next_run <= now` (and that `end_at` has not passed), then notifies the renderer via `automation:run`.
- The renderer re-runs the saved search (via Codex + MCP) and applies the saved action (currently tag edits) to the returned orders. It falls back to the stored `orders_snapshot` if the search fails.
- After each run, `last_run` and `next_run` are updated (using `interval_days`); if `end_at` is in the past, the automation is disabled.
- You can clear all automations during development by deleting rows from `automations.sqlite` (e.g., `DELETE FROM automations;`), as demonstrated in the tests.

## Ask ShopifAI (AI Insights)
- Use the “Ask ShopifAI” button (next to “Edit Orders”) after running a search to send a redacted snapshot of up to 25 returned orders to Codex.
- We redact sensitive fields and only send: `id, name, total_price, currency, created_at, tags, financial_status, fulfillment_status, line_items (title, variant_title, sku, quantity)`.
- The prompt asks Codex for a short conversational summary (no bullets). The response is displayed inline in the “AI Insights” panel.
- Logging: prompts/responses are logged in the console (`[ai-search]`), and failures show an error in the panel.

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
- MCP handlers: order create/update payload shaping and responses, using mocked Shopify calls.

Run the suite:
```bash
npm test
```
The test runner is headless and does not require the Electron UI to be running.
