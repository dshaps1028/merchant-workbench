const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const {
  startOAuth,
  listShops,
  getActiveShopCredentials,
  getTokenForShop,
  writeActiveShop,
  setClientCreds,
  getClientCreds,
  setShopToken
} = require('./auth');
const {
  listAutomations,
  saveAutomation,
  updateAutomation,
  listOrderResults,
  saveOrderResults,
  listCreatedOrders,
  saveCreatedOrders
} = require('./db');

let mainWindowRef = null;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    title: 'Merchant Workbench',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindowRef = mainWindow;
}

let ipcRegistered = false;
const registerIpcHandlers = () => {
  if (ipcRegistered) return;
  ipcRegistered = true;
  ipcMain.handle('oauth:start', async (_event, shop) => startOAuth(shop));
  ipcMain.handle('oauth:list', async () => listShops());
  ipcMain.handle('oauth:getActive', async () => getActiveShopCredentials());
  ipcMain.handle('oauth:setActive', async (_event, shop) => {
    writeActiveShop(shop || '');
    const token = shop ? await getTokenForShop(shop) : '';
    return { shop: shop || '', token: token || '' };
  });
  ipcMain.handle('oauth:setClientCreds', async (_event, id, secret) => {
    await setClientCreds(id, secret);
    return { ok: true };
  });
  ipcMain.handle('oauth:getClientCreds', async () => getClientCreds());
  ipcMain.handle('oauth:setToken', async (_event, shop, token) => setShopToken(shop, token));
  ipcMain.handle('automations:list', async () => listAutomations());
  ipcMain.handle('automations:save', async (_event, payload) => saveAutomation(payload || {}));
  ipcMain.handle('automations:update', async (_event, payload) => updateAutomation(payload || {}));
  ipcMain.handle('orders:list', async (_event, limit = 1) => listOrderResults(limit || 1));
  ipcMain.handle('orders:saveResult', async (_event, payload) => saveOrderResults(payload || {}));
  ipcMain.handle('ordersCreated:list', async (_event, limit = 1) => listCreatedOrders(limit || 1));
  ipcMain.handle('ordersCreated:save', async (_event, payload) => saveCreatedOrders(payload || {}));
  console.log('[main] IPC handlers registered');
};

registerIpcHandlers();
app.on('ready', registerIpcHandlers);

app.whenReady().then(() => {
  createWindow();

  // Simple scheduler loop
  const TICK_MS = 60 * 1000;
  const runSchedulerTick = async () => {
    try {
      const automations = (await listAutomations()) || [];
      const now = Date.now();
      for (const auto of automations) {
        const enabled = auto.enabled === undefined ? 1 : auto.enabled;
        const nextRunMs = auto.next_run ? Date.parse(auto.next_run) : null;
        const endAtMs = auto.end_at ? Date.parse(auto.end_at) : null;
        if (!enabled) continue;
        if (endAtMs && now > endAtMs) {
          await updateAutomation({ id: auto.id, enabled: 0 });
          continue;
        }
        if (nextRunMs !== null && now < nextRunMs) {
          continue;
        }

        // Notify renderer to execute the automation (search + action)
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.send('automation:run', {
            id: auto.id,
            search_query: auto.search_query,
            action: auto.action,
            orders_snapshot: auto.orders_snapshot || []
          });
        }

        const intervalDays =
          auto.interval_days !== undefined && auto.interval_days !== null
            ? Number(auto.interval_days)
            : 1;
        const nextRun = new Date(now + intervalDays * 24 * 60 * 60 * 1000).toISOString();
        await updateAutomation({
          id: auto.id,
          last_run: new Date(now).toISOString(),
          next_run: nextRun
        });
      }
    } catch (err) {
      console.error('[scheduler] tick failed:', err);
    }
  };

  setInterval(runSchedulerTick, TICK_MS);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
