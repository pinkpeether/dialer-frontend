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
import { useSipStore } from '../store/sip.store'

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

const brand = {
  bg: '#05040b',
  panel: 'rgba(10,7,18,0.92)',
  panel2: 'rgba(18,13,31,0.82)',
  ink: '#f9f7ff',
  muted: 'rgba(249,247,255,0.56)',
  faint: 'rgba(249,247,255,0.28)',
  pink: '#fb0b8c',
  pinkSoft: 'rgba(251,11,140,0.16)',
  green: '#00f5a0',
  greenSoft: 'rgba(0,245,160,0.16)',
  purple: '#8b5cf6',
  purpleSoft: 'rgba(139,92,246,0.16)',
  cyan: '#22d3ee',
  red: '#ff3b5f',
  gold: '#f0b90b',
}

function glassCard(active = false) {
  return {
    background: active
      ? 'linear-gradient(145deg,rgba(0,245,160,0.12),rgba(251,11,140,0.07)),rgba(255,255,255,0.045)'
      : 'linear-gradient(145deg,rgba(255,255,255,0.065),rgba(255,255,255,0.025))',
    border: active
      ? '1px solid rgba(0,245,160,0.32)'
      : '1px solid rgba(255,255,255,0.105)',
    boxShadow: active
      ? 'inset 0 1px 0 rgba(255,255,255,0.10),0 18px 44px rgba(0,245,160,0.10)'
      : 'inset 0 1px 0 rgba(255,255,255,0.085),0 14px 38px rgba(0,0,0,0.26)',
  }
}

// ── Premium Signal Waveform ───────────────────────────────
function Waveform({ active }: { active: boolean }) {
  const bars = [0.35, 0.75, 0.45, 1.1, 0.55, 0.95, 0.42, 1.2, 0.72, 0.52, 1.0, 0.62, 0.32, 0.88, 0.7]
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 4, height: 44,
      borderRadius: 22, padding: '0 18px',
      background: 'linear-gradient(135deg,rgba(0,245,160,0.10),rgba(251,11,140,0.07),rgba(139,92,246,0.10))',
      border: '1px solid rgba(255,255,255,0.11)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08),0 18px 36px rgba(0,0,0,0.22)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <motion.div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg,transparent,rgba(0,245,160,0.10),transparent)',
          pointerEvents: 'none',
        }}
        animate={active ? { x: ['-100%', '100%'] } : { x: '-100%' }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
      />
      {bars.map((h, i) => (
        active
          ? <motion.div key={i}
            style={{
              width: 4, borderRadius: 999,
              background: i % 3 === 0
                ? `linear-gradient(180deg,${brand.green},${brand.cyan})`
                : i % 3 === 1
                  ? `linear-gradient(180deg,${brand.pink},${brand.purple})`
                  : `linear-gradient(180deg,#fff,${brand.green})`,
              boxShadow: i % 3 === 0
                ? '0 0 14px rgba(0,245,160,0.78)'
                : '0 0 14px rgba(251,11,140,0.58)',
              position: 'relative',
            }}
            animate={{ height: [h * 7, h * 28, h * 7] }}
            transition={{
              duration: 0.62 + i * 0.035,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.035,
            }}
          />
          : <div key={i} style={{
            width: 4, height: 6, borderRadius: 999,
            background: 'rgba(255,255,255,0.16)',
          }} />
      ))}
    </div>
  )
}

