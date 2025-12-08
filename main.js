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
  listOrderResults,
  saveOrderResults,
  listCreatedOrders,
  saveCreatedOrders
} = require('./db');

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
