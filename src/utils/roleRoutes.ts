import type { UserRole } from '../store/auth.store'

const AGENT_ROUTES = [
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
  const normalized = normalizeRole(role)
  if (normalized === 'AGENT') return '/agent/workspace'
  if (normalized === 'SUPER_ADMIN' || normalized === 'ADMIN') return '/platform/administration'
  if (normalized === 'CUSTOMER_ADMIN' || normalized === 'MANAGER') return '/billing'
  return '/dashboard'
}

export function canAgentAccessPath(pathname: string) {
  return AGENT_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))
}
