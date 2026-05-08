import {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import {
  Phone, PhoneOff, X, Delete, PhoneCall,
  MicOff, Mic, Hash, Clock, Search, ChevronDown,
  User as UserIcon,
} from 'lucide-react'
import { dialerAPI } from '../api/dialer.api'
import { contactsAPI } from '../api/contacts.api'

type WidgetState = 'collapsed' | 'dialpad' | 'calling' | 'active'
type ActiveTab   = 'pad' | 'dtmf' | 'history'

interface RecentCall {
  phone:    string
  name?:    string
  at:       number  // epoch ms
  duration: number  // seconds
  outcome:  'answered' | 'missed' | 'failed'
}

interface Contact {
  id:    number
  name?: string
  phone: string
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
]

const STORAGE_KEY = 'ptdt_recent_calls'

function loadRecent(): RecentCall[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveRecent(calls: RecentCall[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(calls.slice(0, 20)))
}

// Animated waveform bars
function Waveform() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 3,
      height: 28,
    }}>
      {[0.6, 1, 0.7, 1.3, 0.8, 1.1, 0.5, 1.2, 0.9, 0.6, 1, 0.7].map((h, i) => (
        <motion.div
          key={i}
          style={{
            width: 3, borderRadius: 2,
            background: `linear-gradient(180deg, #fb0b8c, #8057d7)`,
          }}
          animate={{ height: [h * 8, h * 20, h * 8] }}
          transition={{ duration: 0.8 + i * 0.05, repeat: Infinity, ease: 'easeInOut', delay: i * 0.06 }}
        />
      ))}
    </div>
  )
}

