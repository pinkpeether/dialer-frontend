import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, Clock, Mic, MicOff, PauseCircle, PhoneOff, PlayCircle, Volume2 } from 'lucide-react'
import AudioDeviceSelect from './AudioDeviceSelect'
import { useAudioDevices, useMicrophoneMeter } from '../hooks/useAudioDevices'
import { useSipStore } from '../store/sip.store'

const brand = {
  ink: '#f9f7ff',
  muted: 'rgba(249,247,255,0.62)',
  faint: 'rgba(249,247,255,0.34)',
  pink: '#fb0b8c',
  green: '#00f5a0',
  red: '#ff3b5f',
  cyan: '#22d3ee',
  purple: '#8b5cf6',
}

function fmt(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function glassCard() {
  return {
    background: 'linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.030))',
    border: '1px solid rgba(255,255,255,0.105)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08),0 14px 34px rgba(0,0,0,0.22)',
  }
}

export default function SipActiveCallOverlay() {
  const activeCall = useSipStore(s => s.activeCall)
  const status = useSipStore(s => s.status)
  const muted = useSipStore(s => s.muted)
  const setMuted = useSipStore(s => s.setMuted)
  const hangup = useSipStore(s => s.hangup)
  const onHold = useSipStore(s => s.onHold)
  const hold = useSipStore(s => s.hold)
  const resume = useSipStore(s => s.resume)

  const sipAudioOutputDeviceId = useSipStore(s => s.audioOutputDeviceId)
  const sipAudioOutputError = useSipStore(s => s.audioOutputError)
  const setSipAudioOutputDevice = useSipStore(s => s.setAudioOutputDevice)
  const testSipAudioOutputDevice = useSipStore(s => s.testAudioOutputDevice)

  const sipAudioInputDeviceId = useSipStore(s => s.audioInputDeviceId)
  const sipAudioInputError = useSipStore(s => s.audioInputError)
  const setSipAudioInputDevice = useSipStore(s => s.setAudioInputDevice)

  const [elapsed, setElapsed] = useState(0)
  const [message, setMessage] = useState<string | null>(null)

  // Keep overlay visible whenever the SIP store has an active call.
  // This avoids losing controls after an incoming call is answered.
  const visible = Boolean(activeCall && (status === 'in_call' || status === 'calling' || status === 'registered'))

  const remoteLabel = useMemo(() => {
    if (!activeCall) return 'SIP Call'
    return activeCall.remoteIdentity || 'SIP Call'
  }, [activeCall])

  const {
    audioOutputs,
    audioInputs,
    error: audioDevicesError,
    refresh: refreshAudioDevices,
    requestAudioPermission,
    canSelectOutput,
  } = useAudioDevices(visible)

  const {
    level: microphoneLevel,
    error: microphoneMeterError,
  } = useMicrophoneMeter(sipAudioInputDeviceId, visible && !muted && !onHold)

  useEffect(() => {
    if (!activeCall) {
      setElapsed(0)
      return
    }

    const tick = () => {
      const startedAt = activeCall.startedAt || Date.now()
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
    }

    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [activeCall])

  useEffect(() => {
    if (!visible) return
    setMessage(null)
    void refreshAudioDevices().catch(() => undefined)
  }, [visible, refreshAudioDevices])

  const handleMuteToggle = useCallback(() => {
    setMuted(!muted)
  }, [muted, setMuted])

  const handleHoldToggle = useCallback(() => {
    setMessage(null)
    const action = onHold ? resume : hold
    void action().catch((err) => {
      const msg = err instanceof Error
        ? err.message
        : onHold
          ? 'Could not resume call'
          : 'Could not place call on hold'
      setMessage(msg)
    })
  }, [onHold, hold, resume])

  const handleAudioInputChange = useCallback((deviceId: string) => {
    setMessage(null)
    void setSipAudioInputDevice(deviceId).catch((err) => {
      const msg = err instanceof Error ? err.message : 'Could not switch microphone/input device'
      setMessage(msg)
    })
  }, [setSipAudioInputDevice])

  const handleAudioOutputChange = useCallback((deviceId: string) => {
    setMessage(null)
    void setSipAudioOutputDevice(deviceId).catch((err) => {
      const msg = err instanceof Error ? err.message : 'Could not switch speaker/audio output'
      setMessage(msg)
    })
  }, [setSipAudioOutputDevice])

  const handleSpeakerTest = useCallback(() => {
    setMessage(null)
    void testSipAudioOutputDevice().catch((err) => {
      const msg = err instanceof Error ? err.message : 'Could not play test speaker tone'
      setMessage(msg)
    })
  }, [testSipAudioOutputDevice])

  const handlePermit = useCallback(() => {
    setMessage(null)
    void requestAudioPermission()
      .then(() => refreshAudioDevices())
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Microphone permission was not granted'
        setMessage(msg)
      })
  }, [refreshAudioDevices, requestAudioPermission])

  if (!visible || !activeCall) return null

  const combinedMessage = message || sipAudioInputError || sipAudioOutputError || microphoneMeterError || audioDevicesError

  return (
    <div
      style={{
        position: 'fixed',
        right: 28,
        bottom: 108,
        zIndex: 10002,
        width: 360,
        maxWidth: 'calc(100vw - 34px)',
        borderRadius: 28,
        padding: 18,
        color: brand.ink,
        background: `
          radial-gradient(circle at 14% 0%,rgba(251,11,140,0.22),transparent 36%),
          radial-gradient(circle at 88% 10%,rgba(0,245,160,0.18),transparent 34%),
          linear-gradient(145deg,rgba(7,5,16,0.97),rgba(18,10,32,0.95))
        `,
        border: '1px solid rgba(255,255,255,0.13)',
        boxShadow: '0 28px 90px rgba(0,0,0,0.62),0 0 70px rgba(0,245,160,0.14)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 1.2,
              color: brand.green,
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <Activity size={13} /> Active SIP Call
          </div>
          <div
            style={{
              marginTop: 7,
              fontSize: 17,
              fontWeight: 900,
              wordBreak: 'break-word',
              lineHeight: 1.25,
            }}
          >
            {remoteLabel}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 10px',
            borderRadius: 999,
            background: 'rgba(0,245,160,0.10)',
            border: '1px solid rgba(0,245,160,0.24)',
            color: brand.green,
            fontWeight: 900,
            fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
            flexShrink: 0,
          }}
        >
          <Clock size={15} /> {fmt(elapsed)}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginTop: 18,
        }}
      >
        <button
          type="button"
          onClick={handleMuteToggle}
          style={{
            height: 48,
            borderRadius: 18,
            border: muted ? `1px solid ${brand.red}88` : '1px solid rgba(255,255,255,0.13)',
            background: muted ? 'rgba(255,59,95,0.16)' : 'rgba(255,255,255,0.07)',
            color: muted ? brand.red : brand.ink,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          {muted ? <MicOff size={18} /> : <Mic size={18} />}
          {muted ? 'Unmute' : 'Mute'}
        </button>

        <button
          type="button"
          onClick={handleHoldToggle}
          style={{
            height: 48,
            borderRadius: 18,
            border: onHold ? `1px solid ${brand.cyan}aa` : '1px solid rgba(255,255,255,0.13)',
            background: onHold ? 'rgba(34,211,238,0.16)' : 'rgba(255,255,255,0.07)',
            color: onHold ? brand.cyan : brand.ink,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          {onHold ? <PlayCircle size={18} /> : <PauseCircle size={18} />}
          {onHold ? 'Resume' : 'Hold'}
        </button>

        <button
          type="button"
          onClick={() => void hangup()}
          style={{
            height: 48,
            borderRadius: 18,
            border: `1px solid ${brand.red}88`,
            background: 'linear-gradient(135deg,rgba(255,59,95,0.96),rgba(251,11,140,0.84))',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: '0 16px 34px rgba(255,59,95,0.24)',
          }}
        >
          <PhoneOff size={18} /> Hang Up
        </button>
      </div>

      <div
        style={{
          ...glassCard(),
          borderRadius: 22,
          padding: '12px 13px',
          marginTop: 14,
          display: 'grid',
          gap: 9,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 10,
              color: brand.muted,
              fontWeight: 900,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            <Mic size={14} color={muted ? brand.red : brand.cyan} /> Microphone Input
          </label>

          <button
            type="button"
            onClick={handlePermit}
            style={{
              border: '1px solid rgba(34,211,238,0.24)',
              background: 'rgba(34,211,238,0.09)',
              color: brand.cyan,
              borderRadius: 999,
              padding: '6px 8px',
              fontSize: 8.5,
              fontWeight: 900,
              cursor: 'pointer',
              letterSpacing: 0.5,
              flexShrink: 0,
            }}
          >
            PERMIT
          </button>
        </div>

        <AudioDeviceSelect
          devices={audioInputs}
          value={sipAudioInputDeviceId}
          onChange={handleAudioInputChange}
          placeholder="Select microphone input"
        />

        <div
          style={{
            height: 9,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.07)',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              width: `${Math.round(microphoneLevel * 100)}%`,
              height: '100%',
              borderRadius: 999,
              background: muted
                ? 'linear-gradient(90deg,rgba(255,59,95,0.35),rgba(255,59,95,0.50))'
                : 'linear-gradient(90deg,#22d3ee,#00f5a0,#fb0b8c)',
              boxShadow: muted ? 'none' : '0 0 16px rgba(0,245,160,0.35)',
              transition: 'width 0.12s ease',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 9,
            color: brand.faint,
            fontWeight: 850,
            letterSpacing: 0.45,
          }}
        >
          <span>{onHold ? 'On hold (audio paused)' : muted ? 'Muted' : 'Live mic level'}</span>
          <span>{Math.round(microphoneLevel * 100)}%</span>
        </div>
      </div>

      <div
        style={{
          ...glassCard(),
          borderRadius: 22,
          padding: '12px 13px',
          marginTop: 12,
          display: 'grid',
          gap: 9,
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 10,
            color: brand.muted,
            fontWeight: 900,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          <Volume2 size={14} /> Speaker Output
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'start' }}>
          <AudioDeviceSelect
            devices={audioOutputs}
            value={sipAudioOutputDeviceId}
            onChange={handleAudioOutputChange}
            disabled={!canSelectOutput}
            placeholder="Select speaker output"
          />

          <button
            type="button"
            onClick={handleSpeakerTest}
            style={{
              height: 42,
              borderRadius: 14,
              border: `1px solid ${brand.cyan}66`,
              background: 'rgba(34,211,238,0.12)',
              color: brand.cyan,
              fontWeight: 900,
              cursor: 'pointer',
              padding: '0 13px',
            }}
          >
            TEST
          </button>
        </div>
      </div>

      {combinedMessage && (
        <div
          style={{
            marginTop: 10,
            padding: '9px 10px',
            borderRadius: 14,
            border: `1px solid ${brand.red}44`,
            background: 'rgba(255,59,95,0.10)',
            color: '#ff9caf',
            fontSize: 10.5,
            fontWeight: 800,
            lineHeight: 1.45,
          }}
        >
          {combinedMessage}
        </div>
      )}

      <div
        style={{
          marginTop: 12,
          fontSize: 10.5,
          lineHeight: 1.45,
          color: 'rgba(249,247,255,0.44)',
        }}
      >
        Incoming and outgoing SIP calls stay controllable here even when the Floating Dialer is closed.
      </div>
    </div>
  )
}
