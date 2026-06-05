import React from 'react';
import type { MiniCallBarState } from '../api/uiUxPro.api';

interface Props {
  state: MiniCallBarState;
  onAction?: (action: 'mute' | 'hold' | 'resume' | 'hangup') => void;
}

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const min = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const sec = Math.floor(safe % 60)
    .toString()
    .padStart(2, '0');
  return `${min}:${sec}`;
};

export default function MiniCallBar({ state, onAction }: Props) {
  if (!state.enabled) return null;

  const active = state.callStatus !== 'IDLE' && state.callStatus !== 'ENDED';

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 80,
        width: 'min(94vw, 420px)',
        borderRadius: 18,
        border: '1px solid rgba(251, 10, 139, 0.35)',
        background: active
          ? 'linear-gradient(135deg, rgba(15,23,42,.98), rgba(88,28,135,.94))'
          : 'rgba(15,23,42,.94)',
        boxShadow: '0 24px 80px rgba(0,0,0,.35)',
        color: '#f8fafc',
        padding: 14,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Mini Call Bar</div>
          <div style={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {state.contactName || state.phoneNumber || 'No active call'}
          </div>
          <div style={{ color: '#cbd5e1', fontSize: 13 }}>
            {state.callStatus} • {formatDuration(state.durationSeconds)}
          </div>
        </div>
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 999,
            background: active ? 'rgba(0,229,160,.16)' : 'rgba(148,163,184,.12)',
            color: active ? '#86efac' : '#cbd5e1',
            fontWeight: 800,
            fontSize: 12,
          }}
        >
          {active ? 'LIVE' : 'IDLE'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
        <button type="button" onClick={() => onAction?.('mute')} style={buttonStyle}>
          {state.muted ? 'Unmute' : 'Mute'}
        </button>
        <button type="button" onClick={() => onAction?.(state.onHold ? 'resume' : 'hold')} style={buttonStyle}>
          {state.onHold ? 'Resume' : 'Hold'}
        </button>
        <button type="button" onClick={() => onAction?.('hangup')} style={{ ...buttonStyle, background: 'rgba(239,68,68,.22)' }}>
          Hangup
        </button>
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('ptdt-open-dialer'))} style={buttonStyle}>
          Dialer
        </button>
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  border: '1px solid rgba(148,163,184,.28)',
  background: 'rgba(30,41,59,.86)',
  color: '#f8fafc',
  borderRadius: 12,
  padding: '9px 8px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 12,
};
