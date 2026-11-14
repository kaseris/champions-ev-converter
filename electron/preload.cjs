const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  fetch_text: url => ipcRenderer.invoke('fetch-text', url)
})
