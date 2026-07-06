import { useNavigate } from 'react-router-dom'
import { Calendar, Headset, History, Phone, Settings2, Sparkles } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { useSipStore } from '../store/sip.store'

const workspaceCards = [
  {
    title: 'Open Dialer',
    caption: 'Place SIP calls and manage live conversations.',
    to: '/dialer',
    icon: Phone,
    color: 'var(--green-2)',
    bg: 'rgba(0,167,71,0.10)',
  },
  {
    title: 'My Calls',
    caption: 'Review your call history and dispositions.',
    to: '/calls',
    icon: History,
    color: 'var(--pink)',
    bg: 'rgba(251,11,140,0.10)',
  },
  {
    title: 'My Callbacks',
    caption: 'Track scheduled callbacks and follow-ups.',
    to: '/callbacks',
    icon: Calendar,
    color: 'var(--purple)',
    bg: 'rgba(128,87,215,0.11)',
  },
  {
    title: 'Account Settings',
    caption: 'Update your agent profile and extension details.',
    to: '/settings',
    icon: Settings2,
    color: '#b87900',
    bg: 'rgba(184,121,0,0.10)',
  },
]

export default function AgentWorkspace() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const sipStatus = useSipStore(s => s.status)
  const activeCall = useSipStore(s => s.activeCall)
  const incomingCall = useSipStore(s => s.incomingCall)

  const callState = activeCall
    ? 'Call connected'
    : incomingCall
      ? 'Incoming call'
      : 'Dialer idle'

  const sipReady = sipStatus === 'registered' || sipStatus === 'in_call' || sipStatus === 'incoming'
  return (
    <div className="ptdt-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            <Sparkles size={12} />
            PTDT Agent Shell
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 9vw, 52px)', lineHeight: 0.95, letterSpacing: '-0.055em', margin: 0, color: 'var(--text)' }}>
            Agent <span className="gradient-brand-text">Workspace</span>
          </h1>
          <p style={{ margin: '14px 0 0', color: 'var(--text-3)', fontSize: 15, maxWidth: 620, lineHeight: 1.65 }}>
            Fast access to your daily call tools, callback queue, and account controls.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              minWidth: 164,
              borderRadius: 24,
              padding: '13px 16px',
              background: sipReady ? 'rgba(0,167,71,0.10)' : 'var(--bg-glass-hi)',
              border: `1px solid ${sipReady ? 'rgba(0,167,71,0.28)' : 'var(--border)'}`,
              color: sipReady ? 'var(--green-2)' : 'var(--text-3)',
            }}
          >
            <div className="mono" style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase' }}>SIP</div>
            <div style={{ fontSize: 18, fontWeight: 950, marginTop: 3 }}>{sipReady ? 'Registered' : 'Offline'}</div>
          </div>

          <div
            style={{
              minWidth: 178,
              borderRadius: 24,
              padding: '13px 16px',
              background: activeCall || incomingCall ? 'rgba(255,59,95,0.10)' : 'rgba(0,167,71,0.10)',
              border: `1px solid ${activeCall || incomingCall ? 'rgba(255,59,95,0.24)' : 'rgba(0,167,71,0.24)'}`,
              color: activeCall || incomingCall ? 'var(--danger)' : 'var(--green-2)',
            }}
          >
            <div className="mono" style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase' }}>Dialer</div>
            <div style={{ fontSize: 18, fontWeight: 950, marginTop: 3 }}>{callState}</div>
          </div>
        </div>
      </div>

      <section
        style={{
          borderRadius: 30,
          border: '1px solid var(--border)',
          background: 'var(--bg-glass-hi)',
          boxShadow: 'var(--shadow-sm)',
          padding: 22,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 18,
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg, rgba(251,11,140,0.16), rgba(0,167,71,0.12))',
              border: '1px solid var(--border)',
              color: 'var(--pink)',
            }}
          >
            <Headset size={23} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 950, color: 'var(--text)' }}>
              {user?.name || 'Agent'}
            </div>
            <div className="mono" style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 800, letterSpacing: 0.7, textTransform: 'uppercase', marginTop: 4 }}>
              {user?.agentCode || 'AGENT'} · {user?.extension ? `EXT ${user.extension}` : 'Extension not set'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/dialer')}
          className="btn-brand"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <Phone size={16} />
          Start Calling
        </button>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        {workspaceCards.map(card => {
          const Icon = card.icon
          return (
            <button
              key={card.to}
              type="button"
              onClick={() => navigate(card.to)}
              style={{
                textAlign: 'left',
                border: '1px solid var(--border)',
                background: 'var(--bg-glass-hi)',
                borderRadius: 24,
                padding: 18,
                minHeight: 164,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 18,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 16,
                  display: 'grid',
                  placeItems: 'center',
                  background: card.bg,
                  color: card.color,
                  border: '1px solid var(--border)',
                }}
              >
                <Icon size={20} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 950, color: 'var(--text)', marginBottom: 7 }}>{card.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5 }}>{card.caption}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
