import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useSipStore } from '../store/sip.store'
import { useAuthStore } from '../store/auth.store'
import { authAPI } from '../api/auth.api'
import PtdtDialog from './PtdtDialog'
import DynamicCallerIdDialerSelector from './DynamicCallerIdDialerSelector'

export default function Layout() {
  const sipConfig = useSipStore(s => s.config)
  const sipStatus = useSipStore(s => s.status)
  const registerSip = useSipStore(s => s.register)
  const unregisterSip = useSipStore(s => s.unregister)
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const autoRegisterKeyRef = useRef('')
  const autoRegisterInFlightRef = useRef(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  useEffect(() => {
    const ready = Boolean(
      sipConfig.enabled &&
      sipConfig.username &&
      sipConfig.password &&
      sipConfig.domain &&
      sipConfig.webSocketServer,
    )
    const key = ready
      ? `${sipConfig.username}|${sipConfig.domain}|${sipConfig.webSocketServer}`
      : ''

    if (!ready) {
      autoRegisterKeyRef.current = ''
      return
    }

    if (!['idle', 'configured'].includes(sipStatus)) return
    if (autoRegisterKeyRef.current === key) return
    if (autoRegisterInFlightRef.current) return

    autoRegisterKeyRef.current = key
    autoRegisterInFlightRef.current = true
    void registerSip()
      .catch(() => {
        autoRegisterKeyRef.current = ''
      })
      .finally(() => {
        autoRegisterInFlightRef.current = false
      })
  }, [registerSip, sipConfig, sipStatus])

  const requestSignOut = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (!target?.closest('.sidebar-signout')) return
    event.preventDefault()
    event.stopPropagation()
    setConfirmSignOut(true)
  }, [])

  const performSignOut = useCallback(async () => {
    setConfirmSignOut(false)
    await authAPI.logout().catch(() => undefined)
    await unregisterSip().catch(() => undefined)
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate, unregisterSip])

  return (
    <div
      onClickCapture={requestSignOut}
      style={{
        display: 'flex',
        minHeight: '100vh',
        position: 'relative',
        background: 'var(--bg)',
      }}
    >
      <PtdtDialog
        dialog={confirmSignOut ? {
          tone: 'confirm',
          title: 'Sign out confirmation',
          message: 'Kya aap waqai PTDT-Dialer se sign out karna chahte hain?',
          confirmLabel: 'Yes, Sign Out',
          onConfirm: performSignOut,
        } : null}
        onClose={() => setConfirmSignOut(false)}
      />

      {/* PTDT aurora — pink / purple / green orbs */}
      <div className="aurora-bg">
        <div className="aurora-orb-3" />
      </div>
      {/* Grid overlay (visible only in dark = PTDT tokenomics vibe) */}
      <div className="grid-overlay" />

      <Sidebar />
      <DynamicCallerIdDialerSelector />

      <main style={{
        flex: 1,
        marginLeft: 'var(--sidebar-width)',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>

        {/* Footer copyright — always visible */}
        <footer style={{
          padding: '20px 32px',
          borderTop: '1px solid var(--border)',
          marginTop: 'auto',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          fontSize: 11.5,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          flexWrap: 'wrap',
          textAlign: 'center',
          lineHeight: 1.7,
        }}>
          <span>
            Copyrights © <span style={{ color: 'var(--text-2)', fontWeight: 700 }}>PTDT-Dialer</span>
            {' · '}Pink Taxi Group Ltd · United Kingdom. All rights reserved.
            {' · '}
            Trust the <span style={{ color: 'var(--pink)', fontWeight: 700 }}>{'{ Code }'}</span>,{' '}
            <span style={{ color: 'var(--green-2)', fontWeight: 700 }}>// Not the Cult!</span>
          </span>
        </footer>
      </main>
    </div>
  )
}
