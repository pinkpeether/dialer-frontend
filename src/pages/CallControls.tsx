import { useEffect, useState } from 'react'
import { ShieldCheck, Radio, PhoneCall } from 'lucide-react'
import AdvancedCallControlPanel from '../components/AdvancedCallControlPanel'
import { callControlAPI } from '../api/callControl.api'

type ActiveCall = {
  id: number
  providerCallId?: string | null
  status: string
  remoteNumber?: string | null
  source?: string | null
  contact?: { name?: string | null; phone?: string | null } | null
  agent?: { name?: string | null; email?: string | null } | null
  campaign?: { name?: string | null } | null
}

export default function CallControls() {
  const [calls, setCalls] = useState<ActiveCall[]>([])
  const [capabilities, setCapabilities] = useState<Record<string, unknown> | null>(null)
  const [selected, setSelected] = useState<ActiveCall | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [caps, active] = await Promise.all([
        callControlAPI.capabilities(),
        callControlAPI.activeCalls(),
      ])
      setCapabilities(caps)
      setCalls(active.calls || [])
      setSelected((active.calls || [])[0] || null)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Unable to load call controls'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="ptdt-page ptdt-pro-page">
      <div className="ptdt-page-header ptdt-pro-hero">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}>
            <ShieldCheck size={14} /> Supervisor Call-Control Console
          </div>
          <h1 className="ptdt-page-title" style={{ fontSize: 'clamp(34px, 5vw, 58px)', margin: 0 }}>
            Advanced <span className="gradient-brand-text">Call Controls</span>
          </h1>
          <p className="ptdt-page-desc" style={{ marginTop: 12 }}>
            Hold, resume, transfer, conference, whisper, barge-in, voicemail drop, mute/unmute and noise-control guardrails.
          </p>
        </div>

        <button type="button" className="btn-brand" onClick={() => void load()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ border: '1px solid rgba(239,68,68,.30)', background: 'rgba(239,68,68,.08)', color: '#ef4444', borderRadius: 16, padding: 14, marginBottom: 18 }}>
          {error}
        </div>
      )}

      <div className="ptdt-pro-kpis" style={{ marginBottom: 22 }}>
        <div className="ptdt-pro-kpi">
          <div className="ptdt-pro-kpi-label">Active Calls</div>
          <div className="ptdt-pro-kpi-value">{calls.length}</div>
          <div className="ptdt-pro-kpi-note">Supervisor-call-control surface</div>
        </div>
        <div className="ptdt-pro-kpi">
          <div className="ptdt-pro-kpi-label">Provider</div>
          <div className="ptdt-pro-kpi-value" style={{ fontSize: '1.6rem' }}>{String(capabilities?.provider || 'universal-sip')}</div>
          <div className="ptdt-pro-kpi-note">Current routed control adapter</div>
        </div>
        <div className="ptdt-pro-kpi">
          <div className="ptdt-pro-kpi-label">Provider Adapter</div>
          <div className="ptdt-pro-kpi-value" style={{ fontSize: '1.6rem' }}>{capabilities?.providerAdapterConfigured ? 'Configured' : 'Not configured'}</div>
          <div className="ptdt-pro-kpi-note">Server-side provider control readiness</div>
        </div>
      </div>

      <div className="glass-hi" style={{ borderRadius: 24, padding: 18, marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <PhoneCall size={18} color="var(--pink)" />
          <h2 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Live Calls</h2>
        </div>

        {calls.length === 0 ? (
          <p style={{ color: 'var(--text-3)' }}>No active calls detected right now.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {calls.map(call => {
              const active = selected?.id === call.id
              return (
                <button
                  key={call.id}
                  type="button"
                  onClick={() => setSelected(call)}
                  className={active ? 'btn-brand' : 'btn-ghost'}
                  style={{
                    justifyContent: 'space-between',
                    gap: 14,
                    flexWrap: 'wrap',
                    textAlign: 'left',
                    minHeight: 54,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Radio size={16} />
                    Call #{call.id} · {call.contact?.name || call.remoteNumber || call.contact?.phone || 'Unknown'}
                  </span>
                  <span className="mono">{call.status}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <AdvancedCallControlPanel
        defaultCallId={selected?.id}
        defaultProviderCallId={selected?.providerCallId || undefined}
      />
    </div>
  )
}
