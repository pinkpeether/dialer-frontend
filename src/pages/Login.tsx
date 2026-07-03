import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Activity, Radio, Code2, X } from 'lucide-react'
import { authAPI }      from '../api/auth.api'
import { useAuthStore } from '../store/auth.store'
import ThemeToggle      from '../components/ThemeToggle'
import { defaultRouteForRole } from '../utils/roleRoutes'

const loginResponsiveCss = `
.ptdt-login-root {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
  overflow-y: auto;
  background: var(--bg);
}

.ptdt-login-theme-toggle {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 20;
}

.ptdt-login-shell {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(360px, 0.92fr);
  gap: 0;
  position: relative;
  z-index: 1;
}

.ptdt-login-brand-panel {
  padding: 60px 64px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.ptdt-login-brand-top {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.ptdt-login-logo {
  width: 78px;
  height: 78px;
  object-fit: contain;
  mix-blend-mode: multiply;
  flex-shrink: 0;
}

.ptdt-login-brand-copy {
  min-width: 0;
}

.ptdt-login-brand-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 900;
  color: var(--text);
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.ptdt-login-brand-subtitle {
  font-size: 11px;
  color: var(--text-3);
  letter-spacing: 1.2px;
  text-transform: uppercase;
  font-weight: 700;
  margin-top: 4px;
}

.ptdt-login-hero {
  min-width: 0;
}

.ptdt-login-eyebrow {
  margin-bottom: 24px;
}

.ptdt-login-heading {
  font-family: var(--font-display);
  font-size: clamp(36px, 5vw, 60px);
  font-weight: 900;
  line-height: 1.04;
  letter-spacing: -0.04em;
  margin-bottom: 22px;
  color: var(--text);
}

.ptdt-login-copy {
  font-size: 16px;
  color: var(--text-2);
  line-height: 1.7;
  max-width: 480px;
  margin-bottom: 28px;
}

.ptdt-login-slogan {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(251,11,140,0.10), rgba(128,87,215,0.08), rgba(0,167,71,0.10));
  border: 1px solid var(--border);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-2);
  margin-bottom: 30px;
  max-width: 100%;
}

.ptdt-login-feature-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.ptdt-login-feature-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-2);
  font-weight: 700;
}

.ptdt-login-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 10.5px;
  color: var(--text-3);
  line-height: 1.6;
}

.ptdt-login-card-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px;
  min-width: 0;
}

.ptdt-login-access-card {
  width: 100%;
  max-width: 460px;
  padding: 34px;
  border-radius: 28px;
  position: relative;
  overflow: hidden;
}

.ptdt-login-access-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 28px;
  right: 28px;
  height: 2px;
  background: linear-gradient(90deg, #fb0b8c 0%, #8057d7 50%, #2ae97b 100%);
  border-radius: 2px;
  opacity: 0.9;
}

.ptdt-login-access-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(251,11,140,0.08);
  color: var(--text-2);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.9px;
  text-transform: uppercase;
  margin-bottom: 22px;
}

.ptdt-login-access-title {
  font-family: var(--font-display);
  font-size: 32px;
  line-height: 1.05;
  font-weight: 900;
  letter-spacing: -0.04em;
  color: var(--text);
  margin: 0 0 12px;
}

.ptdt-login-access-copy {
  color: var(--text-2);
  font-size: 14.5px;
  line-height: 1.65;
  margin: 0 0 24px;
}

.ptdt-login-access-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 24px;
}

.ptdt-login-access-metric {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  padding: 14px 15px;
  border-radius: 17px;
  border: 1px solid rgba(255,255,255,0.24);
  color: #ffffff;
  box-shadow: 0 16px 34px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.28);
}

.ptdt-login-access-metric::after {
  content: '';
  position: absolute;
  inset: -42% -28% auto auto;
  width: 92px;
  height: 92px;
  border-radius: 999px;
  background: rgba(255,255,255,0.24);
  filter: blur(10px);
  z-index: -1;
}

.ptdt-login-access-metric:nth-child(1) {
  background: linear-gradient(135deg, #fb0b8c 0%, #8057d7 100%);
}

.ptdt-login-access-metric:nth-child(2) {
  background: linear-gradient(135deg, #00e5a0 0%, #667085 52%, #8057d7 100%);
}

.ptdt-login-access-metric-label {
  display: block;
  font-size: 10px;
  color: rgba(255,255,255,0.78);
  font-weight: 900;
  letter-spacing: 0.95px;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.ptdt-login-access-metric-value {
  display: block;
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 900;
  text-shadow: 0 1px 8px rgba(15,23,42,0.22);
}

.ptdt-login-open-button {
  width: 100%;
  min-height: 48px;
  border-radius: 14px;
  font-size: 14.5px;
}

.ptdt-login-access-note {
  margin-top: 16px;
  color: var(--text-3);
  font-size: 11.5px;
  line-height: 1.6;
  text-align: center;
}

.ptdt-login-card {
  width: 100%;
  max-width: 440px;
  padding: 40px;
  border-radius: 24px;
  position: relative;
  overflow: hidden;
}

.ptdt-login-card-accent {
  position: absolute;
  top: 0;
  left: 24px;
  right: 24px;
  height: 2px;
  background: linear-gradient(90deg, #fb0b8c 0%, #8057d7 50%, #2ae97b 100%);
  border-radius: 2px;
  opacity: 0.85;
}

.ptdt-login-card-header {
  margin-bottom: 28px;
}

.ptdt-login-card-title {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 900;
  color: var(--text);
  margin-bottom: 6px;
  letter-spacing: -0.03em;
}

.ptdt-login-card-desc {
  font-size: 13.5px;
  color: var(--text-3);
}

.ptdt-login-error {
  background: var(--status-busy-bg);
  border: 1px solid var(--status-busy-bd);
  border-radius: 12px;
  padding: 12px 16px;
  color: var(--status-busy-fg);
  font-size: 13px;
  margin-bottom: 20px;
  font-weight: 600;
}

.ptdt-login-label {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  display: block;
  margin-bottom: 8px;
}

.ptdt-login-input-wrap {
  position: relative;
}

.ptdt-login-input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
}

.ptdt-login-password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-3);
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
}

.ptdt-login-submit {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  font-size: 14.5px;
}

.ptdt-login-security-note {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--text-3);
  text-align: center;
}

.ptdt-login-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(6, 10, 22, 0.58);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.ptdt-login-modal-card {
  width: min(100%, 460px);
  max-height: min(92dvh, 720px);
  overflow-y: auto;
  position: relative;
  box-shadow: 0 28px 90px rgba(15,23,42,0.32);
}

.ptdt-login-modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-glass-hi);
  color: var(--text-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ptdt-login-modal-close:hover {
  color: var(--text);
  border-color: rgba(251,11,140,0.38);
}

@media (max-width: 980px) {
  .ptdt-login-theme-toggle {
    top: 14px;
    right: 14px;
  }

  .ptdt-login-shell {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    width: 100%;
    max-width: 100vw;
    overflow-x: hidden;
  }

  .ptdt-login-brand-panel {
    padding: 54px 18px 14px;
    justify-content: flex-start;
    gap: 18px;
  }

  .ptdt-login-brand-top {
    align-items: center;
    gap: 12px;
  }

  .ptdt-login-logo {
    width: 58px;
    height: 58px;
  }

  .ptdt-login-brand-title {
    font-size: 20px;
  }

  .ptdt-login-brand-subtitle {
    font-size: 9.5px;
    letter-spacing: 1px;
    line-height: 1.45;
  }

  .ptdt-login-eyebrow {
    margin-bottom: 14px;
    max-width: 100%;
  }

  .ptdt-login-heading {
    font-size: clamp(32px, 10vw, 46px);
    margin-bottom: 12px;
  }

  .ptdt-login-copy {
    font-size: 13.5px;
    line-height: 1.55;
    max-width: 100%;
    margin-bottom: 14px;
  }

  .ptdt-login-slogan {
    padding: 8px 12px;
    font-size: 10.5px;
    margin-bottom: 12px;
    white-space: normal;
    border-radius: 16px;
  }

  .ptdt-login-feature-row {
    display: none;
  }

  .ptdt-login-footer {
    display: none;
  }

  .ptdt-login-card-wrap {
    align-items: flex-start;
    justify-content: center;
    padding: 0 18px 24px;
    width: 100%;
  }

  .ptdt-login-access-card {
    max-width: 560px;
    padding: 24px 18px 20px;
    border-radius: 22px;
  }

  .ptdt-login-access-title {
    font-size: 27px;
  }

  .ptdt-login-access-copy {
    font-size: 13px;
    margin-bottom: 16px;
  }

  .ptdt-login-access-grid {
    margin-bottom: 18px;
  }

  .ptdt-login-card {
    max-width: 520px;
    padding: 22px 16px 18px;
    border-radius: 20px;
  }

  .ptdt-login-card-header {
    margin-bottom: 18px;
  }

  .ptdt-login-card-title {
    font-size: 23px;
  }

  .ptdt-login-card-desc {
    font-size: 12.5px;
  }

  .ptdt-login-submit {
    min-height: 44px;
    padding: 12px;
  }

  .ptdt-login-security-note {
    margin-top: 16px;
    padding-top: 14px;
    font-size: 10.5px;
  }

  .ptdt-login-modal-backdrop {
    align-items: flex-start;
    padding: 72px 14px 18px;
    overflow-y: auto;
  }

  .ptdt-login-modal-card {
    max-height: none;
  }
}

@media (max-width: 520px) {
  .ptdt-login-root {
    min-width: 0;
    width: 100%;
    max-width: 100vw;
  }

  .ptdt-login-brand-panel {
    padding: 50px 12px 12px;
    gap: 14px;
  }

  .ptdt-login-logo {
    width: 50px;
    height: 50px;
  }

  .ptdt-login-brand-title {
    font-size: 18px;
  }

  .ptdt-login-brand-subtitle {
    font-size: 8.5px;
    letter-spacing: 0.9px;
  }

  .ptdt-login-eyebrow {
    padding: 8px 12px;
    font-size: 10px;
  }

  .ptdt-login-heading {
    font-size: clamp(28px, 12vw, 40px);
  }

  .ptdt-login-copy,
  .ptdt-login-slogan {
    display: none;
  }

  .ptdt-login-card-wrap {
    padding: 0 10px 18px;
  }

  .ptdt-login-access-card {
    padding: 20px 14px 16px;
    border-radius: 18px;
  }

  .ptdt-login-access-title {
    font-size: 24px;
  }

  .ptdt-login-access-grid {
    grid-template-columns: 1fr;
  }

  .ptdt-login-card {
    padding: 20px 14px 16px;
    border-radius: 18px;
  }

  .ptdt-login-card-accent {
    left: 16px;
    right: 16px;
  }

  .ptdt-login-card-title {
    font-size: 22px;
  }

  .ptdt-login-label {
    font-size: 10px;
  }
}
`

