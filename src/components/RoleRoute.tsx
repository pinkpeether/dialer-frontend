import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, type UserRole } from '../store/auth.store'
import { normalizeRole } from '../utils/roleRoutes'

interface RoleRouteProps {
  children: React.ReactNode
  roles?: UserRole[]
}

const supportedRoles: UserRole[] = ['SUPER_ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR', 'AGENT']

export default function RoleRoute({ children, roles }: RoleRouteProps) {
  const userRole = useAuthStore(s => s.user?.role)
  const location = useLocation()
  const role = normalizeRole(userRole)

  const allowedRoles = roles || supportedRoles
  const isAllowed = Boolean(role && allowedRoles.includes(role))

  if (!isAllowed) {
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
