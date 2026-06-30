import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Wrench } from 'lucide-react'
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
  const userRole = useAuthStore(s => s.user?.role)
  const navigate = useNavigate()
  const autoRegisterKeyRef = useRef('')
  const autoRegisterInFlightRef = useRef(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const showAgentVoiceLink = String(userRole || '').toUpperCase() === 'AGENT'

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

  const performSignOut = useCallback(() => {
    const token = localStorage.getItem('jd_token')
    setConfirmSignOut(false)
    logout()
    navigate('/login', { replace: true })
    void authAPI.logout(token).catch(() => undefined)
    void unregisterSip().catch(() => undefined)
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
          message: 'Are you sure you want to sign out of PTDT-Dialer?',
          confirmLabel: 'Yes, Sign Out',
          onConfirm: performSignOut,
        } : null}
        onClose={() => setConfirmSignOut(false)}
      />

      <div className="aurora-bg">
        <div className="aurora-orb-3" />
      </div>
      <div className="grid-overlay" />

      <Sidebar />
      {showAgentVoiceLink && (
        <NavLink
          to="/sip-settings"
          style={{
            position: 'fixed',
            left: 14,
            bottom: 172,
            width: 'calc(var(--sidebar-width) - 28px)',
            minHeight: 38,
            borderRadius: 16,
            border: '1px solid rgba(128,87,215,0.30)',
            background: 'linear-gradient(135deg, rgba(128,87,215,0.18), rgba(128,87,215,0.08))',
            color: '#8057d7',
            zIndex: 36,
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '8px 12px',
            textDecoration: 'none',
            fontSize: 12.8,
            fontWeight: 900,
            boxShadow: '0 8px 18px rgba(128,87,215,0.14)',
            boxSizing: 'border-box',
          }}
        >
          <span className="sidebar-icon-shell" style={{ color: '#8057d7' }}><Wrench size={16} /></span>
          <span style={{ lineHeight: 1.25, flex: 1 }}>Voice Settings</span>
        </NavLink>
      )}
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
          </span>
        </footer>
      </main>
    </div>
  )
}
