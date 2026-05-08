import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff, X, Delete, PhoneCall } from 'lucide-react'
import { dialerAPI } from '../api/dialer.api'

type WidgetState = 'collapsed' | 'dialpad' | 'calling' | 'active'

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
]

export default function FloatingDialer() {
  const [state, setState]         = useState<WidgetState>('collapsed')
  const [number, setNumber]       = useState('')
  const [callSid, setCallSid]     = useState<string | null>(null)
  const [elapsed, setElapsed]     = useState(0)
  const [error, setError]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null)

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const startTimer = useCallback(() => {
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => () => stopTimer(), [stopTimer])

  const handleKey = (k: string) => {
    if (number.length >= 15) return
    setNumber(n => n + k)
    setError(null)
  }

  const handleDelete = () => setNumber(n => n.slice(0, -1))

  const handleCall = async () => {
    const cleaned = number.replace(/\s/g, '')
    if (cleaned.length < 6) { setError('Enter a valid phone number'); return }
    setError(null)
    setLoading(true)
    setState('calling')
    try {
      // Manual call requires contactId + campaignId
      // For floating manual dialer we hit a simpler direct-call endpoint
      // Fallback: use makeManualCall with contactId=0 campaignId=0 as ad-hoc
      // Backend should handle phone string directly — if not, show graceful error
      const res = await dialerAPI.makeManualCall(0, 0)
      setCallSid(res?.twilioCallSid || res?.callSid || null)
      setState('active')
      startTimer()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Call failed. Check Twilio config.'
      setError(msg)
      setState('dialpad')
    } finally {
      setLoading(false)
    }
  }

  const handleHangup = async () => {
    stopTimer()
    if (callSid) {
      try { await dialerAPI.hangupCall(callSid) } catch { /* silent */ }
    }
    setCallSid(null)
    setElapsed(0)
    setState('dialpad')
  }

  const handleClose = () => {
    if (state === 'active' || state === 'calling') handleHangup()
    setState('collapsed')
    setNumber('')
    setError(null)
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 28,
      right: 28,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 10,
      pointerEvents: 'none',
    }}>

      {/* Widget panel */}
      <AnimatePresence>
        {state !== 'collapsed' && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.88, y: 24  }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            style={{
              pointerEvents: 'all',
              width: 280,
              borderRadius: 20,
              background: 'var(--bg-glass-hi)',
              backdropFilter: 'blur(28px) saturate(160%)',
              WebkitBackdropFilter: 'blur(28px) saturate(160%)',
              border: '1px solid var(--border-pink)',
              boxShadow: '0 24px 60px rgba(251,11,140,0.22), 0 4px 20px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 16px 10px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #fb0b8c, #8057d7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(251,11,140,0.35)',
                }}>
                  <Phone size={13} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3 }}>
                    Manual Dialer
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {state === 'active'
                      ? <span style={{ color: 'var(--green-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="pulse-dot" style={{ width: 6, height: 6 }}/> Live · {fmt(elapsed)}
                        </span>
                      : state === 'calling'
                      ? <span style={{ color: 'var(--pink)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="pulse-dot pink" style={{ width: 6, height: 6 }}/> Connecting…
                        </span>
                      : 'Ad-hoc Call'
                    }
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-3)', cursor: 'pointer', transition: 'all .2s',
                }}
              >
                <X size={12} />
              </button>
            </div>

            <div style={{ padding: '14px 16px 16px' }}>

              {/* Number display */}
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '10px 14px',
                marginBottom: 12,
                minHeight: 44,
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: state === 'active' ? 14 : number ? 18 : 13,
                  fontWeight: 700,
                  color: state === 'active' ? 'var(--green-light)' : number ? 'var(--text)' : 'var(--text-3)',
                  letterSpacing: state === 'active' ? -0.5 : 1,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {state === 'active' || state === 'calling'
                    ? number
                    : number || 'Enter number…'
                  }
                </span>
                {number && state === 'dialpad' && (
                  <button
                    onClick={handleDelete}
                    style={{ color: 'var(--text-3)', padding: 4, cursor: 'pointer', display: 'flex' }}
                  >
                    <Delete size={15} />
                  </button>
                )}
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{   opacity: 0, height: 0 }}
                    style={{
                      fontSize: 11, color: 'var(--danger)',
                      background: 'rgba(239,68,68,0.10)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      borderRadius: 8, padding: '7px 10px',
                      marginBottom: 10, fontWeight: 600,
                    }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Dialpad */}
              {(state === 'dialpad' || state === 'calling') && (
                <>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                    marginBottom: 12,
                    opacity: state === 'calling' ? 0.4 : 1,
                    pointerEvents: state === 'calling' ? 'none' : 'all',
                  }}>
                    {KEYS.flat().map(k => (
                      <motion.button
                        key={k}
                        whileTap={{ scale: 0.88 }}
                        onClick={() => handleKey(k)}
                        style={{
                          height: 44,
                          borderRadius: 10,
                          background: 'var(--bg-2)',
                          border: '1px solid var(--border)',
                          color: 'var(--text)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 16, fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'background .15s, border-color .15s',
                        }}
                      >
                        {k}
                      </motion.button>
                    ))}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleCall}
                    disabled={loading || state === 'calling' || !number}
                    style={{
                      width: '100%', height: 46,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #fb0b8c, #ff4bad)',
                      border: 'none', color: '#fff',
                      fontWeight: 800, fontSize: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      opacity: (!number || loading || state === 'calling') ? 0.5 : 1,
                      cursor: (!number || loading || state === 'calling') ? 'not-allowed' : 'pointer',
                      boxShadow: '0 8px 24px rgba(251,11,140,0.32)',
                    }}
                  >
                    {state === 'calling'
                      ? <><span className="pulse-dot pink" style={{ width: 7, height: 7 }}/> Connecting…</>
                      : <><PhoneCall size={14} /> Call</>
                    }
                  </motion.button>
                </>
              )}

              {/* Active call view */}
              {state === 'active' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ textAlign: 'center' }}
                >
                  <div style={{
                    fontSize: 36, fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--green-light)',
                    letterSpacing: -1,
                    textShadow: '0 0 28px rgba(42,233,123,0.40)',
                    marginBottom: 16,
                  }}>
                    {fmt(elapsed)}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleHangup}
                    style={{
                      width: '100%', height: 46,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      border: 'none', color: '#fff',
                      fontWeight: 800, fontSize: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      boxShadow: '0 8px 24px rgba(239,68,68,0.35)',
                      cursor: 'pointer',
                    }}
                  >
                    <PhoneOff size={14} /> Hang Up
                  </motion.button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => state === 'collapsed' ? setState('dialpad') : handleClose()}
        style={{
          pointerEvents: 'all',
          width: 56, height: 56,
          borderRadius: '50%',
          background: state === 'active'
            ? 'linear-gradient(135deg, #00a747, #2ae97b)'
            : 'linear-gradient(135deg, #fb0b8c, #8057d7)',
          border: 'none',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: state === 'active'
            ? '0 8px 28px rgba(42,233,123,0.45), 0 0 0 4px rgba(42,233,123,0.15)'
            : '0 8px 28px rgba(251,11,140,0.45), 0 0 0 4px rgba(251,11,140,0.12)',
          cursor: 'pointer',
          transition: 'background 0.3s, box-shadow 0.3s',
          flexShrink: 0,
        }}
        title="Manual Dialer"
      >
        <AnimatePresence mode="wait">
          {state === 'active' ? (
            <motion.span key="active"
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            >
              <PhoneCall size={22} />
            </motion.span>
          ) : state !== 'collapsed' ? (
            <motion.span key="open"
              initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}
            >
              <X size={20} />
            </motion.span>
          ) : (
            <motion.span key="closed"
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            >
              <Phone size={22} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}
