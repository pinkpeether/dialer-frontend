import { useCallback, useMemo, useRef, useState } from 'react'
import { AudioLines, Volume2 } from 'lucide-react'
import type { AlertSeverity } from '../api/notificationsAlertsPro.api'

type SoundKey = 'soft-ping' | 'success-chime' | 'attention' | 'urgent'

const frequencyBySound: Record<SoundKey, number> = {
  'soft-ping': 660,
  'success-chime': 880,
  attention: 520,
  urgent: 220,
}

const durationBySeverity: Record<AlertSeverity, number> = {
  INFO: 110,
  SUCCESS: 160,
  WARNING: 240,
  CRITICAL: 420,
}

type Props = {
  enabled: boolean
}

export default function AlertSoundManager({ enabled }: Props) {
  const [lastPlayed, setLastPlayed] = useState('None')
  const audioContextRef = useRef<AudioContext | null>(null)

  const play = useCallback((soundKey: SoundKey = 'soft-ping', severity: AlertSeverity = 'INFO') => {
    if (!enabled) return
    const AudioContextClass = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = audioContextRef.current || new AudioContextClass()
    audioContextRef.current = context

    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = severity === 'CRITICAL' ? 'sawtooth' : 'sine'
    oscillator.frequency.value = frequencyBySound[soundKey]
    gain.gain.value = severity === 'CRITICAL' ? 0.09 : 0.045
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + durationBySeverity[severity] / 1000)
    setLastPlayed(`${soundKey} / ${severity}`)
  }, [enabled])

  ;(window as Window & { ptdtPlayAlertSound?: typeof play }).ptdtPlayAlertSound = play

  const actions = useMemo(() => [
    { label: 'Info', key: 'soft-ping' as SoundKey, severity: 'INFO' as AlertSeverity },
    { label: 'Success', key: 'success-chime' as SoundKey, severity: 'SUCCESS' as AlertSeverity },
    { label: 'Warning', key: 'attention' as SoundKey, severity: 'WARNING' as AlertSeverity },
    { label: 'Critical', key: 'urgent' as SoundKey, severity: 'CRITICAL' as AlertSeverity },
  ], [])

  return (
    <section className="ptdt-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--text)', fontSize: 22, fontWeight: 900 }}>Alert <span className="gradient-brand-text">Sounds</span></h3>
          <p style={{ margin: '6px 0 0', color: 'var(--text-3)', fontSize: 13.5 }}>Browser-safe generated tones. No audio files or media assets required.</p>
        </div>
        <span className="ptdt-chip"><AudioLines size={12} /> Last: {lastPlayed}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {actions.map(action => (
          <button key={action.label} className="ptdt-action-btn" type="button" onClick={() => play(action.key, action.severity)} disabled={!enabled}>
            <Volume2 size={14} /> Test {action.label}
          </button>
        ))}
      </div>
    </section>
  )
}
