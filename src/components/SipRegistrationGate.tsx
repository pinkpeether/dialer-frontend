import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Headset, LockKeyhole, LogOut, PhoneCall, Save, Wifi } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { agentsAPI } from '../api/agents.api'
import { SOCKET_EVENTS } from '../constants/socketEvents'
import { useSocket } from '../hooks/useSocket'
import { useToast } from '../hooks/useToast'
import { useAuthStore } from '../store/auth.store'
import { useSipStore } from '../store/sip.store'
import type { SipAccountConfig, SipTransport } from '../types/sip'
import SipStatusBadge from './SipStatusBadge'

const gateInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 16,
  border: '1px solid var(--ptdt-sip-gate-input-border, rgba(148,163,184,.32))',
  background: 'var(--ptdt-sip-gate-input-bg, rgba(255,255,255,.92))',
  color: 'var(--ptdt-sip-gate-input-text, var(--text))',
  fontSize: 13,
  fontWeight: 800,
  outline: 'none',
  boxShadow: 'inset 0 1px 0 var(--ptdt-sip-gate-input-highlight, rgba(255,255,255,.85))',
}

const gateLabelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 7,
  minWidth: 0,
  color: 'var(--text-2)',
  fontSize: 10.5,
  fontWeight: 950,
  letterSpacing: 1.15,
  textTransform: 'uppercase',
}

function fieldValue(config: SipAccountConfig): SipAccountConfig {
  return {
    ...config,
    enabled: true,
    transport: config.transport || 'WSS',
    stunServer: config.stunServer || 'stun.l.google.com:19302',
  }
}

