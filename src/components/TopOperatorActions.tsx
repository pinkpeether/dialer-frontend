import { useCallback, useState } from 'react'
import { LogOut, ShieldCheck } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { useSipStore } from '../store/sip.store'
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
  const [deskHidden, setDeskHidden] = useState(false)
  const [dialog, setDialog] = useState<PtdtDialogState | null>(null)
  const isDialerPage = location.pathname === '/dialer'

  const performSignOut = useCallback(() => {
    const sessionToken = localStorage.getItem('jd_token')
    setDialog(null)
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

  const toggleVoiceDesk = () => {
    const button = Array.from(document.querySelectorAll('button')).find(item => {
      const text = item.textContent?.toLowerCase() || ''
      return !item.classList.contains('ptdt-hide-desk-pill') && (text.includes('hide desk') || text.includes('open desk'))
    }) as HTMLButtonElement | undefined
    button?.click()
    setDeskHidden(current => !current)
  }

  return (
    <>
      <div className={`ptdt-top-operator-actions ${isDialerPage ? 'is-dialer-page' : ''}`}>
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

        {isDialerPage && (
          <div className="ptdt-top-operator-row ptdt-top-operator-desk-row">
            <div className="ptdt-dialer-idle-pill">
              <span />
              Dialer Idle
            </div>
            <button type="button" className="ptdt-hide-desk-pill" onClick={toggleVoiceDesk}>
              {deskHidden ? 'Open Desk' : 'Hide Desk'}
            </button>
          </div>
        )}
      </div>
      <PtdtDialog dialog={dialog} onClose={() => setDialog(null)} />
    </>
  )
}
