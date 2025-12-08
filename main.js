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
const { listAutomations, saveAutomation } = require('./db');

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

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('oauth:start', async (_event, shop) => {
    return startOAuth(shop);
  });

  ipcMain.handle('oauth:list', async () => {
    return listShops();
  });

  ipcMain.handle('oauth:getActive', async () => {
    return getActiveShopCredentials();
  });

  ipcMain.handle('oauth:setActive', async (_event, shop) => {
    writeActiveShop(shop || '');
    const token = shop ? await getTokenForShop(shop) : '';
    return { shop: shop || '', token: token || '' };
  });

  ipcMain.handle('oauth:setClientCreds', async (_event, id, secret) => {
    await setClientCreds(id, secret);
    return { ok: true };
  });

  ipcMain.handle('oauth:getClientCreds', async () => {
    const creds = await getClientCreds();
    return creds;
  });

  ipcMain.handle('oauth:setToken', async (_event, shop, token) => {
    const result = await setShopToken(shop, token);
    return result;
  });

  ipcMain.handle('automations:list', async () => {
    return listAutomations();
  });

  ipcMain.handle('automations:save', async (_event, payload) => {
    return saveAutomation(payload || {});
  });

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
