import { useEffect, useState, type ElementType } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Phone, LayoutDashboard, Users,
  Megaphone, BookUser, LogOut,
  BarChart3, Headset, Settings2, History,
  ShieldOff, Calendar, Eye, Wrench, ClipboardList, SlidersHorizontal, Radio, Activity, BriefcaseBusiness, LifeBuoy, PhoneCall, Zap, Globe, Layers3, HardDriveDownload, BellRing, Palette, LockKeyhole, ServerCog,
  Menu, X,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/auth.store'
import { authAPI }      from '../api/auth.api'
import ThemeToggle      from './ThemeToggle'
import NotificationBell from './NotificationBell'
import DesktopUpdateControl from './DesktopUpdateControl'
import { useSipStore } from '../store/sip.store'

type NavItem = {
  to: string
  icon: ElementType
  label: string
  roles?: string[]
  color?: string
}

const COLORS = {
  pink: '#fb0b8c', green: '#00a747', purple: '#8057d7', gold: '#f0b90b', red: '#ef4444', cyan: '#0891b2', indigo: '#6366f1', slate: '#64748b', orange: '#f97316', teal: '#14b8a6'
}

const NAV: NavItem[] = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard', color: COLORS.purple       },
  { to: '/dialer',          icon: Phone,           label: 'Dialer', color: COLORS.green          },
  { to: '/agent/dashboard', icon: Headset,         label: 'Agent Dashboard', color: COLORS.cyan },
  { to: '/campaigns',       icon: Megaphone,       label: 'Campaigns',      roles: ['ADMIN', 'MANAGER'], color: COLORS.pink },
  { to: '/contacts',        icon: BookUser,        label: 'Contacts', color: COLORS.teal        },
  { to: '/contact-management-pro', icon: Users,    label: 'Contact Mgmt Pro', roles: ['ADMIN', 'SUPERVISOR'], color: COLORS.teal },
  { to: '/agents',          icon: Users,           label: 'Agents',         roles: ['ADMIN', 'MANAGER'], color: COLORS.indigo },
  { to: '/agent-management-pro', icon: Users,      label: 'Agent Mgmt Pro', roles: ['ADMIN', 'SUPERVISOR'], color: COLORS.purple },
  { to: '/calls',           icon: History,         label: 'Call History', color: COLORS.gold    },
  { to: '/callbacks',       icon: Calendar,        label: 'Callbacks', color: COLORS.orange       },
  { to: '/supervisor',      icon: Eye,             label: 'Supervisor',     roles: ['ADMIN', 'MANAGER', 'SUPERVISOR'], color: COLORS.purple },
  { to: '/ops',             icon: Activity,        label: 'Ops Center',     roles: ['ADMIN', 'SUPERVISOR'], color: COLORS.green },
  { to: '/monitoring',      icon: Activity,        label: 'Monitoring',     roles: ['ADMIN', 'SUPERVISOR'], color: COLORS.cyan },
  { to: '/live-monitoring-advanced', icon: Globe,  label: 'Live Monitoring+', roles: ['ADMIN', 'SUPERVISOR'], color: COLORS.teal },
  { to: '/advanced-dialing', icon: Zap,            label: 'Advanced Dialing', roles: ['ADMIN', 'SUPERVISOR'], color: COLORS.orange },
  { to: '/call-controls',   icon: PhoneCall,       label: 'Call Controls',  roles: ['ADMIN', 'SUPERVISOR'], color: COLORS.red },
  { to: '/live-ai',         icon: Radio,           label: 'Live AI',        roles: ['ADMIN', 'SUPERVISOR', 'AGENT'], color: COLORS.pink },
  { to: '/campaign-management-pro', icon: Layers3, label: 'Campaign Mgmt Pro', roles: ['ADMIN', 'SUPERVISOR'], color: COLORS.teal },
  { to: '/reports-analytics-pro', icon: BarChart3, label: 'Reports Analytics+', roles: ['ADMIN', 'SUPERVISOR'], color: COLORS.purple },
  { to: '/ui-ux-pro',       icon: Palette,         label: 'UI/UX Pro',      roles: ['ADMIN', 'SUPERVISOR'], color: COLORS.teal },
  { to: '/security-admin-pro', icon: LockKeyhole,  label: 'Security Admin Pro', roles: ['ADMIN'], color: COLORS.red },
  { to: '/deployment-platform-pro', icon: ServerCog, label: 'Deployment Platform', roles: ['ADMIN', 'SUPERVISOR'], color: COLORS.teal },
  { to: '/support/diagnostics', icon: LifeBuoy,    label: 'Diagnostics',    roles: ['ADMIN', 'SUPERVISOR'], color: COLORS.indigo },
  { to: '/dnc',             icon: ShieldOff,       label: 'DNC Registry',   roles: ['ADMIN', 'SUPERVISOR'], color: COLORS.red },
  { to: '/reports',         icon: BarChart3,       label: 'Reports',        roles: ['ADMIN', 'SUPERVISOR'], color: COLORS.pink },
  { to: '/recordings',      icon: Radio,           label: 'Recordings',     roles: ['ADMIN', 'SUPERVISOR'], color: COLORS.green },
  { to: '/recording-storage-pro', icon: HardDriveDownload, label: 'Recording Storage', roles: ['ADMIN', 'SUPERVISOR'], color: COLORS.cyan },
  { to: '/call-intelligence', icon: Radio,         label: 'Call Intelligence', roles: ['ADMIN', 'SUPERVISOR'], color: COLORS.purple },
  { to: '/notifications-alerts-pro', icon: BellRing, label: 'Notifications & Alerts', color: COLORS.orange },
  { to: '/audit-logs',      icon: ClipboardList,   label: 'Audit Logs',     roles: ['ADMIN'], color: COLORS.gold },
  { to: '/admin/spoofing',  icon: PhoneCall,       label: 'Spoofing Mgmt',  roles: ['ADMIN'], color: COLORS.cyan },
  { to: '/sip-settings',    icon: Wrench,          label: 'SIP Settings', color: COLORS.gold    },
  { to: '/settings',        icon: Settings2,       label: 'Account Settings', color: COLORS.slate },
  { to: '/settings/system', icon: SlidersHorizontal, label: 'System Settings', roles: ['ADMIN'], color: COLORS.orange },
]

