import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
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

// Response interceptor — 401 par logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('jd_token')
      localStorage.removeItem('jd_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api