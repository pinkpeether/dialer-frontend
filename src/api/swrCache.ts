import type { AxiosRequestConfig } from 'axios'

export type SwrAxiosRequestConfig = AxiosRequestConfig & {
  ptdtSilentOverlay?: boolean
}

type SwrRecord<T> = {
  savedAt: number
  data: T
}

const memory = new Map<string, SwrRecord<unknown>>()
const prefix = 'ptdt-api-swr:'
const defaultMaxAgeMs = 30 * 60 * 1000

const currentUserCacheScope = () => {
  if (typeof window === 'undefined') return 'guest'
  try {
    const raw = window.localStorage.getItem('jd_user')
    const user = raw ? JSON.parse(raw) as { id?: number; role?: string } : null
    return user?.id ? `user:${user.role || 'USER'}:${user.id}` : 'guest'
  } catch {
    return 'guest'
  }
}

const storageKey = (key: string) => `${prefix}${key}`

const stableValue = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(stableValue)
  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      const item = (value as Record<string, unknown>)[key]
      if (item !== undefined && item !== null && String(item).trim?.() !== '') {
        acc[key] = stableValue(item)
      }
      return acc
    }, {})
}

export const swrKey = (scope: string, params?: unknown) => `${currentUserCacheScope()}:${scope}:${JSON.stringify(stableValue(params || {}))}`

export const silentOverlayConfig = <T extends AxiosRequestConfig>(config?: T): T & SwrAxiosRequestConfig => ({
  ...(config || {} as T),
  ptdtSilentOverlay: true,
} as T & SwrAxiosRequestConfig)

const read = <T>(key: string, maxAgeMs = defaultMaxAgeMs): T | null => {
  const cached = memory.get(key) as SwrRecord<T> | undefined
  const now = Date.now()
  if (cached && now - cached.savedAt < maxAgeMs) return cached.data
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(storageKey(key))
    if (!raw) return null
    const stored = JSON.parse(raw) as SwrRecord<T>
    if (!stored?.savedAt || now - stored.savedAt > maxAgeMs) return null
    memory.set(key, stored)
    return stored.data
  } catch {
    return null
  }
}

export const writeSwr = <T>(key: string, data: T) => {
  const record: SwrRecord<T> = { savedAt: Date.now(), data }
  memory.set(key, record)
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(storageKey(key), JSON.stringify(record)) } catch { /* best-effort cache */ }
}

export const removeSwr = (key: string) => {
  memory.delete(key)
  if (typeof window !== 'undefined') window.localStorage.removeItem(storageKey(key))
}

export const clearSwrByPrefix = (scope: string) => {
  const fullPrefix = `${scope}:`
  Array.from(memory.keys()).forEach(key => {
    if (key.startsWith(fullPrefix) || key.includes(`:${fullPrefix}`)) memory.delete(key)
  })
  if (typeof window === 'undefined') return
  Object.keys(window.localStorage).forEach(key => {
    if (key.startsWith(storageKey(fullPrefix)) || (key.startsWith(prefix) && key.includes(`:${fullPrefix}`))) {
      window.localStorage.removeItem(key)
    }
  })
}

export const swr = async <T>(
  key: string,
  request: (options: { silent: boolean }) => Promise<T>,
  options: { maxAgeMs?: number; silent?: boolean } = {},
): Promise<T> => {
  const cached = read<T>(key, options.maxAgeMs)
  if (cached) {
    void request({ silent: true }).then(data => writeSwr(key, data)).catch(() => undefined)
    return cached
  }

  const data = await request({ silent: Boolean(options.silent) })
  writeSwr(key, data)
  return data
}
