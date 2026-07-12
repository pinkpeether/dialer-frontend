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
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  CreditCard,
  Crown,
  Globe,
  HardDriveDownload,
  Headset,
  History,
  Layers3,
  LayoutDashboard,
  LifeBuoy,
  LockKeyhole,
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
import ThemeToggle from './ThemeToggle'
import PtdtAnimatedSlogan from './PtdtAnimatedSlogan'

type SupportedRole = 'SUPER_ADMIN' | 'CUSTOMER_ADMIN' | 'SUPERVISOR' | 'AGENT'
type NavItem = { to: string; icon: ElementType; label: string; color?: string }
type NavGroup = { key: string; label: string; icon: ElementType; color?: string; items: NavItem[] }

type SidebarProps = {
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

const COLORS = {
  pink: '#fb0b8c',
  green: '#00a747',
  purple: '#8057d7',
  slate: '#64748b',
}

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '')
  const value = normalized.length === 3 ? normalized.split('').map(char => char + char).join('') : normalized
  const int = Number.parseInt(value, 16)
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`
}

const item = (to: string, label: string, icon: ElementType, color: string): NavItem => ({ to, label, icon, color })
const group = (key: string, label: string, icon: ElementType, color: string, items: NavItem[]): NavGroup => ({ key, label, icon, color, items })

const SUPER_ADMIN_GROUPS: NavGroup[] = [
  group('dashboard', 'Dashboard', LayoutDashboard, COLORS.purple, [
    item('/dashboard', 'Main Dashboard', LayoutDashboard, COLORS.purple),
    item('/agent/dashboard', 'Agent Dashboard', Headset, COLORS.purple),
  ]),
  group('dialer', 'Dialer', Phone, COLORS.green, [
    item('/dialer', 'Calling Console', Phone, COLORS.green),
    item('/call-controls', 'Call Controls', PhoneCall, COLORS.green),
    item('/sms', 'Send SMS', MessageSquareText, COLORS.green),
  ]),
  group('ai-calls', 'AI Calls', Radio, COLORS.pink, [
    item('/ai-dialer', 'Start AI Call', PhoneCall, COLORS.pink),
    item('/ai-dialer/logs', 'AI Call History', History, COLORS.pink),
    item('/live-ai', 'Live AI Assistant', Radio, COLORS.pink),
  ]),
  group('campaigns', 'Campaigns', Megaphone, COLORS.pink, [
    item('/campaigns', 'Campaign List', Megaphone, COLORS.pink),
    item('/campaign-management-pro', 'Campaign Setup', Layers3, COLORS.pink),
    item('/advanced-dialing', 'Dialing Settings', Zap, COLORS.pink),
  ]),
  group('contacts', 'Contacts', BookUser, COLORS.green, [
    item('/contacts', 'Contact List', BookUser, COLORS.green),
    item('/contact-management-pro', 'Contact Tools', Users, COLORS.green),
    item('/dnc', 'DNC List', ShieldOff, COLORS.green),
  ]),
  group('agents', 'Agents', Users, COLORS.purple, [
    item('/agents', 'Team Users', Users, COLORS.purple),
    item('/attendance-integrity', 'Attendance', Clock3, COLORS.purple),
    item('/workforce-intelligence', 'Performance', BarChart3, COLORS.purple),
  ]),
  group('live-operations', 'Live Operations', Activity, COLORS.green, [
    item('/ops', "Today's Operations", Activity, COLORS.green),
    item('/live-monitoring-advanced', 'Live Calls', Globe, COLORS.green),
    item('/workforce-operations', 'Live Team', Users, COLORS.green),
  ]),
  group('calls-recordings', 'Calls & Recordings', History, COLORS.purple, [
    item('/calls', 'Call History', History, COLORS.purple),
    item('/callbacks', 'Callbacks', Calendar, COLORS.purple),
    item('/recordings', 'Recordings', Radio, COLORS.purple),
    item('/call-intelligence', 'Call Review', Headset, COLORS.purple),
    item('/recording-storage-pro', 'Recording Storage', HardDriveDownload, COLORS.purple),
  ]),
  group('reports', 'Reports', BarChart3, COLORS.pink, [
    item('/reports', 'Reports Overview', BarChart3, COLORS.pink),
    item('/reports-analytics-pro', 'Detailed Reports', Activity, COLORS.pink),
  ]),
  group('customers', 'Customers', Building2, COLORS.purple, [
    item('/commercial-control', 'Customer Accounts', Building2, COLORS.purple),
    item('/customer-onboarding', 'Add Customer', Crown, COLORS.purple),
    item('/platform/administration', 'Account Users & Access', Users, COLORS.purple),
    item('/billing', 'Billing & Plans', CreditCard, COLORS.purple),
  ]),
  group('telephony', 'Telephony Setup', Wrench, COLORS.green, [
    item('/sip-settings', 'SIP Configuration', Wrench, COLORS.green),
    item('/admin/spoofing', 'Caller ID', PhoneCall, COLORS.green),
  ]),
  group('system', 'System Administration', ServerCog, COLORS.purple, [
    item('/monitoring', 'System Health', Activity, COLORS.purple),
    item('/security-admin-pro', 'Security', LockKeyhole, COLORS.purple),
    item('/deployment-platform-pro', 'Deployment', ServerCog, COLORS.purple),
    item('/support/diagnostics', 'Diagnostics', LifeBuoy, COLORS.purple),
    item('/audit-logs', 'Audit Logs', ClipboardList, COLORS.purple),
    item('/settings/system', 'System Settings', SlidersHorizontal, COLORS.purple),
    item('/production/review', 'Production Review', Headset, COLORS.purple),
  ]),
  group('settings-support', 'Settings & Support', Settings2, COLORS.slate, [
    item('/settings', 'My Account', Settings2, COLORS.slate),
    item('/notifications-alerts-pro', 'Notifications', BellRing, COLORS.slate),
    item('/ui-ux-pro', 'Appearance & Shortcuts', Palette, COLORS.slate),
  ]),
]

const CUSTOMER_ADMIN_GROUPS: NavGroup[] = [
  group('dashboard', 'Dashboard', LayoutDashboard, COLORS.purple, [
    item('/dashboard', 'Account Dashboard', LayoutDashboard, COLORS.purple),
    item('/agent/dashboard', 'Agent Dashboard', Headset, COLORS.purple),
  ]),
  group('dialer', 'Dialer', Phone, COLORS.green, [
    item('/dialer', 'Calling Console', Phone, COLORS.green),
    item('/call-controls', 'Call Controls', PhoneCall, COLORS.green),
    item('/sms', 'Send SMS', MessageSquareText, COLORS.green),
  ]),
  group('ai-calls', 'AI Calls', Radio, COLORS.pink, [
    item('/ai-dialer', 'Start AI Call', PhoneCall, COLORS.pink),
    item('/ai-dialer/logs', 'AI Call History', History, COLORS.pink),
    item('/live-ai', 'Live AI Assistant', Radio, COLORS.pink),
  ]),
  group('campaigns', 'Campaigns', Megaphone, COLORS.pink, [
    item('/campaigns', 'Campaign List', Megaphone, COLORS.pink),
    item('/campaign-management-pro', 'Campaign Setup', Layers3, COLORS.pink),
    item('/advanced-dialing', 'Dialing Settings', Zap, COLORS.pink),
  ]),
  group('contacts', 'Contacts', BookUser, COLORS.green, [
    item('/contacts', 'Contact List', BookUser, COLORS.green),
    item('/contact-management-pro', 'Contact Tools', Users, COLORS.green),
    item('/dnc', 'DNC List', ShieldOff, COLORS.green),
  ]),
  group('agents', 'Agents', Users, COLORS.purple, [
    item('/agents', 'Team Users', Users, COLORS.purple),
    item('/attendance-integrity', 'Attendance', Clock3, COLORS.purple),
    item('/workforce-intelligence', 'Performance', BarChart3, COLORS.purple),
  ]),
  group('live-operations', 'Live Operations', Activity, COLORS.green, [
    item('/ops', "Today's Operations", Activity, COLORS.green),
    item('/live-monitoring-advanced', 'Live Calls', Globe, COLORS.green),
    item('/workforce-operations', 'Live Team', Users, COLORS.green),
  ]),
  group('calls-recordings', 'Calls & Recordings', History, COLORS.purple, [
    item('/calls', 'Call History', History, COLORS.purple),
    item('/callbacks', 'Callbacks', Calendar, COLORS.purple),
    item('/recordings', 'Recordings', Radio, COLORS.purple),
    item('/call-intelligence', 'Call Review', Headset, COLORS.purple),
    item('/recording-storage-pro', 'Recording Storage', HardDriveDownload, COLORS.purple),
  ]),
  group('reports', 'Reports', BarChart3, COLORS.pink, [
    item('/reports', 'Reports Overview', BarChart3, COLORS.pink),
    item('/reports-analytics-pro', 'Detailed Reports', Activity, COLORS.pink),
  ]),
  group('telephony', 'Telephony Setup', Wrench, COLORS.green, [
    item('/sip-settings', 'SIP Configuration', Wrench, COLORS.green),
    item('/admin/spoofing', 'Caller ID', PhoneCall, COLORS.green),
  ]),
  group('account-support', 'Account & Support', Settings2, COLORS.slate, [
    item('/billing', 'Billing & Plan', CreditCard, COLORS.slate),
    item('/settings', 'My Account', Settings2, COLORS.slate),
    item('/notifications-alerts-pro', 'Notifications', BellRing, COLORS.slate),
    item('/ui-ux-pro', 'Appearance & Shortcuts', Palette, COLORS.slate),
    item('/support/diagnostics', 'Support Diagnostics', LifeBuoy, COLORS.slate),
  ]),
]

const SUPERVISOR_GROUPS: NavGroup[] = [
  group('dashboard', 'Dashboard', LayoutDashboard, COLORS.purple, [
    item('/dashboard', 'Operations Dashboard', LayoutDashboard, COLORS.purple),
    item('/agent/dashboard', 'Team Dashboard', Headset, COLORS.purple),
  ]),
  group('dialer', 'Dialer', Phone, COLORS.green, [
    item('/dialer', 'Calling Console', Phone, COLORS.green),
    item('/call-controls', 'Call Controls', PhoneCall, COLORS.green),
    item('/sms', 'Send SMS', MessageSquareText, COLORS.green),
  ]),
  group('ai-calls', 'AI Calls', Radio, COLORS.pink, [
    item('/ai-dialer', 'Start AI Call', PhoneCall, COLORS.pink),
    item('/ai-dialer/logs', 'AI Call History', History, COLORS.pink),
    item('/live-ai', 'Live AI Assistant', Radio, COLORS.pink),
  ]),
  group('campaigns', 'Campaigns', Megaphone, COLORS.pink, [
    item('/campaigns', 'Campaign List', Megaphone, COLORS.pink),
  ]),
  group('contacts', 'Contacts', BookUser, COLORS.green, [
    item('/contacts', 'Contact List', BookUser, COLORS.green),
    item('/dnc', 'DNC List', ShieldOff, COLORS.green),
  ]),
  group('agents', 'Agents', Users, COLORS.purple, [
    item('/agents', 'Agents', Users, COLORS.purple),
    item('/attendance-integrity', 'Attendance', Clock3, COLORS.purple),
    item('/workforce-intelligence', 'Performance', BarChart3, COLORS.purple),
  ]),
  group('live-operations', 'Live Operations', Activity, COLORS.green, [
    item('/ops', "Today's Operations", Activity, COLORS.green),
    item('/live-monitoring-advanced', 'Live Calls', Globe, COLORS.green),
    item('/workforce-operations', 'Live Team', Users, COLORS.green),
  ]),
  group('calls-recordings', 'Calls & Recordings', History, COLORS.purple, [
    item('/calls', 'Call History', History, COLORS.purple),
    item('/callbacks', 'Callbacks', Calendar, COLORS.purple),
    item('/recordings', 'Recordings', Radio, COLORS.purple),
    item('/call-intelligence', 'Call Review', Headset, COLORS.purple),
  ]),
  group('reports', 'Reports', BarChart3, COLORS.pink, [
    item('/reports', 'Reports Overview', BarChart3, COLORS.pink),
  ]),
  group('settings-support', 'Settings & Support', Settings2, COLORS.slate, [
    item('/settings', 'My Account', Settings2, COLORS.slate),
    item('/notifications-alerts-pro', 'Notifications', BellRing, COLORS.slate),
    item('/support/diagnostics', 'Support Diagnostics', LifeBuoy, COLORS.slate),
  ]),
]

const AGENT_GROUPS: NavGroup[] = [
  group('workspace', 'My Workspace', BriefcaseBusiness, COLORS.purple, [
    item('/agent/workspace', 'Agent Workspace', BriefcaseBusiness, COLORS.purple),
    item('/dialer', 'Calling Console', Phone, COLORS.green),
  ]),
  group('contacts', 'Contacts', BookUser, COLORS.green, [
    item('/contacts', 'Contact List', BookUser, COLORS.green),
  ]),
  group('calls', 'My Calls', History, COLORS.purple, [
    item('/calls', 'Call History', History, COLORS.purple),
    item('/callbacks', 'Callbacks', Calendar, COLORS.purple),
  ]),
  group('ai-assistant', 'AI Assistant', Radio, COLORS.pink, [
    item('/live-ai', 'Live AI Assistant', Radio, COLORS.pink),
  ]),
  group('settings', 'Settings', Settings2, COLORS.slate, [
    item('/notifications-alerts-pro', 'Notifications', BellRing, COLORS.slate),
    item('/settings', 'My Account', Settings2, COLORS.slate),
  ]),
]

const ROLE_GROUPS: Record<SupportedRole, NavGroup[]> = {
  SUPER_ADMIN: SUPER_ADMIN_GROUPS,
  CUSTOMER_ADMIN: CUSTOMER_ADMIN_GROUPS,
  SUPERVISOR: SUPERVISOR_GROUPS,
  AGENT: AGENT_GROUPS,
}

const ROLE_CONSOLE_LABELS: Record<SupportedRole, string> = {
  SUPER_ADMIN: 'PLATFORM CONSOLE',
  CUSTOMER_ADMIN: 'CUSTOMER ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  AGENT: 'AGENT WORKSPACE',
}

const isSupportedRole = (role?: string): role is SupportedRole => (
  role === 'SUPER_ADMIN' ||
  role === 'CUSTOMER_ADMIN' ||
  role === 'SUPERVISOR' ||
  role === 'AGENT'
)

const SIDEBAR_FEATURED_CSS = `
.ptdt-sidebar-group-btn{position:relative;overflow:hidden}.ptdt-sidebar-group-btn>*{position:relative;z-index:2}.ptdt-sidebar-group-btn-featured::after{content:"";position:absolute;top:-45%;bottom:-45%;left:-80%;width:46%;z-index:1;pointer-events:none;background:linear-gradient(105deg,transparent 0%,rgba(255,255,255,0.18) 36%,rgba(255,255,255,0.82) 50%,rgba(42,233,123,0.22) 62%,transparent 100%);transform:skewX(-18deg);mix-blend-mode:screen;animation:ptdt-sidebar-rider-sweep 3.25s ease-in-out infinite}@keyframes ptdt-sidebar-rider-sweep{0%{left:-82%;opacity:0}25%{opacity:.92}55%{left:124%;opacity:.92}100%{left:124%;opacity:0}}@media(prefers-reduced-motion:reduce){.ptdt-sidebar-group-btn-featured::after{animation:none!important;opacity:0}}
`

const isMobileViewport = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches

export default function Sidebar({ collapsed = false, onCollapsedChange }: SidebarProps) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const userRole = (user as Record<string, unknown> | null)?.role as string | undefined
  const normalizedRole = userRole?.toUpperCase()
  const role = isSupportedRole(normalizedRole) ? normalizedRole : null
  const groups = role ? ROLE_GROUPS[role] : []
  const consoleLabel = role ? ROLE_CONSOLE_LABELS[role] : 'USER'
  const homeRoute = role === 'AGENT' ? '/agent/workspace' : '/dashboard'
  const isPathActive = useCallback((to: string) => location.pathname === to || (to !== '/' && location.pathname.startsWith(`${to}/`)), [location.pathname])

  const activeGroupKey = useMemo(() => {
    const activeGroup = groups.find(navGroup => navGroup.items.some(navItem => isPathActive(navItem.to)))
    return activeGroup?.key || ''
  }, [groups, isPathActive])

  const closeMobileNav = () => { if (isMobileViewport()) setMobileOpen(false) }
  const toggleGroup = (navGroup: NavGroup) => {
    if (collapsed) {
      const first = navGroup.items[0]
      if (first) navigate(first.to)
      closeMobileNav()
      return
    }
    setExpandedGroups(previous => ({ [navGroup.key]: !previous[navGroup.key] }))
  }

  useEffect(() => {
    if (collapsed) return
    setExpandedGroups(activeGroupKey ? { [activeGroupKey]: true } : {})
  }, [activeGroupKey, collapsed])

  useEffect(() => {
    document.documentElement.dataset.performanceMode = 'on'
    window.localStorage.setItem('ptdt-performance-mode', 'on')
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

  const sidebarWidth = collapsed ? 96 : 324

  return (
    <>
      <style>{SIDEBAR_FEATURED_CSS}</style>
      <button type="button" className="ptdt-mobile-nav-toggle" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu"><Menu size={18} /><span>Menu</span></button>
      <button type="button" className={`ptdt-mobile-nav-backdrop ${mobileOpen ? 'is-open' : ''}`} onClick={() => setMobileOpen(false)} aria-label="Close navigation menu" />

      <aside className={`ptdt-sidebar ${mobileOpen ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`} style={{ width: sidebarWidth, height: '100vh', background: 'var(--bg-glass-hi)', backdropFilter: 'blur(22px) saturate(160%)', WebkitBackdropFilter: 'blur(22px) saturate(160%)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: collapsed ? '16px 10px' : '14px 14px 12px', position: 'fixed', top: 0, left: 0, zIndex: 30, boxShadow: 'var(--shadow-md)', boxSizing: 'border-box', overflowX: 'hidden', transition: 'width .22s ease, padding .22s ease' }}>
        <div style={{ position: 'relative', display: collapsed ? 'flex' : 'grid', gridTemplateColumns: collapsed ? undefined : 'minmax(104px, 128px) auto', justifyContent: 'center', alignItems: 'center', columnGap: 8, rowGap: 4, padding: collapsed ? '6px 0 18px' : '2px 2px 18px', marginBottom: collapsed ? 2 : 6, textAlign: 'center' }}>
          <button type="button" className="ptdt-mobile-sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation menu" style={{ position: 'absolute', top: 0, right: 0 }}><X size={18} /></button>
          <motion.button
            type="button"
            aria-label="Go to home"
            title="Go to home"
            onClick={() => {
              navigate(homeRoute)
              closeMobileNav()
            }}
            whileHover={{ scale: 1.04 }}
            transition={{ type: 'spring', stiffness: 280 }}
            style={{
              width: collapsed ? 56 : 126,
              height: collapsed ? 56 : 82,
              padding: 0,
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              justifySelf: 'end',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <img src="ptdt-main-logo.png" alt="PTDT" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 0, background: 'transparent', mixBlendMode: 'multiply' }} />
          </motion.button>
          {!collapsed && <><div style={{ fontFamily: 'var(--font-display)', fontSize: 31, fontWeight: 950, color: 'var(--text)', lineHeight: 1, letterSpacing: '-0.055em', justifySelf: 'start' }}>Dialer</div><div className="mono" style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 4.8, marginTop: -2, fontWeight: 800 }}>{consoleLabel}</div></>}
        </div>

        {!collapsed && <div style={{ padding: '8px 10px', marginBottom: 10, borderRadius: 14, background: 'linear-gradient(135deg, rgba(251,11,140,0.08), rgba(128,87,215,0.08))', border: '1px solid var(--border)', fontSize: 10.5, fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.45 }}>
          <PtdtAnimatedSlogan compact />
        </div>}

        <nav style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: collapsed ? 8 : 5, overflowY: 'auto', overflowX: 'hidden', paddingRight: collapsed ? 0 : 2, paddingBottom: collapsed ? 8 : 30 }}>
          {!collapsed && <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.5, padding: '0 12px 8px', fontWeight: 800 }}>Navigation</div>}
          {groups.map(navGroup => {
            const Icon = navGroup.icon
            const groupColor = navGroup.color || COLORS.pink
            const isGroupActive = navGroup.items.some(navItem => isPathActive(navItem.to))
            const isOpen = Boolean(expandedGroups[navGroup.key]) && !collapsed
            const isFeaturedDialerGroup = navGroup.key === 'ai-calls' || navGroup.key === 'dialer'

            return (
              <div key={navGroup.key} style={{ display: 'grid', gap: 5 }}>
                <button type="button" title={collapsed ? navGroup.label : undefined} data-sidebar-tooltip={collapsed ? navGroup.label : undefined} className={`ptdt-sidebar-group-btn ${isFeaturedDialerGroup ? 'ptdt-sidebar-group-btn-featured' : ''}`} onClick={() => toggleGroup(navGroup)} style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 11, width: '100%', minHeight: collapsed ? 52 : 42, padding: collapsed ? '0' : '9px 12px', borderRadius: collapsed ? 18 : 14, border: `1px solid ${hexToRgba(groupColor, isOpen ? 0.52 : isGroupActive ? 0.35 : 0.18)}`, background: isOpen ? `linear-gradient(135deg, ${hexToRgba(groupColor, 0.32)}, ${hexToRgba(groupColor, 0.16)})` : isGroupActive ? `linear-gradient(135deg, ${hexToRgba(groupColor, 0.18)}, ${hexToRgba(groupColor, 0.08)})` : `linear-gradient(135deg, ${hexToRgba(groupColor, 0.09)}, ${hexToRgba(groupColor, 0.04)})`, color: groupColor, cursor: 'pointer', textAlign: 'left', boxShadow: isOpen ? `0 6px 18px ${hexToRgba(groupColor, 0.28)}` : `0 1px 4px ${hexToRgba(groupColor, 0.08)}`, transition: 'all .25s ease' }}>
                  <span className="sidebar-icon-shell" style={{ color: groupColor, background: hexToRgba(groupColor, isOpen || isGroupActive ? 0.2 : 0.1) }}><Icon size={collapsed ? 20 : 16.5} /></span>
                  {!collapsed && <><span style={{ flex: 1, fontSize: 12.5, fontWeight: 900, lineHeight: 1.25, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{navGroup.label}</span>{isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</>}
                </button>
                {isOpen && <div style={{ display: 'grid', gap: 4, paddingLeft: 10, marginLeft: 13, borderLeft: `2px solid ${hexToRgba(groupColor, 0.32)}` }}>
                  {navGroup.items.map(navItem => {
                    const ItemIcon = navItem.icon
                    return <NavLink key={navItem.to} to={navItem.to} end={navItem.to === '/settings' || navItem.to === '/ai-dialer'} style={{ textDecoration: 'none' }} onClick={closeMobileNav}>{({ isActive }) => <motion.div whileHover={{ x: isActive ? 0 : 3 }} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '7px 10px', borderRadius: 12, fontSize: 12.5, fontWeight: 700, background: isActive ? `linear-gradient(135deg, ${hexToRgba(groupColor, 0.22)}, ${hexToRgba(groupColor, 0.10)})` : 'transparent', color: isActive ? groupColor : hexToRgba(groupColor, 0.65), border: isActive ? `1px solid ${hexToRgba(groupColor, 0.35)}` : '1px solid transparent' }}><span className="sidebar-icon-shell"><ItemIcon size={15.5} /></span><span style={{ lineHeight: 1.25, flex: 1 }}>{navItem.label}</span></motion.div>}</NavLink>
                  })}
                </div>}
              </div>
            )
          })}
        </nav>

        {!collapsed && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 6px 0', borderTop: '1px solid var(--border)', marginTop: 8 }}>
          <ThemeToggle />
          <span className="mono" style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--text-3)', fontWeight: 950, letterSpacing: 1.05, textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'left', marginRight: 8 }}>Night/Day</span>
          <button type="button" onClick={() => onCollapsedChange?.(true)} aria-label="Collapse sidebar" title="Collapse sidebar" style={{ width: 38, height: 38, borderRadius: 13, border: '1px solid rgba(255,255,255,.58)', background: 'linear-gradient(145deg, rgba(15,23,42,.96), rgba(15,23,42,.88))', color: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 0 0 2px rgba(255,255,255,.42), 0 0 0 4px rgba(15,23,42,.14), 0 10px 20px rgba(15,23,42,.20)', cursor: 'pointer', flexShrink: 0 }}><ChevronLeft size={17} strokeWidth={3} /></button>
        </div>}

        {collapsed && <button type="button" onClick={() => onCollapsedChange?.(false)} aria-label="Expand sidebar" title="Expand sidebar" style={{ alignSelf: 'center', width: 38, height: 38, marginTop: 10, borderRadius: 13, border: '1px solid rgba(255,255,255,.58)', background: 'linear-gradient(145deg, rgba(15,23,42,.96), rgba(15,23,42,.88))', color: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 0 0 2px rgba(255,255,255,.42), 0 0 0 4px rgba(15,23,42,.14), 0 10px 20px rgba(15,23,42,.20)', cursor: 'pointer' }}><ChevronRight size={17} strokeWidth={3} /></button>}
      </aside>
    </>
  )
}
