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

type CallControlsCache = {
  savedAt: string
  calls: ActiveCall[]
  capabilities: Record<string, unknown> | null
  selectedCallId?: number
}

const CACHE_KEY = 'ptdt-call-controls:last-good'

const readCache = (): CallControlsCache | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) as CallControlsCache : null
  } catch {
    return null
  }
}

const writeCache = (cache: Omit<CallControlsCache, 'savedAt'>) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cache, savedAt: new Date().toISOString() }))
  } catch {
    // Cache is best-effort; backend remains source of truth.
  }
}

function displayCallStatus(status?: string | null) {
  const key = String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (!key) return 'Unknown'
  if (key === 'active' || key === 'in_progress' || key === 'connected') return 'Active'
  if (key === 'ringing' || key === 'queued' || key === 'pending') return 'Starting'
  if (key === 'completed' || key === 'ended') return 'Completed'
  if (key === 'failed' || key === 'error') return 'Unable to complete'
  if (
    key.includes('provider') ||
    key.includes('adapter') ||
    key.includes('gateway') ||
    key.includes('trunk') ||
    key.includes('sip') ||
    key.includes('pbx') ||
    key.includes('setup') ||
    key.includes('internal')
  ) return 'Request received'
  return key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

export default function CallControls() {
  const [cached] = useState(() => readCache())
  const [calls, setCalls] = useState<ActiveCall[]>(cached?.calls ?? [])
  const [capabilities, setCapabilities] = useState<Record<string, unknown> | null>(cached?.capabilities ?? null)
  const [selected, setSelected] = useState<ActiveCall | null>(() => cached?.calls.find(call => call.id === cached.selectedCallId) || cached?.calls[0] || null)
  const [loading, setLoading] = useState(!cached?.calls?.length && !cached?.capabilities)
  const [error, setError] = useState('')

  const load = async (options: { silent?: boolean } = {}) => {
    setLoading(true)
    setError('')
    try {
      const [caps, active] = await Promise.all([
        callControlAPI.capabilities(options),
        callControlAPI.activeCalls(options),
      ])
      const nextCalls = active.calls || []
      const nextSelected = nextCalls.find((call: ActiveCall) => call.id === selected?.id) || nextCalls[0] || null
      setCapabilities(caps)
      setCalls(nextCalls)
      setSelected(nextSelected)
      writeCache({ calls: nextCalls, capabilities: caps, selectedCallId: nextSelected?.id })
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Unable to load call controls'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load({ silent: Boolean(cached) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <div className="ptdt-pro-kpi-label">Call Gateway</div>
          <div className="ptdt-pro-kpi-value" style={{ fontSize: '1.6rem' }}>Voice Service</div>
          <div className="ptdt-pro-kpi-note">Current routed call-control path</div>
        </div>
        <div className="ptdt-pro-kpi">
          <div className="ptdt-pro-kpi-label">Gateway Control</div>
          <div className="ptdt-pro-kpi-value" style={{ fontSize: '1.6rem' }}>{capabilities?.providerAdapterConfigured ? 'Configured' : 'Not configured'}</div>
          <div className="ptdt-pro-kpi-note">Server-side call-control readiness</div>
        </div>
      </div>

      <AdvancedCallControlPanel
        defaultCallId={selected?.id}
        defaultProviderCallId={selected?.providerCallId || undefined}
      />

      <div className="glass-hi" style={{ borderRadius: 24, padding: 18, marginTop: 22, marginBottom: 22 }}>
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
                  <span className="mono">{displayCallStatus(call.status)}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>


    </div>
  )
}
