import { useCallback, useEffect, useState } from 'react'
import { LogOut, ShieldCheck, WalletCards } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { useSipStore } from '../store/sip.store'
import { authAPI } from '../api/auth.api'
import api from '../api/axios'
import type { AdministrationMe } from '../api/administration.api'
import NotificationBell from './NotificationBell'
import PtdtDialog, { type PtdtDialogState } from './PtdtDialog'
import { markPresenceOfflineBeforeLogout } from '../hooks/useAgentPresence'
import { useSocket } from '../hooks/useSocket'
import TimeClockWidget, { TimeClockDateBadge } from './TimeClockWidget'
import { attendanceIntegrityApi } from '../api/attendanceIntegrity.api'
import { clearPtdtSessionCache } from '../services/sessionCleanup'
import { silentOverlayConfig } from '../api/swrCache'

type LocalTimeClockState = {
  clockedIn?: boolean
  startedAt?: number | null
  backendSessionId?: number | null
}

type VoipBalanceState = {
  accountName: string
  amount: number
  held: number
  currency: string
  status: string
}

const roleLabel = (role?: string) => {
  if (role === 'CUSTOMER_ADMIN') return 'Customer Admin'
  if (role === 'SUPERVISOR') return 'Supervisor'
  if (role === 'AGENT') return 'Agent'
  if (role === 'SUPER_ADMIN') return 'PTDT Super Admin'
  if (role === 'ADMIN') return 'PTDT Admin'
  return role || 'Account'
}

const readActiveClockState = (userId?: number | string | null): LocalTimeClockState | null => {
  if (!userId) return null
  try {
    const raw = window.localStorage.getItem(`ptdt-timeclock:${userId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LocalTimeClockState
    return parsed?.clockedIn ? parsed : null
  } catch {
    return null
  }
}

const money = (amount: number, currency: string) => `${currency} ${amount.toFixed(2)}`
const canShowVoipBalance = (role?: string) => role === 'CUSTOMER_ADMIN' || role === 'SUPERVISOR'

const balanceTone = (balance?: VoipBalanceState | null) => {
  if (!balance) return 'neutral'
  if (balance.amount <= 0) return 'critical'
  if (balance.amount <= 3) return 'critical'
  if (balance.amount <= 10) return 'warning'
  return 'healthy'
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
  const [voipBalance, setVoipBalance] = useState<VoipBalanceState | null>(null)
  const isDialerPage = location.pathname === '/dialer'
  const showTimeClock = user?.role === 'AGENT' || user?.role === 'SUPERVISOR'
  const showVoipBalance = canShowVoipBalance(user?.role)
  const voipTone = balanceTone(voipBalance)
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

  useEffect(() => {
    if (!showVoipBalance) {
      setVoipBalance(null)
      return undefined
    }

    let cancelled = false
    const loadBalance = async () => {
      try {
        const res = await api.get('/administration/me', silentOverlayConfig({ timeout: 45000 }))
        const data = res.data.data as AdministrationMe
        const membership = data.memberships.find(item => item.status === 'ACTIVE' && item.account?.wallet) || data.memberships.find(item => item.account?.wallet)
        const wallet = membership?.account?.wallet
        if (cancelled || !membership?.account || !wallet) return
        setVoipBalance({
          accountName: membership.account.name,
          amount: Number(wallet.availableBalance || 0),
          held: Number(wallet.heldBalance || 0),
          currency: wallet.currency || membership.account.currency || 'EUR',
          status: membership.account.status || 'ACTIVE',
        })
      } catch {
        if (!cancelled) setVoipBalance(current => current)
      }
    }

    void loadBalance()
    const timer = window.setInterval(loadBalance, 45_000)
    const onFocus = () => { void loadBalance() }
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [showVoipBalance])

  useEffect(() => {
    if (!showTimeClock) return undefined

    const syncSipPresence = () => {
      void attendanceIntegrityApi.sipPresence({
        enabled: Boolean(sipConfig.enabled),
        status: sipConfig.enabled ? sipStatus : 'disabled',
        username: sipConfig.username,
        transport: sipConfig.transport,
        domain: sipConfig.domain,
        webSocketServer: sipConfig.webSocketServer,
      }).catch(() => undefined)
    }

    syncSipPresence()
    const timer = window.setInterval(syncSipPresence, 30_000)
    return () => window.clearInterval(timer)
  }, [showTimeClock, sipConfig.domain, sipConfig.enabled, sipConfig.transport, sipConfig.username, sipConfig.webSocketServer, sipStatus])

  const performSignOut = useCallback(async (options?: { flagAttendance?: boolean }) => {
    const sessionToken = localStorage.getItem('jd_token')
    const activeClock = options?.flagAttendance ? readActiveClockState(user?.id) : null
    setDialog(null)
    if (options?.flagAttendance) {
      await attendanceIntegrityApi.disconnect({
        ...(activeClock?.backendSessionId ? { sessionId: activeClock.backendSessionId } : {}),
        currentUrl: window.location.href,
        tabVisible: document.visibilityState === 'visible',
        lastInteractionAt: new Date().toISOString(),
      }).catch(() => undefined)
    }
    markPresenceOfflineBeforeLogout()
    void unregisterSip().catch(() => undefined)
    logout()
    await clearPtdtSessionCache()
    navigate(`/login?logout=${Date.now()}`, { replace: true })
    void authAPI.logout(sessionToken).catch(() => undefined)
  }, [logout, navigate, unregisterSip, user?.id])

  const requestSignOut = () => {
    if ((user?.role === 'AGENT' || user?.role === 'SUPERVISOR') && readActiveClockState(user?.id)) {
      setDialog({
        tone: 'confirm',
        title: 'Clock Out before signing out',
        message: 'Your Clock-In timer is still running. Please Clock Out before signing out. If you sign out without Clock Out, this attendance session will be flagged for supervisor review.',
        confirmLabel: 'Sign Out Anyway',
        onConfirm: () => performSignOut({ flagAttendance: true }),
      })
      return
    }

    setDialog({
      tone: 'confirm',
      title: 'Sign out?',
      message: 'Are you sure you want to sign out of PTDT Dialer?',
      confirmLabel: 'Sign Out',
      onConfirm: () => performSignOut(),
    })
  }

  return (
    <>
      <div className={`ptdt-top-operator-actions${isDialerPage ? ' is-dialer-page' : ''}`}>
        <div className="ptdt-top-operator-row" style={{ width: '100%', justifyContent: showTimeClock || showVoipBalance ? 'space-between' : 'flex-end' }}>
          {(showTimeClock || showVoipBalance) && (
            <div className="ptdt-top-operator-left">
              {showTimeClock && <TimeClockWidget />}
              {showVoipBalance && (
                <div className={`ptdt-voip-balance-card is-${voipTone}`} title={voipBalance ? `${voipBalance.accountName} VoIP balance` : 'VoIP balance loading'}>
                  <span className="ptdt-voip-balance-icon"><WalletCards size={17} /></span>
                  <span className="ptdt-voip-balance-copy">
                    <span className="ptdt-voip-balance-label">VoIP Balance</span>
                    <strong>{voipBalance ? money(voipBalance.amount, voipBalance.currency) : 'Loading...'}</strong>
                  </span>
                  {voipBalance && voipBalance.held > 0 && <span className="ptdt-voip-balance-held">Held {money(voipBalance.held, voipBalance.currency)}</span>}
                </div>
              )}
            </div>
          )}
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
            {showTimeClock && <TimeClockDateBadge />}
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
