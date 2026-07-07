import { useCallback, useEffect, useState } from 'react'
import { LogOut, ShieldCheck } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { useSipStore } from '../store/sip.store'
import { authAPI } from '../api/auth.api'
import NotificationBell from './NotificationBell'
import PtdtDialog, { type PtdtDialogState } from './PtdtDialog'
import { markPresenceOfflineBeforeLogout } from '../hooks/useAgentPresence'
import { useSocket } from '../hooks/useSocket'
import TimeClockWidget from './TimeClockWidget'

const roleLabel = (role?: string) => {
  if (role === 'CUSTOMER_ADMIN') return 'Customer Admin'
  if (role === 'SUPERVISOR') return 'Supervisor'
  if (role === 'AGENT') return 'Agent'
  if (role === 'SUPER_ADMIN') return 'PTDT Super Admin'
  if (role === 'ADMIN') return 'PTDT Admin'
  return role || 'Account'
}

export default function TopOperatorActions() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(state => state.user)
  const sipConfig = useSipStore(state => state.config)
  const sipStatus = useSipStore(state => state.status)
  const logout = useAuthStore(state => state.logout)
  const unregisterSip = useSipStore(state => state.unregister)
  const socket = useSocket()
  const [connected, setConnected] = useState(Boolean(socket.isConnected))
  const [dialog, setDialog] = useState<PtdtDialogState | null>(null)
  const isDialerPage = location.pathname === '/dialer'
  const showTimeClock = user?.role === 'AGENT' || user?.role === 'SUPERVISOR'
  const roleCardClass = user?.role === 'SUPERVISOR'
    ? ' is-supervisor'
    : user?.role === 'AGENT'
      ? ' is-agent'
      : ''
  const sipLabel = sipConfig.enabled
    ? sipStatus === 'registered'
      ? 'SIP Registered'
      : sipStatus === 'in_call'
        ? 'SIP In Call'
        : sipStatus === 'calling'
          ? 'SIP Calling'
          : 'SIP Offline'
    : 'SIP Disabled'
  const sipColor = sipStatus === 'registered' || sipStatus === 'in_call' || sipStatus === 'calling'
    ? 'var(--green-2)'
    : 'var(--text-3)'

  useEffect(() => {
    setConnected(Boolean(socket.isConnected))
    const cleanupConnect = socket.on('connect', () => setConnected(true))
    const cleanupDisconnect = socket.on('disconnect', () => setConnected(false))
    const timer = window.setInterval(() => setConnected(Boolean(socket.isConnected)), 2000)
    return () => {
      cleanupConnect()
      cleanupDisconnect()
      window.clearInterval(timer)
    }
  }, [socket])

  const performSignOut = useCallback(() => {
    const sessionToken = localStorage.getItem('jd_token')
    setDialog(null)
    markPresenceOfflineBeforeLogout()
    logout()
    navigate('/login', { replace: true })
    void authAPI.logout(sessionToken).catch(() => undefined)
    void unregisterSip().catch(() => undefined)
  }, [logout, navigate, unregisterSip])

  const requestSignOut = () => {
    setDialog({
      tone: 'confirm',
      title: 'Sign out?',
      message: 'Are you sure you want to sign out of PTDT Dialer?',
      confirmLabel: 'Sign Out',
      onConfirm: performSignOut,
    })
  }

  return (
    <>
      <div className={`ptdt-top-operator-actions${isDialerPage ? ' is-dialer-page' : ''}`}>
        <div className="ptdt-top-operator-row" style={{ width: '100%', justifyContent: showTimeClock ? 'space-between' : 'flex-end' }}>
          {showTimeClock && <TimeClockWidget />}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            {isDialerPage && (
              <div className="ptdt-top-operator-dialer-pills">
                <div className="ptdt-dialer-status-pill compact">
                  <span style={{ background: sipColor }} />
                  <div>
                    <div className="mono">SIP</div>
                    <strong style={{ color: sipColor }}>{sipLabel}</strong>
                  </div>
                </div>
                <div className="ptdt-dialer-status-pill compact">
                  <span style={{ background: connected ? 'var(--green-2)' : 'var(--pink)' }} />
                  <div>
                    <div className="mono">REALTIME</div>
                    <strong style={{ color: connected ? 'var(--green-2)' : 'var(--pink)' }}>{connected ? 'Online' : 'Offline'}</strong>
                  </div>
                </div>
              </div>
            )}
            <NotificationBell />
            <div className={`ptdt-top-operator-role${roleCardClass}`} style={{ minHeight: 54, padding: '7px 15px', alignItems: 'center' }}>
              <ShieldCheck size={14} />
              <span style={{ display: 'grid', gap: 2, lineHeight: 1.08 }}>
                <span>{roleLabel(user?.role)}</span>
                <span style={{ fontSize: 10.8, fontWeight: 900, letterSpacing: 0, textTransform: 'none', opacity: 0.9 }}>
                  {user?.email || 'signed-in account'}
                </span>
              </span>
            </div>
            <button type="button" className="ptdt-top-operator-signout" onClick={requestSignOut}>
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
      <PtdtDialog dialog={dialog} onClose={() => setDialog(null)} />
    </>
  )
}
