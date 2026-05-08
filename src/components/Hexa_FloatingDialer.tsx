import {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone, PhoneOff, X, Delete, PhoneCall,
  MicOff, Mic, Hash, Clock, Search,
  User as UserIcon, ChevronDown, Signal, Zap,
} from 'lucide-react'
import { dialerAPI } from '../api/dialer.api'
import { contactsAPI } from '../api/contacts.api'

type WidgetState = 'collapsed' | 'dialpad' | 'calling' | 'active'
type ActiveTab = 'controls' | 'dtmf' | 'history'

interface RecentCall {
  phone: string
  name?: string
  at: number
  duration: number
  outcome: 'answered' | 'missed' | 'failed'
}

interface Contact {
  id: number
  name?: string
  phone: string
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
]

const SUB: Record<string, string> = {
  '1': '', '2': 'ABC', '3': 'DEF',
  '4': 'GHI', '5': 'JKL', '6': 'MNO',
  '7': 'PQRS', '8': 'TUV', '9': 'WXYZ',
  '*': '', '0': '+', '#': '',
}

const STORAGE_KEY = 'ptdt_recent_calls_v5'
function loadRecent(): RecentCall[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveRecent(c: RecentCall[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c.slice(0, 20)))
}

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// ── Vibrant Waveform ──────────────────────────────────────
function Waveform({ active }: { active: boolean }) {
  const bars = [0.4, 0.8, 0.5, 1.1, 0.6, 1.0, 0.4, 1.2, 0.7, 0.5, 1.0, 0.6, 0.3, 0.9, 0.7]
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 3, height: 40,
      background: 'rgba(255,255,255,0.06)',
      borderRadius: 20, padding: '0 16px',
      border: '1px solid rgba(255,255,255,0.10)',
    }}>
      {bars.map((h, i) => (
        active
          ? <motion.div key={i}
            style={{
              width: 3, borderRadius: 4,
              background: `linear-gradient(180deg,
                hsl(${180 + i * 12},100%,65%),
                hsl(${260 + i * 8},100%,65%))`,
            }}
            animate={{ height: [h * 6, h * 26, h * 6] }}
            transition={{
              duration: 0.6 + i * 0.05,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.04,
            }}
          />
          : <div key={i} style={{
            width: 3, height: 5, borderRadius: 4,
            background: 'rgba(255,255,255,0.18)',
          }} />
      ))}
    </div>
  )
}

