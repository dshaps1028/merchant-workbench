const { contextBridge } = require('electron');

// Expose a minimal API for the renderer; add methods here as needed.
contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => 'ready'
});
