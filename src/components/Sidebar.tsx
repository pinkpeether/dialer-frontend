import { NavLink, useNavigate } from 'react-router-dom'
import {
  Phone, LayoutDashboard, Users,
  Megaphone, BookUser, LogOut,
  BarChart3, Headset, Settings2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/auth.store'
import { authAPI }      from '../api/auth.api'
import ThemeToggle      from './ThemeToggle'

const NAV = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/dialer',          icon: Phone,           label: 'Dialer'          },
  { to: '/agent/dashboard', icon: Headset,         label: 'Agent Dashboard' },
  { to: '/campaigns',       icon: Megaphone,       label: 'Campaigns'       },
  { to: '/contacts',        icon: BookUser,        label: 'Contacts'        },
  { to: '/agents',          icon: Users,           label: 'Agents'          },
  { to: '/reports',         icon: BarChart3,       label: 'Reports'         },
  { to: '/sip-settings',    icon: Settings2,       label: 'SIP Settings'    },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    void authAPI.logout().catch(() => undefined)
    logout()
    navigate('/login', { replace: true })
  }

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
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '4px 6px',
        marginBottom: 22,
      }}>
        <motion.img
          src="ptdt-main-logo.png"
          alt="PTDT"
          whileHover={{ scale: 1.04 }}
          transition={{ type: 'spring', stiffness: 280 }}
          style={{
            width: 48, height: 48,
            objectFit: 'contain',
            borderRadius: 12,
            background: 'transparent',
            mixBlendMode: 'multiply',
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16, fontWeight: 900,
            color: 'var(--text)',
            lineHeight: 1.05, letterSpacing: '-0.03em',
          }}>
            PTDT-<span className="gradient-brand-text">Dialer</span>
          </div>
          <div className="mono" style={{
            fontSize: 9, color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: 1.4, marginTop: 3,
            fontWeight: 700,
          }}>
            {user?.role || 'Operator'} Console
          </div>
        </div>
      </div>

      <div style={{
        padding: '8px 10px',
        marginBottom: 18,
        borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(251,11,140,0.08), rgba(128,87,215,0.08))',
        border: '1px solid var(--border)',
        fontSize: 10.5,
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        color: 'var(--text-3)',
        textAlign: 'center',
        lineHeight: 1.4,
      }}>
        Trust the <span style={{ color: 'var(--pink)' }}>{`{ Code }`}</span>,
        <br />
        <span style={{ color: 'var(--green-2)' }}>// </span>
        Not the Cult!
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'auto' }}>
        <div className="mono" style={{
          fontSize: 9.5, color: 'var(--muted)',
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
                  whileHover={{ x: isActive ? 0 : 3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{
                    position: 'relative',
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 14px',
                    borderRadius: 999,
                    fontSize: 13.5,
                    fontWeight: 700,
                    background: isActive
                      ? 'linear-gradient(135deg, #fb0b8c, #ff4bad)'
                      : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-3)',
                    boxShadow: isActive
                      ? '0 12px 26px rgba(251,11,140,0.28), inset 0 1px 0 rgba(255,255,255,0.22)'
                      : 'none',
                    transition: 'background 0.25s, color 0.25s, box-shadow 0.25s',
                  }}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-glow"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 999,
                        background: 'linear-gradient(135deg, #fb0b8c, #ff4bad)',
                        boxShadow: '0 12px 26px rgba(251,11,140,0.30)',
                        zIndex: -1,
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
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

      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 10px', marginBottom: 8,
        borderTop: '1px solid var(--border)',
        marginTop: 8,
      }}>
        <span className="mono" style={{
          fontSize: 10.5, color: 'var(--text-3)',
          fontWeight: 700, letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}>
          Appearance
        </span>
        <ThemeToggle />
      </div>

      <div style={{ paddingTop: 6 }}>
        <div className="glass" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', marginBottom: 8,
          borderRadius: 14,
        }}>
          <div style={{
            position: 'relative',
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #fb0b8c, #8057d7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: '#fff',
            boxShadow: '0 4px 12px rgba(251,11,140,0.30)',
          }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            <span style={{
              position: 'absolute', bottom: -1, right: -1,
              width: 10, height: 10, borderRadius: '50%',
              background: '#2ae97b',
              border: '2px solid var(--surface)',
            }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: 12.5, fontWeight: 700, color: 'var(--text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user?.name || 'User'}
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
              {user?.agentCode || '—'}
            </div>
          </div>
        </div>

        <motion.button
          onClick={handleLogout}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 12px',
            borderRadius: 999,
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-3)',
            fontSize: 12.5, fontWeight: 700,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--danger)'
            e.currentTarget.style.color = 'var(--danger)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-3)'
          }}
        >
          <LogOut size={14}/> Sign Out
        </motion.button>
      </div>
    </aside>
  )
}
