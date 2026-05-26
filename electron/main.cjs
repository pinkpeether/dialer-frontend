const { app, BrowserWindow, Menu, session, ipcMain } = require('electron')
const path = require('path')
const { configureAutoUpdater } = require('./updater-service.cjs')

// ---------------------------------------------------------------------------
// DEV: Local FreePBX hosts.
// Trust every port on these IPs — Asterisk surfaces the same self-signed cert
// through WSS/HTTPS and WebRTC-adjacent requests during call setup / re-INVITE.
// Add new VM IPs here if FreePBX VM address changes again.
// ---------------------------------------------------------------------------
const DEV_FREEPBX_HOSTS = new Set(['192.168.0.111', '192.168.0.104', '192.168.0.107'])

const WEBRTC_IP_POLICY = 'default_public_and_private_interfaces'
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const allowLocalCertBypass = isDev || process.env.PTDT_ALLOW_LOCAL_CERT_BYPASS === 'true'
const updaterEnabled = app.isPackaged && process.env.PTDT_DISABLE_AUTO_UPDATES !== 'true'
let updaterControls = null

// ---------------------------------------------------------------------------
// Chromium autoplay policy — allow audio.play() without user gesture.
// Required for SIP.js remote audio to play automatically when call connects.
// ---------------------------------------------------------------------------
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

// ---------------------------------------------------------------------------
// Force Chromium to expose real LAN IPs for WebRTC ICE candidates.
// Prevents VMware host-only adapters (172.x / 192.168.115.x) from leaking
// into the SDP and confusing Asterisk's ICE negotiation on outgoing calls.
// ---------------------------------------------------------------------------
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns')
app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', WEBRTC_IP_POLICY)

// ---------------------------------------------------------------------------
// Local FreePBX cert bypass. Production builds keep public HTTPS certificate
// validation intact unless explicitly opted into local cert bypass.
// ---------------------------------------------------------------------------
if (allowLocalCertBypass) {
  app.commandLine.appendSwitch('allow-insecure-localhost', 'true')
  if (isDev) {
    app.commandLine.appendSwitch('ignore-certificate-errors')
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isTrustedFreepbxUrl(url) {
  try {
    const parsed = new URL(url)
    return DEV_FREEPBX_HOSTS.has(parsed.hostname)
  } catch {
    return typeof url === 'string' &&
      Array.from(DEV_FREEPBX_HOSTS).some(host => url.includes(host))
  }
}

// ---------------------------------------------------------------------------
// Stronger cert-bypass path: hooks into Chromium's network stack directly.
// This fires before WSS/HTTPS verification fails, covering SIP.js + WebRTC.
// ---------------------------------------------------------------------------
function installCertificateBypass() {
  session.defaultSession.setCertificateVerifyProc((request, callback) => {
    if (allowLocalCertBypass && DEV_FREEPBX_HOSTS.has(request.hostname)) {
      console.log('[DEV] Cert bypass for local FreePBX:', request.url || request.hostname)
      callback(0) // 0 = OK
      return
    }
    callback(-3) // -3 = use Chromium's default result
  })
}

// ---------------------------------------------------------------------------
// Fallback cert-bypass path (older Electron builds still emit this event).
// BUG FIX: DEV_FREEPBX_HOSTS is a Set — must use .has(), NOT .includes().
// .includes() is undefined on Set and silently returns undefined (falsy),
// causing the cert to be rejected even for trusted hosts.
// ---------------------------------------------------------------------------
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (allowLocalCertBypass && isTrustedFreepbxUrl(url)) {
    console.log('[DEV] certificate-error bypass for local FreePBX:', url, error)
    event.preventDefault()
    callback(true)
    return
  }
  callback(false)
})

// ---------------------------------------------------------------------------
// Main window
// ---------------------------------------------------------------------------
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: allowLocalCertBypass,
    },
    icon: path.join(__dirname, '../public/icon.png'),
    title: 'PTDT Dialer',
  })

  // Apply WebRTC IP policy per-window as well (belt-and-suspenders with the
  // app-level commandLine switch above).
  if (typeof win.webContents.setWebRTCIPHandlingPolicy === 'function') {
    win.webContents.setWebRTCIPHandlingPolicy(WEBRTC_IP_POLICY)
    console.log('[DEV] WebRTC IP handling policy:', win.webContents.getWebRTCIPHandlingPolicy())
  }

  win.webContents.on('context-menu', (_event, params) => {
    const menu = Menu.buildFromTemplate([
      ...(params.isEditable ? [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ] : [
        { role: 'copy', enabled: params.selectionText.length > 0 },
        { role: 'selectAll' },
      ]),
    ])

    menu.popup({ window: win })
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  if (process.env.OPEN_DEVTOOLS === 'true') {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  if (updaterEnabled) {
    updaterControls = configureAutoUpdater(win)
    if (process.env.PTDT_AUTO_CHECK_UPDATES === 'true') {
      setTimeout(() => {
        void updaterControls?.check().catch(error => {
          win.webContents.send('updater:status', {
            status: 'error',
            message: error?.message || 'Could not check for updates',
          })
        })
      }, 5000)
    }
  }
}

ipcMain.handle('app:get-version', () => app.getVersion())
ipcMain.handle('app:get-platform', () => ({
  platform: process.platform,
  arch: process.arch,
  isPackaged: app.isPackaged,
}))

ipcMain.handle('updater:check', async () => {
  if (!updaterControls) {
    return { status: 'disabled', reason: isDev ? 'Updates are disabled in development.' : 'Updater is not configured.' }
  }
  await updaterControls.check()
  return { status: 'checking' }
})

ipcMain.handle('updater:download', async () => {
  if (!updaterControls) {
    return { status: 'disabled', reason: 'Updater is not configured.' }
  }
  await updaterControls.download()
  return { status: 'downloading' }
})

ipcMain.handle('updater:install', () => {
  if (!updaterControls) {
    return { status: 'disabled', reason: 'Updater is not configured.' }
  }
  updaterControls.quitAndInstall()
  return { status: 'installing' }
})

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(() => {
  installCertificateBypass()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
