# Codex Agent Guide

This repo contains an Electron shell plus a local Shopify MCP server. When working on PRs, follow these checks to keep things smooth:

## Quick checks
- Verify scripts: `npm start` for Electron, `npm run start:mcp` (stdio) or `npm run start:mcp:http` (HTTP bridge for renderer), `npm run dev` to run HTTP bridge + Electron together.
- Environment: keep real Shopify creds in `mcp-server/.env` (ignored by git). File must define `SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_DOMAIN`, and `PORT`.
- Dependencies: install root deps with `npm install`; install MCP deps with `cd mcp-server && npm install`.
- Submodule cleanup: `mcp-server` should be a normal folder (no nested `.git`). If you see submodule warnings, remove `mcp-server/.git` before committing.
- Styling: UI uses React via CDN in `index.html`; keep color/theme aligned with the Shopify palette already set in CSS variables.

## Formatting standards
- JavaScript: prefer 2-space indentation, trailing commas where valid, and semicolons at statement ends. Use single quotes for strings except when interpolation requires template literals. Keep imports sorted by module path.
- JSON: format with 2-space indentation, double-quoted keys/strings, and no trailing commas. When editing config files, keep object keys alphabetized for readability.

## Before pushing a PR
- Run `git status` to ensure `mcp-server/.env` and `node_modules` are untracked.
- Run the app (`npm run dev`) to confirm the UI loads and the MCP server starts without missing env errors.
- If you add network calls to MCP, make endpoints/configurable (use `PORT` from env or a config constant) and avoid hardcoding secrets.
- Update docs if you change startup scripts or required env vars.
