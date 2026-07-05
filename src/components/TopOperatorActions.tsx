import { useCallback, useState } from 'react'
import { LogOut, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { useSipStore } from '../store/sip.store'
import { authAPI } from '../api/auth.api'
import NotificationBell from './NotificationBell'
import PtdtDialog, { type PtdtDialogState } from './PtdtDialog'
import { markPresenceOfflineBeforeLogout } from '../hooks/useAgentPresence'

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
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)
  const unregisterSip = useSipStore(state => state.unregister)
  const [dialog, setDialog] = useState<PtdtDialogState | null>(null)

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
      <div className="ptdt-top-operator-actions">
        <div className="ptdt-top-operator-row">
          <NotificationBell />
          <div className="ptdt-top-operator-role" style={{ minHeight: 54, padding: '7px 15px', alignItems: 'center' }}>
            <ShieldCheck size={14} />
            <span style={{ display: 'grid', gap: 2, lineHeight: 1.08 }}>
              <span>{roleLabel(user?.role)}</span>
              <span style={{ fontSize: 9.5, fontWeight: 850, letterSpacing: 0, textTransform: 'none', opacity: 0.86 }}>
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
      <PtdtDialog dialog={dialog} onClose={() => setDialog(null)} />
    </>
  )
}
