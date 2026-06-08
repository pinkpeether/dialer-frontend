const PRODUCTION_BACKEND_URL = 'https://dialer-api.ptdt.taxi'

export function getSocketUrl() {
  const explicit = import.meta.env.VITE_SOCKET_URL as string | undefined
  if (explicit) return explicit.replace(/\/$/, '')

  const apiUrl = import.meta.env.VITE_API_URL as string | undefined
  if (apiUrl) return apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')

  return import.meta.env.PROD ? PRODUCTION_BACKEND_URL : 'http://localhost:3001'
}