export default function SipRegistrationGate({ open, onSignOut }: { open: boolean; onSignOut?: () => void }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { emit } = useSocket()
  const user = useAuthStore(state => state.user)
  const updateUser = useAuthStore(state => state.updateUser)
  const config = useSipStore(state => state.config)
  const status = useSipStore(state => state.status)
  const error = useSipStore(state => state.error)
  const saveConfig = useSipStore(state => state.saveConfig)
  const register = useSipStore(state => state.register)
  const [form, setForm] = useState<SipAccountConfig>(() => fieldValue(config))
  const [busy, setBusy] = useState(false)

  const needsConfig = useMemo(() => {
    return !form.username || !form.password || !form.domain || !form.webSocketServer
  }, [form.domain, form.password, form.username, form.webSocketServer])

  const update = <K extends keyof SipAccountConfig>(key: K, value: SipAccountConfig[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveAndRegister = async () => {
    setBusy(true)
    try {
      saveConfig(fieldValue(form))
      await register()
      updateUser({ status: 'READY' })
      emit(SOCKET_EVENTS.AGENT_STATUS, 'READY')
      void agentsAPI.updateMyStatus('READY')
        .then(() => emit(SOCKET_EVENTS.AGENT_STATUS, 'READY'))
        .catch(() => undefined)
      toast.success('SIP registered. Agent marked Ready.')
      navigate('/dialer', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'SIP registration failed'
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            display: 'grid',
            placeItems: 'center',
            padding: 22,
            background: 'rgba(15,23,42,.54)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="ptdt-top-operator-signout"
              style={{
                position: 'fixed',
                top: 22,
                right: 28,
                zIndex: 2,
                minHeight: 42,
                padding: '0 16px',
              }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          )}
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="glass ptdt-sip-gate-card"
            style={{
              width: 'min(760px, 100%)',
              borderRadius: 30,
              padding: 28,
              background: 'var(--ptdt-sip-gate-card-bg, linear-gradient(135deg, rgba(255,246,251,.96), rgba(244,255,249,.96), rgba(255,255,255,.96)))',
              border: '1px solid var(--ptdt-sip-gate-card-border, rgba(255,255,255,.62))',
              boxShadow: 'var(--ptdt-sip-gate-card-shadow, 0 34px 90px rgba(15,23,42,.28))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
              <div style={{ display: 'flex', gap: 14, minWidth: 0 }}>
                <div style={{ width: 58, height: 58, borderRadius: 22, background: 'var(--grad-brand)', color: '#fff', display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow-pink)', flexShrink: 0 }}>
                  <Headset size={25} />
                </div>
                <div>
                  <div className="eyebrow pink" style={{ marginBottom: 8 }}>
                    <LockKeyhole size={11} /> SIP Registration Required
                  </div>
                  <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 950, letterSpacing: '-0.04em', lineHeight: 1.02 }}>
                    Connect your <span className="gradient-brand-text">Agent Dialer</span>
                  </h2>
                  <p style={{ margin: '10px 0 0', color: 'var(--text-3)', lineHeight: 1.6, fontSize: 13.5 }}>
                    {user?.name || 'Agent'}, register SIP first. Calling Console will open automatically after a successful registration.
                  </p>
                </div>
              </div>
              <SipStatusBadge status={status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
              <label style={gateLabelStyle}>Enable SIP Mode
                <select className="ptdt-sip-gate-input" value={form.enabled ? 'yes' : 'no'} onChange={event => update('enabled', event.target.value === 'yes')} style={gateInputStyle}>
                  <option value="yes">Enabled</option>
                  <option value="no">Disabled</option>
                </select>
              </label>
              <label style={gateLabelStyle}>Transport
                <select className="ptdt-sip-gate-input" value={form.transport} onChange={event => update('transport', event.target.value as SipTransport)} style={gateInputStyle}>
                  <option value="WSS">WSS</option>
                  <option value="WS">WS</option>
                  <option value="TLS">TLS</option>
                  <option value="TCP">TCP</option>
                  <option value="UDP">UDP</option>
                </select>
              </label>
              <label style={gateLabelStyle}>SIP Username
                <input className="ptdt-sip-gate-input" value={form.username} onChange={event => update('username', event.target.value)} placeholder="1001" style={gateInputStyle} />
              </label>
              <label style={gateLabelStyle}>SIP Password
                <input className="ptdt-sip-gate-input" value={form.password} onChange={event => update('password', event.target.value)} placeholder="••••••••" type="password" style={gateInputStyle} />
              </label>
              <label style={gateLabelStyle}>SIP Domain / Host
                <input className="ptdt-sip-gate-input" value={form.domain} onChange={event => update('domain', event.target.value)} placeholder="pbx.ptdt.taxi" style={gateInputStyle} />
              </label>
              <label style={gateLabelStyle}>SIP Port
                <input className="ptdt-sip-gate-input" value={form.port || ''} onChange={event => update('port', event.target.value)} placeholder="5060 / 5061 / 8089" style={gateInputStyle} />
              </label>
              <label style={{ ...gateLabelStyle, gridColumn: '1 / -1' }}>SIP WebSocket Server
                <input className="ptdt-sip-gate-input" value={form.webSocketServer} onChange={event => update('webSocketServer', event.target.value)} placeholder="wss://pbx.ptdt.taxi:8089/ws" style={gateInputStyle} />
              </label>
              <label style={{ ...gateLabelStyle, gridColumn: '1 / -1' }}>Display Name
                <input className="ptdt-sip-gate-input" value={form.displayName || ''} onChange={event => update('displayName', event.target.value)} placeholder="Agent display name" style={gateInputStyle} />
              </label>
            </div>

            {error && (
              <div style={{ marginTop: 16, padding: 12, borderRadius: 16, background: 'rgba(239,68,68,.10)', border: '1px solid rgba(239,68,68,.28)', color: 'var(--danger)', fontSize: 12.5, fontWeight: 800 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => saveConfig(fieldValue(form))} disabled={busy} className="ptdt-action-btn" style={{ minHeight: 42, borderRadius: 999 }}>
                <Save size={14} /> Save
              </button>
              <button type="button" onClick={handleSaveAndRegister} disabled={busy || needsConfig} className="btn-brand" style={{ minHeight: 42, borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: busy || needsConfig ? 0.6 : 1 }}>
                <PhoneCall size={15} /> {busy ? 'Registering...' : 'Save & Register'}
              </button>
              <button type="button" onClick={handleSaveAndRegister} disabled={busy || needsConfig} style={{ minHeight: 42, borderRadius: 999, padding: '0 16px', border: '1px solid var(--green-2)', color: 'var(--green-2)', background: 'rgba(0,167,71,.10)', fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: busy || needsConfig ? 0.6 : 1 }}>
                <Wifi size={15} /> Register
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
