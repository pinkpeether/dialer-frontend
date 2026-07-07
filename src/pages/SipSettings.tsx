import { useState } from 'react'
import { motion } from 'framer-motion'
import { PhoneCall, Save, Trash2, Wifi, WifiOff, ShieldCheck, Info } from 'lucide-react'
import SipStatusBadge from '../components/SipStatusBadge'
import { useSipStore } from '../store/sip.store'
import { useToast } from '../hooks/useToast'
import type { SipAccountConfig, SipTransport } from '../types/sip'
import OperationalStatusPills from '../components/OperationalStatusPills'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--bg-glass-hi)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10.5,
  fontWeight: 800,
  color: 'var(--text-3)',
  textTransform: 'uppercase',
  letterSpacing: 1.1,
  marginBottom: 7,
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  )
}

export default function SipSettings() {
  const config = useSipStore(s => s.config)
  const status = useSipStore(s => s.status)
  const error = useSipStore(s => s.error)
  const saveConfig = useSipStore(s => s.saveConfig)
  const clearConfig = useSipStore(s => s.clearConfig)
  const register = useSipStore(s => s.register)
  const unregister = useSipStore(s => s.unregister)
  const toast = useToast()

  const [form, setForm] = useState<SipAccountConfig>(config)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const update = <K extends keyof SipAccountConfig>(key: K, value: SipAccountConfig[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    saveConfig(form)
    setNotice('✓ SIP account configuration saved locally')
    toast.success('SIP account saved')
  }

  const handleRegister = async () => {
    setBusy(true)
    setNotice('')
    try {
      saveConfig(form)
      await register()
      setNotice('✓ SIP account registered successfully')
      toast.success('SIP account registered')
    } catch (err) {
      setNotice('')
      const msg = err instanceof Error ? err.message : 'SIP registration failed'
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  const handleUnregister = async () => {
    setBusy(true)
    try {
      await unregister()
      setNotice('SIP account unregistered')
      toast.warning('SIP account unregistered')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not unregister SIP account'
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>

      <style>{`
        @media (max-width: 900px) {
          .ptdt-sip-page {
            width: 100% !important;
            max-width: 100vw !important;
            padding: 64px 10px 24px !important;
            overflow-x: hidden !important;
          }

          .ptdt-sip-shell {
            display: flex !important;
            flex-direction: column !important;
            gap: 14px !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }

          .ptdt-sip-form-card,
          .ptdt-sip-info-card {
            width: 100% !important;
            max-width: 100% !important;
            padding: 16px !important;
            overflow: hidden !important;
          }

          .ptdt-sip-form-header {
            align-items: flex-start !important;
            flex-direction: column !important;
            gap: 12px !important;
          }

          .ptdt-sip-fields-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 14px !important;
          }

          .ptdt-sip-fields-grid label,
          .ptdt-sip-fields-grid > div {
            width: 100% !important;
            max-width: 100% !important;
          }

          .ptdt-sip-actions {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .ptdt-sip-actions button {
            width: 100% !important;
            justify-content: center !important;
          }
        }

        @media (max-width: 560px) {
          .ptdt-sip-page {
            padding: 58px 8px 20px !important;
          }

          .ptdt-sip-form-card,
          .ptdt-sip-info-card {
            padding: 14px !important;
          }

          .ptdt-sip-page h1 {
            font-size: clamp(28px, 11vw, 38px) !important;
          }

          .ptdt-sip-page p {
            font-size: 13px !important;
          }
        }
      `}</style>

    <div className="ptdt-sip-page" style={{ padding: '32px 36px', maxWidth: 1320, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 14 }}>
            <PhoneCall size={11}/> Universal SIP Provider Mode
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 3.2vw, 42px)',
            fontWeight: 900,
            lineHeight: 1.05,
            color: 'var(--text)',
            letterSpacing: '-0.04em',
            marginBottom: 10,
          }}>
            SIP Account <span className="gradient-brand-text">Configuration</span>
          </h1>
          <p style={{ fontSize: 14.5, color: 'var(--text-3)', lineHeight: 1.7, maxWidth: 860 }}>
            Configure any compatible SIP provider. PTDT Dialer will use this account for softphone calls instead of a hardcoded telecom API.
            Use the transport that matches your provider or PBX deployment, including WebSocket, TLS, TCP, or UDP where supported.
          </p>
        </div>
        <OperationalStatusPills />
      </motion.div>

      <div className="ptdt-sip-shell" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 20 }}>
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass ptdt-sip-form-card"
          onSubmit={e => { e.preventDefault(); handleSave() }}
          style={{ padding: 24 }}
        >
          <div className="ptdt-sip-form-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 22 }}>
            <div>
              <h2 className="display" style={{ color: 'var(--text)', fontSize: 19, fontWeight: 900, marginBottom: 5 }}>
                Provider Credentials
              </h2>
              <p style={{ color: 'var(--text-3)', fontSize: 12.5 }}>
                Works with FreePBX, Asterisk, 3CX, VoIP.ms, Telnyx, trunk providers, and other SIP-compatible platforms.
              </p>
            </div>
            <SipStatusBadge status={status}/>
          </div>

          <div className="ptdt-sip-fields-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            <Field label="Enable SIP Mode">
              <select
                className="ptdt-sip-gate-input"
                value={form.enabled ? 'yes' : 'no'}
                onChange={e => update('enabled', e.target.value === 'yes')}
                style={inputStyle}
              >
                <option value="yes">Enabled — use SIP for manual calls</option>
                <option value="no">Disabled — keep legacy provider fallback</option>
              </select>
            </Field>

            <Field label="Transport">
              <select
                className="ptdt-sip-gate-input"
                value={form.transport}
                onChange={e => update('transport', e.target.value as SipTransport)}
                style={inputStyle}
              >
                <option value="WSS">WSS — recommended for Electron/WebRTC</option>
                <option value="WS">WS — non-TLS WebSocket</option>
                <option value="TLS">TLS — secure SIP transport</option>
                <option value="TCP">TCP — SIP over TCP</option>
                <option value="UDP">UDP — standard PBX/trunk SIP</option>
              </select>
            </Field>

            <Field label="SIP Username">
              <input className="ptdt-sip-gate-input" value={form.username} onChange={e => update('username', e.target.value)} placeholder="1001" style={inputStyle}/>
            </Field>

            <Field label="SIP Password">
              <input className="ptdt-sip-gate-input" value={form.password} onChange={e => update('password', e.target.value)} placeholder="••••••••" type="password" style={inputStyle}/>
            </Field>

            <Field label="SIP Domain / Host">
              <input className="ptdt-sip-gate-input" value={form.domain} onChange={e => update('domain', e.target.value)} placeholder="sip.provider.com" style={inputStyle}/>
            </Field>

            <Field label="SIP Port">
              <input className="ptdt-sip-gate-input" value={form.port || ''} onChange={e => update('port', e.target.value)} placeholder="5060 / 5061 / provider-specific" style={inputStyle}/>
            </Field>

            <Field label="SIP WebSocket Server">
              <input className="ptdt-sip-gate-input" value={form.webSocketServer} onChange={e => update('webSocketServer', e.target.value)} placeholder="wss://sip.provider.com:7443" style={inputStyle}/>
            </Field>

            <Field label="Outbound Proxy">
              <input className="ptdt-sip-gate-input" value={form.outboundProxy || ''} onChange={e => update('outboundProxy', e.target.value)} placeholder="proxy.provider.com" style={inputStyle}/>
            </Field>

            <Field label="Display Name">
              <input className="ptdt-sip-gate-input" value={form.displayName || ''} onChange={e => update('displayName', e.target.value)} placeholder="John Doe" style={inputStyle}/>
            </Field>

            <Field label="Caller ID">
              <input className="ptdt-sip-gate-input" value={form.callerId || ''} onChange={e => update('callerId', e.target.value)} placeholder="+15551234567" style={inputStyle}/>
            </Field>

            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="STUN Server">
                <input className="ptdt-sip-gate-input" value={form.stunServer || ''} onChange={e => update('stunServer', e.target.value)} placeholder="stun.l.google.com:19302" style={inputStyle}/>
              </Field>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', color: 'var(--danger)', fontSize: 13 }}>
              {error}
            </div>
          )}

          {notice && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: 'rgba(0,167,71,0.10)', border: '1px solid rgba(0,167,71,0.35)', color: 'var(--green-2)', fontSize: 13 }}>
              {notice}
            </div>
          )}

          <div className="ptdt-sip-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
            <button type="submit" className="btn-brand" style={{ borderRadius: 999, padding: '9px 15px', minHeight: 38, display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800 }}>
              <Save size={14}/> Save SIP Account
            </button>
            <button type="button" onClick={handleRegister} disabled={busy} style={{ borderRadius: 999, padding: '9px 15px', minHeight: 38, display: 'flex', alignItems: 'center', gap: 7, border: '1px solid var(--green-2)', background: 'rgba(0,167,71,0.10)', color: 'var(--green-2)', fontSize: 12.5, fontWeight: 800 }}>
              <Wifi size={14}/> Register
            </button>
            <button type="button" onClick={handleUnregister} disabled={busy} style={{ borderRadius: 999, padding: '9px 15px', minHeight: 38, display: 'flex', alignItems: 'center', gap: 7, border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text-3)', fontSize: 12.5, fontWeight: 800 }}>
              <WifiOff size={14}/> Unregister
            </button>
            <button type="button" onClick={() => { clearConfig(); setForm({ ...form, enabled: false, username: '', password: '', domain: '', webSocketServer: '' }); toast.warning('SIP account cleared') }} style={{ borderRadius: 999, padding: '9px 15px', minHeight: 38, display: 'flex', alignItems: 'center', gap: 7, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.10)', color: 'var(--danger)', fontSize: 12.5, fontWeight: 800 }}>
              <Trash2 size={14}/> Clear
            </button>
          </div>
        </motion.form>

        <motion.aside initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass ptdt-sip-info-card" style={{ padding: 22, height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <ShieldCheck size={18} color="var(--green-2)"/>
            <h3 className="display" style={{ color: 'var(--text)', fontSize: 16, fontWeight: 900 }}>Deployment Notes</h3>
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: 12.5, lineHeight: 1.7, marginBottom: 14 }}>
            PTDT Dialer is configured to work with your own PBX, VPS, and SIP trunk stack instead of relying on a bundled carrier setup.
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              'Use the transport required by your current provider, PBX, or trunk endpoint.',
              'Credentials are stored locally in this app for now.',
              'WebRTC softphone sessions commonly use WSS or WS, while PBX and trunk routing often use TLS, TCP, or UDP.',
              'Caller ID, outbound proxy, and transport should match the live values configured in your FreePBX and trunk provider.',
            ].map(item => (
              <div key={item} style={{ display: 'flex', gap: 8, color: 'var(--text-3)', fontSize: 12.5, lineHeight: 1.5 }}>
                <Info size={14} color="var(--pink)" style={{ flexShrink: 0, marginTop: 2 }}/>
                {item}
              </div>
            ))}
          </div>
        </motion.aside>
      </div>
    </div>
    </>
  )
}
