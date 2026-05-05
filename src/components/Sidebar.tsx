import { NavLink, useNavigate } from 'react-router-dom'
import {
  Phone, LayoutDashboard, Users,
  Megaphone, BookUser, LogOut, Zap,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/auth.store'
import { authAPI }      from '../api/auth.api'
import ThemeToggle      from './ThemeToggle'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dialer',    icon: Phone,           label: 'Dialer'    },
  { to: '/campaigns', icon: Megaphone,       label: 'Campaigns' },
  { to: '/contacts',  icon: BookUser,        label: 'Contacts'  },
  { to: '/agents',    icon: Users,           label: 'Agents'    },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await authAPI.logout() } catch { /* noop */ }
    logout()
    navigate('/login')
  }

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      background: 'var(--sidebar-bg)',
      backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      borderRight: '1px solid var(--sidebar-border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '22px 14px',
      position: 'fixed',
      top: 0, left: 0,
      zIndex: 30,
    }}>

      {/* === Logo / Brand === */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, paddingLeft: 6 }}>
        <motion.div
          whileHover={{ rotate: -8, scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300 }}
          style={{
            position: 'relative',
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--grad-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--glow-brand)',
          }}
        >
          <Zap size={20} color="#fff" strokeWidth={2.5} fill="#fff" />
          <div style={{
            position: 'absolute', inset: -4,
            borderRadius: 16,
            background: 'var(--grad-brand)',
            opacity: 0.25,
            filter: 'blur(10px)',
            zIndex: -1,
          }} />
        </motion.div>
        <div>
          <div className="display" style={{
            fontSize: 17, fontWeight: 700, color: 'var(--text-primary)',
            lineHeight: 1.1, letterSpacing: '-0.02em',
          }}>
            JD <span className="gradient-brand-text">Dialer</span>
          </div>
          <div style={{
            fontSize: 9, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: 1.6, marginTop: 2,
            fontWeight: 600,
          }}>
            {user?.role || 'Operator'} Console
          </div>
        </div>
      </div>

      {/* === Nav === */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{
          fontSize: 10, color: 'var(--text-faint)',
          textTransform: 'uppercase', letterSpacing: 1.4,
          padding: '0 12px 8px', fontWeight: 700,
        }}>
          Navigation
        </div>

        {NAV.map(item => {
          const Icon = item.icon
          return (
            <NavLink key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <motion.div
                  whileHover={{ x: 3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{
                    position: 'relative',
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 13.5, fontWeight: 600,
                    background: isActive ? 'var(--bg-active)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: `1px solid ${isActive ? 'var(--border-strong)' : 'transparent'}`,
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                  }}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-glow"
                      style={{
                        position: 'absolute',
                        left: 0, top: '20%', bottom: '20%',
                        width: 3,
                        background: 'var(--grad-brand)',
                        borderRadius: '0 4px 4px 0',
                        boxShadow: '0 0 12px var(--accent-glow)',
                      }}
                    />
                  )}
                  <Icon size={17} strokeWidth={isActive ? 2.4 : 2} />
                  {item.label}
                </motion.div>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* === Theme Toggle === */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 8px', marginBottom: 12,
      }}>
        <span style={{
          fontSize: 11, color: 'var(--text-muted)',
          fontWeight: 600, letterSpacing: 0.4,
        }}>
          Appearance
        </span>
        <ThemeToggle />
      </div>

      {/* === User card + Logout === */}
      <div style={{
        borderTop: '1px solid var(--sidebar-border)',
        paddingTop: 14,
      }}>
        <div className="glass" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', marginBottom: 10,
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{
            position: 'relative',
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--grad-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: '#fff',
            boxShadow: '0 0 0 2px var(--bg-card-solid), 0 0 0 3px var(--accent)',
          }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            <span style={{
              position: 'absolute', bottom: -1, right: -1,
              width: 10, height: 10, borderRadius: '50%',
              background: 'var(--success)',
              border: '2px solid var(--bg-card-solid)',
            }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user?.name || 'User'}
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
              {user?.agentCode || '—'}
            </div>
          </div>
        </div>

        <motion.button
          onClick={handleLogout}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            border: '1px solid var(--border-input)',
            color: 'var(--text-muted)',
            fontSize: 12.5, fontWeight: 600,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--danger)'
            e.currentTarget.style.color = 'var(--danger)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border-input)'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          <LogOut size={14}/> Sign Out
        </motion.button>
      </div>
    </aside>
  )
}
