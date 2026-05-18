const { app, BrowserWindow, session } = require('electron')
const path = require('path')

// ---------------------------------------------------------------------------
// DEV: Local FreePBX hosts.
// Trust every port on these IPs — Asterisk surfaces the same self-signed cert
// through WSS/HTTPS and WebRTC-adjacent requests during call setup / re-INVITE.
// Add new VM IPs here if FreePBX VM address changes again.
// ---------------------------------------------------------------------------
const DEV_FREEPBX_HOSTS = new Set(['192.168.0.111', '192.168.0.104'])

const WEBRTC_IP_POLICY = 'default_public_and_private_interfaces'

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
// DEV ONLY — blanket cert bypass for local FreePBX self-signed WSS cert.
// Remove before shipping a production build against public SIP providers.
// ---------------------------------------------------------------------------
app.commandLine.appendSwitch('ignore-certificate-errors')
app.commandLine.appendSwitch('allow-insecure-localhost', 'true')

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
    if (DEV_FREEPBX_HOSTS.has(request.hostname)) {
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
  if (isTrustedFreepbxUrl(url)) {
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
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: true, // needed for local HTTP/WS in dev
    },
    icon: path.join(__dirname, '../public/icon.png'),
    title: 'PTDT Dialer',
  })

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

  // Apply WebRTC IP policy per-window as well (belt-and-suspenders with the
  // app-level commandLine switch above).
  if (typeof win.webContents.setWebRTCIPHandlingPolicy === 'function') {
    win.webContents.setWebRTCIPHandlingPolicy(WEBRTC_IP_POLICY)
    console.log('[DEV] WebRTC IP handling policy:', win.webContents.getWebRTCIPHandlingPolicy())
  }

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

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