export default function Login() {
  const navigate  = useNavigate()
  const setAuth   = useAuthStore(s => s.setAuth)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const emailInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isLoginOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => emailInputRef.current?.focus(), 80)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || loading) return
      setError('')
      setShowPass(false)
      setIsLoginOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isLoginOpen, loading])

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true); setError('')
  try {
    const data = await authAPI.login(email, password)
    setAuth(data.user, data.token)
    navigate(defaultRouteForRole(data.user?.role), { replace: true })
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })
      ?.response?.data?.message || 'Login failed'
    setError(msg)
    setIsLoginOpen(true)
  } finally {
    setLoading(false)
  }
}

  const openLoginModal = () => {
    setError('')
    setIsLoginOpen(true)
  }

  const closeLoginModal = () => {
    if (loading) return
    setError('')
    setShowPass(false)
    setIsLoginOpen(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 14px 14px 44px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    color: 'var(--text)', fontSize: 14, outline: 'none',
    transition: 'all 0.2s',
    fontFamily: 'var(--font-body)',
  }

  const loginCard = (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      className="glass-hi ptdt-login-card ptdt-login-modal-card"
    >
      <button
        type="button"
        className="ptdt-login-modal-close"
        onClick={closeLoginModal}
        aria-label="Close sign in dialog"
        disabled={loading}
      >
        <X size={16} />
      </button>

      <div className="ptdt-login-card-accent" />

      <div className="ptdt-login-card-header">
        <h2 id="ptdt-login-modal-title" className="ptdt-login-card-title">
          Welcome back!
        </h2>
        <p className="ptdt-login-card-desc">
          Sign in to access your PTDT Dialer operator dashboard.
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="ptdt-login-error"
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 18 }}>
          <label className="mono ptdt-login-label">
            Email
          </label>
          <div className="ptdt-login-input-wrap">
            <Mail size={16} color="var(--text-3)" className="ptdt-login-input-icon" />
            <input
              ref={emailInputRef}
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
          <label className="mono ptdt-login-label">
            Password
          </label>
          <div className="ptdt-login-input-wrap">
            <Lock size={16} color="var(--text-3)" className="ptdt-login-input-icon" />
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
              className="ptdt-login-password-toggle"
              aria-label={showPass ? 'Hide password' : 'Show password'}
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
          className="btn-brand ptdt-login-submit"
        >
          {loading ? (
            <>Authenticating…</>
          ) : (
            <>Sign in to Console <ArrowRight size={16}/></>
          )}
        </motion.button>
      </form>

      <div className="ptdt-login-security-note">
        <ShieldCheck size={12}/> Secured with end-to-end encryption
      </div>
    </motion.div>
  )

  return (
    <div className="ptdt-login-root">
      <style>{loginResponsiveCss}</style>

      {/* Aurora background */}
      <div className="aurora-bg"><div className="aurora-orb-3" /></div>
      <div className="grid-overlay" />

      {/* Theme toggle (top-right) */}
      <div className="ptdt-login-theme-toggle">
        <ThemeToggle compact />
      </div>

      <div className="ptdt-login-shell">

        {/* ================= LEFT — Brand panel ================= */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="ptdt-login-brand-panel"
        >
          {/* Top brand */}
          <div className="ptdt-login-brand-top">
            <img
              src="ptdt-main-logo.png"
              alt="PTDT"
              className="ptdt-login-logo"
            />
            <div className="ptdt-login-brand-copy">
              <div className="ptdt-login-brand-title">
                PTDT-<span className="gradient-brand-text">Dialer</span>
              </div>
              <div className="mono ptdt-login-brand-subtitle">
                Operator Settlement Console
              </div>
            </div>
          </div>

          {/* Hero text */}
          <div className="ptdt-login-hero">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="eyebrow ptdt-login-eyebrow"
            >
              <span className="pulse-dot" />
              <Radio size={11}/> Live · v2.0 · BSC Mainnet
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="ptdt-login-heading"
            >
              Dispatch smarter.<br/>
              <span className="gradient-brand-text">Settle faster.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              className="ptdt-login-copy"
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
              className="mono ptdt-login-slogan"
            >
              <Code2 size={13} color="var(--pink)" />
              Trust the <span style={{ color: 'var(--pink)' }}>{`{ Code }`}</span>,{' '}
              <span style={{ color: 'var(--green-2)' }}>// Not the Cult!</span>
            </motion.div>

            {/* Feature pills */}
            <div className="ptdt-login-feature-row">
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
                    className="glass ptdt-login-feature-pill"
                  >
                    <Icon size={13} color={f.c}/>
                    {f.label}
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="mono ptdt-login-footer">
            <span>
              Copyrights © <span style={{ color: 'var(--text-2)', fontWeight: 700 }}>PTDT-Dialer</span>
              {' · '}Pink Taxi Group Ltd · United Kingdom. All rights reserved.
            </span>
          </div>
        </motion.div>

        {/* ================= RIGHT — Console access CTA ================= */}
        <div className="ptdt-login-card-wrap">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            className="glass-hi ptdt-login-access-card"
          >
            <div className="mono ptdt-login-access-kicker">
              <ShieldCheck size={13} color="var(--green-2)" />
              Secure Console Access
            </div>

            <h2 className="ptdt-login-access-title">
              Your command center is ready.
            </h2>

            <p className="ptdt-login-access-copy">
              Open the secure sign-in panel to manage campaigns, agents, calls,
              customer accounts, and real-time operations from one protected workspace.
            </p>

            <div className="ptdt-login-access-grid">
              <div className="ptdt-login-access-metric">
                <span className="mono ptdt-login-access-metric-label">Workspace</span>
                <span className="ptdt-login-access-metric-value">Operator Console</span>
              </div>
              <div className="ptdt-login-access-metric">
                <span className="mono ptdt-login-access-metric-label">Access</span>
                <span className="ptdt-login-access-metric-value">Authorized Users</span>
              </div>
            </div>

            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="btn-brand ptdt-login-open-button"
              onClick={openLoginModal}
            >
              Open Sign in Console <ArrowRight size={16} />
            </motion.button>

            <div className="ptdt-login-access-note">
              Login details stay inside a focused secure pop-up, keeping the landing page clean and client-facing.
            </div>
          </motion.div>
        </div>
      </div>

      {isLoginOpen && (
        <motion.div
          className="ptdt-login-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ptdt-login-modal-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeLoginModal()
          }}
        >
          {loginCard}
        </motion.div>
      )}
    </div>
  )
}
