export {}

declare global {
  interface Window {
    ptdtDesktop?: {
      getAppVersion: () => Promise<string>
      getPlatform: () => Promise<{
        platform: string
        arch: string
        isPackaged: boolean
      }>
      onUpdaterStatus: (callback: (payload: {
        status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
        message?: string
        info?: unknown
        progress?: { percent?: number }
      }) => void) => () => void
      checkForUpdates: () => Promise<{ status: string; reason?: string }>
      downloadUpdate: () => Promise<{ status: string; reason?: string }>
      installUpdate: () => Promise<{ status: string; reason?: string }>
    }
  }
}
