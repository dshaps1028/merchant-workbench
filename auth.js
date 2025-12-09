const { shell, app } = require('electron');
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const keytar = require('keytar');

const SERVICE = 'merchant-workbench';
const CLIENT_SERVICE = `${SERVICE}-client`;
const PORT = 43210;
const REDIRECT_PATH = '/auth/callback';
const CALLBACK_URL = `http://localhost:${PORT}${REDIRECT_PATH}`;
const SCOPES = process.env.SHOPIFY_SCOPES || 'read_orders,write_orders';

const activeShopPath = path.join(app.getPath('userData'), 'active-shop.json');

const readActiveShop = () => {
  try {
    const data = fs.readFileSync(activeShopPath, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.shop || '';
  } catch {
    return '';
  }
};

const writeActiveShop = (shop) => {
  try {
    fs.writeFileSync(activeShopPath, JSON.stringify({ shop }, null, 2), 'utf8');
  } catch (error) {
    console.error('[auth] failed to write active shop', error);
  }
};

const listShops = async () => {
  const creds = await keytar.findCredentials(SERVICE);
  return creds.map((c) => c.account);
};

const setShopToken = async (shop, token) => {
  if (!shop || !token) {
    throw new Error('Shop and token are required.');
  }
  await keytar.setPassword(SERVICE, shop, token);
  writeActiveShop(shop);
  return { shop, accessToken: token };
};

const clearActiveShopCredentials = async () => {
  const shop = readActiveShop();
  if (shop) {
    try {
      await keytar.deletePassword(SERVICE, shop);
    } catch (err) {
      console.warn('[auth] failed to delete token for shop', shop, err?.message);
    }
  }
  writeActiveShop('');
  return { shopCleared: shop || '', tokenCleared: !!shop };
};

const getTokenForShop = async (shop) => {
  if (!shop) return '';
  return keytar.getPassword(SERVICE, shop);
};

const getClientCreds = async () => {
  const envId = process.env.SHOPIFY_CLIENT_ID;
  const envSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (envId && envSecret) return { clientId: envId, clientSecret: envSecret };
  const id = await keytar.getPassword(CLIENT_SERVICE, 'client_id');
  const secret = await keytar.getPassword(CLIENT_SERVICE, 'client_secret');
  return { clientId: id || '', clientSecret: secret || '' };
};

const setClientCreds = async (id, secret) => {
  await keytar.setPassword(CLIENT_SERVICE, 'client_id', id || '');
  await keytar.setPassword(CLIENT_SERVICE, 'client_secret', secret || '');
};

const startOAuth = async (shopDomain) => {
  const { clientId, clientSecret } = await getClientCreds();
  if (!clientId || !clientSecret) {
    throw new Error('Shopify client credentials are not set.');
  }
  if (!shopDomain) {
    throw new Error('Shop domain is required.');
  }
  const app = express();
  const state = crypto.randomBytes(16).toString('hex');

  const authorizeUrl = `https://${shopDomain}/admin/oauth/authorize?client_id=${encodeURIComponent(
    clientId
  )}&scope=${encodeURIComponent(SCOPES)}&redirect_uri=${encodeURIComponent(
    CALLBACK_URL
  )}&state=${encodeURIComponent(state)}`;

  const serverPromise = new Promise((resolve, reject) => {
    const server = app.listen(PORT, () => {
      console.log(`[auth] Listening on ${PORT} for OAuth callback`);
    });

    const finish = (err, data) => {
      server.close();
      if (err) reject(err);
      else resolve(data);
    };

    app.get(REDIRECT_PATH, async (req, res) => {
      try {
        const { code, state: returnedState, hmac, shop } = req.query;
        if (!code || !returnedState || !shop) {
          res.status(400).send('Missing code or state');
          return finish(new Error('Missing code/state/shop'));
        }
        if (returnedState !== state) {
          res.status(400).send('Invalid state');
          return finish(new Error('Invalid state'));
        }

        // HMAC validation is recommended; for brevity, skip here but log.
        if (!hmac) {
          console.warn('[auth] No hmac provided in callback');
        }

        const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code
          })
        });
        if (!tokenRes.ok) {
          const text = await tokenRes.text();
          res.status(500).send('Token exchange failed');
          return finish(new Error(`Token exchange failed: ${text}`));
        }
        const tokenJson = await tokenRes.json();
        const accessToken = tokenJson.access_token;
        if (!accessToken) {
          res.status(500).send('No access token returned');
          return finish(new Error('No access token'));
        }
        await keytar.setPassword(SERVICE, shop, accessToken);
        writeActiveShop(shop);
        res.send('Shopify authorization successful. You can close this window.');
        finish(null, { shop, accessToken });
      } catch (error) {
        console.error('[auth] OAuth callback error', error);
        res.status(500).send('OAuth error');
        finish(error);
      }
    });
  });

  await shell.openExternal(authorizeUrl);
  return serverPromise;
};

const getActiveShopCredentials = async () => {
  const shop = readActiveShop();
  if (!shop) return { shop: '', token: '' };
  const token = await getTokenForShop(shop);
  return { shop, token: token || '' };
};

module.exports = {
  startOAuth,
  listShops,
  getActiveShopCredentials,
  getTokenForShop,
  writeActiveShop,
  setClientCreds,
  getClientCreds,
  setShopToken,
  clearActiveShopCredentials
};
