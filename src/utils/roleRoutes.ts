import type { UserRole } from '../store/auth.store'

const AGENT_ROUTES = [
  '/dashboard',
  '/agent/workspace',
  '/dialer',
  '/live-ai',
  '/calls',
  '/callbacks',
  '/notifications-alerts-pro',
  '/settings',
]

export function normalizeRole(role?: string | null): UserRole | null {
  const next = role?.toUpperCase()
  if (
    next === 'SUPER_ADMIN' ||
    next === 'ADMIN' ||
    next === 'CUSTOMER_ADMIN' ||
    next === 'MANAGER' ||
    next === 'SUPERVISOR' ||
    next === 'AGENT'
  ) {
    return next
  }
  return null
}

export function defaultRouteForRole(role?: string | null) {
  return normalizeRole(role) === 'AGENT' ? '/agent/workspace' : '/dashboard'
}

export function canAgentAccessPath(pathname: string) {
  return AGENT_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))
}
