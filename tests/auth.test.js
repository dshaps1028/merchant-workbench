const fs = require('fs');
const os = require('os');
const path = require('path');

// In-memory keytar mock
jest.mock('keytar', () => {
  const store = new Map();
  return {
    setPassword: async (service, account, password) => {
      store.set(`${service}:${account}`, password);
    },
    getPassword: async (service, account) => {
      return store.get(`${service}:${account}`) || null;
    },
    findCredentials: async (service) => {
      return Array.from(store.entries())
        .filter(([k]) => k.startsWith(`${service}:`))
        .map(([k, v]) => ({ account: k.split(':')[1], password: v }));
    }
  };
});

// Electron mock with a temp userData path
jest.mock('electron', () => {
  const mockPath = require('path');
  const mockOs = require('os');
  const tmpUserData = mockPath.join(mockOs.tmpdir(), `mw-auth-${Date.now()}`);
  return {
    shell: { openExternal: jest.fn() },
    app: { getPath: () => tmpUserData }
  };
});

const auth = require('../auth');
const tmpUserData = require('electron').app.getPath();

beforeAll(() => {
  fs.mkdirSync(tmpUserData, { recursive: true });
});

describe('auth helpers (file + keytar)', () => {
  afterEach(() => {
    const activeFile = path.join(tmpUserData, 'active-shop.json');
    if (fs.existsSync(activeFile)) fs.unlinkSync(activeFile);
  });

  test('writeActiveShop/read back through getActiveShopCredentials', async () => {
    auth.writeActiveShop('shop1.myshopify.com');
    const { shop, token } = await auth.getActiveShopCredentials();
    expect(shop).toBe('shop1.myshopify.com');
    expect(token).toBe('');
  });

  test('setShopToken and retrieval via getTokenForShop/listShops', async () => {
    await auth.setShopToken('store.myshopify.com', 'sekret');
    const token = await auth.getTokenForShop('store.myshopify.com');
    expect(token).toBe('sekret');
    const shops = await auth.listShops();
    expect(shops).toEqual(['store.myshopify.com']);
  });

  test('client credential round-trip using keytar', async () => {
    await auth.setClientCreds('id123', 'secret456');
    const creds = await auth.getClientCreds();
    expect(creds.clientId).toBe('id123');
    expect(creds.clientSecret).toBe('secret456');
  });
});