const AGENT_NAV: NavItem[] = [
  { to: '/agent/workspace', icon: BriefcaseBusiness, label: 'Agent Workspace', color: COLORS.purple },
  { to: '/dialer',          icon: Phone,             label: 'Dialer', color: COLORS.green },
  { to: '/live-ai',         icon: Radio,             label: 'Live AI', color: COLORS.pink },
  { to: '/calls',           icon: History,           label: 'My Calls', color: COLORS.gold },
  { to: '/callbacks',       icon: Calendar,          label: 'My Callbacks', color: COLORS.orange },
  { to: '/notifications-alerts-pro', icon: BellRing, label: 'Notifications & Alerts', color: COLORS.orange },
  { to: '/settings',        icon: Settings2,         label: 'Account Settings', color: COLORS.slate },
]

const isMobileViewport = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const unregisterSip = useSipStore(s => s.unregister)
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [performanceMode, setPerformanceMode] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('ptdt-performance-mode') === 'on'
  })
  const [desktopVersion, setDesktopVersion] = useState('')

  const userRole = (user as Record<string, unknown> | null)?.role as string | undefined
  const normalizedRole = userRole?.toUpperCase()
  const navItems = normalizedRole === 'AGENT' ? AGENT_NAV : NAV
  const visibleNav = navItems.filter(item => !item.roles || !normalizedRole || item.roles.includes(normalizedRole))

  const closeMobileNav = () => {
    if (isMobileViewport()) setMobileOpen(false)
  }

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

  useEffect(() => {
    let mounted = true
    void window.ptdtDesktop?.getAppVersion()
      .then(version => { if (mounted) setDesktopVersion(version) })
      .catch(() => { if (mounted) setDesktopVersion('') })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }

    const onResize = () => {
      if (!isMobileViewport()) setMobileOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <>
      <button
        type="button"
        className="ptdt-mobile-nav-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu size={18} />
        <span>Menu</span>
      </button>

      <button
        type="button"
        className={`ptdt-mobile-nav-backdrop ${mobileOpen ? 'is-open' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-label="Close navigation menu"
      />

      <aside className={`ptdt-sidebar ${mobileOpen ? 'is-open' : ''}`} style={{
        width: 'var(--sidebar-width)', height: '100vh', background: 'var(--bg-glass-hi)',
        backdropFilter: 'blur(22px) saturate(160%)', WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '20px 14px',
        position: 'fixed', top: 0, left: 0, zIndex: 30, boxShadow: 'var(--shadow-md)', boxSizing: 'border-box', overflowX: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px', marginBottom: 22 }}>
          <motion.img src="ptdt-main-logo.png" alt="PTDT" whileHover={{ scale: 1.04 }} transition={{ type: 'spring', stiffness: 280 }} style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 12, background: 'transparent', mixBlendMode: 'multiply' }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900, color: 'var(--text)', lineHeight: 1.05, letterSpacing: '-0.03em' }}>
              PTDT-<span className="gradient-brand-text">Dialer</span>
            </div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1.4, marginTop: 3, fontWeight: 700 }}>
              {userRole || 'Operator'} Console
            </div>
          </div>

          <button
            type="button"
            className="ptdt-mobile-sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '8px 10px', marginBottom: 18, borderRadius: 12, background: 'linear-gradient(135deg, rgba(251,11,140,0.08), rgba(128,87,215,0.08))', border: '1px solid var(--border)', fontSize: 10.5, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.4 }}>
          Trust the <span style={{ color: 'var(--pink)' }}>{`{ Code }`}</span>,<br/><span style={{ color: 'var(--green-2)' }}>// </span> Not the Cult!
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', overflowX: 'hidden', paddingRight: 2 }}>
          <div className="mono" style={{ fontSize: 9.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.4, padding: '0 12px 8px', fontWeight: 700 }}>Navigation</div>
          {visibleNav.map(item => {
            const Icon = item.icon
            const iconColor = item.color || COLORS.pink
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/settings'} style={{ textDecoration: 'none' }} onClick={closeMobileNav}>
                {({ isActive }) => (
                  <motion.div
                    whileHover={{ x: isActive ? 0 : 3 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    style={{
                      position: 'relative', display: 'flex', alignItems: 'center', gap: 11,
                      padding: '8px 10px', borderRadius: 18, fontSize: 13.3, fontWeight: 800,
                      background: isActive ? 'linear-gradient(135deg, rgba(251,11,140,0.96), rgba(128,87,215,0.92))' : 'transparent',
                      color: isActive ? '#fff' : 'var(--text-2)',
                      border: isActive ? '1px solid rgba(255,255,255,0.22)' : '1px solid transparent',
                      boxShadow: isActive ? '0 12px 26px rgba(251,11,140,0.24), inset 0 1px 0 rgba(255,255,255,0.22)' : 'none',
                      transition: 'background .22s, color .22s, box-shadow .22s, border-color .22s',
                    }}
                  >
                    <span className="sidebar-icon-shell" style={{ color: isActive ? '#fff' : iconColor, background: isActive ? 'rgba(255,255,255,0.16)' : undefined }}>
                      <Icon size={16.5} strokeWidth={isActive ? 2.5 : 2.2}/>
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                  </motion.div>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 10px', marginBottom: 8, borderTop: '1px solid var(--border)', marginTop: 8 }}>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Appearance</span>
          <ThemeToggle/>
        </div>

        <button type="button" onClick={() => setPerformanceMode(value => !value)} className={`ptdt-action-btn ${performanceMode ? 'active' : ''}`} style={{ margin: '0 4px 10px', minHeight: 34, fontSize: 10.5 }} title="Reduce animations, blur, and background effects for smoother Electron performance">
          <span style={{ width: 8, height: 8, borderRadius: 999, background: performanceMode ? 'var(--green-2)' : 'var(--muted)' }} />
          Performance {performanceMode ? 'On' : 'Off'}
        </button>

        {desktopVersion && <div className="mono" style={{ margin: '0 8px 10px', fontSize: 9.5, color: 'var(--muted)', textAlign: 'center', letterSpacing: 0.7, textTransform: 'uppercase' }}>Desktop v{desktopVersion}</div>}
        <DesktopUpdateControl />

        <div style={{ paddingTop: 6 }}>
          <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 8, borderRadius: 14 }}>
            <div style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #fb0b8c, #8057d7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', boxShadow: '0 4px 12px rgba(251,11,140,0.30)', flexShrink: 0 }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              <span style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: '#2ae97b', border: '2px solid var(--surface)' }}/>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'User'}</div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{(user as Record<string, unknown> | null)?.agentCode as string || '—'}</div>
            </div>
            <NotificationBell/>
          </div>
          <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={handleLogout} className="sidebar-signout" style={{ width: '100%', height: 42, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 850, cursor: 'pointer' }}>
            <LogOut size={15}/> Sign Out
          </motion.button>
        </div>
      </aside>
    </>
  )
}
