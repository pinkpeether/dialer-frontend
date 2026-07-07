import axios from 'axios'
import {
  beginGlobalRequestOverlay,
  endGlobalRequestOverlay,
} from '../services/globalRequestOverlay'

const PRODUCTION_API_URL = 'https://dialer-api.ptdt.taxi/api'

const apiBaseURL =
  import.meta.env.VITE_API_URL ||
  (
    import.meta.env.PROD
      ? PRODUCTION_API_URL
      : 'http://localhost:3001/api'
  )

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 15000,
})

const overlayIds = new WeakMap<object, number>()
const GLOBAL_OVERLAY_SUPPRESS_KEY = 'ptdt:suppress-global-overlay'

const managedGetPrefixes = [
  '/administration',
  '/agent-management',
  '/advanced-dialing',
  '/commercial-control',
  '/contact-management-pro',
  '/ai-calls',
  '/dialer',
  '/agents',
  '/campaigns',
  '/contacts',
  '/call-controls',
  '/calls',
  '/callbacks',
  '/call-intelligence',
  '/ops',
  '/monitoring',
  '/reports',
  '/reports-analytics-pro',
  '/recordings',
  '/recording-storage-pro',
  '/audit-logs',
  '/security-admin-pro',
  '/deployment-platform-pro',
  '/dnc',
  '/support',
  '/ui-ux-pro',
  '/dynamic-caller-id',
  '/customer-onboarding',
  '/account-review',
  '/attendance-integrity',
  '/live-monitoring-advanced',
  '/live-ai',
  '/notifications-alerts-pro',
  '/sms',
]

const silentGetPrefixes = [
  '/auth/profile',
  '/notifications',
]

const silentRequestPrefixes = [
  '/auth/logout',
  '/dialer/call/backend-hangup',
]

const normalizedPath = (url?: string) => {
  if (!url) return ''
  try {
    const parsed = new URL(url, apiBaseURL)
    return parsed.pathname.replace(/^\/api(?=\/)/, '').toLowerCase()
  } catch {
    return url.split('?')[0].replace(/^\/api(?=\/)/, '').toLowerCase()
  }
}

const requestVerb = (method?: string) => (method || 'get').toLowerCase()

const pathStartsWith = (path: string, prefixes: string[]) => prefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`))

export const setGlobalRequestOverlaySuppressed = (suppressed: boolean) => {
  try {
    if (suppressed) window.sessionStorage.setItem(GLOBAL_OVERLAY_SUPPRESS_KEY, '1')
    else window.sessionStorage.removeItem(GLOBAL_OVERLAY_SUPPRESS_KEY)
  } catch {
    // Best-effort UI preference only.
  }
}

const isPtdtModalOpen = () => {
  try {
    return Boolean(document.querySelector('[data-ptdt-dialog-open="true"], [data-ptdt-modal-open="true"]'))
  } catch {
    return false
  }
}

const isGlobalOverlaySuppressed = () => {
  try {
    return window.sessionStorage.getItem(GLOBAL_OVERLAY_SUPPRESS_KEY) === '1' || isPtdtModalOpen()
  } catch {
    return false
  }
}

const shouldTrackRequest = (method: string, path: string) => {
  if (isGlobalOverlaySuppressed()) return false
  if (!path || pathStartsWith(path, silentRequestPrefixes)) return false
  if (method === 'get') {
    if (pathStartsWith(path, silentGetPrefixes)) return false
    return pathStartsWith(path, managedGetPrefixes)
  }
  return true
}

const overlayTextFor = (method: string, path: string) => {
  if (path.includes('/commercial-control/admin/accounts') || path.includes('/administration/platform/overview')) {
    return { message: 'Fetching commercial accounts...', followupMessage: 'Preparing account list...', successMessage: 'Accounts ready' }
  }
  if (path.includes('/dynamic-caller-id')) {
    return { message: 'Loading Dynamic Caller ID data...', followupMessage: 'Almost done...', successMessage: 'Account loaded' }
  }
  if (path.includes('/export') || path.includes('.csv') || path.includes('/backup/export')) {
    return { message: 'Preparing download...', followupMessage: 'Packaging file...', successMessage: 'Download ready' }
  }
  if (method === 'delete') return { message: 'Removing item...', followupMessage: 'Finalizing removal...', successMessage: 'Removed' }
  if (method === 'post') return { message: 'Submitting request...', followupMessage: 'Applying changes...', successMessage: 'Request complete' }
  if (method === 'patch' || method === 'put') return { message: 'Applying changes...', followupMessage: 'Almost done...', successMessage: 'Changes saved' }
  return { message: 'Loading data...', followupMessage: 'Almost done...', successMessage: 'Data loaded' }
}

// Request interceptor — token attach karo
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jd_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const ptdtConfig = config as typeof config & { ptdtSilentOverlay?: boolean }
  const method = requestVerb(config.method)
  const path = normalizedPath(config.url)
  if (!ptdtConfig.ptdtSilentOverlay && shouldTrackRequest(method, path)) {
    const delayMs = method === 'get' ? 520 : 220
    const overlayId = beginGlobalRequestOverlay({ ...overlayTextFor(method, path), delayMs })
    overlayIds.set(config, overlayId)
  }

  return config
})

// Response interceptor — 401 par HashRouter-safe logout
api.interceptors.response.use(
  (response) => {
    const overlayId = overlayIds.get(response.config)
    endGlobalRequestOverlay(overlayId, true)
    return response
  },
  (error) => {
    const overlayId = error.config ? overlayIds.get(error.config) : null
    endGlobalRequestOverlay(overlayId, false)

    const apiMessage = error.response?.data?.message || error.response?.data?.error
    if (apiMessage && error instanceof Error) {
      error.message = apiMessage
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('jd_token')
      localStorage.removeItem('jd_user')

      // HashRouter + Electron safe redirect.
      if (window.location.hash !== '#/login') {
        window.location.hash = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
