const { autoUpdater } = require('electron-updater')

function sendStatus(mainWindow, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('updater:status', payload)
}

function configureAutoUpdater(mainWindow) {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => {
    sendStatus(mainWindow, { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    sendStatus(mainWindow, { status: 'available', info })
  })

  autoUpdater.on('update-not-available', (info) => {
    sendStatus(mainWindow, { status: 'not-available', info })
  })

  autoUpdater.on('error', (error) => {
    sendStatus(mainWindow, {
      status: 'error',
      message: error?.message || 'Updater error',
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    sendStatus(mainWindow, { status: 'downloading', progress })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendStatus(mainWindow, { status: 'downloaded', info })
  })

  return {
    check: () => autoUpdater.checkForUpdates(),
    download: () => autoUpdater.downloadUpdate(),
    quitAndInstall: () => autoUpdater.quitAndInstall(false, true),
  }
}

module.exports = { configureAutoUpdater }
