import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff, BellRing, UserRound, Radio, ShieldCheck } from 'lucide-react'
import { useSipStore } from '../store/sip.store'

const brand = {
  ink: '#f9f7ff',
  muted: 'rgba(249,247,255,0.62)',
  faint: 'rgba(249,247,255,0.30)',
  pink: '#fb0b8c',
  green: '#00f5a0',
  purple: '#8b5cf6',
  cyan: '#22d3ee',
  red: '#ff3b5f',
}

type RingerHandle = {
  stop: () => void
}

function createIncomingRinger(): RingerHandle {
  const AudioContextCtor = window.AudioContext || (window as typeof window & {
    webkitAudioContext?: typeof AudioContext
  }).webkitAudioContext

  if (!AudioContextCtor) {
    return { stop: () => undefined }
  }

  const ctx = new AudioContextCtor()
  let stopped = false
  let interval: ReturnType<typeof setInterval> | null = null
  const activeNodes: Array<OscillatorNode | GainNode> = []

  const playTone = (frequency: number, startOffset: number, duration: number) => {
    if (stopped) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + startOffset)

    gain.gain.setValueAtTime(0.0001, ctx.currentTime + startOffset)
    gain.gain.exponentialRampToValueAtTime(0.13, ctx.currentTime + startOffset + 0.035)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startOffset + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(ctx.currentTime + startOffset)
    osc.stop(ctx.currentTime + startOffset + duration + 0.04)

    activeNodes.push(osc, gain)
  }

  const ringBurst = () => {
    void ctx.resume().catch(() => undefined)
    playTone(440, 0, 0.65)
    playTone(520, 0.72, 0.65)
  }

  ringBurst()
  interval = setInterval(ringBurst, 3000)

  return {
    stop: () => {
      stopped = true
      if (interval) clearInterval(interval)
      activeNodes.forEach((node) => {
        try { node.disconnect() } catch { /* noop */ }
      })
      void ctx.close().catch(() => undefined)
    },
  }
}

function cleanCallerLabel(raw: string) {
  return raw
    .replace(/^sip:/i, '')
    .replace(/;.*$/, '')
    .replace(/^<|>$/g, '')
}

