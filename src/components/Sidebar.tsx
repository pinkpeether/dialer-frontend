import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  BellRing,
  BookUser,
  BriefcaseBusiness,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Crown,
  Eye,
  Globe,
  HardDriveDownload,
  Headset,
  History,
  Layers3,
  LayoutDashboard,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareText,
  Palette,
  Phone,
  PhoneCall,
  Radio,
  ServerCog,
  Settings2,
  ShieldOff,
  SlidersHorizontal,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/auth.store'
import { authAPI } from '../api/auth.api'
import ThemeToggle from './ThemeToggle'
import NotificationBell from './NotificationBell'
import DesktopUpdateControl from './DesktopUpdateControl'
import { useSipStore } from '../store/sip.store'

type NavItem = { to: string; icon: ElementType; label: string; roles?: string[]; color?: string }
type NavGroup = { key: string; label: string; icon: ElementType; roles?: string[]; color?: string; items: string[] }

const COLORS = {
  pink: '#fb0b8c',
  green: '#00a747',
  purple: '#8057d7',
  gold: '#8057d7',
  red: '#fb0b8c',
  cyan: '#8057d7',
  indigo: '#8057d7',
  slate: '#64748b',
  orange: '#fb0b8c',
  teal: '#00a747',
}

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '')
  const value = normalized.length === 3 ? normalized.split('').map(char => char + char).join('') : normalized
  const int = Number.parseInt(value, 16)
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`
}

const NAV: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: COLORS.purple },
  { to: '/dialer', icon: Phone, label: 'Dialer', color: COLORS.green },
  { to: '/sms', icon: MessageSquareText, label: 'Send SMS', color: COLORS.green },
  { to: '/agent/dashboard', icon: Headset, label: 'Agent Dashboard', color: COLORS.cyan },
  { to: '/campaigns', icon: Megaphone, label: 'Manage Campaigns', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], color: COLORS.pink },
  { to: '/contacts', icon: BookUser, label: 'Contacts', color: COLORS.teal },
  { to: '/contact-management-pro', icon: Users, label: 'Contact Management Pro', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN'], color: COLORS.teal },
  { to: '/agents', icon: Users, label: 'Agents / Team Users', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], color: COLORS.indigo },
  { to: '/agent-management-pro', icon: Users, label: 'Agent Management Pro', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN'], color: COLORS.purple },
  { to: '/calls', icon: History, label: 'Call History', color: COLORS.gold },
  { to: '/callbacks', icon: Calendar, label: 'Callbacks', color: COLORS.orange },
  { to: '/supervisor', icon: Eye, label: 'Supervisor', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], color: COLORS.purple },
  { to: '/ops', icon: Activity, label: 'Ops Center', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], color: COLORS.green },
  { to: '/monitoring', icon: Activity, label: 'Monitoring', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], color: COLORS.cyan },
  { to: '/live-monitoring-advanced', icon: Globe, label: 'Live Monitoring Plus', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], color: COLORS.teal },
  { to: '/advanced-dialing', icon: Zap, label: 'Advanced Dialing', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN'], color: COLORS.orange },
  { to: '/call-controls', icon: PhoneCall, label: 'Call Controls', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], color: COLORS.red },
  { to: '/live-ai', icon: Radio, label: 'Live AI', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR', 'AGENT'], color: COLORS.pink },
  { to: '/campaign-management-pro', icon: Layers3, label: 'Campaign Management Pro', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN'], color: COLORS.teal },
  { to: '/reports-analytics-pro', icon: BarChart3, label: 'Reports Analytics Plus', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN'], color: COLORS.purple },
  { to: '/ui-ux-pro', icon: Palette, label: 'UI/UX Pro', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN'], color: COLORS.teal },
  { to: '/security-admin-pro', icon: LockKeyhole, label: 'Security Admin Pro', roles: ['SUPER_ADMIN', 'ADMIN'], color: COLORS.red },
  { to: '/deployment-platform-pro', icon: ServerCog, label: 'Deployment Platform', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN'], color: COLORS.teal },
  { to: '/support/diagnostics', icon: LifeBuoy, label: 'Diagnostics', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], color: COLORS.indigo },
  { to: '/dnc', icon: ShieldOff, label: 'DNC Registry', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], color: COLORS.red },
  { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], color: COLORS.pink },
  { to: '/recordings', icon: Radio, label: 'Recordings', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], color: COLORS.green },
  { to: '/recording-storage-pro', icon: HardDriveDownload, label: 'Recording Storage', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN'], color: COLORS.cyan },
  { to: '/call-intelligence', icon: Radio, label: 'Call Intelligence', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], color: COLORS.purple },
  { to: '/ai-dialer', icon: PhoneCall, label: 'Start AI Call', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], color: COLORS.pink },
  { to: '/ai-dialer/logs', icon: Radio, label: 'AI Call Logs', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], color: COLORS.pink },
  { to: '/notifications-alerts-pro', icon: BellRing, label: 'Notifications & Alerts', color: COLORS.orange },
  { to: '/audit-logs', icon: ClipboardList, label: 'Audit Logs', roles: ['SUPER_ADMIN', 'ADMIN'], color: COLORS.gold },
  { to: '/platform/administration', icon: Crown, label: 'Platform Administration', roles: ['SUPER_ADMIN', 'ADMIN'], color: COLORS.pink },
  { to: '/customer-onboarding', icon: Building2, label: 'Customer Onboarding', roles: ['SUPER_ADMIN', 'ADMIN'], color: COLORS.purple },
  { to: '/commercial-control', icon: CreditCard, label: 'Commercial Control', roles: ['SUPER_ADMIN', 'ADMIN'], color: COLORS.green },
  { to: '/billing', icon: Building2, label: 'Billing & Plan', roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], color: COLORS.gold },
  { to: '/admin/spoofing', icon: PhoneCall, label: 'Dynamic Caller ID', roles: ['SUPER_ADMIN', 'ADMIN'], color: COLORS.cyan },
  { to: '/sip-settings', icon: Wrench, label: 'SIP Settings', color: COLORS.gold },
  { to: '/settings', icon: Settings2, label: 'Account Settings', color: COLORS.slate },
  { to: '/settings/system', icon: SlidersHorizontal, label: 'System Settings', roles: ['SUPER_ADMIN', 'ADMIN'], color: COLORS.orange },
]

const AGENT_NAV: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: COLORS.purple },
  { to: '/agent/workspace', icon: BriefcaseBusiness, label: 'Agent Workspace', color: COLORS.purple },
  { to: '/dialer', icon: Phone, label: 'Call Dialer', color: COLORS.green },
  { to: '/live-ai', icon: Radio, label: 'Live AI', color: COLORS.pink },
  { to: '/calls', icon: History, label: 'My Calls', color: COLORS.gold },
  { to: '/callbacks', icon: Calendar, label: 'My Callbacks', color: COLORS.orange },
  { to: '/notifications-alerts-pro', icon: BellRing, label: 'Notifications & Alerts', color: COLORS.orange },
  { to: '/settings', icon: Settings2, label: 'Account Settings', color: COLORS.slate },
]

const CONSOLE_GROUPS: NavGroup[] = [
  { key: 'dashboard', label: 'DASHBOARD', icon: LayoutDashboard, color: COLORS.green, items: ['/dashboard', '/supervisor', '/agent/dashboard'] },
  { key: 'administration', label: 'ADMINISTRATION', icon: Crown, color: COLORS.purple, roles: ['SUPER_ADMIN', 'ADMIN'], items: ['/platform/administration', '/customer-onboarding', '/commercial-control'] },
  { key: 'ai-dialer', label: 'AI DIALER', icon: Radio, color: COLORS.pink, roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], items: ['/ai-dialer', '/ai-dialer/logs'] },
  { key: 'dialer', label: 'DIALER', icon: Phone, color: COLORS.green, items: ['/dialer', '/advanced-dialing'] },
  { key: 'agents', label: 'AGENTS', icon: Users, color: COLORS.purple, roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], items: ['/agents', '/agent-management-pro'] },
  { key: 'campaigns', label: 'CAMPAIGNS', icon: Megaphone, color: COLORS.pink, roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], items: ['/campaigns', '/campaign-management-pro'] },
  { key: 'spoofing', label: 'SPOOFING MANAGEMENT', icon: PhoneCall, color: COLORS.purple, roles: ['SUPER_ADMIN', 'ADMIN'], items: ['/admin/spoofing'] },
  { key: 'sms', label: 'SMS MANAGEMENT', icon: MessageSquareText, color: COLORS.green, items: ['/sms'] },
  { key: 'calls', label: 'CALLS', icon: History, color: COLORS.green, items: ['/calls', '/callbacks', '/call-controls', '/call-intelligence'] },
  { key: 'contacts', label: 'CONTACTS', icon: BookUser, color: COLORS.green, items: ['/contacts', '/contact-management-pro'] },
  { key: 'monitoring', label: 'MONITORING', icon: Activity, color: COLORS.purple, roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], items: ['/monitoring', '/live-monitoring-advanced', '/ops'] },
  { key: 'reports', label: 'REPORTS', icon: BarChart3, color: COLORS.purple, roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], items: ['/reports', '/reports-analytics-pro'] },
  { key: 'recordings', label: 'RECORDINGS', icon: Radio, color: COLORS.green, roles: ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_ADMIN', 'SUPERVISOR'], items: ['/recordings', '/recording-storage-pro'] },
  { key: 'settings', label: 'SETTINGS', icon: Settings2, color: COLORS.slate, items: ['/settings', '/audit-logs', '/security-admin-pro', '/settings/system', '/notifications-alerts-pro'] },
]

const CONSOLE_STANDALONE = ['/billing', '/deployment-platform-pro', '/dnc', '/support/diagnostics', '/live-ai', '/sip-settings', '/ui-ux-pro']

const CONSOLE_SECTION_LABELS: Record<string, string> = {
  dashboard: 'MAIN ADMIN',
  administration: 'PLATFORM SETUP',
  'ai-dialer': 'MAIN DIALING',
  calls: 'CALLING INFO',
  monitoring: 'ANALYTICS',
  recordings: 'RECORDINGS',
  settings: 'SETTINGS',
}

const getConsoleSectionLabel = (groupKey: string, normalizedRole?: string) => {
  if (normalizedRole === 'AGENT') return ''
  return CONSOLE_SECTION_LABELS[groupKey] || ''
}

const AGENT_GROUPS: NavGroup[] = [
  { key: 'dashboard', label: 'DASHBOARD', icon: LayoutDashboard, color: COLORS.purple, items: ['/dashboard'] },
  { key: 'workspace', label: 'WORKSPACE', icon: BriefcaseBusiness, color: COLORS.purple, items: ['/agent/workspace'] },
  { key: 'dialer', label: 'DIALER', icon: Phone, color: COLORS.green, items: ['/dialer', '/live-ai'] },
  { key: 'calls', label: 'CALLS', icon: History, color: COLORS.gold, items: ['/calls', '/callbacks'] },
  { key: 'settings', label: 'SETTINGS', icon: Settings2, color: COLORS.slate, items: ['/notifications-alerts-pro', '/settings'] },
]

const SIDEBAR_FEATURED_CSS = `
.ptdt-sidebar-group-btn {
  position: relative;
  overflow: hidden;
}
.ptdt-sidebar-group-btn > * {
  position: relative;
  z-index: 2;
}
.ptdt-sidebar-group-btn-featured::after {
  content: "";
  position: absolute;
  top: -45%;
  bottom: -45%;
  left: -80%;
  width: 46%;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.18) 36%, rgba(255,255,255,0.82) 50%, rgba(42,233,123,0.22) 62%, transparent 100%);
  transform: skewX(-18deg);
  mix-blend-mode: screen;
  animation: ptdt-sidebar-rider-sweep 3.25s ease-in-out infinite;
}
@keyframes ptdt-sidebar-rider-sweep {
  0% { left: -82%; opacity: 0; }
  25% { opacity: 0.92; }
  55% { left: 124%; opacity: 0.92; }
  100% { left: 124%; opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .ptdt-sidebar-group-btn-featured::after { animation: none !important; opacity: 0; }
}
`

const isMobileViewport = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const unregisterSip = useSipStore(s => s.unregister)
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [performanceMode, setPerformanceMode] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem('ptdt-performance-mode') !== 'off'
  })
  const [desktopVersion, setDesktopVersion] = useState('')

  const userRole = (user as Record<string, unknown> | null)?.role as string | undefined
  const normalizedRole = userRole?.toUpperCase()
  const isVisibleForRole = useCallback((roles?: string[]) => !roles || !normalizedRole || roles.includes(normalizedRole), [normalizedRole])
  const itemMap = useMemo(() => Object.fromEntries([...NAV, ...AGENT_NAV].map(item => [item.to, item])) as Record<string, NavItem>, [])
  const isPathActive = useCallback((to: string) => location.pathname === to || (to !== '/' && location.pathname.startsWith(`${to}/`)), [location.pathname])

  const groups = useMemo(() => {
    const sourceGroups = normalizedRole === 'AGENT' ? AGENT_GROUPS : CONSOLE_GROUPS
    return sourceGroups
      .filter(group => isVisibleForRole(group.roles))
      .map(group => ({ ...group, navItems: group.items.map(to => itemMap[to]).filter(Boolean).filter(item => isVisibleForRole(item.roles)) }))
      .filter(group => group.navItems.length > 0)
  }, [isVisibleForRole, itemMap, normalizedRole])

  const activeGroupKey = useMemo(() => {
    const activeGroup = groups.find(group => group.navItems.some(item => isPathActive(item.to)))
    if (!activeGroup || activeGroup.key === 'dashboard') return ''
    return activeGroup.key
  }, [groups, isPathActive])

  const standaloneItems = useMemo(() => {
    if (normalizedRole === 'AGENT') return []
    return CONSOLE_STANDALONE.map(to => itemMap[to]).filter(Boolean).filter(item => isVisibleForRole(item.roles))
  }, [isVisibleForRole, itemMap, normalizedRole])

  const closeMobileNav = () => { if (isMobileViewport()) setMobileOpen(false) }
  const toggleGroup = (key: string) => setExpandedGroups(prev => ({ [key]: !prev[key] }))

  const handleLogout = () => {
    const token = localStorage.getItem('jd_token')
    logout()
    navigate('/login', { replace: true })
    void authAPI.logout(token).catch(() => undefined)
    void unregisterSip().catch(() => undefined)
  }

  useEffect(() => {
    setExpandedGroups(activeGroupKey ? { [activeGroupKey]: true } : {})
  }, [activeGroupKey])

  useEffect(() => {
    const next = performanceMode ? 'on' : 'off'
    document.documentElement.dataset.performanceMode = next
    window.localStorage.setItem('ptdt-performance-mode', next)
  }, [performanceMode])

  useEffect(() => {
    let mounted = true
    void window.ptdtDesktop?.getAppVersion().then(version => { if (mounted) setDesktopVersion(version) }).catch(() => { if (mounted) setDesktopVersion('') })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false) }
    const onResize = () => { if (!isMobileViewport()) setMobileOpen(false) }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <>
      <style>{SIDEBAR_FEATURED_CSS}</style>
      <button type="button" className="ptdt-mobile-nav-toggle" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu"><Menu size={18} /><span>Menu</span></button>
      <button type="button" className={`ptdt-mobile-nav-backdrop ${mobileOpen ? 'is-open' : ''}`} onClick={() => setMobileOpen(false)} aria-label="Close navigation menu" />

      <aside className={`ptdt-sidebar ${mobileOpen ? 'is-open' : ''}`} style={{ width: 'var(--sidebar-width)', height: '100vh', background: 'var(--bg-glass-hi)', backdropFilter: 'blur(22px) saturate(160%)', WebkitBackdropFilter: 'blur(22px) saturate(160%)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '18px 14px', position: 'fixed', top: 0, left: 0, zIndex: 30, boxShadow: 'var(--shadow-md)', boxSizing: 'border-box', overflowX: 'hidden' }}>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(104px, 128px) auto', justifyContent: 'center', alignItems: 'center', columnGap: 8, rowGap: 4, padding: '4px 2px 28px', marginBottom: 8, textAlign: 'center' }}>
          <button type="button" className="ptdt-mobile-sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation menu" style={{ position: 'absolute', top: 0, right: 0 }}><X size={18} /></button>
          <motion.img src="ptdt-main-logo.png" alt="PTDT" whileHover={{ scale: 1.04 }} transition={{ type: 'spring', stiffness: 280 }} style={{ width: 126, height: 82, objectFit: 'contain', borderRadius: 0, background: 'transparent', mixBlendMode: 'multiply', justifySelf: 'end' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 31, fontWeight: 950, color: 'var(--text)', lineHeight: 1, letterSpacing: '-0.055em', justifySelf: 'start' }}>Dialer</div>
          <div className="mono" style={{ gridColumn: '1 / -1', fontSize: 13, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 7.2, marginTop: -2, fontWeight: 800 }}>ADMIN CONSOLE</div>
        </div>

        <div style={{ padding: '9px 10px', marginBottom: 16, borderRadius: 14, background: 'linear-gradient(135deg, rgba(251,11,140,0.08), rgba(128,87,215,0.08))', border: '1px solid var(--border)', fontSize: 10.5, fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.55 }}>
          Trust the <span style={{ color: 'var(--pink)' }}>{`{ Code }`}</span>,<br /><span style={{ color: 'var(--green-2)' }}>// </span> Not the Cult!
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', overflowX: 'hidden', paddingRight: 2 }}>
          <div className="mono" style={{ fontSize: 9.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.4, padding: '0 12px 8px', fontWeight: 700 }}>Navigation</div>
          {groups.map(group => {
            const Icon = group.icon
            const groupColor = group.color || COLORS.pink
            const isGroupActive = group.navItems.some(item => isPathActive(item.to))
            const isOpen = Boolean(expandedGroups[group.key])
            const sectionLabel = getConsoleSectionLabel(group.key, normalizedRole)
            const isFeaturedDialerGroup = group.key === 'ai-dialer' || group.key === 'dialer'

            return (
              <div key={group.key} style={{ display: 'grid', gap: sectionLabel ? 8 : 5, marginTop: sectionLabel ? (group.key === 'dashboard' ? 0 : 16) : 0 }}>
                {sectionLabel && <div className="mono" style={{ fontSize: 11.2, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1.55, padding: '3px 12px 1px', fontWeight: 950 }}>{sectionLabel}</div>}
                <button type="button" className={`ptdt-sidebar-group-btn ${isFeaturedDialerGroup ? 'ptdt-sidebar-group-btn-featured' : ''}`} onClick={() => toggleGroup(group.key)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 12px', borderRadius: 14, border: `1px solid ${hexToRgba(groupColor, isOpen ? 0.52 : isGroupActive ? 0.35 : 0.18)}`, background: isOpen ? `linear-gradient(135deg, ${hexToRgba(groupColor, 0.32)}, ${hexToRgba(groupColor, 0.16)})` : isGroupActive ? `linear-gradient(135deg, ${hexToRgba(groupColor, 0.18)}, ${hexToRgba(groupColor, 0.08)})` : `linear-gradient(135deg, ${hexToRgba(groupColor, 0.09)}, ${hexToRgba(groupColor, 0.04)})`, color: groupColor, cursor: 'pointer', textAlign: 'left', boxShadow: isOpen ? `0 6px 18px ${hexToRgba(groupColor, 0.28)}` : `0 1px 4px ${hexToRgba(groupColor, 0.08)}`, transition: 'all .25s ease' }}>
                  <span className="sidebar-icon-shell" style={{ color: groupColor, background: hexToRgba(groupColor, isOpen ? 0.2 : 0.1) }}><Icon size={16.5} /></span>
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 900, lineHeight: 1.25, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{group.label}</span>
                  {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
                {isOpen && <div style={{ display: 'grid', gap: 4, paddingLeft: 10, marginLeft: 13, borderLeft: `2px solid ${hexToRgba(groupColor, 0.32)}` }}>
                  {group.navItems.map(item => {
                    const ItemIcon = item.icon
                    return <NavLink key={item.to} to={item.to} end={item.to === '/settings' || item.to === '/ai-dialer'} style={{ textDecoration: 'none' }} onClick={closeMobileNav}>{({ isActive }) => <motion.div whileHover={{ x: isActive ? 0 : 3 }} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '7px 10px', borderRadius: 12, fontSize: 12.5, fontWeight: 700, background: isActive ? `linear-gradient(135deg, ${hexToRgba(groupColor, 0.22)}, ${hexToRgba(groupColor, 0.10)})` : 'transparent', color: isActive ? groupColor : hexToRgba(groupColor, 0.65), border: isActive ? `1px solid ${hexToRgba(groupColor, 0.35)}` : '1px solid transparent' }}><span className="sidebar-icon-shell"><ItemIcon size={15.5} /></span><span style={{ lineHeight: 1.25, flex: 1 }}>{item.label}</span></motion.div>}</NavLink>
                  })}
                </div>}
              </div>
            )
          })}

          {standaloneItems.length > 0 && <>
            <div className="mono" style={{ fontSize: 9.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.4, padding: '12px 12px 8px', fontWeight: 700 }}>Tools</div>
            {standaloneItems.map(item => {
              const Icon = item.icon
              const iconColor = item.color || COLORS.pink
              return <NavLink key={item.to} to={item.to} end={item.to === '/settings' || item.to === '/ai-dialer'} style={{ textDecoration: 'none' }} onClick={closeMobileNav}>{({ isActive }) => <motion.div whileHover={{ x: isActive ? 0 : 3 }} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 10px', borderRadius: 18, fontSize: 13.3, fontWeight: 800, background: isActive ? `linear-gradient(135deg, ${hexToRgba(iconColor, 0.26)}, ${hexToRgba(iconColor, 0.12)})` : 'transparent', color: isActive ? iconColor : hexToRgba(iconColor, 0.8), border: isActive ? `1px solid ${hexToRgba(iconColor, 0.3)}` : '1px solid transparent' }}><span className="sidebar-icon-shell"><Icon size={16.5} /></span><span style={{ lineHeight: 1.25, flex: 1 }}>{item.label}</span></motion.div>}</NavLink>
            })}
          </>}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 10px', marginBottom: 8, borderTop: '1px solid var(--border)', marginTop: 8 }}>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Appearance</span><ThemeToggle />
        </div>
        <button type="button" onClick={() => setPerformanceMode(value => !value)} className={`ptdt-action-btn ${performanceMode ? 'active' : ''}`} style={{ margin: '0 4px 10px', minHeight: 34, fontSize: 10.5 }} title="Reduce animations, blur, and background effects for smoother Electron performance"><span style={{ width: 8, height: 8, borderRadius: 999, background: performanceMode ? 'var(--green-2)' : 'var(--muted)' }} />Performance {performanceMode ? 'On' : 'Off'}</button>
        {desktopVersion && <div className="mono" style={{ margin: '0 8px 10px', fontSize: 9.5, color: 'var(--muted)', textAlign: 'center', letterSpacing: 0.7, textTransform: 'uppercase' }}>Desktop v{desktopVersion}</div>}
        <DesktopUpdateControl />
        <div style={{ paddingTop: 6 }}>
          <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 8, borderRadius: 14 }}>
            <div style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #fb0b8c, #8057d7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', boxShadow: '0 4px 12px rgba(251,11,140,0.30)', flexShrink: 0 }}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}<span style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: '#2ae97b', border: '2px solid var(--surface)' }} /></div>
            <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'User'}</div><div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{(user as Record<string, unknown> | null)?.agentCode as string || '—'}</div></div>
            <NotificationBell />
          </div>
          <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={handleLogout} className="sidebar-signout" style={{ width: '100%', height: 42, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 850, cursor: 'pointer' }}><LogOut size={15} /> Sign Out</motion.button>
        </div>
      </aside>
    </>
  )
}
