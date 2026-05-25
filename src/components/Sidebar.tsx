import { useEffect, useState, type ElementType } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Phone, LayoutDashboard, Users,
  Megaphone, BookUser, LogOut,
  BarChart3, Headset, Settings2, History,
  ShieldOff, Calendar, Eye, Wrench, ClipboardList, SlidersHorizontal, Radio, Activity,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/auth.store'
import { authAPI }      from '../api/auth.api'
import ThemeToggle      from './ThemeToggle'
import NotificationBell from './NotificationBell'
import { useSipStore } from '../store/sip.store'

type NavItem = {
  to: string
  icon: ElementType
  label: string
  roles?: string[]
}

const NAV: NavItem[] = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/dialer',          icon: Phone,           label: 'Dialer'          },
  { to: '/agent/dashboard', icon: Headset,         label: 'Agent Dashboard' },
  { to: '/campaigns',       icon: Megaphone,       label: 'Campaigns',      roles: ['ADMIN', 'MANAGER'] },
  { to: '/contacts',        icon: BookUser,        label: 'Contacts'        },
  { to: '/agents',          icon: Users,           label: 'Agents',         roles: ['ADMIN', 'MANAGER'] },
  { to: '/calls',           icon: History,         label: 'Call History'    },
  { to: '/callbacks',       icon: Calendar,        label: 'Callbacks'       },
  { to: '/supervisor',      icon: Eye,             label: 'Supervisor',     roles: ['ADMIN', 'MANAGER', 'SUPERVISOR'] },
  { to: '/ops',             icon: Activity,        label: 'Ops Center',     roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/monitoring',      icon: Activity,        label: 'Monitoring',     roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/dnc',             icon: ShieldOff,       label: 'DNC Registry',   roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/reports',         icon: BarChart3,       label: 'Reports',        roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/recordings',      icon: Radio,           label: 'Recordings',     roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/audit-logs',      icon: ClipboardList,   label: 'Audit Logs',     roles: ['ADMIN'] },
  { to: '/sip-settings',    icon: Wrench,          label: 'SIP Settings'    },
  { to: '/settings',        icon: Settings2,       label: 'Account Settings' },
  { to: '/settings/system', icon: SlidersHorizontal, label: 'System Settings', roles: ['ADMIN'] },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const unregisterSip = useSipStore(s => s.unregister)
  const navigate = useNavigate()
  const [performanceMode, setPerformanceMode] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('ptdt-performance-mode') === 'on'
  })

  const userRole = (user as Record<string, unknown> | null)?.role as string | undefined

  const visibleNav = NAV.filter(item => {
    if (!item.roles) return true
    if (!userRole) return true
    return item.roles.includes(userRole.toUpperCase())
  })

  const handleLogout = () => {
    void authAPI.logout().catch(() => undefined)
    void unregisterSip().catch(() => undefined)
    logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    const next = performanceMode ? 'on' : 'off'
    document.documentElement.dataset.performanceMode = next
    window.localStorage.setItem('ptdt-performance-mode', next)
  }, [performanceMode])

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      background: 'var(--bg-glass-hi)',
      backdropFilter: 'blur(22px) saturate(160%)',
      WebkitBackdropFilter: 'blur(22px) saturate(160%)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 14px',
      position: 'fixed',
      top: 0, left: 0,
      zIndex: 30,
      boxShadow: 'var(--shadow-md)',
      boxSizing: 'border-box',
      overflowX: 'hidden',
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px', marginBottom: 22 }}>
        <motion.img
          src="ptdt-main-logo.png"
          alt="PTDT"
          whileHover={{ scale: 1.04 }}
          transition={{ type: 'spring', stiffness: 280 }}
          style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 12, background: 'transparent', mixBlendMode: 'multiply' }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900, color: 'var(--text)', lineHeight: 1.05, letterSpacing: '-0.03em' }}>
            PTDT-<span className="gradient-brand-text">Dialer</span>
          </div>
          <div className="mono" style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1.4, marginTop: 3, fontWeight: 700 }}>
            {userRole || 'Operator'} Console
          </div>
        </div>
      </div>

      {/* Slogan pill */}
      <div style={{ padding: '8px 10px', marginBottom: 18, borderRadius: 12, background: 'linear-gradient(135deg, rgba(251,11,140,0.08), rgba(128,87,215,0.08))', border: '1px solid var(--border)', fontSize: 10.5, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.4 }}>
        Trust the <span style={{ color: 'var(--pink)' }}>{`{ Code }`}</span>,
        <br/>
        <span style={{ color: 'var(--green-2)' }}>// </span> Not the Cult!
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', overflowX: 'hidden', paddingRight: 2 }}>
        <div className="mono" style={{ fontSize: 9.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.4, padding: '0 12px 8px', fontWeight: 700 }}>Navigation</div>

        {visibleNav.map(item => {
          const Icon = item.icon
          const isDialer = item.to === '/dialer'
          const isSipSettings = item.to === '/sip-settings'
          const specialActiveBg = isDialer
            ? 'linear-gradient(135deg, rgba(0,167,71,0.98), rgba(0,245,160,0.86))'
            : isSipSettings
              ? 'linear-gradient(135deg, #b87900, #d99a16)'
              : 'linear-gradient(135deg, #fb0b8c, #ff4bad)'
          const specialInactiveColor = isDialer
            ? 'var(--green-2)'
            : isSipSettings
              ? '#b87900'
              : 'var(--text-3)'
          const specialInactiveBorder = isDialer
            ? 'rgba(0,167,71,0.24)'
            : isSipSettings
              ? 'rgba(184,121,0,0.28)'
              : 'transparent'
          return (
            <NavLink key={item.to} to={item.to} end={item.to === '/settings'} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <motion.div
                  whileHover={{ x: isActive ? 0 : 3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{
                    position: 'relative',
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 14px',
                    borderRadius: 999,
                    fontSize: 13.5, fontWeight: 700,
                    background: isActive ? specialActiveBg : 'transparent',
                    color: isActive ? '#fff' : specialInactiveColor,
                    border: isDialer || isSipSettings
                      ? isActive
                        ? `1px solid ${isDialer ? 'rgba(0,245,160,0.48)' : 'rgba(217,154,22,0.50)'}`
                        : `1px solid ${specialInactiveBorder}`
                      : '1px solid transparent',
                    boxShadow: isActive
                      ? isDialer
                        ? '0 14px 30px rgba(0,167,71,0.26), 0 0 22px rgba(0,245,160,0.18), inset 0 1px 0 rgba(255,255,255,0.22)'
                        : isSipSettings
                          ? '0 14px 30px rgba(184,121,0,0.24), 0 0 22px rgba(217,154,22,0.16), inset 0 1px 0 rgba(255,255,255,0.20)'
                        : '0 12px 26px rgba(251,11,140,0.28), inset 0 1px 0 rgba(255,255,255,0.22)'
                      : isDialer
                        ? '0 0 18px rgba(0,167,71,0.08)'
                        : isSipSettings
                          ? '0 0 18px rgba(184,121,0,0.08)'
                        : 'none',
                    transition: 'background 0.25s, color 0.25s, box-shadow 0.25s, border-color 0.25s',
                  }}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-glow"
                      style={{
                        position: 'absolute', inset: 0, borderRadius: 999,
                        background: specialActiveBg,
                        boxShadow: isDialer
                          ? '0 14px 30px rgba(0,167,71,0.26),0 0 22px rgba(0,245,160,0.18)'
                          : isSipSettings
                            ? '0 14px 30px rgba(184,121,0,0.24),0 0 22px rgba(217,154,22,0.16)'
                          : '0 12px 26px rgba(251,11,140,0.30)',
                        zIndex: -1,
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon size={17} strokeWidth={isActive ? 2.4 : 2}/>
                  {item.label}
                </motion.div>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Appearance */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 10px', marginBottom: 8, borderTop: '1px solid var(--border)', marginTop: 8 }}>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Appearance</span>
        <ThemeToggle/>
      </div>

      <button
        type="button"
        onClick={() => setPerformanceMode(value => !value)}
        style={{
          margin: '0 4px 10px',
          minHeight: 34,
          borderRadius: 999,
          border: performanceMode ? '1px solid rgba(0,167,71,0.36)' : '1px solid var(--border)',
          background: performanceMode ? 'rgba(0,167,71,0.10)' : 'rgba(255,255,255,0.36)',
          color: performanceMode ? 'var(--green-2)' : 'var(--text-3)',
          fontSize: 10.5,
          fontWeight: 900,
          letterSpacing: 0.7,
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          cursor: 'pointer',
        }}
        title="Reduce animations, blur, and background effects for smoother Electron performance"
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: performanceMode ? 'var(--green-2)' : 'var(--muted)',
            boxShadow: performanceMode ? '0 0 12px rgba(0,167,71,0.35)' : 'none',
          }}
        />
        Performance {performanceMode ? 'On' : 'Off'}
      </button>

      {/* User profile + bell + logout */}
      <div style={{ paddingTop: 6 }}>
        <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 8, borderRadius: 14 }}>
          <div style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #fb0b8c, #8057d7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', boxShadow: '0 4px 12px rgba(251,11,140,0.30)', flexShrink: 0 }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            <span style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: '#2ae97b', border: '2px solid var(--surface)' }}/>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'User'}
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
              {(user as Record<string, unknown> | null)?.agentCode as string || '—'}
            </div>
          </div>
          <NotificationBell/>
        </div>

        <motion.button
          onClick={handleLogout}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 12px', borderRadius: 999, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 12.5, fontWeight: 700, transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' }}
        >
          <LogOut size={14}/> Sign Out
        </motion.button>
      </div>
    </aside>
  )
}