// ── Round Dial Key ────────────────────────────────────────
function DialKey({
  label, sub, onClick, size = 'normal',
}: {
  label: string
  sub?: string
  onClick: () => void
  size?: 'normal' | 'small'
}) {
  const [pressed, setPressed] = useState(false)
  const [hovered, setHovered] = useState(false)
  const dim = size === 'small' ? 48 : 62

  // Each key gets a unique vibrant gradient based on label
  const gradients: Record<string, string> = {
    '1': 'linear-gradient(135deg,#667eea,#764ba2)',
    '2': 'linear-gradient(135deg,#f093fb,#f5576c)',
    '3': 'linear-gradient(135deg,#4facfe,#00f2fe)',
    '4': 'linear-gradient(135deg,#43e97b,#38f9d7)',
    '5': 'linear-gradient(135deg,#fa709a,#fee140)',
    '6': 'linear-gradient(135deg,#a18cd1,#fbc2eb)',
    '7': 'linear-gradient(135deg,#ffecd2,#fcb69f)',
    '8': 'linear-gradient(135deg,#ff9a9e,#fecfef)',
    '9': 'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
    '*': 'linear-gradient(135deg,#fddb92,#d1fdff)',
    '0': 'linear-gradient(135deg,#30cfd0,#330867)',
    '#': 'linear-gradient(135deg,#f77062,#fe5196)',
  }

  const hoverGrad: Record<string, string> = {
    '1': 'linear-gradient(135deg,#7c91ff,#9060c0)',
    '2': 'linear-gradient(135deg,#ff9fff,#ff7080)',
    '3': 'linear-gradient(135deg,#6fc8ff,#20ffff)',
    '4': 'linear-gradient(135deg,#5dff90,#55ffee)',
    '5': 'linear-gradient(135deg,#ff85b5,#ffec55)',
    '6': 'linear-gradient(135deg,#c0a8ff,#ffd8ff)',
    '7': 'linear-gradient(135deg,#fff0e0,#ffd0b5)',
    '8': 'linear-gradient(135deg,#ffb5b8,#ffe0ff)',
    '9': 'linear-gradient(135deg,#c0d8ff,#e0f5ff)',
    '*': 'linear-gradient(135deg,#fff0a0,#e8ffff)',
    '0': 'linear-gradient(135deg,#50efef,#6030a0)',
    '#': 'linear-gradient(135deg,#ff9080,#ff70b0)',
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        width: dim, height: dim,
        borderRadius: '50%',
        cursor: 'pointer',
        background: hovered
          ? (hoverGrad[label] || 'rgba(255,255,255,0.2)')
          : (gradients[label] || 'rgba(255,255,255,0.1)'),
        border: 'none',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 1,
        transform: pressed ? 'scale(0.84)' : hovered ? 'scale(1.08)' : 'scale(1)',
        transition: 'all 0.12s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: pressed
          ? 'inset 0 3px 8px rgba(0,0,0,0.3)'
          : hovered
            ? '0 8px 24px rgba(0,0,0,0.28), 0 0 0 3px rgba(255,255,255,0.20)'
            : '0 4px 14px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.30)',
        justifySelf: 'center',
      }}
    >
      <span style={{
        fontSize: size === 'small' ? 16 : 21,
        fontWeight: 800,
        color: '#fff',
        fontFamily: 'monospace',
        lineHeight: 1,
        textShadow: '0 1px 4px rgba(0,0,0,0.4)',
      }}>{label}</span>
      {sub && (
        <span style={{
          fontSize: 6.5, fontWeight: 700,
          color: 'rgba(255,255,255,0.75)',
          letterSpacing: 1,
        }}>{sub}</span>
      )}
    </button>
  )
}

