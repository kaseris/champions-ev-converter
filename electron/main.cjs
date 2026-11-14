const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

// Only pokepast.es raw pastes may be fetched through the main process
ipcMain.handle('fetch-text', async (_event, url) => {
  if (!/^https:\/\/pokepast\.es\/[a-z0-9]+\/raw$/i.test(url)) throw new Error('Only pokepast.es URLs are allowed')
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
})

function create_window() {
  const window = new BrowserWindow({
    width: 1000,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  const dev_url = process.env.ELECTRON_DEV_URL
  if (dev_url) window.loadURL(dev_url)
  else window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(() => {
  create_window()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) create_window()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
