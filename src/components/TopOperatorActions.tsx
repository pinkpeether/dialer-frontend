import { useCallback, useEffect, useState } from 'react'
import { LogOut, ShieldCheck } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { useSipStore } from '../store/sip.store'
import { useSocket } from '../hooks/useSocket'
import { authAPI } from '../api/auth.api'
import NotificationBell from './NotificationBell'
import PtdtDialog, { type PtdtDialogState } from './PtdtDialog'

const roleLabel = (role?: string) => {
  if (role === 'CUSTOMER_ADMIN') return 'Customer Admin'
  if (role === 'SUPERVISOR') return 'Supervisor'
  if (role === 'AGENT') return 'Agent'
  if (role === 'SUPER_ADMIN') return 'PTDT Super Admin'
  if (role === 'ADMIN') return 'PTDT Admin'
  return role || 'Account'
}

export default function TopOperatorActions() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)
  const unregisterSip = useSipStore(state => state.unregister)
  const sipConfig = useSipStore(state => state.config)
  const sipStatus = useSipStore(state => state.status)
  const socket = useSocket()
  const [connected, setConnected] = useState(Boolean(socket.isConnected))
  const [deskHidden, setDeskHidden] = useState(false)
  const [dialog, setDialog] = useState<PtdtDialogState | null>(null)

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
    const token = localStorage.getItem('jd_token')
    setDialog(null)
    logout()
    navigate('/login', { replace: true })
    void authAPI.logout(token).catch(() => undefined)
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

  const toggleVoiceDesk = () => {
    const button = Array.from(document.querySelectorAll('button')).find(item => {
      const text = item.textContent?.toLowerCase() || ''
      return text.includes('hide desk') || text.includes('open desk')
    }) as HTMLButtonElement | undefined
    button?.click()
    setDeskHidden(current => !current)
  }

  if (location.pathname !== '/dialer') return null

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

  return (
    <>
      <div className="ptdt-top-operator-actions">
        <div className="ptdt-top-operator-row">
          <NotificationBell />
          <div className="ptdt-top-operator-role">
            <ShieldCheck size={14} />
            <span>{roleLabel(user?.role)}</span>
          </div>
          <button type="button" className="ptdt-top-operator-signout" onClick={requestSignOut}>
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="ptdt-top-operator-row ptdt-top-operator-status-row">
          <div className="ptdt-top-status-card">
            <span className="ptdt-top-status-dot" style={{ background: sipColor }} />
            <div>
              <div className="mono ptdt-top-status-eyebrow">SIP</div>
              <div className="ptdt-top-status-value" style={{ color: sipColor }}>{sipLabel}</div>
            </div>
          </div>
          <div className="ptdt-top-status-card">
            <span className="ptdt-top-status-dot" style={{ background: connected ? 'var(--green-2)' : 'var(--pink)' }} />
            <div>
              <div className="mono ptdt-top-status-eyebrow">REALTIME</div>
              <div className="ptdt-top-status-value" style={{ color: connected ? 'var(--green-2)' : 'var(--pink)' }}>{connected ? 'Online' : 'Offline'}</div>
            </div>
          </div>
        </div>

        <div className="ptdt-top-operator-row ptdt-top-operator-desk-row">
          <div className="ptdt-dialer-idle-pill">
            <span />
            Dialer Idle
          </div>
          <button type="button" className="ptdt-hide-desk-pill" onClick={toggleVoiceDesk}>
            {deskHidden ? 'Open Desk' : 'Hide Desk'}
          </button>
        </div>
      </div>
      <PtdtDialog dialog={dialog} onClose={() => setDialog(null)} />
    </>
  )
}
