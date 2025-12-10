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
3. Optionally create `.env.local` in the repo root for AI keys (ignored by Git). Example:
   ```bash
   CODEX_API_KEY=your_codex_key
   OPENAI_API_KEY=your_openai_key
   ```
   Codex remains supported; `OPENAI_API_KEY` enables the new OpenAI function-calling helper exposed from `preload.js`.

## Running the App
You can run the Electron shell and MCP server separately or together. Run these commands from the repo root:

- Preferred dev shortcut (runs MCP over stdio with stored creds + Electron together in one terminal):
  ```bash
  npm run dev
  ```
  This starts the Shopify MCP server over stdio in the background using the Shopify domain/token saved via the Connect Shopify flow (keytar), then launches Electron. Codex-as-MCP is auto-started by the app (no second terminal needed). When you’re done, stop the terminal to kill everything.
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
- `search_products`: finds products/variants by query (contains-style token search across title/type/variants/SKUs, with fallbacks to legacy title search and a final local substring filter).
- `list_products`: fallback listing of products/variants when no query is provided.

The full tool catalog (including customer and analytics helpers) is documented in `mcp-server/TOOLS.md`.

The Electron app connects to this MCP server over stdio by default.

## MCP Servers Overview
- **Shopify MCP (local)**: `mcp-server/index.js`, handles order/product tools. Started by `npm run dev` (via `scripts/start-mcp-stdio.js`) or manually with `npm run start:mcp`. Requires Shopify creds from keytar or `mcp-server/.env`.
- **Codex MCP (bundled)**: Provided by the Codex CLI binary under `node_modules/@openai/codex-sdk/vendor/.../codex/codex`. Used for AI Insights (CSV/top/trends) via Codex-as-MCP. Auto-started by `preload.js` when Insights needs it; falls back to schema-only insights if unavailable. Requires `CODEX_API_KEY` (and optional `CODEX_MODEL` in `.env.local`). No extra install beyond `npm install` (the binary is vendored).

### Manual Codex MCP start (optional for debugging)
If you want to run it yourself, load `.env.local` then launch the bundled CLI (Apple Silicon path shown; swap `aarch64` for `x86_64` on Intel):
```bash
cd /Users/dshaps10/Desktop/merchant-workbench
set -a; source .env.local; set +a
./node_modules/@openai/codex-sdk/vendor/aarch64-apple-darwin/codex/codex mcp-server -c model="gpt-4.1"
```
Leave this terminal open; the Electron app will connect over stdio.

### Local Enhancements
- Added a `create_order` tool to generate Shopify orders directly from Codex, complementing the existing order management commands.
- Added an `update_order` tool to edit tags, notes, and contact fields for existing orders (used by the bulk/single edit flows).
- Expanded `list_orders` filtering to support status, fulfillment state, created-at bounds, email, order ID, order number/name, and customer name.

## Authentication (Private App Tokens)
This build uses Shopify private app tokens (no OAuth redirect) because private apps don’t support redirect URLs. To connect:
1) In your Shopify admin: Settings → Apps and sales channels → Develop apps → create/open your custom app.
2) Grant the scopes you need (e.g., read/write orders) and allow required permissions.
3) Under API credentials, copy:
   - Admin API access token (used as the token)
   - Shop domain (e.g., `your-shop.myshopify.com`)
4) In the app, click “Connect Shopify” and enter the shop domain and Admin API access token. These are stored securely via keytar (OS keychain) and never exposed to end-users. Env `.env` is only a dev fallback; search/create flows require a connected shop.

## State Management & Storage
Automations are persisted locally in a SQLite file (via `sql.js`, stored as `automations.sqlite` in the project directory). The schema includes: `id`, `label`, `schedule`, `action`, `search_query`, `orders_snapshot` (JSON string), `created_at`, `last_run`, `next_run`, `start_at`, `end_at`, `enabled`, `interval_days`. No external DB service is required. Order search and created-order snapshots are also stored locally for “recent” views.

### Automation Scheduler
- A lightweight scheduler loop runs in `main.js` (~60s tick). It loads enabled automations, checks `next_run <= now` (and that `end_at` has not passed), then notifies the renderer via `automation:run`.
- The renderer re-runs the saved search (via Codex + MCP) and applies the saved action (currently tag edits) to the returned orders. It falls back to the stored `orders_snapshot` if the search fails.
- After each run, `last_run` and `next_run` are updated (using `interval_days`); if `end_at` is in the past, the automation is disabled.
- You can clear all automations during development by deleting rows from `automations.sqlite` (e.g., `DELETE FROM automations;`), as demonstrated in the tests.

## Ask ShopifAI (AI Insights)
- Use the “Ask ShopifAI” button (next to “Edit Orders”) after running a search to send a redacted snapshot of the most recent orders to Codex. If you just refreshed, the UI pulls your last saved search from the local cache automatically.
- A separate “Open Insights Chat” lets you ask for trends, top performers, or a CSV export. CSVs include `created_at` and honor natural-language hints like “top 5 most expensive” or “created_at descending.” A “Download last CSV” button saves the latest CSV locally without extra backend calls.
- We redact sensitive fields and only send: `id, name, total_price, currency, created_at, tags, financial_status, fulfillment_status, line_items (title, variant_title, sku, quantity)`.
- The prompt asks Codex for a short conversational summary (no bullets). The response is displayed inline in the “AI Insights” panel. Errors are shown in-panel and logged with `[ai-search]`/`[codex]`.

## Search Date Parsing & Typo Tolerance
The order search bar accepts natural language date phrases: explicit dates (`2025-09-12`), month ranges (`September 2025`), relative ranges (`yesterday`, `last week`, `past month`, `last year`), and weekdays (`last Sunday`). A lightweight fuzzy pass (Levenshtein distance ≤ 2 against known date terms) normalizes minor misspellings (e.g., “yesterdy” → “yesterday”). When a fuzzy correction is applied, a warning string is returned alongside the derived date range so the UI can surface it if desired. Date ranges are derived using the shop’s timezone (when available) and are no longer auto-widened; zero results stay zero instead of silently broadening the query.

## AI Flows (Function Calling)
- Order search: NL queries route through OpenAI function calling (`list_orders` / `search_products`), which invokes our local MCP server tools over stdio. The model is free to call `search_products` when a product name is present; results are used to filter orders by SKU.
- Order creation chat: Uses the `draft_order_intent` function to drive product search (`search` action), draft updates, and submit confirmation. The assistant keeps asking for missing required details (SKU/variant, quantity, email, shipping address) and, once everything is present, summarizes the draft and prompts you to confirm before submitting to Shopify. Product search in this flow benefits from the improved contains-style matching and local fallback described above.

## Product Search Resilience
- Contains-style token search via Shopify `products/search.json` (`title:*token*` with OR across tokens, after stripping filler words like “name/containing/with”).
- Fallback to legacy `products.json?title=…`.
- Final fallback: broaden to a list and filter client-side across title/handle/product_type/variant titles/SKUs for substring matches.

## Project Structure
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
- Insights helpers: CSV intent parsing (limits/sorting) and CSV building (includes `created_at` header).

Run the suite:
```bash
npm test
```
The test runner is headless and does not require the Electron UI to be running.
