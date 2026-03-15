const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('moneyman', {
  getState: () => ipcRenderer.invoke('get-state'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (cfg) => ipcRenderer.invoke('set-config', cfg),
  runNow: () => ipcRenderer.invoke('run-now'),
  onStateUpdate: (fn) => {
    ipcRenderer.on('state-update', (_e, state) => fn(state));
  },
});
