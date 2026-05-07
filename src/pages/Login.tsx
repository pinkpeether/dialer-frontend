import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Activity, Radio, Code2 } from 'lucide-react'
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
  } finally {
    setLoading(false)
  }
}

  const inputWrap: React.CSSProperties = { position: 'relative' }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 14px 14px 44px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    color: 'var(--text)', fontSize: 14, outline: 'none',
    transition: 'all 0.2s',
    fontFamily: 'var(--font-body)',
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
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
            <img
              src="ptdt-main-logo.png"
              alt="PTDT"
              style={{
                width: 78, height: 78,
                objectFit: 'contain',
                mixBlendMode: 'multiply',
              }}
            />
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22, fontWeight: 900, color: 'var(--text)',
                letterSpacing: '-0.03em', lineHeight: 1.1,
              }}>
                PTDT-<span className="gradient-brand-text">Dialer</span>
              </div>
              <div className="mono" style={{
                fontSize: 11, color: 'var(--text-3)',
                letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 700,
                marginTop: 4,
              }}>
                Operator Settlement Console
              </div>
            </div>
          </div>

          {/* Hero text */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="eyebrow"
              style={{ marginBottom: 24 }}
            >
              <span className="pulse-dot" />
              <Radio size={11}/> Live · v2.0 · BSC Mainnet
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(36px, 5vw, 60px)',
                fontWeight: 900,
                lineHeight: 1.04,
                letterSpacing: '-0.04em',
                marginBottom: 22,
                color: 'var(--text)',
              }}
            >
              Dispatch smarter.<br/>
              <span className="gradient-brand-text">Settle faster.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              style={{
                fontSize: 16, color: 'var(--text-2)',
                lineHeight: 1.7, maxWidth: 480, marginBottom: 28,
              }}
            >
              The operator console for the <strong style={{ color: 'var(--pink)' }}>PTDT</strong>{' '}
              settlement protocol. Real-time pipelines, live agents, automated campaigns —
              orchestrated in one cinematic surface.
            </motion.p>

            {/* Slogan callout */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.7 }}
              className="mono"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 16px',
                borderRadius: 999,
                background: 'linear-gradient(135deg, rgba(251,11,140,0.10), rgba(128,87,215,0.08), rgba(0,167,71,0.10))',
                border: '1px solid var(--border)',
                fontSize: 12.5, fontWeight: 700,
                color: 'var(--text-2)',
                marginBottom: 30,
              }}
            >
              <Code2 size={13} color="var(--pink)" />
              Trust the <span style={{ color: 'var(--pink)' }}>{`{ Code }`}</span>,{' '}
              <span style={{ color: 'var(--green-2)' }}>// Not the Cult!</span>
            </motion.div>

            {/* Feature pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[
                { icon: Activity,    label: 'Live Pipeline',  c: 'var(--pink)' },
                { icon: ShieldCheck, label: 'JWT + API Keys', c: 'var(--green-2)' },
                { icon: Code2,       label: 'On-chain Ready', c: 'var(--purple)' },
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
                      fontSize: 12, color: 'var(--text-2)',
                      fontWeight: 700,
                    }}
                  >
                    <Icon size={13} color={f.c}/>
                    {f.label}
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="mono" style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            fontSize: 10.5, color: 'var(--text-3)',
            lineHeight: 1.6,
          }}>
            <span>
              Copyrights © <span style={{ color: 'var(--text-2)', fontWeight: 700 }}>PTDT-Dialer</span>
              {' · '}Pink Taxi Group Ltd · United Kingdom. All rights reserved.
            </span>
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
            className="glass-hi"
            style={{
              width: '100%', maxWidth: 440,
              padding: 40,
              borderRadius: 24,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 24, right: 24, height: 2,
              background: 'linear-gradient(90deg, #fb0b8c 0%, #8057d7 50%, #2ae97b 100%)',
              borderRadius: 2,
              opacity: 0.85,
            }} />

            <div style={{ marginBottom: 28 }}>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 26, fontWeight: 900,
                color: 'var(--text)',
                marginBottom: 6, letterSpacing: '-0.03em',
              }}>
                Welcome back
              </h2>
              <p style={{ fontSize: 13.5, color: 'var(--text-3)' }}>
                Sign in to access your operator dashboard.
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'var(--status-busy-bg)',
                  border: '1px solid var(--status-busy-bd)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  color: 'var(--status-busy-fg)', fontSize: 13, marginBottom: 20,
                  fontWeight: 600,
                }}
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 18 }}>
                <label className="mono" style={{
                  fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)',
                  textTransform: 'uppercase', letterSpacing: 1.2,
                  display: 'block', marginBottom: 8,
                }}>
                  Email
                </label>
                <div style={inputWrap}>
                  <Mail size={16} color="var(--text-3)" style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  }}/>
                  <input
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@ptdt.taxi"
                    required style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'var(--pink)'; e.target.style.boxShadow = '0 0 0 3px rgba(251,11,140,0.12)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <label className="mono" style={{
                  fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)',
                  textTransform: 'uppercase', letterSpacing: 1.2,
                  display: 'block', marginBottom: 8,
                }}>
                  Password
                </label>
                <div style={inputWrap}>
                  <Lock size={16} color="var(--text-3)" style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  }}/>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'var(--pink)'; e.target.style.boxShadow = '0 0 0 3px rgba(251,11,140,0.12)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none',
                      color: 'var(--text-3)',
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
                  borderRadius: 12,
                  fontSize: 14.5,
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
              marginTop: 22, paddingTop: 18,
              borderTop: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, fontSize: 11.5, color: 'var(--text-3)',
            }}>
              <ShieldCheck size={12}/> Secured with end-to-end encryption
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}