export default function FloatingDialer() {
  const [state, setState]         = useState<WidgetState>('collapsed')
  const [activeTab, setActiveTab] = useState<ActiveTab>('pad')
  const [number, setNumber]       = useState('')
  const [contactName, setName]    = useState('')
  const [callSid, setCallSid]     = useState<string | null>(null)
  const [elapsed, setElapsed]     = useState(0)
  const [error, setError]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [muted, setMuted]         = useState(false)
  const [dtmfBuf, setDtmfBuf]     = useState('')
  const [recentCalls, setRecent]  = useState<RecentCall[]>(loadRecent)
  const [contacts, setContacts]   = useState<Contact[]>([])
  const [query, setQuery]         = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const callStart   = useRef<number>(0)
  const dragControls = useDragControls()
  const inputRef    = useRef<HTMLInputElement>(null)

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const startTimer = useCallback(() => {
    setElapsed(0)
    callStart.current = Date.now()
    timerRef.current  = setInterval(() => setElapsed(e => e + 1), 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => () => stopTimer(), [stopTimer])

  // Load contacts once
  useEffect(() => {
    if (state !== 'collapsed') {
      contactsAPI.getAll({ limit: 200 })
        .then((data: Contact[]) => setContacts(data || []))
        .catch(() => {})
    }
  }, [state])

  // Keyboard shortcut Alt+D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        setState(s => s === 'collapsed' ? 'dialpad' : (s === 'active' || s === 'calling' ? s : 'collapsed'))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return contacts
      .filter(c => c.phone.includes(q) || c.name?.toLowerCase().includes(q))
      .slice(0, 6)
  }, [query, contacts])

  const handleKey = (k: string) => {
    if (number.length >= 16) return
    setNumber(n => n + k)
    setQuery(n => n + k)
    setError(null)
  }

  const handleDelete = () => {
    setNumber(n => n.slice(0, -1))
    setQuery(n => n.slice(0, -1))
  }

  const selectContact = (c: Contact) => {
    setNumber(c.phone)
    setName(c.name || '')
    setQuery(c.phone)
    setShowSuggestions(false)
  }

  const handleCall = async () => {
    const cleaned = number.replace(/\s/g, '')
    if (cleaned.length < 5) { setError('Enter a valid number'); return }
    setError(null)
    setLoading(true)
    setState('calling')
    try {
      const res = await dialerAPI.makeAdhocCall(cleaned, contactName || undefined)
      setCallSid(res?.callSid || null)
      setState('active')
      setActiveTab('pad')
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

  const handleHangup = useCallback(async () => {
    const dur = Math.round((Date.now() - callStart.current) / 1000)
    stopTimer()
    if (callSid) {
      try { await dialerAPI.hangupCall(callSid) } catch { /* silent */ }
    }
    // Save to recent
    const entry: RecentCall = {
      phone:    number,
      name:     contactName || undefined,
      at:       Date.now(),
      duration: dur,
      outcome:  dur > 3 ? 'answered' : 'missed',
    }
    const updated = [entry, ...recentCalls]
    setRecent(updated)
    saveRecent(updated)

    setCallSid(null)
    setElapsed(0)
    setMuted(false)
    setState('dialpad')
  }, [callSid, number, contactName, recentCalls, stopTimer])

  const handleDTMF = async (digit: string) => {
    setDtmfBuf(d => d + digit)
    if (callSid) {
      try { await dialerAPI.sendDTMF(callSid, digit) } catch { /* silent */ }
    }
  }

  const handleMute = () => setMuted(m => !m)

  const handleClose = useCallback(() => {
    if (state === 'active' || state === 'calling') handleHangup()
    setState('collapsed')
    setNumber('')
    setName('')
    setQuery('')
    setError(null)
    setDtmfBuf('')
    setShowSuggestions(false)
  }, [state, handleHangup])

  const timeAgo = (ms: number) => {
    const diff = Date.now() - ms
    const m = Math.floor(diff / 60000)
    if (m < 1)  return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  const outcomeColor = (o: string) =>
    o === 'answered' ? 'var(--green-light)' :
    o === 'missed'   ? 'var(--gold)' : 'var(--danger)'

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      style={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 10,
        cursor: 'default',
      }}
    >
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
              width: 300,
              borderRadius: 22,
              background: 'var(--bg-glass-hi)',
              backdropFilter: 'blur(32px) saturate(160%)',
              WebkitBackdropFilter: 'blur(32px) saturate(160%)',
              border: '1px solid var(--border-pink)',
              boxShadow: '0 28px 70px rgba(251,11,140,0.20), 0 4px 24px rgba(0,0,0,0.28)',
              overflow: 'hidden',
              userSelect: 'none',
            }}
          >
            {/* Drag handle — header */}
            <div
              onPointerDown={e => dragControls.start(e)}
              style={{
                padding: '13px 16px 10px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'grab',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: state === 'active'
                    ? 'linear-gradient(135deg, #00a747, #2ae97b)'
                    : 'linear-gradient(135deg, #fb0b8c, #8057d7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: state === 'active'
                    ? '0 4px 14px rgba(42,233,123,0.40)'
                    : '0 4px 14px rgba(251,11,140,0.40)',
                  transition: 'all 0.3s',
                  flexShrink: 0,
                }}>
                  <Phone size={13} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3 }}>
                    PTDT Manual Dialer
                  </div>
                  <div style={{
                    fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {state === 'active' ? (
                      <span style={{ color: 'var(--green-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="pulse-dot" style={{ width: 5, height: 5 }}/>
                        Live &middot; {fmt(elapsed)}
                        {muted && <MicOff size={9} color="var(--danger)" style={{ marginLeft: 2 }}/>}
                      </span>
                    ) : state === 'calling' ? (
                      <span style={{ color: 'var(--pink)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="pulse-dot pink" style={{ width: 5, height: 5 }}/>
                        Connecting…
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-3)' }}>Ad-hoc &middot; Alt+D</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={handleClose}
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-3)', cursor: 'pointer',
                }}
              >
                <X size={11} />
              </button>
            </div>

            <div style={{ padding: '12px 14px 14px' }}>

              {/* === DIALPAD / SEARCHING VIEW === */}
              {(state === 'dialpad' || state === 'calling') && (
                <>
                  {/* Search + number input */}
                  <div style={{
                    position: 'relative',
                    marginBottom: 10,
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      background: 'var(--bg-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '9px 12px',
                      gap: 8,
                    }}>
                      <Search size={13} color="var(--text-3)"/>
                      <input
                        ref={inputRef}
                        value={query}
                        onChange={e => {
                          const v = e.target.value
                          setQuery(v)
                          setNumber(v)
                          setShowSuggestions(true)
                          setError(null)
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        placeholder="Name or number…"
                        style={{
                          flex: 1,
                          background: 'none',
                          border: 'none',
                          outline: 'none',
                          fontFamily: 'var(--font-mono)',
                          fontSize: number ? 16 : 13,
                          fontWeight: 700,
                          color: 'var(--text)',
                          letterSpacing: number ? 1 : 0,
                        }}
                      />
                      {number && (
                        <button
                          onClick={handleDelete}
                          style={{ color: 'var(--text-3)', display: 'flex', cursor: 'pointer' }}
                        >
                          <Delete size={14}/>
                        </button>
                      )}
                    </div>

                    {/* Contact suggestions */}
                    <AnimatePresence>
                      {showSuggestions && filtered.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{   opacity: 0, y: -6 }}
                          style={{
                            position: 'absolute',
                            top: '100%', left: 0, right: 0,
                            marginTop: 4,
                            background: 'var(--bg-glass-hi)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            border: '1px solid var(--border-pink)',
                            borderRadius: 12,
                            overflow: 'hidden',
                            zIndex: 10,
                            boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
                          }}
                        >
                          {filtered.map(c => (
                            <div
                              key={c.id}
                              onClick={() => selectContact(c)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '9px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--border)',
                                transition: 'background .15s',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <div style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: 'linear-gradient(135deg, rgba(251,11,140,0.15), rgba(128,87,215,0.15))',
                                border: '1px solid var(--border-pink)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                <UserIcon size={12} color="var(--pink)"/>
                              </div>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                                  {c.name || 'Unknown'}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                                  {c.phone}
                                </div>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 7,
                    marginBottom: 10,
                    opacity: state === 'calling' ? 0.4 : 1,
                    pointerEvents: state === 'calling' ? 'none' : 'all',
                  }}>
                    {KEYS.flat().map(k => (
                      <motion.button
                        key={k}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => handleKey(k)}
                        style={{
                          height: 42,
                          borderRadius: 10,
                          background: 'var(--bg-2)',
                          border: '1px solid var(--border)',
                          color: 'var(--text)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 17, fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'background .12s, border-color .12s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-pink)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
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
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      opacity: (!number || loading || state === 'calling') ? 0.5 : 1,
                      cursor: (!number || loading || state === 'calling') ? 'not-allowed' : 'pointer',
                      boxShadow: '0 8px 24px rgba(251,11,140,0.32)',
                      letterSpacing: 0.2,
                    }}
                  >
                    {state === 'calling'
                      ? <><span className="pulse-dot pink" style={{ width: 7, height: 7 }}/> Connecting…</>
                      : <><PhoneCall size={14} /> Call {contactName ? contactName : number || ''}</>
                    }
                  </motion.button>
                </>
              )}

              {/* === ACTIVE CALL VIEW === */}
              {state === 'active' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Caller info */}
                  <div style={{ textAlign: 'center', marginBottom: 10 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(0,167,71,0.20), rgba(42,233,123,0.10))',
                      border: '1.5px solid rgba(42,233,123,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 8px',
                      boxShadow: '0 0 24px rgba(42,233,123,0.20)',
                    }}>
                      <UserIcon size={20} color="var(--green-light)"/>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>
                      {contactName || 'Unknown'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                      {number}
                    </div>
                  </div>

                  {/* Waveform */}
                  {!muted && <Waveform />}
                  {muted && (
                    <div style={{
                      textAlign: 'center', fontSize: 11,
                      color: 'var(--danger)', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      height: 28,
                    }}>
                      <MicOff size={12}/> Muted
                    </div>
                  )}

                  {/* Timer */}
                  <div style={{
                    textAlign: 'center',
                    fontSize: 32, fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--green-light)',
                    letterSpacing: -1,
                    textShadow: '0 0 28px rgba(42,233,123,0.35)',
                    margin: '8px 0 12px',
                  }}>
                    {fmt(elapsed)}
                  </div>

                  {/* Tabs: DTMF */}
                  <div style={{
                    display: 'flex',
                    background: 'var(--bg-2)',
                    borderRadius: 10,
                    padding: 3,
                    gap: 3,
                    marginBottom: 10,
                  }}>
                    {(['pad', 'dtmf', 'history'] as ActiveTab[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        style={{
                          flex: 1,
                          padding: '6px 4px',
                          borderRadius: 8,
                          border: 'none',
                          fontSize: 10, fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          background: activeTab === t
                            ? 'linear-gradient(135deg, rgba(251,11,140,0.25), rgba(128,87,215,0.20))'
                            : 'transparent',
                          color: activeTab === t ? 'var(--pink)' : 'var(--text-3)',
                          cursor: 'pointer',
                          transition: 'all .15s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        }}
                      >
                        {t === 'pad' && <><ChevronDown size={9}/> Controls</>}
                        {t === 'dtmf' && <><Hash size={9}/> Keypad</>}
                        {t === 'history' && <><Clock size={9}/> History</>}
                      </button>
                    ))}
                  </div>

                  {/* Controls tab */}
                  {activeTab === 'pad' && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={handleMute}
                        style={{
                          flex: 1, height: 42, borderRadius: 11,
                          background: muted
                            ? 'linear-gradient(135deg, rgba(239,68,68,0.20), rgba(239,68,68,0.10))'
                            : 'var(--bg-2)',
                          border: `1px solid ${muted ? 'rgba(239,68,68,0.40)' : 'var(--border)'}`,
                          color: muted ? 'var(--danger)' : 'var(--text-3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          fontWeight: 700, fontSize: 11,
                          cursor: 'pointer', transition: 'all .2s',
                        }}
                      >
                        {muted ? <MicOff size={13}/> : <Mic size={13}/>}
                        {muted ? 'Unmute' : 'Mute'}
                      </motion.button>
                    </div>
                  )}

                  {/* DTMF tab */}
                  {activeTab === 'dtmf' && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 16, fontWeight: 700,
                        color: 'var(--text)',
                        letterSpacing: 2,
                        textAlign: 'center',
                        padding: '6px 10px',
                        background: 'var(--bg-2)',
                        borderRadius: 8,
                        minHeight: 34,
                        marginBottom: 8,
                      }}>
                        {dtmfBuf || <span style={{ color: 'var(--text-3)', fontSize: 11 }}>Press keys below</span>}
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 5,
                      }}>
                        {KEYS.flat().map(k => (
                          <motion.button
                            key={k}
                            whileTap={{ scale: 0.84 }}
                            onClick={() => handleDTMF(k)}
                            style={{
                              height: 36,
                              borderRadius: 8,
                              background: 'var(--bg-2)',
                              border: '1px solid var(--border)',
                              color: 'var(--text)',
                              fontFamily: 'var(--font-mono)',
                              fontSize: 15, fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {k}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* History tab (during active call) */}
                  {activeTab === 'history' && (
                    <div style={{ marginBottom: 10, maxHeight: 150, overflowY: 'auto' }}>
                      {recentCalls.length === 0 ? (
                        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', padding: '16px 0' }}>
                          No recent calls
                        </div>
                      ) : recentCalls.slice(0, 5).map((c, i) => (
                        <div
                          key={i}
                          onClick={() => { setNumber(c.phone); setName(c.name || ''); setQuery(c.phone) }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '7px 4px',
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: outcomeColor(c.outcome),
                            flexShrink: 0,
                            boxShadow: `0 0 6px ${outcomeColor(c.outcome)}`,
                          }}/>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', truncate: true } as React.CSSProperties}>
                              {c.name || c.phone}
                            </div>
                            <div style={{ fontSize: 9.5, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                              {fmt(c.duration)} &middot; {timeAgo(c.at)}
                            </div>
                          </div>
                          <Phone size={9} color="var(--text-3)"/>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hangup */}
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

              {/* === RECENT CALLS (dialpad idle mode) === */}
              {state === 'dialpad' && recentCalls.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700,
                    color: 'var(--text-3)',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginBottom: 6,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <Clock size={9}/> Recent Calls
                  </div>
                  {recentCalls.slice(0, 4).map((c, i) => (
                    <div
                      key={i}
                      onClick={() => { setNumber(c.phone); setName(c.name || ''); setQuery(c.phone) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9,
                        padding: '7px 6px',
                        borderRadius: 9,
                        cursor: 'pointer',
                        transition: 'background .15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: outcomeColor(c.outcome),
                        flexShrink: 0,
                      }}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>
                          {c.name || c.phone}
                        </div>
                        <div style={{ fontSize: 9.5, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                          {fmt(c.duration)} &middot; {timeAgo(c.at)}
                        </div>
                      </div>
                      <Phone size={10} color="var(--text-3)"/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => state === 'collapsed' ? setState('dialpad') : handleClose()}
        style={{
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
        title="Manual Dialer (Alt+D)"
      >
        <AnimatePresence mode="wait">
          {state === 'active' ? (
            <motion.span key="active"
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <PhoneCall size={22} />
            </motion.span>
          ) : state !== 'collapsed' ? (
            <motion.span key="open"
              initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
              <X size={20} />
            </motion.span>
          ) : (
            <motion.span key="closed"
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Phone size={22} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  )
}
