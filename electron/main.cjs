const { app, BrowserWindow } = require('electron')
const path = require('path')

// ---------------------------------------------------------------------------
// DEV: Local FreePBX host — trust ALL ports on this IP.
// Asterisk's self-signed cert causes code:1006 WebSocket drops during
// outgoing call ICE/re-INVITE if only port 8089 is trusted.
// ---------------------------------------------------------------------------
const DEV_FREEPBX_HOST = '192.168.0.111'

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  try {
    const parsed = new URL(url)

    const isLocalFreePBX = parsed.hostname === DEV_FREEPBX_HOST

    if (isLocalFreePBX) {
      console.log('[DEV] Trusting local FreePBX certificate:', url, error)
      event.preventDefault()
      callback(true)
      return
    }
  } catch {
    // fall through to default rejection
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
