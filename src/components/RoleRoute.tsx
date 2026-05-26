import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, type UserRole } from '../store/auth.store'
import { canAgentAccessPath, normalizeRole } from '../utils/roleRoutes'

interface RoleRouteProps {
  children: React.ReactNode
  roles?: UserRole[]
}

export default function RoleRoute({ children, roles }: RoleRouteProps) {
  const userRole = useAuthStore(s => s.user?.role)
  const location = useLocation()
  const role = normalizeRole(userRole)

  const isAllowed = roles
    ? Boolean(role && roles.includes(role))
    : role === 'AGENT'
      ? canAgentAccessPath(location.pathname)
      : true

  if (!isAllowed) {
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
