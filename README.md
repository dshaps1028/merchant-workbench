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
2. Install local Shopify MCP server dependencies:
   ```bash
   cd mcp-server
   npm install
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
You can run the Electron shell and MCP server separately or together:

- Start only the Electron app (uses the MCP HTTP bridge if already running):
  ```bash
  npm start
  ```
- Start only the MCP server (stdio):
  ```bash
  npm run start:mcp
  ```
- Start the MCP server with the HTTP bridge:
  ```bash
  npm run start:mcp:http
  ```
- Start the MCP server (HTTP bridge) and Electron shell together for local development:
  ```bash
  npm run dev
  ```

If you run the MCP server manually, ensure it is listening on the `PORT` you configured in `.env` before launching the Electron app.

## MCP server details
The included MCP server (launched from `mcp-server/index.js`) uses the Model Context Protocol SDK to expose a Shopify-focused tool set. The primary tool today is `list_orders`, which returns Shopify order data and supports filtering by:

- `limit`: maximum number of orders to return (up to 50)
- `status`: order status filter
- `fulfillment_status`: fulfillment state filter
- `created_at_min` / `created_at_max`: ISO8601 timestamps bounding the created-at window
- `email`: customer email address

The Electron app connects to this MCP server over stdio by default and can also communicate through the optional HTTP bridge when started with `npm run start:mcp:http` or `npm run dev`.

## Project structure
- `main.js`: Electron main process that creates the browser window.
- `preload.js`: Preload script for the renderer.
- `renderer.js`: Renderer-side logic for the UI loaded by `index.html`.
- `index.html`: HTML entry point for the renderer.
