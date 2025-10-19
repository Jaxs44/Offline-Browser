const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('open-file'),
  duplicateWindow: () => ipcRenderer.invoke('duplicate-window'),
  duplicateWindowWithUrl: (url) => ipcRenderer.invoke('duplicate-window-with-url', url),
  setFullscreen: (flag) => ipcRenderer.invoke('set-fullscreen', flag),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  getDownloadPath: () => ipcRenderer.invoke('get-download-path'),
  setDownloadPath: () => ipcRenderer.invoke('set-download-path'),
  saveScreenshotDialog: () => ipcRenderer.invoke('save-screenshot-dialog'),
  takeScreenshot: (savePath) => ipcRenderer.invoke('take-screenshot', savePath),
  toggleDevTools: () => ipcRenderer.invoke('toggle-devtools'),
  showAbout: () => ipcRenderer.invoke('show-about'),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  onLoadUrl: (callback) => ipcRenderer.on('load-url', (event, url) => callback(url))
});