// ── Pulsing Status Badge ──────────────────────────────────
function StatusBadge({
  label, color, bg, pulse,
}: {
  label: string; color: string; bg: string; pulse?: boolean
}) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: bg, borderRadius: 20,
      padding: '4px 10px 4px 8px',
      border: `1px solid ${color}40`,
    }}>
      <div style={{ position: 'relative', width: 7, height: 7 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}`,
        }} />
        {pulse && (
          <motion.div style={{
            position: 'absolute', inset: -3, borderRadius: '50%',
            border: `1.5px solid ${color}`,
          }}
            animate={{ scale: [1, 2.0], opacity: [0.8, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </div>
      <span style={{
        fontSize: 9, fontFamily: 'monospace', color, fontWeight: 800, letterSpacing: 1,
      }}>{label}</span>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────
export default function FloatingDialer() {
  const [state, setState] = useState<WidgetState>('collapsed')
  const [tab, setTab] = useState<ActiveTab>('controls')
  const [number, setNumber] = useState('')
  const [contactName, setName] = useState('')
  const [callSid, setCallSid] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [muted, setMuted] = useState(false)
  const [dtmfBuf, setDtmfBuf] = useState('')
  const [recent, setRecent] = useState<RecentCall[]>(loadRecent)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [query, setQuery] = useState('')
  const [suggestions, setSugg] = useState(false)
  const [ripple, setRipple] = useState(false)

  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{
    startX: number; startY: number; origX: number; origY: number
  } | null>(null)
  const isDraggingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const callStart = useRef<number>(0)

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])
  useEffect(() => () => stopTimer(), [stopTimer])

  useEffect(() => {
    if (state !== 'collapsed') {
      (async () => {
        try {
          const d = await contactsAPI.getAll({ limit: 200 })
          const arr = Array.isArray((d as any)?.contacts)
            ? (d as any).contacts
            : Array.isArray(d) ? d : []
          setContacts(arr as Contact[])
        } catch { setContacts([]) }
      })()
    }
  }, [state])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        setState(s =>
          s === 'collapsed' ? 'dialpad'
            : (s === 'active' || s === 'calling' ? s : 'collapsed')
        )
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return (contacts || [])
      .filter(c => c.phone.includes(q) || c.name?.toLowerCase().includes(q))
      .slice(0, 5)
  }, [query, contacts])

  // ── Drag ──
  const onHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
    isDraggingRef.current = false
  }, [pos])

  const onHeaderPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (!isDraggingRef.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3))
      isDraggingRef.current = true
    if (isDraggingRef.current)
      setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy })
  }, [])

  const onHeaderPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false
    dragRef.current = null
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { }
  }, [])

  // ── FAB ──
  const handleFABClick = useCallback(() => {
    if (state === 'collapsed') { setState('dialpad') }
    else if (state === 'dialpad') {
      setState('collapsed')
      setNumber(''); setName(''); setQuery('')
      setError(null); setDtmfBuf(''); setSugg(false)
    }
  }, [state])

  const triggerRipple = useCallback(() => {
    setRipple(true); setTimeout(() => setRipple(false), 600)
  }, [])

  const handleKey = (k: string) => {
    if (number.length >= 16) return
    setNumber(n => n + k); setQuery(n => n + k)
    setError(null); triggerRipple()
  }
  const handleDelete = () => {
    setNumber(n => n.slice(0, -1)); setQuery(n => n.slice(0, -1))
  }
  const selectContact = (c: Contact) => {
    setNumber(c.phone); setName(c.name || '')
    setQuery(c.phone); setSugg(false)
  }

  const handleCall = async () => {
    const cleaned = number.replace(/\s/g, '')
    if (cleaned.length < 5) { setError('Enter a valid number'); return }
    setError(null); setLoading(true); setState('calling')
    try {
      const res = await dialerAPI.makeAdhocCall(cleaned, contactName || undefined)
      setCallSid(res?.callSid || null)
      setState('active'); setTab('controls'); setElapsed(0)
      callStart.current = Date.now()
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
      triggerRipple()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || 'Call failed'
      setError(msg); setState('dialpad')
    } finally { setLoading(false) }
  }

  const handleHangup = useCallback(async () => {
    const dur = Math.round((Date.now() - callStart.current) / 1000)
    stopTimer()
    if (callSid) { try { await dialerAPI.hangupCall(callSid) } catch { } }
    const entry: RecentCall = {
      phone: number, name: contactName || undefined,
      at: Date.now(), duration: dur,
      outcome: dur > 3 ? 'answered' : 'missed',
    }
    const updated = [entry, ...recent]
    setRecent(updated); saveRecent(updated)
    setCallSid(null); setElapsed(0); setMuted(false); setState('dialpad')
  }, [callSid, number, contactName, recent, stopTimer])

  const handleDTMF = async (digit: string) => {
    setDtmfBuf(d => d + digit)
    if (callSid) { try { await dialerAPI.sendDTMF(callSid, digit) } catch { } }
  }

  const handleClose = useCallback(() => {
    if (state === 'active' || state === 'calling') handleHangup()
    setState('collapsed')
    setNumber(''); setName(''); setQuery('')
    setError(null); setDtmfBuf(''); setSugg(false)
  }, [state, handleHangup])

  const timeAgo = (ms: number) => {
    const m = Math.floor((Date.now() - ms) / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
  }

  const outcomeColor = (o: string) =>
    o === 'answered' ? '#10b981' : o === 'missed' ? '#f59e0b' : '#ef4444'

  const isOpen = state !== 'collapsed'

  return (
    <>
      <style>{`
        @keyframes ptdt-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ptdt-float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-4px); }
        }
        .ptdt-panel::-webkit-scrollbar { width: 4px; }
        .ptdt-panel::-webkit-scrollbar-track { background: transparent; }
        .ptdt-panel::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15); border-radius: 4px;
        }
      `}</style>

      <div style={{
        position: 'fixed',
        bottom: 28 - pos.y,
        right: 28 - pos.x,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 14,
      }}>

        {/* ══════════════════════════════════════════
            PANEL  — Fully Round Card
        ══════════════════════════════════════════ */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.75, y: 48 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.75, y: 48 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              style={{
                width: 348,
                borderRadius: 36,
                /* ── Vibrant frosted background ── */
                background: 'linear-gradient(145deg,rgba(30,18,60,0.95) 0%,rgba(15,10,45,0.97) 100%)',
                backdropFilter: 'blur(24px)',
                border: '1.5px solid rgba(255,255,255,0.12)',
                boxShadow: ripple
                  ? '0 0 0 4px rgba(167,139,250,0.35),0 0 80px rgba(139,92,246,0.50),0 32px 80px rgba(0,0,0,0.55)'
                  : state === 'active'
                    ? '0 0 0 3px rgba(52,211,153,0.30),0 0 60px rgba(52,211,153,0.25),0 28px 70px rgba(0,0,0,0.50)'
                    : '0 0 0 1.5px rgba(167,139,250,0.20),0 28px 70px rgba(0,0,0,0.50),0 0 60px rgba(139,92,246,0.12)',
                overflow: 'hidden',
                userSelect: 'none',
                transition: 'box-shadow 0.4s ease',
                position: 'relative',
              }}
            >
              {/* ── Decorative top orb glow ── */}
              <div style={{
                position: 'absolute', top: -60, left: '50%',
                transform: 'translateX(-50%)',
                width: 200, height: 120,
                background: state === 'active'
                  ? 'radial-gradient(ellipse,rgba(52,211,153,0.22) 0%,transparent 70%)'
                  : 'radial-gradient(ellipse,rgba(139,92,246,0.28) 0%,transparent 70%)',
                pointerEvents: 'none',
                transition: 'background 0.5s',
              }} />

              {/* ── Decorative bottom orb ── */}
              <div style={{
                position: 'absolute', bottom: -40, right: -20,
                width: 160, height: 100,
                background: 'radial-gradient(ellipse,rgba(236,72,153,0.18) 0%,transparent 70%)',
                pointerEvents: 'none',
              }} />

              {/* ════════════════════════════════════
                  HEADER
              ════════════════════════════════════ */}
              <div
                onPointerDown={onHeaderPointerDown}
                onPointerMove={onHeaderPointerMove}
                onPointerUp={onHeaderPointerUp}
                onPointerCancel={onHeaderPointerUp}
                style={{
                  padding: '20px 20px 16px',
                  cursor: 'grab',
                  touchAction: 'none',
                  position: 'relative', zIndex: 2,
                }}
              >
                {/* Brand row */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Round logo with spinning ring */}
                    <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
                      {/* Spinning ring */}
                      <div style={{
                        position: 'absolute', inset: -3,
                        borderRadius: '50%',
                        border: '2px solid transparent',
                        borderTopColor: state === 'active' ? '#34d399' : '#a78bfa',
                        borderRightColor: state === 'active' ? '#34d399' : '#ec4899',
                        animation: 'ptdt-spin 2.5s linear infinite',
                      }} />
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: state === 'active'
                          ? 'linear-gradient(135deg,#059669,#34d399)'
                          : 'linear-gradient(135deg,#7c3aed,#ec4899)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: state === 'active'
                          ? '0 0 20px rgba(52,211,153,0.60)'
                          : '0 0 20px rgba(139,92,246,0.60)',
                      }}>
                        <Phone size={18} color="#fff" />
                      </div>
                    </div>

                    <div>
                      <div style={{
                        fontSize: 13, fontWeight: 900, letterSpacing: 1.5,
                        background: 'linear-gradient(135deg,#a78bfa,#ec4899,#f472b6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}>PTDT Dialer</div>
                      <div style={{
                        fontSize: 9, color: 'rgba(167,139,250,0.55)',
                        fontWeight: 600, letterSpacing: 0.5,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <Signal size={7} />v4.0 · Alt+D to toggle
                      </div>
                    </div>
                  </div>

                  {/* Close — round */}
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={handleClose}
                    style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'rgba(255,255,255,0.40)', cursor: 'pointer',
                      transition: 'all .2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.20)'
                      e.currentTarget.style.color = '#f87171'
                      e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                      e.currentTarget.style.color = 'rgba(255,255,255,0.40)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                    }}
                  ><X size={13} /></button>
                </div>

                {/* ── LCD / Display — Rounded Square ── */}
                <div style={{
                  background: 'linear-gradient(145deg,#0d0620,#07031a)',
                  borderRadius: 20,
                  padding: '14px 18px',
                  minHeight: 82,
                  display: 'flex', flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(167,139,250,0.20)',
                  boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.60), 0 0 0 1px rgba(167,139,250,0.06)',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {/* Subtle shimmer */}
                  <motion.div
                    style={{
                      position: 'absolute', top: 0, left: '-100%',
                      width: '60%', height: '100%',
                      background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)',
                      pointerEvents: 'none',
                    }}
                    animate={{ left: ['−100%', '200%'] }}
                    transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
                  />

                  {state === 'active' ? (
                    <>
                      <StatusBadge
                        label="CONNECTED"
                        color="#34d399"
                        bg="rgba(52,211,153,0.12)"
                        pulse
                      />
                      <div style={{
                        fontSize: 11, color: 'rgba(52,211,153,0.55)',
                        marginTop: 6, fontWeight: 600,
                      }}>{contactName || number}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                        <span style={{
                          fontSize: 34, fontWeight: 800, fontFamily: 'monospace',
                          color: '#34d399', letterSpacing: 3,
                          textShadow: '0 0 24px rgba(52,211,153,0.70)',
                        }}>{fmt(elapsed)}</span>
                        {muted && (
                          <span style={{
                            fontSize: 10, background: 'rgba(239,68,68,0.20)',
                            color: '#f87171', padding: '2px 8px', borderRadius: 20,
                            fontWeight: 700,
                          }}>MUTED</span>
                        )}
                      </div>
                    </>
                  ) : state === 'calling' ? (
                    <>
                      <StatusBadge
                        label="DIALING…"
                        color="#818cf8"
                        bg="rgba(129,140,248,0.12)"
                        pulse
                      />
                      <div style={{
                        fontSize: 22, fontFamily: 'monospace',
                        color: 'rgba(167,139,250,0.90)',
                        letterSpacing: 2, marginTop: 8, fontWeight: 700,
                      }}>{number}</div>
                    </>
                  ) : (
                    <>
                      <div style={{
                        fontSize: 9, color: 'rgba(167,139,250,0.40)',
                        fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <Zap size={8} />Ready to call
                      </div>
                      <div style={{
                        fontSize: number ? 24 : 14,
                        fontFamily: 'monospace', fontWeight: 700,
                        color: number ? '#e2d9f3' : 'rgba(255,255,255,0.18)',
                        letterSpacing: number ? 3 : 0.5,
                        textShadow: number ? '0 0 20px rgba(167,139,250,0.50)' : 'none',
                        minHeight: 38, display: 'flex', alignItems: 'center',
                        transition: 'font-size 0.12s',
                      }}>
                        {number || 'Enter number…'}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ════════════════════════════════════
                  BODY
              ════════════════════════════════════ */}
              <div
                onPointerDown={e => e.stopPropagation()}
                style={{ padding: '4px 20px 24px', position: 'relative', zIndex: 2 }}
              >
                {/* ── Search ── */}
                {(state === 'dialpad' || state === 'calling') && (
                  <div style={{ position: 'relative', marginBottom: 14 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      borderRadius: 50,
                      padding: '9px 14px', gap: 8,
                    }}>
                      <Search size={12} color="rgba(167,139,250,0.55)" />
                      <input
                        value={query}
                        onChange={e => {
                          setQuery(e.target.value); setNumber(e.target.value)
                          setSugg(true); setError(null)
                        }}
                        onFocus={() => setSugg(true)}
                        onBlur={() => setTimeout(() => setSugg(false), 160)}
                        placeholder="Search name or number…"
                        style={{
                          flex: 1, background: 'none', border: 'none', outline: 'none',
                          fontSize: 13, fontWeight: 600,
                          color: 'rgba(255,255,255,0.85)',
                          caretColor: '#a78bfa',
                        }}
                      />
                      {number && (
                        <button
                          onClick={handleDelete}
                          style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.08)',
                            border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'rgba(255,255,255,0.45)',
                          }}
                        ><Delete size={11} /></button>
                      )}
                    </div>

                    <AnimatePresence>
                      {suggestions && filtered.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.96 }}
                          style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
                            background: 'rgba(15,8,40,0.98)',
                            border: '1px solid rgba(167,139,250,0.22)',
                            borderRadius: 20, overflow: 'hidden', zIndex: 20,
                            boxShadow: '0 20px 50px rgba(0,0,0,0.70)',
                          }}
                        >
                          {filtered.map(c => (
                            <div key={c.id} onClick={() => selectContact(c)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 14px', cursor: 'pointer',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                transition: 'background .12s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(167,139,250,0.10)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <div style={{
                                width: 30, height: 30, borderRadius: '50%',
                                background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                <UserIcon size={13} color="#fff" />
                              </div>
                              <div>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>
                                  {c.name || 'Unknown'}
                                </div>
                                <div style={{
                                  fontSize: 10, color: 'rgba(167,139,250,0.50)',
                                  fontFamily: 'monospace',
                                }}>{c.phone}</div>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* ── Error ── */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        fontSize: 11.5, color: '#fca5a5',
                        background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: 14, padding: '8px 14px',
                        marginBottom: 12, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>⚠</span> {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ════════════════════════════════════
                    DIAL PAD
                ════════════════════════════════════ */}
                {(state === 'dialpad' || state === 'calling') && (
                  <>
                    {/* Key grid — circles */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3,1fr)',
                      justifyItems: 'center',
                      gap: 14,
                      marginBottom: 16,
                      opacity: state === 'calling' ? 0.25 : 1,
                      pointerEvents: state === 'calling' ? 'none' : 'all',
                    }}>
                      {KEYS.flat().map(k => (
                        <DialKey
                          key={k}
                          label={k}
                          sub={SUB[k]}
                          onClick={() => handleKey(k)}
                        />
                      ))}
                    </div>

                    {/* Call button — pill */}
                    <motion.button
                      onClick={handleCall}
                      disabled={loading || state === 'calling' || !number}
                      whileHover={(!number || loading || state === 'calling')
                        ? {} : { scale: 1.03, y: -2 }}
                      whileTap={(!number || loading || state === 'calling')
                        ? {} : { scale: 0.96 }}
                      style={{
                        width: '100%', height: 56, borderRadius: 28,
                        cursor: (!number || loading || state === 'calling')
                          ? 'not-allowed' : 'pointer',
                        background: (!number || loading || state === 'calling')
                          ? 'rgba(255,255,255,0.06)'
                          : 'linear-gradient(135deg,#7c3aed 0%,#a855f7 40%,#ec4899 100%)',
                        border: 'none', color: '#fff',
                        fontWeight: 800, fontSize: 15, letterSpacing: 0.5,
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 10,
                        opacity: (!number || loading || state === 'calling') ? 0.35 : 1,
                        boxShadow: (!number || loading || state === 'calling')
                          ? 'none'
                          : '0 10px 36px rgba(139,92,246,0.50),inset 0 1px 0 rgba(255,255,255,0.20)',
                        transition: 'all .18s',
                      }}
                    >
                      {state === 'calling'
                        ? <>
                          <motion.div style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: '#a78bfa',
                          }}
                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                          />
                          Connecting…
                        </>
                        : <>
                          <PhoneCall size={17} />
                          {contactName
                            ? `Call ${contactName}`
                            : number ? `Call ${number}` : 'Enter a number'}
                        </>
                      }
                    </motion.button>

                    {/* Recent calls */}
                    {recent.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{
                          fontSize: 9, fontWeight: 800,
                          color: 'rgba(167,139,250,0.40)',
                          letterSpacing: 1.5, textTransform: 'uppercase',
                          marginBottom: 8,
                          display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                          <Clock size={9} /> Recent Calls
                        </div>
                        {recent.slice(0, 3).map((c, i) => (
                          <div key={i}
                            onClick={() => {
                              setNumber(c.phone)
                              setName(c.name || '')
                              setQuery(c.phone)
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '8px 10px', borderRadius: 14,
                              cursor: 'pointer', transition: 'background .12s', marginBottom: 3,
                            }}
                            onMouseEnter={e =>
                              e.currentTarget.style.background = 'rgba(167,139,250,0.08)'}
                            onMouseLeave={e =>
                              e.currentTarget.style.background = 'transparent'}
                          >
                            {/* Outcome dot */}
                            <div style={{
                              width: 30, height: 30, borderRadius: '50%',
                              background: `${outcomeColor(c.outcome)}18`,
                              border: `1.5px solid ${outcomeColor(c.outcome)}50`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <Phone size={11} color={outcomeColor(c.outcome)} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: 12, fontWeight: 700,
                                color: 'rgba(255,255,255,0.80)',
                                whiteSpace: 'nowrap', overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}>{c.name || c.phone}</div>
                              <div style={{
                                fontSize: 9.5, color: 'rgba(255,255,255,0.28)',
                                fontFamily: 'monospace',
                              }}>{fmt(c.duration)} · {timeAgo(c.at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* ════════════════════════════════════
                    ACTIVE CALL
                ════════════════════════════════════ */}
                {state === 'active' && (
                  <div>
                    {/* Avatar */}
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        {/* Outer pulse ring */}
                        <motion.div style={{
                          position: 'absolute', inset: -8, borderRadius: '50%',
                          border: '2px solid rgba(52,211,153,0.30)',
                        }}
                          animate={{ scale: [1, 1.15], opacity: [0.6, 0] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                        />
                        <div style={{
                          width: 64, height: 64, borderRadius: '50%',
                          background: 'linear-gradient(135deg,rgba(52,211,153,0.20),rgba(5,150,105,0.12))',
                          border: '2.5px solid rgba(52,211,153,0.35)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 0 36px rgba(52,211,153,0.28)',
                        }}>
                          <UserIcon size={26} color="#34d399" />
                        </div>
                      </div>
                      <div style={{
                        fontSize: 16, fontWeight: 800, color: '#fff', marginTop: 10,
                      }}>
                        {contactName || 'Unknown'}
                      </div>
                      <div style={{
                        fontSize: 11, color: 'rgba(167,139,250,0.50)',
                        fontFamily: 'monospace', marginTop: 2,
                      }}>{number}</div>
                    </div>

                    <Waveform active={!muted} />

                    {/* Tab bar */}
                    <div style={{
                      display: 'flex',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 24, padding: 4, gap: 3, margin: '14px 0 12px',
                    }}>
                      {(['controls', 'dtmf', 'history'] as ActiveTab[]).map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                          flex: 1, padding: '7px 6px', borderRadius: 20, border: 'none',
                          fontSize: 9.5, fontWeight: 800,
                          textTransform: 'uppercase', letterSpacing: 0.6,
                          background: tab === t
                            ? 'linear-gradient(135deg,rgba(124,58,237,0.45),rgba(236,72,153,0.30))'
                            : 'transparent',
                          color: tab === t ? '#c4b5fd' : 'rgba(255,255,255,0.25)',
                          cursor: 'pointer', transition: 'all .15s',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: 4,
                          boxShadow: tab === t ? '0 2px 12px rgba(124,58,237,0.22)' : 'none',
                        }}>
                          {t === 'controls' && <><ChevronDown size={9} />Controls</>}
                          {t === 'dtmf' && <><Hash size={9} />Keypad</>}
                          {t === 'history' && <><Clock size={9} />History</>}
                        </button>
                      ))}
                    </div>

                    {/* Controls */}
                    {tab === 'controls' && (
                      <motion.button
                        onClick={() => setMuted(m => !m)}
                        whileTap={{ scale: 0.95 }}
                        style={{
                          width: '100%', height: 48, borderRadius: 24,
                          background: muted
                            ? 'linear-gradient(135deg,rgba(239,68,68,0.20),rgba(220,38,38,0.12))'
                            : 'rgba(255,255,255,0.06)',
                          border: muted
                            ? '1px solid rgba(239,68,68,0.35)'
                            : '1px solid rgba(255,255,255,0.10)',
                          color: muted ? '#fca5a5' : 'rgba(255,255,255,0.55)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          fontWeight: 700, fontSize: 13, cursor: 'pointer',
                          marginBottom: 10, transition: 'all .2s',
                        }}
                      >
                        {muted
                          ? <><MicOff size={14} />Unmute</>
                          : <><Mic size={14} />Mute</>
                        }
                      </motion.button>
                    )}

                    {/* DTMF */}
                    {tab === 'dtmf' && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{
                          fontFamily: 'monospace', fontSize: 18, fontWeight: 700,
                          color: '#c4b5fd', letterSpacing: 4, textAlign: 'center',
                          padding: '8px 12px',
                          background: 'rgba(124,58,237,0.08)',
                          border: '1px solid rgba(167,139,250,0.18)',
                          borderRadius: 16, minHeight: 36, marginBottom: 10,
                        }}>
                          {dtmfBuf || (
                            <span style={{
                              fontSize: 11, color: 'rgba(255,255,255,0.20)', letterSpacing: 0,
                            }}>Press keys…</span>
                          )}
                        </div>
                        <div style={{
                          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                          justifyItems: 'center', gap: 10,
                        }}>
                          {KEYS.flat().map(k => (
                            <DialKey key={k} label={k} onClick={() => handleDTMF(k)} size="small" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* History */}
                    {tab === 'history' && (
                      <div style={{ marginBottom: 12, maxHeight: 130, overflowY: 'auto' }}
                        className="ptdt-panel">
                        {recent.length === 0
                          ? <div style={{
                            textAlign: 'center', fontSize: 11.5,
                            color: 'rgba(255,255,255,0.20)', padding: '18px 0',
                          }}>No recent calls</div>
                          : recent.slice(0, 5).map((c, i) => (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '8px 6px', borderRadius: 12, cursor: 'pointer',
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                            }}
                              onMouseEnter={e =>
                                e.currentTarget.style.background = 'rgba(167,139,250,0.07)'}
                              onMouseLeave={e =>
                                e.currentTarget.style.background = 'transparent'}
                            >
                              <div style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: outcomeColor(c.outcome), flexShrink: 0,
                                boxShadow: `0 0 8px ${outcomeColor(c.outcome)}`,
                              }} />
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: 12, fontWeight: 700,
                                  color: 'rgba(255,255,255,0.75)',
                                }}>{c.name || c.phone}</div>
                                <div style={{
                                  fontSize: 9.5, color: 'rgba(255,255,255,0.28)',
                                  fontFamily: 'monospace',
                                }}>{fmt(c.duration)} · {timeAgo(c.at)}</div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Hang Up */}
                    <motion.button
                      onClick={handleHangup}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      style={{
                        width: '100%', height: 56, borderRadius: 28, cursor: 'pointer',
                        background: 'linear-gradient(135deg,#ef4444,#dc2626,#b91c1c)',
                        border: 'none', color: '#fff', fontWeight: 800, fontSize: 15,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                        boxShadow: '0 10px 36px rgba(239,68,68,0.45),inset 0 1px 0 rgba(255,255,255,0.18)',
                        transition: 'all .18s',
                      }}
                    >
                      <PhoneOff size={17} /> Hang Up
                    </motion.button>
                  </div>
                )}
              </div>

              {/* ── Bottom rainbow stripe ── */}
              <div style={{
                height: 4,
                background: 'linear-gradient(90deg,#7c3aed,#a855f7,#ec4899,#f472b6,#a855f7,#7c3aed)',
                backgroundSize: '200% 100%',
              }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════
            FAB — Round with float animation
        ══════════════════════════════════════════ */}
        <motion.button
          onClick={handleFABClick}
          title="PTDT Dialer (Alt+D)"
          animate={
            state === 'collapsed'
              ? { y: [0, -5, 0] }
              : {}
          }
          transition={
            state === 'collapsed'
              ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
              : {}
          }
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.88 }}
          style={{
            width: 64, height: 64, borderRadius: '50%',
            cursor: 'pointer', border: 'none', color: '#fff',
            background: state === 'active'
              ? 'linear-gradient(135deg,#059669,#34d399)'
              : 'linear-gradient(135deg,#7c3aed,#a855f7,#ec4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: state === 'active'
              ? '0 0 0 8px rgba(52,211,153,0.14),0 12px 36px rgba(52,211,153,0.55)'
              : '0 0 0 8px rgba(168,85,247,0.14),0 12px 36px rgba(124,58,237,0.55)',
            transition: 'background 0.3s, box-shadow 0.3s',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {/* Active pulse ring */}
          {state === 'active' && (
            <motion.div style={{
              position: 'absolute', inset: -6, borderRadius: '50%',
              border: '2.5px solid rgba(52,211,153,0.50)',
              pointerEvents: 'none',
            }}
              animate={{ scale: [1, 1.30], opacity: [0.7, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}

          <AnimatePresence mode="wait">
            {state === 'active' ? (
              <motion.span key="a"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 30 }}
              ><PhoneCall size={26} /></motion.span>
            ) : isOpen ? (
              <motion.span key="o"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
              ><X size={24} /></motion.span>
            ) : (
              <motion.span key="c"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              ><Phone size={26} /></motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  )
}