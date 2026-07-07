import { useEffect, useMemo, useState } from 'react'
import { Clock3, LogIn, LogOut } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'

const pad = (value: number) => String(value).padStart(2, '0')

const formatElapsed = (startedAt: number | null) => {
  if (!startedAt) return '00:00:00'
  const total = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

type TimeClockState = {
  clockedIn: boolean
  startedAt: number | null
  lastClockOutAt?: number | null
  sessionId?: string | null
}

type AttendanceSession = {
  id: string
  userId: number | string
  name: string
  email: string
  role: string
  clockInAt: number
  clockOutAt?: number | null
  workedSeconds?: number
  status: 'Clocked-In' | 'Clocked-Out'
  browser: string
  os: string
  timezone: string
}

const attendanceSessionsKey = 'ptdt-attendance:sessions'

const detectBrowser = () => {
  const ua = navigator.userAgent
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Edg/')) return 'Edge'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Safari')) return 'Safari'
  return 'Browser'
}

const detectOs = () => {
  const platform = navigator.platform || navigator.userAgent
  if (/Mac/i.test(platform)) return 'macOS'
  if (/Win/i.test(platform)) return 'Windows'
  if (/Linux/i.test(platform)) return 'Linux'
  if (/iPhone|iPad|iPod/i.test(platform)) return 'iOS'
  if (/Android/i.test(platform)) return 'Android'
  return 'Unknown OS'
}

const readSessions = (): AttendanceSession[] => {
  try {
    const raw = window.localStorage.getItem(attendanceSessionsKey)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeSession = (session: AttendanceSession) => {
  try {
    const sessions = readSessions().filter(item => item.id !== session.id)
    window.localStorage.setItem(attendanceSessionsKey, JSON.stringify([session, ...sessions].slice(0, 300)))
  } catch {
    /* ignore */
  }
}

export default function TimeClockWidget() {
  const user = useAuthStore(state => state.user)
  const storageKey = useMemo(() => `ptdt-timeclock:${user?.id || 'guest'}`, [user?.id])
  const [state, setState] = useState<TimeClockState>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      return raw ? { clockedIn: false, startedAt: null, ...JSON.parse(raw) } : { clockedIn: false, startedAt: null }
    } catch {
      return { clockedIn: false, startedAt: null }
    }
  })
  const [, tick] = useState(0)

  const eligible = user?.role === 'AGENT' || user?.role === 'SUPERVISOR'

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(state)) } catch { /* ignore */ }
  }, [state, storageKey])

  useEffect(() => {
    if (!state.clockedIn) return undefined
    const timer = window.setInterval(() => tick(value => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [state.clockedIn])

  if (!eligible) return null

  const toggle = () => {
    setState(current => {
      const now = Date.now()
      const userId = user?.id || 'guest'
      const sessionId = current.sessionId || `att-${userId}-${now}`

      if (current.clockedIn) {
        const workedSeconds = current.startedAt ? Math.max(0, Math.floor((now - current.startedAt) / 1000)) : 0
        writeSession({
          id: sessionId,
          userId,
          name: user?.name || user?.email || 'PTDT User',
          email: user?.email || '',
          role: user?.role || 'USER',
          clockInAt: current.startedAt || now,
          clockOutAt: now,
          workedSeconds,
          status: 'Clocked-Out',
          browser: detectBrowser(),
          os: detectOs(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local',
        })
        return { clockedIn: false, startedAt: null, lastClockOutAt: now, sessionId: null }
      }

      writeSession({
        id: sessionId,
        userId,
        name: user?.name || user?.email || 'PTDT User',
        email: user?.email || '',
        role: user?.role || 'USER',
        clockInAt: now,
        clockOutAt: null,
        workedSeconds: 0,
        status: 'Clocked-In',
        browser: detectBrowser(),
        os: detectOs(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local',
      })
      return { clockedIn: true, startedAt: now, lastClockOutAt: current.lastClockOutAt || null, sessionId }
    })
  }

  return (
    <div className="ptdt-timeclock-widget">
      <div className="ptdt-timeclock-icon"><Clock3 size={15} /></div>
      <div>
        <div className="mono ptdt-timeclock-label">{state.clockedIn ? 'CLOCKED IN' : 'CLOCKED OUT'}</div>
        <strong>{formatElapsed(state.startedAt)}</strong>
      </div>
      <button type="button" onClick={toggle} className={state.clockedIn ? 'is-out' : 'is-in'}>
        {state.clockedIn ? <LogOut size={13} /> : <LogIn size={13} />}
        {state.clockedIn ? 'Clock Out' : 'Clock In'}
      </button>
    </div>
  )
}
