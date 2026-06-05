import { BellRing, CheckCheck, ExternalLink, Volume2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { NotificationAlert } from '../api/notificationsAlertsPro.api'

const severityTone: Record<string, { color: string; bg: string }> = {
  INFO: { color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
  SUCCESS: { color: '#00a747', bg: 'rgba(0,167,71,0.12)' },
  WARNING: { color: '#f0b90b', bg: 'rgba(240,185,11,0.12)' },
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
}

type Props = {
  alerts: NotificationAlert[]
  onAcknowledge: (alertId: string) => void
  onAcknowledgeAll: () => void
  loading?: boolean
}

export default function AlertCenterPanel({ alerts, onAcknowledge, onAcknowledgeAll, loading }: Props) {
  const navigate = useNavigate()

  const openAction = (path?: string | null) => {
    if (!path) return
    if (path.startsWith('/')) navigate(path)
    else window.open(path, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="ptdt-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--text)', fontSize: 22, fontWeight: 900 }}>Alert <span className="gradient-brand-text">Center</span></h3>
          <p style={{ margin: '6px 0 0', color: 'var(--text-3)', fontSize: 13.5 }}>Desktop toasts, sound alerts, reminders, and supervisor escalation events.</p>
        </div>
        <button className="ptdt-action-btn" type="button" onClick={onAcknowledgeAll}>
          <CheckCheck size={14} /> Mark All Read
        </button>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {loading ? (
          <div className="glass" style={{ padding: 18, color: 'var(--text-3)' }}>Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="glass" style={{ padding: 20, color: 'var(--text-3)' }}>No active alerts.</div>
        ) : alerts.map(alert => {
          const tone = severityTone[alert.severity] || severityTone.INFO
          return (
            <div key={alert.id} className="glass" style={{ padding: 16, borderRadius: 18, borderColor: `${tone.color}33` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="mono" style={{ padding: '5px 9px', borderRadius: 999, background: tone.bg, color: tone.color, border: `1px solid ${tone.color}40`, fontSize: 10, fontWeight: 900, letterSpacing: 0.8 }}>
                      {alert.severity}
                    </span>
                    <span className="ptdt-chip">{alert.type.replaceAll('_', ' ')}</span>
                    {alert.soundKey ? <span className="ptdt-chip"><Volume2 size={12} /> {alert.soundKey}</span> : null}
                  </div>
                  <div style={{ marginTop: 10, color: 'var(--text)', fontSize: 14, fontWeight: 900 }}>{alert.title}</div>
                  <div style={{ marginTop: 6, color: 'var(--text-2)', fontSize: 12.5, lineHeight: 1.55 }}>{alert.message}</div>
                  <div className="mono" style={{ marginTop: 8, color: 'var(--text-3)', fontSize: 10.5 }}>{new Date(alert.createdAt).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {alert.actionUrl ? (
                    <button className="ptdt-action-btn" type="button" onClick={() => openAction(alert.actionUrl)}>
                      <ExternalLink size={14} /> Open
                    </button>
                  ) : null}
                  <button className="btn-brand" type="button" onClick={() => onAcknowledge(alert.id)} style={{ minHeight: 38 }}>
                    <BellRing size={14} /> Acknowledge
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
