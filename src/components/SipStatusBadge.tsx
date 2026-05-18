import { AlertTriangle, PhoneCall, Radio, Wifi, WifiOff } from 'lucide-react'
import type { SipRuntimeStatus } from '../types/sip'

const STATUS_COPY: Record<SipRuntimeStatus, { label: string; color: string; bg: string; border: string }> = {
  idle:                { label: 'SIP Not Configured',  color: 'var(--text-3)',    bg: 'var(--bg-glass)',           border: 'rgba(148,163,184,0.26)' },
  configured:          { label: 'SIP Configured',      color: 'var(--warning)',   bg: 'rgba(240,185,11,0.12)',     border: 'rgba(240,185,11,0.32)' },
  registering:         { label: 'Registering SIP',     color: 'var(--warning)',   bg: 'rgba(240,185,11,0.12)',     border: 'rgba(240,185,11,0.32)' },
  registered:          { label: 'SIP Ready',           color: 'var(--green-2)',   bg: 'rgba(0,167,71,0.10)',       border: 'rgba(0,167,71,0.30)' },
  registration_failed: { label: 'SIP Failed',          color: 'var(--danger)',    bg: 'rgba(239,68,68,0.12)',      border: 'rgba(239,68,68,0.32)' },
  incoming:            { label: 'Incoming SIP Call',   color: 'var(--pink)',      bg: 'rgba(251,11,140,0.12)',     border: 'rgba(251,11,140,0.32)' },
  calling:             { label: 'SIP Dialing',         color: 'var(--pink)',      bg: 'rgba(251,11,140,0.12)',     border: 'rgba(251,11,140,0.32)' },
  in_call:             { label: 'SIP Connected',       color: 'var(--green-2)',   bg: 'rgba(0,167,71,0.10)',       border: 'rgba(0,167,71,0.30)' },
  ended:               { label: 'SIP Ended',           color: 'var(--text-3)',    bg: 'var(--bg-glass)',           border: 'rgba(148,163,184,0.26)' },
  error:               { label: 'SIP Error',           color: 'var(--danger)',    bg: 'rgba(239,68,68,0.12)',      border: 'rgba(239,68,68,0.32)' },
}

export default function SipStatusBadge({ status }: { status: SipRuntimeStatus }) {
  const item = STATUS_COPY[status]
  const Icon =
    status === 'registered' || status === 'in_call'
      ? PhoneCall
      : status === 'idle'
      ? WifiOff
      : status === 'registration_failed' || status === 'error'
      ? AlertTriangle
      : status === 'calling' || status === 'incoming'
      ? Radio
      : Wifi

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: item.bg,
        borderRadius: 999,
        padding: '4px 10px 4px 8px',
        border: `1px solid ${item.border}`,
        fontSize: 11,
        fontWeight: 700,
        color: item.color,
        letterSpacing: 0.2,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={12} />
      {item.label}
    </div>
  )
}