// ── Premium Dial Key ──────────────────────────────────────
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
  const dim = size === 'small' ? 48 : 64
  const isPrimary = label === '0'
  const isEdge = label === '*' || label === '#'

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        width: dim, height: dim,
        borderRadius: size === 'small' ? 18 : 22,
        cursor: 'pointer',
        background: hovered
          ? isPrimary
            ? 'linear-gradient(145deg,rgba(0,245,160,0.34),rgba(251,11,140,0.18))'
            : isEdge
              ? 'linear-gradient(145deg,rgba(251,11,140,0.25),rgba(139,92,246,0.19))'
              : 'linear-gradient(145deg,rgba(255,255,255,0.16),rgba(255,255,255,0.07))'
          : isPrimary
            ? 'linear-gradient(145deg,rgba(0,245,160,0.24),rgba(0,245,160,0.075))'
            : isEdge
              ? 'linear-gradient(145deg,rgba(251,11,140,0.16),rgba(139,92,246,0.10))'
              : 'linear-gradient(145deg,rgba(255,255,255,0.10),rgba(255,255,255,0.035))',
        border: hovered
          ? isPrimary
            ? '1px solid rgba(0,245,160,0.54)'
            : '1px solid rgba(251,11,140,0.42)'
          : '1px solid rgba(255,255,255,0.115)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2,
        transform: pressed ? 'translateY(2px) scale(0.94)' : hovered ? 'translateY(-2px) scale(1.035)' : 'translateY(0) scale(1)',
        transition: 'all 0.16s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: pressed
          ? 'inset 0 5px 16px rgba(0,0,0,0.44)'
          : hovered
            ? isPrimary
              ? '0 18px 36px rgba(0,245,160,0.18),0 0 0 4px rgba(0,245,160,0.06),inset 0 1px 0 rgba(255,255,255,0.18)'
              : '0 18px 36px rgba(251,11,140,0.16),0 0 0 4px rgba(251,11,140,0.055),inset 0 1px 0 rgba(255,255,255,0.16)'
            : '0 12px 22px rgba(0,0,0,0.22),inset 0 1px 0 rgba(255,255,255,0.10)',
        justifySelf: 'center',
        color: brand.ink,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 30% 18%,rgba(255,255,255,0.20),transparent 38%)',
        pointerEvents: 'none',
      }} />
      <span style={{
        fontSize: size === 'small' ? 17 : 23,
        fontWeight: 900,
        color: isPrimary ? brand.green : brand.ink,
        fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
        lineHeight: 1,
        textShadow: isPrimary
          ? '0 0 18px rgba(0,245,160,0.62)'
          : '0 1px 12px rgba(255,255,255,0.18)',
        position: 'relative',
      }}>{label}</span>
      {sub && (
        <span style={{
          fontSize: 6.5, fontWeight: 900,
          color: 'rgba(249,247,255,0.45)',
          letterSpacing: 1.25,
          position: 'relative',
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
      display: 'inline-flex', alignItems: 'center', gap: 7,
      background: bg,
      borderRadius: 999,
      padding: '5px 11px 5px 9px',
      border: `1px solid ${color}55`,
      boxShadow: `0 0 22px ${color}18,inset 0 1px 0 rgba(255,255,255,0.10)`,
    }}>
      <div style={{ position: 'relative', width: 8, height: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: color,
          boxShadow: `0 0 12px ${color}`,
        }} />
        {pulse && (
          <motion.div style={{
            position: 'absolute', inset: -4, borderRadius: '50%',
            border: `1.5px solid ${color}`,
          }}
            animate={{ scale: [1, 2.1], opacity: [0.85, 0] }}
            transition={{ duration: 1.15, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </div>
      <span style={{
        fontSize: 9.5,
        fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
        color,
        fontWeight: 900,
        letterSpacing: 1.05,
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

  const sipConfig = useSipStore(s => s.config)
  const sipStatus = useSipStore(s => s.status)
  const sipCall = useSipStore(s => s.call)
  const sipHangup = useSipStore(s => s.hangup)
  const sipSendDTMF = useSipStore(s => s.sendDTMF)
  const sipModeEnabled = Boolean(sipConfig.enabled)
  const sipReady = sipModeEnabled && sipStatus === 'registered'

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

  const appendDialerKey = useCallback((k: string) => {
    setNumber(current => {
      if (current.length >= 16) return current
      const next = current + k
      setQuery(next)
      return next
    })
    setError(null)
    triggerRipple()
  }, [triggerRipple])

  const handleKey = (k: string) => {
    appendDialerKey(k)
  }
  const handleDelete = () => {
    setNumber(current => {
      const next = current.slice(0, -1)
      setQuery(next)
      return next
    })
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
      if (sipModeEnabled) {
        if (!sipReady) {
          throw new Error('SIP mode is enabled but not registered. Open SIP Settings and register first.')
        }
        await sipCall(cleaned)
        setCallSid(`sip:${Date.now()}`)
      } else {
        const res = await dialerAPI.makeAdhocCall(cleaned, contactName || undefined)
        setCallSid(res?.callSid || null)
      }
      setState('active'); setTab('controls'); setElapsed(0)
      callStart.current = Date.now()
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
      triggerRipple()
    } catch (e: unknown) {
      const msg = e instanceof Error
        ? e.message
        : (e as { response?: { data?: { message?: string } } })
          ?.response?.data?.message || 'Call failed'
      setError(msg); setState('dialpad')
    } finally { setLoading(false) }
  }

  const handleHangup = useCallback(async () => {
    const dur = Math.round((Date.now() - callStart.current) / 1000)
    stopTimer()
    if (callSid) {
      try {
        if (callSid.startsWith('sip:')) await sipHangup()
        else await dialerAPI.hangupCall(callSid)
      } catch { }
    }
    const entry: RecentCall = {
      phone: number, name: contactName || undefined,
      at: Date.now(), duration: dur,
      outcome: dur > 3 ? 'answered' : 'missed',
    }
    const updated = [entry, ...recent]
    setRecent(updated); saveRecent(updated)
    setCallSid(null); setElapsed(0); setMuted(false); setState('dialpad')
  }, [callSid, number, contactName, recent, stopTimer, sipHangup])

  const handleDTMF = async (digit: string) => {
    setDtmfBuf(d => d + digit)
    if (callSid) {
      try {
        if (callSid.startsWith('sip:')) await sipSendDTMF(digit)
        else await dialerAPI.sendDTMF(callSid, digit)
      } catch { }
    }
  }

  const handleClose = useCallback(() => {
    if (state === 'active' || state === 'calling') handleHangup()
    setState('collapsed')
    setNumber(''); setName(''); setQuery('')
    setError(null); setDtmfBuf(''); setSugg(false)
  }, [state, handleHangup])

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null
      if (!el) return false
      const tag = el.tagName?.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
    }

    const h = (e: KeyboardEvent) => {
      const key = e.key
      const isDialKey = /^[0-9]$/.test(key) || key === '*' || key === '#'

      if (key === 'Escape' && state !== 'collapsed') {
        e.preventDefault()
        handleClose()
        return
      }

      if (isEditableTarget(e.target)) return

      if ((state === 'dialpad' || state === 'calling') && isDialKey) {
        e.preventDefault()
        appendDialerKey(key)
        return
      }

      if ((state === 'dialpad' || state === 'calling') && (key === 'Backspace' || key === 'Delete')) {
        e.preventDefault()
        handleDelete()
        return
      }

      if (state === 'dialpad' && key === 'Enter' && !loading) {
        e.preventDefault()
        void handleCall()
        return
      }

      if (state === 'active' && tab === 'dtmf' && isDialKey) {
        e.preventDefault()
        void handleDTMF(key)
      }
    }

    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [state, tab, loading, appendDialerKey, handleDelete, handleCall, handleDTMF, handleClose])

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
        @keyframes ptdt-glow-pan {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes ptdt-grid-drift {
          from { background-position: 0 0; }
          to { background-position: 44px 44px; }
        }
        .ptdt-panel::-webkit-scrollbar { width: 4px; }
        .ptdt-panel::-webkit-scrollbar-track { background: transparent; }
        .ptdt-panel::-webkit-scrollbar-thumb {
          background: rgba(251,11,140,0.35); border-radius: 4px;
        }
        .ptdt-dialer-input::placeholder { color: rgba(249,247,255,0.28); }
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
            PANEL — PTDT Voice Console
        ══════════════════════════════════════════ */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.78, y: 54, rotateX: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.78, y: 54, rotateX: -8 }}
              transition={{ type: 'spring', stiffness: 430, damping: 34 }}
              style={{
                width: 372,
                borderRadius: 34,
                background: `
                  radial-gradient(circle at 18% 0%,rgba(251,11,140,0.25),transparent 34%),
                  radial-gradient(circle at 88% 4%,rgba(0,245,160,0.18),transparent 34%),
                  radial-gradient(circle at 50% 102%,rgba(139,92,246,0.26),transparent 38%),
                  linear-gradient(152deg,rgba(8,5,18,0.98),rgba(14,9,27,0.965) 48%,rgba(6,5,14,0.985))
                `,
                backdropFilter: 'blur(26px) saturate(1.18)',
                WebkitBackdropFilter: 'blur(26px) saturate(1.18)',
                border: '1px solid rgba(255,255,255,0.13)',
                boxShadow: ripple
                  ? '0 0 0 4px rgba(251,11,140,0.18),0 0 95px rgba(251,11,140,0.42),0 34px 92px rgba(0,0,0,0.62)'
                  : state === 'active'
                    ? '0 0 0 1px rgba(0,245,160,0.34),0 0 80px rgba(0,245,160,0.24),0 34px 92px rgba(0,0,0,0.62)'
                    : '0 0 0 1px rgba(251,11,140,0.18),0 30px 84px rgba(0,0,0,0.62),0 0 72px rgba(139,92,246,0.20)',
                overflow: 'hidden',
                userSelect: 'none',
                transition: 'box-shadow 0.38s ease',
                position: 'relative',
                color: brand.ink,
              }}
            >
              {/* Luxury grid / aurora layer */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
                `,
                backgroundSize: '44px 44px',
                maskImage: 'linear-gradient(to bottom,rgba(0,0,0,0.72),transparent 74%)',
                WebkitMaskImage: 'linear-gradient(to bottom,rgba(0,0,0,0.72),transparent 74%)',
                animation: 'ptdt-grid-drift 16s linear infinite',
                pointerEvents: 'none',
              }} />
              <motion.div
                style={{
                  position: 'absolute', top: -120, left: -120,
                  width: 260, height: 260,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle,rgba(251,11,140,0.25),transparent 66%)',
                  filter: 'blur(8px)',
                  pointerEvents: 'none',
                }}
                animate={{ scale: [1, 1.18, 1], opacity: [0.52, 0.82, 0.52] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                style={{
                  position: 'absolute', right: -130, bottom: -120,
                  width: 280, height: 280,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle,rgba(0,245,160,0.19),transparent 68%)',
                  filter: 'blur(8px)',
                  pointerEvents: 'none',
                }}
                animate={{ scale: [1, 1.14, 1], opacity: [0.5, 0.78, 0.5] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
              />

              {/* ════════════════════════════════════
                  HEADER
              ════════════════════════════════════ */}
              <div
                onPointerDown={onHeaderPointerDown}
                onPointerMove={onHeaderPointerMove}
                onPointerUp={onHeaderPointerUp}
                onPointerCancel={onHeaderPointerUp}
                style={{
                  padding: '20px 20px 15px',
                  cursor: 'grab',
                  touchAction: 'none',
                  position: 'relative', zIndex: 2,
                }}
              >
                {/* Brand row */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 15,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
                      <motion.div style={{
                        position: 'absolute', inset: -4,
                        borderRadius: '50%',
                        background: state === 'active'
                          ? `conic-gradient(from 0deg,transparent,${brand.green},transparent,${brand.cyan},transparent)`
                          : `conic-gradient(from 0deg,transparent,${brand.pink},transparent,${brand.green},transparent,${brand.purple},transparent)`,
                        filter: 'drop-shadow(0 0 14px rgba(251,11,140,0.45))',
                      }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: state === 'active' ? 2.2 : 4.4, repeat: Infinity, ease: 'linear' }}
                      />
                      <div style={{
                        position: 'absolute', inset: 0,
                        borderRadius: '50%',
                        background: 'linear-gradient(145deg,#11101a,#07060d)',
                        border: '1px solid rgba(255,255,255,0.16)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: state === 'active'
                          ? '0 0 28px rgba(0,245,160,0.38),inset 0 1px 0 rgba(255,255,255,0.16)'
                          : '0 0 28px rgba(251,11,140,0.30),inset 0 1px 0 rgba(255,255,255,0.16)',
                      }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: state === 'active'
                            ? `linear-gradient(145deg,${brand.green},#068a63)`
                            : `linear-gradient(145deg,${brand.pink},${brand.purple})`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: state === 'active'
                            ? '0 0 20px rgba(0,245,160,0.60)'
                            : '0 0 20px rgba(251,11,140,0.48)',
                        }}>
                          <Phone size={16} color="#fff" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 950,
                        letterSpacing: 1.65,
                        lineHeight: 1,
                        background: `linear-gradient(135deg,#fff 0%,${brand.green} 30%,${brand.pink} 72%,#fff 100%)`,
                        backgroundSize: '220% 220%',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        animation: 'ptdt-glow-pan 5s ease infinite',
                      }}>PTDT-DIALER</div>
                      <div style={{
                        fontSize: 9,
                        color: 'rgba(249,247,255,0.48)',
                        fontWeight: 800,
                        letterSpacing: 0.62,
                        display: 'flex', alignItems: 'center', gap: 5,
                        marginTop: 5,
                        textTransform: 'uppercase',
                      }}>
                        <Signal size={8} color={state === 'active' ? brand.green : brand.green} />
                        Voice Console · Alt+D
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusBadge
                      label={state === 'active' ? 'LIVE' : state === 'calling' ? 'ROUTE' : 'ONLINE'}
                      color={state === 'active' ? brand.green : state === 'calling' ? brand.cyan : brand.green}
                      bg={state === 'active' ? brand.greenSoft : state === 'calling' ? 'rgba(34,211,238,0.13)' : brand.greenSoft}
                      pulse={state === 'active' || state === 'calling'}
                    />
                    <button
                      onPointerDown={e => e.stopPropagation()}
                      onClick={handleClose}
                      style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: 'linear-gradient(145deg,rgba(255,255,255,0.095),rgba(255,255,255,0.035))',
                        border: '1px solid rgba(255,255,255,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(249,247,255,0.46)', cursor: 'pointer',
                        transition: 'all .18s ease',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'linear-gradient(145deg,rgba(255,59,95,0.24),rgba(255,59,95,0.10))'
                        e.currentTarget.style.color = '#ff8ca0'
                        e.currentTarget.style.borderColor = 'rgba(255,59,95,0.38)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'linear-gradient(145deg,rgba(255,255,255,0.095),rgba(255,255,255,0.035))'
                        e.currentTarget.style.color = 'rgba(249,247,255,0.46)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                      }}
                    ><X size={14} /></button>
                  </div>
                </div>

                {/* ── LCD / Display ── */}
                <div style={{
                  background: 'linear-gradient(145deg,rgba(2,2,8,0.92),rgba(14,9,25,0.80))',
                  borderRadius: 26,
                  padding: '15px 17px',
                  minHeight: 90,
                  display: 'flex', flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: state === 'active'
                    ? '1px solid rgba(0,245,160,0.30)'
                    : '1px solid rgba(251,11,140,0.20)',
                  boxShadow: state === 'active'
                    ? 'inset 0 2px 24px rgba(0,0,0,0.76),0 0 36px rgba(0,245,160,0.10)'
                    : 'inset 0 2px 24px rgba(0,0,0,0.76),0 0 36px rgba(251,11,140,0.10)',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(0,245,160,0.055) 1px,transparent 1px)',
                    backgroundSize: '100% 7px',
                    opacity: 0.45,
                    pointerEvents: 'none',
                  }} />
                  <motion.div
                    style={{
                      position: 'absolute', top: 0, left: '-72%',
                      width: '48%', height: '100%',
                      background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)',
                      pointerEvents: 'none',
                      transform: 'skewX(-16deg)',
                    }}
                    animate={{ left: ['-72%', '124%'] }}
                    transition={{ duration: 3.6, repeat: Infinity, repeatDelay: 2.2, ease: 'easeInOut' }}
                  />

                  {state === 'active' ? (
                    <>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <StatusBadge
                          label="CONNECTED"
                          color={brand.green}
                          bg="rgba(0,245,160,0.12)"
                          pulse
                        />
                        {muted && (
                          <span style={{
                            fontSize: 9,
                            background: 'rgba(255,59,95,0.16)',
                            color: '#ff9caf',
                            padding: '5px 9px',
                            borderRadius: 999,
                            fontWeight: 900,
                            border: '1px solid rgba(255,59,95,0.28)',
                            letterSpacing: 0.8,
                          }}>MUTED</span>
                        )}
                      </div>
                      <div style={{
                        position: 'relative',
                        fontSize: 12,
                        color: 'rgba(0,245,160,0.62)',
                        marginTop: 9,
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>{contactName || number}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 3, position: 'relative' }}>
                        <span style={{
                          fontSize: 35,
                          fontWeight: 950,
                          fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
                          color: brand.green,
                          letterSpacing: 3,
                          textShadow: '0 0 28px rgba(0,245,160,0.70)',
                        }}>{fmt(elapsed)}</span>
                      </div>
                    </>
                  ) : state === 'calling' ? (
                    <>
                      <StatusBadge
                        label="ROUTING CALL"
                        color={brand.cyan}
                        bg="rgba(34,211,238,0.12)"
                        pulse
                      />
                      <div style={{
                        position: 'relative',
                        fontSize: 23,
                        fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
                        color: 'rgba(236,253,255,0.96)',
                        letterSpacing: 2,
                        marginTop: 10,
                        fontWeight: 900,
                        textShadow: '0 0 22px rgba(34,211,238,0.45)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>{number}</div>
                    </>
                  ) : (
                    <>
                      <div style={{
                        position: 'relative',
                        fontSize: 9.5,
                        color: 'rgba(249,247,255,0.46)',
                        fontWeight: 900,
                        letterSpacing: 1.25,
                        textTransform: 'uppercase',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <Zap size={9} color={brand.green} /> Ready to call
                      </div>
                      <div style={{
                        position: 'relative',
                        fontSize: number ? 25 : 14,
                        fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
                        fontWeight: 900,
                        color: number ? '#fff7fb' : 'rgba(249,247,255,0.22)',
                        letterSpacing: number ? 2.6 : 0.4,
                        textShadow: number ? '0 0 24px rgba(251,11,140,0.44)' : 'none',
                        minHeight: 40,
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'font-size 0.12s',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
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
                style={{ padding: '3px 20px 24px', position: 'relative', zIndex: 2 }}
              >
                {/* ── Search ── */}
                {(state === 'dialpad' || state === 'calling') && (
                  <div style={{ position: 'relative', marginBottom: 14 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      background: 'linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.026))',
                      border: '1px solid rgba(255,255,255,0.11)',
                      borderRadius: 24,
                      padding: '10px 13px', gap: 9,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08),0 12px 26px rgba(0,0,0,0.18)',
                    }}>
                      <Search size={13} color={brand.pink} />
                      <input
                        className="ptdt-dialer-input"
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
                          fontSize: 13, fontWeight: 750,
                          color: 'rgba(249,247,255,0.88)',
                          caretColor: brand.green,
                          minWidth: 0,
                        }}
                      />
                      {number && (
                        <button
                          onClick={handleDelete}
                          style={{
                            width: 27, height: 27, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'rgba(249,247,255,0.48)',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                          }}
                        ><Delete size={12} /></button>
                      )}
                    </div>

                    <AnimatePresence>
                      {suggestions && filtered.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.97 }}
                          style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 7,
                            background: 'linear-gradient(145deg,rgba(11,8,22,0.99),rgba(22,13,34,0.99))',
                            border: '1px solid rgba(251,11,140,0.22)',
                            borderRadius: 22, overflow: 'hidden', zIndex: 20,
                            boxShadow: '0 24px 60px rgba(0,0,0,0.74),0 0 36px rgba(251,11,140,0.12)',
                          }}
                        >
                          {filtered.map(c => (
                            <div key={c.id} onClick={() => selectContact(c)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 11,
                                padding: '11px 14px', cursor: 'pointer',
                                borderBottom: '1px solid rgba(255,255,255,0.055)',
                                transition: 'background .12s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,11,140,0.105)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <div style={{
                                width: 33, height: 33, borderRadius: '50%',
                                background: 'linear-gradient(145deg,rgba(251,11,140,0.22),rgba(0,245,160,0.11))',
                                border: '1px solid rgba(255,255,255,0.10)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                <UserIcon size={14} color={brand.green} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 850, color: brand.ink }}>{c.name || 'Unknown'}</div>
                                <div style={{
                                  fontSize: 10.5,
                                  color: 'rgba(249,247,255,0.42)',
                                  fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
                                }}>{c.phone}</div>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      style={{
                        marginBottom: 12,
                        padding: '10px 12px',
                        borderRadius: 18,
                        background: 'linear-gradient(145deg,rgba(255,59,95,0.18),rgba(255,59,95,0.08))',
                        border: '1px solid rgba(255,59,95,0.28)',
                        color: '#ff9caf',
                        fontSize: 12,
                        fontWeight: 800,
                        boxShadow: '0 12px 26px rgba(255,59,95,0.10)',
                      }}
                    >{error}</motion.div>
                  )}
                </AnimatePresence>

                {/* ════════════════════════════════════
                    DIALPAD
                ════════════════════════════════════ */}
                {(state === 'dialpad' || state === 'calling') && (
                  <>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3,1fr)',
                      justifyItems: 'center',
                      gap: 12,
                      marginBottom: 18,
                    }}>
                      {KEYS.flat().map(k => (
                        <DialKey key={k} label={k} sub={SUB[k]} onClick={() => handleKey(k)} />
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginBottom: recent.length > 0 ? 14 : 0 }}>
                      <motion.button
                        onClick={handleCall}
                        disabled={loading || state === 'calling'}
                        whileHover={{ scale: loading || state === 'calling' ? 1 : 1.025, y: loading || state === 'calling' ? 0 : -1 }}
                        whileTap={{ scale: loading || state === 'calling' ? 1 : 0.965 }}
                        style={{
                          flex: 1,
                          height: 57,
                          borderRadius: 24,
                          cursor: loading || state === 'calling' ? 'wait' : 'pointer',
                          background: loading || state === 'calling'
                            ? 'linear-gradient(135deg,rgba(34,211,238,0.26),rgba(139,92,246,0.20))'
                            : `linear-gradient(135deg,${brand.green},#09c990 40%,${brand.pink})`,
                          border: 'none',
                          color: '#03100b',
                          fontWeight: 950,
                          fontSize: 15,
                          letterSpacing: 0.2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 9,
                          boxShadow: loading || state === 'calling'
                            ? '0 16px 36px rgba(34,211,238,0.18),inset 0 1px 0 rgba(255,255,255,0.22)'
                            : '0 18px 42px rgba(0,245,160,0.24),0 0 35px rgba(251,11,140,0.17),inset 0 1px 0 rgba(255,255,255,0.34)',
                          opacity: loading || state === 'calling' ? 0.82 : 1,
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <motion.div
                          style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.30),transparent)',
                            transform: 'skewX(-18deg)',
                          }}
                          animate={{ x: ['-130%', '130%'] }}
                          transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
                        />
                        <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 9 }}>
                          {loading || state === 'calling' ? <Signal size={17} /> : <Phone size={17} />}
                          {loading || state === 'calling' ? 'Routing…' : 'Start Call'}
                        </span>
                      </motion.button>
                    </div>

                    {/* Recent mini list */}
                    {recent.length > 0 && (
                      <div style={{
                        ...glassCard(false),
                        borderRadius: 22,
                        padding: '10px 10px 7px',
                      }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0 2px 8px',
                        }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 10,
                            fontWeight: 950,
                            color: 'rgba(249,247,255,0.48)',
                            textTransform: 'uppercase',
                            letterSpacing: 1.2,
                          }}><Clock size={10} color={brand.pink} />Recent Signal</div>
                          <div style={{
                            fontSize: 9,
                            color: 'rgba(249,247,255,0.28)',
                            fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
                          }}>{recent.length} stored</div>
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
                              padding: '9px 9px', borderRadius: 16,
                              cursor: 'pointer', transition: 'background .12s', marginBottom: 3,
                            }}
                            onMouseEnter={e =>
                              e.currentTarget.style.background = 'rgba(251,11,140,0.08)'}
                            onMouseLeave={e =>
                              e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{
                              width: 31, height: 31, borderRadius: '50%',
                              background: `${outcomeColor(c.outcome)}18`,
                              border: `1.5px solid ${outcomeColor(c.outcome)}50`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                              boxShadow: `0 0 20px ${outcomeColor(c.outcome)}13`,
                            }}>
                              <Phone size={11} color={outcomeColor(c.outcome)} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: 12.2, fontWeight: 850,
                                color: 'rgba(249,247,255,0.84)',
                                whiteSpace: 'nowrap', overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}>{c.name || c.phone}</div>
                              <div style={{
                                fontSize: 9.5, color: 'rgba(249,247,255,0.34)',
                                fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
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
                        <motion.div style={{
                          position: 'absolute', inset: -14, borderRadius: '50%',
                          background: 'radial-gradient(circle,rgba(0,245,160,0.16),transparent 64%)',
                        }}
                          animate={{ scale: [1, 1.32], opacity: [0.78, 0] }}
                          transition={{ duration: 1.45, repeat: Infinity, ease: 'easeOut' }}
                        />
                        <motion.div style={{
                          position: 'absolute', inset: -7, borderRadius: '50%',
                          border: '2px solid rgba(0,245,160,0.34)',
                        }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                        />
                        <div style={{
                          width: 70, height: 70, borderRadius: '50%',
                          background: 'linear-gradient(145deg,rgba(0,245,160,0.22),rgba(251,11,140,0.08))',
                          border: '2px solid rgba(0,245,160,0.38)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 0 42px rgba(0,245,160,0.26),inset 0 1px 0 rgba(255,255,255,0.12)',
                        }}>
                          <UserIcon size={28} color={brand.green} />
                        </div>
                      </div>
                      <div style={{
                        fontSize: 17, fontWeight: 950, color: brand.ink, marginTop: 12,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {contactName || 'Unknown'}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: 'rgba(249,247,255,0.44)',
                        fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
                        marginTop: 3,
                      }}>{number}</div>
                    </div>

                    <Waveform active={!muted} />

                    {/* Tab bar */}
                    <div style={{
                      display: 'flex',
                      background: 'rgba(255,255,255,0.052)',
                      border: '1px solid rgba(255,255,255,0.09)',
                      borderRadius: 24, padding: 5, gap: 4, margin: '14px 0 12px',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
                    }}>
                      {(['controls', 'dtmf', 'history'] as ActiveTab[]).map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                          flex: 1, padding: '8px 6px', borderRadius: 20, border: 'none',
                          fontSize: 9.5, fontWeight: 950,
                          textTransform: 'uppercase', letterSpacing: 0.58,
                          background: tab === t
                            ? `linear-gradient(135deg,${brand.greenSoft},${brand.pinkSoft})`
                            : 'transparent',
                          color: tab === t ? brand.ink : 'rgba(249,247,255,0.30)',
                          cursor: 'pointer', transition: 'all .15s',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: 5,
                          boxShadow: tab === t
                            ? '0 10px 22px rgba(0,245,160,0.09),inset 0 1px 0 rgba(255,255,255,0.10)'
                            : 'none',
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
                        whileHover={{ y: -1, scale: 1.01 }}
                        whileTap={{ scale: 0.965 }}
                        style={{
                          width: '100%', height: 50, borderRadius: 23,
                          background: muted
                            ? 'linear-gradient(145deg,rgba(255,59,95,0.22),rgba(255,59,95,0.10))'
                            : 'linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.030))',
                          border: muted
                            ? '1px solid rgba(255,59,95,0.36)'
                            : '1px solid rgba(255,255,255,0.105)',
                          color: muted ? '#ff9caf' : 'rgba(249,247,255,0.62)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                          fontWeight: 850, fontSize: 13, cursor: 'pointer',
                          marginBottom: 10, transition: 'all .2s',
                          boxShadow: muted
                            ? '0 14px 30px rgba(255,59,95,0.12),inset 0 1px 0 rgba(255,255,255,0.10)'
                            : 'inset 0 1px 0 rgba(255,255,255,0.08)',
                        }}
                      >
                        {muted
                          ? <><MicOff size={15} />Unmute Microphone</>
                          : <><Mic size={15} />Mute Microphone</>
                        }
                      </motion.button>
                    )}

                    {/* DTMF */}
                    {tab === 'dtmf' && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{
                          fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
                          fontSize: 18,
                          fontWeight: 950,
                          color: brand.green,
                          letterSpacing: 4,
                          textAlign: 'center',
                          padding: '9px 12px',
                          background: 'linear-gradient(145deg,rgba(0,245,160,0.11),rgba(251,11,140,0.06))',
                          border: '1px solid rgba(0,245,160,0.22)',
                          borderRadius: 18,
                          minHeight: 39,
                          marginBottom: 11,
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                        }}>
                          {dtmfBuf || (
                            <span style={{
                              fontSize: 11,
                              color: 'rgba(249,247,255,0.25)',
                              letterSpacing: 0,
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
                      <div style={{ marginBottom: 12, maxHeight: 132, overflowY: 'auto' }}
                        className="ptdt-panel">
                        {recent.length === 0
                          ? <div style={{
                            textAlign: 'center', fontSize: 12,
                            color: 'rgba(249,247,255,0.25)', padding: '18px 0',
                            borderRadius: 18,
                            border: '1px dashed rgba(255,255,255,0.10)',
                          }}>No recent calls</div>
                          : recent.slice(0, 5).map((c, i) => (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '9px 7px', borderRadius: 14, cursor: 'pointer',
                              borderBottom: '1px solid rgba(255,255,255,0.052)',
                            }}
                              onMouseEnter={e =>
                                e.currentTarget.style.background = 'rgba(251,11,140,0.07)'}
                              onMouseLeave={e =>
                                e.currentTarget.style.background = 'transparent'}
                            >
                              <div style={{
                                width: 9, height: 9, borderRadius: '50%',
                                background: outcomeColor(c.outcome), flexShrink: 0,
                                boxShadow: `0 0 10px ${outcomeColor(c.outcome)}`,
                              }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: 12.2, fontWeight: 850,
                                  color: 'rgba(249,247,255,0.80)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}>{c.name || c.phone}</div>
                                <div style={{
                                  fontSize: 9.5, color: 'rgba(249,247,255,0.34)',
                                  fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
                                }}>{fmt(c.duration)} · {timeAgo(c.at)}</div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Hang Up */}
                    <motion.button
                      onClick={handleHangup}
                      whileHover={{ scale: 1.025, y: -2 }}
                      whileTap={{ scale: 0.955 }}
                      style={{
                        width: '100%', height: 58, borderRadius: 25, cursor: 'pointer',
                        background: 'linear-gradient(135deg,#ff3b5f,#e11d48,#9f1239)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        color: '#fff', fontWeight: 950, fontSize: 15,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        boxShadow: '0 18px 42px rgba(255,59,95,0.30),inset 0 1px 0 rgba(255,255,255,0.18)',
                        transition: 'all .18s',
                        letterSpacing: 0.15,
                      }}
                    >
                      <PhoneOff size={18} /> End Call
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Bottom premium beam */}
              <div style={{
                height: 5,
                background: `linear-gradient(90deg,${brand.pink},${brand.green},${brand.cyan},${brand.pink})`,
                backgroundSize: '220% 100%',
                animation: 'ptdt-glow-pan 4s ease infinite',
                boxShadow: '0 -10px 34px rgba(251,11,140,0.20)',
              }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════
            FAB — PTDT Orb
        ══════════════════════════════════════════ */}
        <motion.button
          onClick={handleFABClick}
          title="PTDT-Dialer (Alt+D)"
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
          whileHover={{ scale: 1.10 }}
          whileTap={{ scale: 0.90 }}
          style={{
            width: 68, height: 68, borderRadius: '50%',
            cursor: 'pointer', border: '1px solid rgba(255,255,255,0.16)', color: '#fff',
            background: state === 'active'
              ? `radial-gradient(circle at 30% 20%,#fff,${brand.green} 20%,#0ea574 58%,#063426)`
              : `radial-gradient(circle at 30% 20%,#fff,${brand.pink} 18%,${brand.purple} 55%,#211033)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: state === 'active'
              ? '0 0 0 8px rgba(0,245,160,0.12),0 18px 46px rgba(0,245,160,0.40),0 0 54px rgba(0,245,160,0.28)'
              : '0 0 0 8px rgba(251,11,140,0.12),0 18px 46px rgba(251,11,140,0.38),0 0 54px rgba(139,92,246,0.26)',
            transition: 'background 0.3s, box-shadow 0.3s',
            flexShrink: 0,
            position: 'relative',
            overflow: 'visible',
          }}
        >
          <motion.div
            style={{
              position: 'absolute', inset: -8, borderRadius: '50%',
              background: state === 'active'
                ? `conic-gradient(from 0deg,transparent,${brand.green},transparent,${brand.cyan},transparent)`
                : `conic-gradient(from 0deg,transparent,${brand.pink},transparent,${brand.green},transparent)`,
              opacity: 0.9,
              zIndex: -1,
              filter: 'blur(0.2px)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: state === 'active' ? 2.5 : 5, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            style={{
              position: 'absolute', inset: -16, borderRadius: '50%',
              border: state === 'active'
                ? '1.5px solid rgba(0,245,160,0.38)'
                : '1.5px solid rgba(251,11,140,0.34)',
              pointerEvents: 'none',
            }}
            animate={{ scale: [1, 1.22], opacity: [0.62, 0] }}
            transition={{ duration: state === 'active' ? 1.25 : 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
          <AnimatePresence mode="wait">
            {state === 'active' ? (
              <motion.span key="a"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 30 }}
                style={{ display: 'flex', position: 'relative' }}
              ><PhoneCall size={27} /></motion.span>
            ) : isOpen ? (
              <motion.span key="o"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                style={{ display: 'flex', position: 'relative' }}
              ><X size={25} /></motion.span>
            ) : (
              <motion.span key="c"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                style={{ display: 'flex', position: 'relative' }}
              ><Phone size={27} /></motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  )
}
