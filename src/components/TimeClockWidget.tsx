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
    setState(current => current.clockedIn
      ? { clockedIn: false, startedAt: null, lastClockOutAt: Date.now() }
      : { clockedIn: true, startedAt: Date.now(), lastClockOutAt: current.lastClockOutAt || null })
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
