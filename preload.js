const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal, well-defined API for the popup and settings windows.
// This keeps renderer code away from direct ipcRenderer usage and main process internals.
contextBridge.exposeInMainWorld('clipboardBuddy', {
  // History
  getHistory: () => ipcRenderer.invoke('history:get'),
  selectItem: (payload) => ipcRenderer.invoke('history:select', payload),
  addPersistentFromClipboard: () => ipcRenderer.invoke('history:addBelowFromClipboard'),
  removePersistent: (index) => ipcRenderer.invoke('history:removeBelow', index),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (partial) => ipcRenderer.invoke('settings:update', partial),

  // Popup sizing
  setPopupHeight: (height) => ipcRenderer.invoke('popup:setHeight', height)
});
