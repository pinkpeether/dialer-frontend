import { clearAllSwr } from '../api/swrCache'
import { queryClient } from '../lib/queryClient'

const exactStorageKeys = new Set([
  'jd_token',
  'jd_user',
  'ptdt-attendance:sessions',
  'ptdt-platform-administration:last-good',
  'ptdt-customer-billing:last-good',
  'ptdt_sip_account_v1',
  'ptdt_sip_audio_output_v1',
  'ptdt_sip_audio_input_v1',
])

const storagePrefixes = [
  'ptdt-api-swr:',
  'ptdt-workforce-intelligence:',
  'ptdt-commercial-control:',
  'ptdt-commercial-control-stable:',
  'ptdt-dialer:',
  'ptdt-timeclock:',
  'ptdt-dashboard:',
  'ptdt-agent-dashboard:',
  'ptdt-agent-management:',
  'ptdt-platform-administration:',
  'ptdt-customer-billing:',
  'ptdt-call-controls:',
  'ptdt-recordings:',
  'ptdt-notifications:',
  'ptdt-deployment-platform:',
  'ptdt-spoofing-management:',
]

const shouldRemoveLocalStorageKey = (key: string) => (
  exactStorageKeys.has(key)
  || storagePrefixes.some(prefix => key.startsWith(prefix))
)

const clearCacheStorage = async () => {
  if (typeof window === 'undefined' || !('caches' in window)) return
  try {
    const keys = await window.caches.keys()
    await Promise.all(keys.map(key => window.caches.delete(key)))
  } catch {
    // Browser cache APIs are best-effort and should never block sign-out.
  }
}

export const clearPtdtSessionCache = async () => {
  queryClient.clear()
  clearAllSwr()

  if (typeof window === 'undefined') return

  try { window.sessionStorage.clear() } catch { /* ignore */ }

  try {
    Object.keys(window.localStorage).forEach(key => {
      if (shouldRemoveLocalStorageKey(key)) window.localStorage.removeItem(key)
    })
  } catch {
    // Local storage cleanup is best-effort.
  }

  await clearCacheStorage()
}
