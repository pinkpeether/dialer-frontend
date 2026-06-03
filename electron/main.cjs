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

app.setName('PTDT Dialer')

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

function buildAboutHtml() {
  const version = app.getVersion()

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>About PTDT Dialer</title>
  <style>
    :root {
      color-scheme: light;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f7f7f9;
      color: #1f2937;
      overflow: hidden;
    }

    .about-card {
      width: 100%;
      padding: 18px 26px 16px;
      text-align: center;
      box-sizing: border-box;
    }

    .title {
      margin: 0 0 4px;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #111827;
    }

    .version {
      margin: 0 0 8px;
      font-size: 13px;
      color: #6b7280;
      font-weight: 600;
    }

    .separator {
      margin: 8px auto;
      color: #9ca3af;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      line-height: 1;
      white-space: pre;
      letter-spacing: -0.04em;
    }

    .dedication {
      margin: 0;
      font-size: 13px;
      line-height: 1.42;
      color: #374151;
      font-weight: 600;
    }

    .dedication strong {
      display: block;
      margin: 1px 0;
      font-size: 16px;
      line-height: 1.25;
      color: #111827;
      font-weight: 800;
    }

    .copyright {
      margin: 0;
      font-size: 11px;
      line-height: 1.35;
      color: #6b7280;
      font-weight: 600;
      white-space: nowrap;
    }

    .close-button {
      margin-top: 12px;
      min-width: 92px;
      border: 0;
      border-radius: 999px;
      padding: 7px 16px;
      font-size: 12px;
      font-weight: 700;
      color: #ffffff;
      background: #111827;
      cursor: pointer;
    }

    .close-button:hover {
      background: #374151;
    }
  </style>
</head>
<body>
  <main class="about-card">
    <h1 class="title">PTDT Dialer</h1>
    <p class="version">Version ${version} (${version})</p>

    <div class="separator">--------------------------------------------</div>

    <p class="dedication">
      This product is dedicated to the one &amp; only!
      <strong>Shaikh Mohammad Saleem</strong>
      Dedicated by his Son -SMZ
    </p>

    <div class="separator">--------------------------------------------</div>

    <p class="copyright">Copyrights © 2026 Peether - PTDT | Pink Taxi Group LTD. UK. All rights reserved.</p>

    <button class="close-button" type="button" onclick="window.close()">Close</button>
  </main>
</body>
</html>`
}

function showAboutWindow() {
  const parentWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null
  const aboutWindow = new BrowserWindow({
    width: 520,
    height: 310,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    fullscreenable: false,
    title: 'About PTDT Dialer',
    parent: parentWindow || undefined,
    modal: Boolean(parentWindow),
    show: false,
    backgroundColor: '#f7f7f9',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  aboutWindow.removeMenu()
  aboutWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildAboutHtml())}`)
  aboutWindow.once('ready-to-show', () => {
    aboutWindow.show()
  })
}

function installApplicationMenu() {
  const template = process.platform === 'darwin'
    ? [
        {
          label: app.name,
          submenu: [
            { label: 'About PTDT Dialer', click: showAboutWindow },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
        { role: 'editMenu' },
        { role: 'viewMenu' },
        { role: 'windowMenu' },
        {
          role: 'help',
          submenu: [],
        },
      ]
    : [
        {
          label: 'File',
          submenu: [
            { role: 'quit' },
          ],
        },
        { role: 'editMenu' },
        { role: 'viewMenu' },
        {
          label: 'Help',
          submenu: [
            { label: 'About PTDT Dialer', click: showAboutWindow },
          ],
        },
      ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
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
  installApplicationMenu()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
