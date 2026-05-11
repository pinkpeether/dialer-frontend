import { Wifi, WifiOff, PhoneCall } from 'lucide-react'
import type { SipRuntimeStatus } from '../types/sip'

const STATUS_COPY: Record<SipRuntimeStatus, { label: string; color: string; bg: string }> = {
  idle:                { label: 'SIP Not Configured', color: 'var(--text-3)', bg: 'var(--bg-glass)' },
  configured:          { label: 'SIP Configured',     color: 'var(--warning)', bg: 'rgba(240,185,11,0.12)' },
  registering:         { label: 'Registering SIP',    color: 'var(--warning)', bg: 'rgba(240,185,11,0.12)' },
  registered:          { label: 'SIP Registered',     color: 'var(--green-2)', bg: 'rgba(0,167,71,0.10)' },
  registration_failed: { label: 'SIP Failed',         color: 'var(--danger)', bg: 'rgba(239,68,68,0.12)' },
  incoming:            { label: 'Incoming SIP Call',  color: 'var(--pink)', bg: 'rgba(251,11,140,0.12)' },
  calling:             { label: 'SIP Calling',        color: 'var(--pink)', bg: 'rgba(251,11,140,0.12)' },
  in_call:             { label: 'SIP In Call',        color: 'var(--green-2)', bg: 'rgba(0,167,71,0.10)' },
  ended:               { label: 'SIP Ended',          color: 'var(--text-3)', bg: 'var(--bg-glass)' },
  error:               { label: 'SIP Error',          color: 'var(--danger)', bg: 'rgba(239,68,68,0.12)' },
}

export default function SipStatusBadge({ status }: { status: SipRuntimeStatus }) {
  const item = STATUS_COPY[status]
  const Icon = status === 'registered' || status === 'in_call' ? PhoneCall : status === 'idle' ? WifiOff : Wifi

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '7px 11px', borderRadius: 999,
      background: item.bg,
      border: `1px solid ${item.color}`,
      color: item.color,
      fontSize: 11.5,
      fontWeight: 800,
    }}>
      <Icon size={13}/>
      {item.label}
    </span>
  )
}
