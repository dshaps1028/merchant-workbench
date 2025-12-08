# Merchant Workbench

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

## Environment configuration
1. Create `mcp-server/.env` with your Shopify credentials and the port the MCP server should listen on:
   ```bash
   SHOPIFY_ACCESS_TOKEN=your_access_token
   SHOPIFY_DOMAIN=your-shop.myshopify.com
   PORT=3000
   ```
2. Keep this file out of version control; it is already ignored by Git.

## Running the app
You can run the Electron shell and MCP server separately or together. Run these commands from the repo root:

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

## MCP server details
The included MCP server (launched from `mcp-server/index.js`) is a local clone of [`@akson/mcp-shopify`](https://github.com/antoineschaller/shopify-mcp-server). Keeping the source checked into this repo makes it easy to run locally and apply customizations without publishing a new npm package.

### Local enhancements
- Added a `create_orders` tool to generate Shopify orders directly from Claude, complementing the existing order management commands.
- Expanded `list_orders` filtering to support status, fulfillment state, created-at bounds, email, order ID, order number/name, and customer name.
- Preserved the HTTP bridge (`npm run start:mcp:http`) so the renderer can talk to the MCP server over HTTP during development, while stdio remains the default for Electron.

### Core tools
The server exposes a Shopify-focused tool set through the Model Context Protocol, including:

- `list_orders`: returns Shopify order data with the filters listed above.
- `create_order`: creates a single order with line items and customer details.

The Electron app connects to this MCP server over stdio by default and can also communicate through the optional HTTP bridge when started with `npm run start:mcp:http`.

## Project structure
- `main.js`: Electron main process that creates the browser window.
- `preload.js`: Preload script for the renderer.
- `renderer.js`: Renderer-side logic for the UI loaded by `index.html`.
- `index.html`: HTML entry point for the renderer.