function formatElapsed(seconds: number) {
  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export default function IncomingCallModal() {
  const incomingCall = useSipStore(s => s.incomingCall)
  const answer = useSipStore(s => s.answer)
  const reject = useSipStore(s => s.reject)
  const status = useSipStore(s => s.status)

  const [elapsed, setElapsed] = useState(0)
  const [busy, setBusy] = useState<'answer' | 'reject' | null>(null)
  const ringerRef = useRef<RingerHandle | null>(null)

  const caller = useMemo(() => {
    if (!incomingCall) return 'Unknown caller'
    return incomingCall.displayName || cleanCallerLabel(incomingCall.from) || 'Unknown caller'
  }, [incomingCall])

  const callerMeta = useMemo(() => {
    if (!incomingCall?.displayName) return incomingCall?.from ? cleanCallerLabel(incomingCall.from) : 'SIP incoming call'
    return incomingCall.from ? cleanCallerLabel(incomingCall.from) : 'SIP incoming call'
  }, [incomingCall])

  useEffect(() => {
    if (!incomingCall) {
      setElapsed(0)
      setBusy(null)
      ringerRef.current?.stop()
      ringerRef.current = null
      return
    }

    ringerRef.current?.stop()
    ringerRef.current = createIncomingRinger()

    const timer = setInterval(() => setElapsed(value => value + 1), 1000)

    return () => {
      clearInterval(timer)
      ringerRef.current?.stop()
      ringerRef.current = null
    }
  }, [incomingCall])

  const handleAnswer = useCallback(async () => {
    if (!incomingCall || busy) return
    try {
      setBusy('answer')
      ringerRef.current?.stop()
      await answer()
    } finally {
      setBusy(null)
    }
  }, [incomingCall, busy, answer])

  const handleReject = useCallback(async () => {
    if (!incomingCall || busy) return
    try {
      setBusy('reject')
      ringerRef.current?.stop()
      await reject()
    } finally {
      setBusy(null)
    }
  }, [incomingCall, busy, reject])

  useEffect(() => {
    if (!incomingCall) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        void handleAnswer()
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        void handleReject()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [incomingCall, handleAnswer, handleReject])

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          key="incoming-call-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10050,
            display: 'grid',
            placeItems: 'center',
            background: 'radial-gradient(circle at 50% 30%,rgba(251,11,140,0.15),rgba(5,4,11,0.58) 42%,rgba(5,4,11,0.82))',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            pointerEvents: 'auto',
          }}
        >
          <motion.div
            initial={{ y: 34, scale: 0.92, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, scale: 0.94, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            style={{
              width: 'min(520px, calc(100vw - 34px))',
              borderRadius: 34,
              overflow: 'hidden',
              color: brand.ink,
              position: 'relative',
              background: `
                radial-gradient(circle at 18% 0%,rgba(251,11,140,0.35),transparent 34%),
                radial-gradient(circle at 84% 12%,rgba(0,245,160,0.24),transparent 34%),
                linear-gradient(145deg,rgba(8,5,18,0.98),rgba(18,10,34,0.98))
              `,
              border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 40px 110px rgba(0,0,0,0.70), 0 0 0 1px rgba(251,11,140,0.18), 0 0 80px rgba(251,11,140,0.24)',
            }}
          >
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
              `,
              backgroundSize: '38px 38px',
              maskImage: 'linear-gradient(to bottom,rgba(0,0,0,0.72),transparent 80%)',
              WebkitMaskImage: 'linear-gradient(to bottom,rgba(0,0,0,0.72),transparent 80%)',
              pointerEvents: 'none',
            }} />

            <div style={{ padding: 28, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <motion.div
                    animate={{ rotate: [-6, 6, -6], scale: [1, 1.06, 1] }}
                    transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 18,
                      display: 'grid',
                      placeItems: 'center',
                      background: 'linear-gradient(135deg,rgba(251,11,140,0.32),rgba(0,245,160,0.18))',
                      border: '1px solid rgba(255,255,255,0.16)',
                      boxShadow: '0 0 34px rgba(251,11,140,0.38), inset 0 1px 0 rgba(255,255,255,0.16)',
                    }}
                  >
                    <BellRing size={24} color={brand.pink} />
                  </motion.div>
                  <div>
                    <div style={{
                      fontSize: 10,
                      fontWeight: 950,
                      letterSpacing: 2.3,
                      color: brand.green,
                      textTransform: 'uppercase',
                      fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
                    }}>
                      Incoming SIP Call
                    </div>
                    <div style={{ fontSize: 13, color: brand.muted, marginTop: 4 }}>
                      Press Enter to answer Â· Esc to reject
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  borderRadius: 999,
                  padding: '8px 12px',
                  background: 'rgba(0,245,160,0.10)',
                  border: '1px solid rgba(0,245,160,0.28)',
                  color: brand.green,
                  fontSize: 11,
                  fontWeight: 900,
                  fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
                }}>
                  <Radio size={14} /> {status.toUpperCase()}
                </div>
              </div>

              <div style={{
                borderRadius: 28,
                padding: '26px 22px',
                textAlign: 'center',
                background: 'linear-gradient(145deg,rgba(255,255,255,0.10),rgba(255,255,255,0.035))',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10),0 20px 60px rgba(0,0,0,0.32)',
              }}>
                <motion.div
                  animate={{ boxShadow: [
                    '0 0 0 0 rgba(251,11,140,0.34)',
                    '0 0 0 18px rgba(251,11,140,0)',
                    '0 0 0 0 rgba(251,11,140,0)',
                  ] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                  style={{
                    width: 82,
                    height: 82,
                    borderRadius: 28,
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 18px',
                    background: 'linear-gradient(135deg,rgba(251,11,140,0.34),rgba(139,92,246,0.22))',
                    border: '1px solid rgba(255,255,255,0.16)',
                  }}
                >
                  <UserRound size={36} color={brand.ink} />
                </motion.div>

                <div style={{
                  fontSize: 30,
                  lineHeight: 1.08,
                  fontWeight: 950,
                  letterSpacing: '-0.04em',
                  color: brand.ink,
                  wordBreak: 'break-word',
                }}>
                  {caller}
                </div>
                <div style={{
                  marginTop: 10,
                  color: brand.muted,
                  fontSize: 14,
                  wordBreak: 'break-word',
                  fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
                }}>
                  {callerMeta}
                </div>

                <div style={{
                  marginTop: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: brand.faint,
                  fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
                  fontWeight: 900,
                }}>
                  <ShieldCheck size={15} color={brand.cyan} /> Ringing {formatElapsed(elapsed)}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
                marginTop: 22,
              }}>
                <button
                  onClick={() => void handleReject()}
                  disabled={Boolean(busy)}
                  style={{
                    minHeight: 58,
                    borderRadius: 20,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    border: '1px solid rgba(255,59,95,0.32)',
                    background: 'linear-gradient(135deg,rgba(255,59,95,0.22),rgba(251,11,140,0.10))',
                    color: brand.ink,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    fontWeight: 950,
                    letterSpacing: '-0.02em',
                    boxShadow: '0 16px 34px rgba(255,59,95,0.12),inset 0 1px 0 rgba(255,255,255,0.12)',
                    opacity: busy ? 0.72 : 1,
                  }}
                >
                  <PhoneOff size={19} /> {busy === 'reject' ? 'Rejecting...' : 'Reject'}
                </button>

                <button
                  onClick={() => void handleAnswer()}
                  disabled={Boolean(busy)}
                  style={{
                    minHeight: 58,
                    borderRadius: 20,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    border: '1px solid rgba(0,245,160,0.38)',
                    background: 'linear-gradient(135deg,rgba(0,245,160,0.92),rgba(251,11,140,0.78))',
                    color: '#07110e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    fontWeight: 950,
                    letterSpacing: '-0.02em',
                    boxShadow: '0 20px 48px rgba(0,245,160,0.22),0 20px 48px rgba(251,11,140,0.16),inset 0 1px 0 rgba(255,255,255,0.30)',
                    opacity: busy ? 0.78 : 1,
                  }}
                >
                  <Phone size={19} /> {busy === 'answer' ? 'Answering...' : 'Answer'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
