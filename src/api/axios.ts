import axios from 'axios'

const apiBaseURL =
  import.meta.env.VITE_API_URL ||
  (
    import.meta.env.PROD
      ? 'https://dialer-backend-production-2a23.up.railway.app/api'
      : 'http://localhost:3001/api'
  )

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 15000,
})

// Request interceptor — token attach karo
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jd_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — 401 par HashRouter-safe logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
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