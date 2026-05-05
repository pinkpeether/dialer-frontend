import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Zap, ArrowRight, ShieldCheck, Activity, Radio } from 'lucide-react'
import { authAPI }      from '../api/auth.api'
import { useAuthStore } from '../store/auth.store'
import ThemeToggle      from '../components/ThemeToggle'

export default function Login() {
  const navigate  = useNavigate()
  const setAuth   = useAuthStore(s => s.setAuth)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const data = await authAPI.login(email, password)
      setAuth(data.user, data.token)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || 'Login failed'
      setError(msg)
    } finally { setLoading(false) }
  }

  const inputWrap: React.CSSProperties = { position: 'relative' }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 14px 14px 44px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-input)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
    transition: 'all 0.2s',
    backdropFilter: 'blur(8px)',
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Aurora background */}
      <div className="aurora-bg"><div className="aurora-orb-3" /></div>
      <div className="grid-overlay" />

      {/* Theme toggle (top-right) */}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 10 }}>
        <ThemeToggle compact />
      </div>

      <div style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1.1fr 1fr',
        gap: 0,
        position: 'relative', zIndex: 1,
      }}>

        {/* ================= LEFT — Brand panel ================= */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          style={{
            padding: '60px 64px',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Top brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              position: 'relative',
              width: 48, height: 48, borderRadius: 14,
              background: 'var(--grad-brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--glow-brand)',
            }}>
              <Zap size={24} color="#fff" strokeWidth={2.5} fill="#fff"/>
            </div>
            <div>
              <div className="display" style={{
                fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}>
                JD <span className="gradient-brand-text">Dialer</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
                Next-gen calling stack
              </div>
            </div>
          </div>

          {/* Hero text */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="badge"
              style={{
                background: 'var(--accent-bg)',
                color: 'var(--accent-text)',
                border: '1px solid var(--border-strong)',
                marginBottom: 24,
                width: 'fit-content',
              }}
            >
              <Radio size={11}/> Live · v2.0
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="display"
              style={{
                fontSize: 'clamp(36px, 5vw, 60px)',
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                marginBottom: 20,
                color: 'var(--text-primary)',
              }}
            >
              Dial smarter.<br/>
              <span className="gradient-brand-text">Close faster.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              style={{
                fontSize: 16, color: 'var(--text-secondary)',
                lineHeight: 1.6, maxWidth: 480, marginBottom: 36,
              }}
            >
              The operator console for high-velocity outbound teams. Real-time pipelines, live agents,
              automated campaigns — orchestrated in one cinematic surface.
            </motion.p>

            {/* Feature pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[
                { icon: Activity,   label: 'Live Pipeline' },
                { icon: ShieldCheck, label: 'JWT + API Keys' },
                { icon: Zap,        label: 'Burst Dialing' },
              ].map((f, i) => {
                const Icon = f.icon
                return (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.08 }}
                    className="glass"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 14px',
                      borderRadius: 999,
                      fontSize: 12, color: 'var(--text-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    <Icon size={13} color="var(--accent)"/>
                    {f.label}
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            fontSize: 11, color: 'var(--text-faint)',
          }}>
            <span>© {new Date().getFullYear()} JD Dialer</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-faint)' }} />
            <span>Powered by Peether PTDT</span>
          </div>
        </motion.div>

        {/* ================= RIGHT — Login card ================= */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px 32px',
        }}>
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            className="glass"
            style={{
              width: '100%', maxWidth: 440,
              padding: 40,
              borderRadius: 'var(--radius-2xl)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 24, right: 24, height: 1,
              background: 'var(--grad-brand)',
              opacity: 0.6,
            }} />

            <div style={{ marginBottom: 28 }}>
              <h2 className="display" style={{
                fontSize: 26, fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 6, letterSpacing: '-0.02em',
              }}>
                Welcome back
              </h2>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
                Sign in to access your operator dashboard.
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  color: 'var(--danger)', fontSize: 13, marginBottom: 20,
                  fontWeight: 500,
                }}
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 18 }}>
                <label style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: 1.2,
                  display: 'block', marginBottom: 8,
                }}>
                  Email
                </label>
                <div style={inputWrap}>
                  <Mail size={16} color="var(--text-muted)" style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  }}/>
                  <input
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@jddialer.com"
                    required style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: 1.2,
                  display: 'block', marginBottom: 8,
                }}>
                  Password
                </label>
                <div style={inputWrap}>
                  <Lock size={16} color="var(--text-muted)" style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  }}/>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none',
                      color: 'var(--text-muted)',
                      padding: 6, borderRadius: 6,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="btn-brand"
                style={{
                  width: '100%', padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 14.5, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  letterSpacing: 0.2,
                }}
              >
                {loading ? (
                  <>Authenticating…</>
                ) : (
                  <>Sign in to Console <ArrowRight size={16}/></>
                )}
              </motion.button>
            </form>

            <div style={{
              marginTop: 24, paddingTop: 20,
              borderTop: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, fontSize: 11.5, color: 'var(--text-faint)',
            }}>
              <ShieldCheck size={12}/> Secured with end-to-end encryption
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
