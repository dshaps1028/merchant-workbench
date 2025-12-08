#!/usr/bin/env node
// Starts the MCP server (stdio) with creds pulled from keytar/active-shop, so users don't need mcp-server/.env

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const keytar = require('keytar');

const SERVICE = 'merchant-workbench';

const findActiveShopFile = () => {
  const candidates = [
    path.join(os.homedir(), 'Library', 'Application Support', 'merchant-workbench', 'active-shop.json'), // macOS
    path.join(os.homedir(), '.config', 'merchant-workbench', 'active-shop.json'), // Linux
    path.join(process.env.APPDATA || '', 'merchant-workbench', 'active-shop.json') // Windows
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
};

const loadActiveShop = () => {
  const file = findActiveShopFile();
  if (!file) return '';
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return data.shop || '';
  } catch {
    return '';
  }
};

const pickShopAndToken = async () => {
  // Prefer the active shop file if present
  const active = loadActiveShop();
  if (active) {
    const token = await keytar.getPassword(SERVICE, active);
    if (token) return { shop: active, token };
  }

  // Fallback: if only one credential exists, use it
  const creds = await keytar.findCredentials(SERVICE);
  if (creds.length === 1) {
    return { shop: creds[0].account, token: creds[0].password };
  }

  throw new Error(
    'No active shop credentials found. Please connect Shopify in the app once to save credentials.'
  );
};

const start = async () => {
  try {
    const { shop, token } = await pickShopAndToken();
    const env = {
      ...process.env,
      SHOPIFY_DOMAIN: shop,
      SHOPIFY_ACCESS_TOKEN: token
    };
    const child = spawn('npm', ['start'], {
      cwd: path.join(__dirname, '..', 'mcp-server'),
      env,
      stdio: 'inherit'
    });
    child.on('exit', (code) => process.exit(code || 0));
  } catch (err) {
    console.error('[dev] Failed to start MCP with stored credentials:', err.message);
    process.exit(1);
  }
};

start();
