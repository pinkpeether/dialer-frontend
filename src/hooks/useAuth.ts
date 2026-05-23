import { useAuthStore } from '../store/auth.store'
import { authAPI } from '../api/auth.api'
import { useNavigate } from 'react-router-dom'

export const useAuth = () => {
  const { user, token, isAuth, setAuth, logout } = useAuthStore()
  const navigate = useNavigate()

  const login = async (email: string, password: string) => {
    const data = await authAPI.login(email, password)
    setAuth(data.user, data.token)
    navigate('/dashboard')
    return data
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch {
      // Local logout must still complete if the backend session is unreachable.
    }
    logout()
    navigate('/login')
  }

  return { user, token, isAuth, login, logout: handleLogout }
}
