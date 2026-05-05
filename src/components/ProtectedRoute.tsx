import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'

export default function ProtectedRoute({
  children
}: { children: React.ReactNode }) {
  const isAuth = useAuthStore(s => s.isAuth)
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />
}