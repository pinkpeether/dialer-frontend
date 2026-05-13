const { app, BrowserWindow } = require('electron')
const path = require('path')

const DEV_FREEPBX_HOST = '192.168.0.111'

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  try {
    const parsed = new URL(url)

    const isLocalFreePBX =
      parsed.hostname === DEV_FREEPBX_HOST &&
      parsed.port === '8089'

    if (isLocalFreePBX) {
      console.log('[DEV] Trusting local FreePBX certificate:', url, error)
      event.preventDefault()
      callback(true)
      return
    }
  } catch {
    // fall through
  }

  callback(false)
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../public/icon.png'),
    title: 'PTDT Dialer',
  })

  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})