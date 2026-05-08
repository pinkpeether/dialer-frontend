import {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone, PhoneOff, X, Delete, PhoneCall,
  MicOff, Mic, Hash, Clock, Search,
  User as UserIcon, ChevronDown,
} from 'lucide-react'
import { dialerAPI } from '../api/dialer.api'
import { contactsAPI } from '../api/contacts.api'

type WidgetState = 'collapsed' | 'dialpad' | 'calling' | 'active'
type ActiveTab   = 'controls' | 'dtmf' | 'history'

interface RecentCall {
  phone:    string
  name?:    string
  at:       number
  duration: number
  outcome:  'answered' | 'missed' | 'failed'
}

interface Contact {
  id:    number
  name?: string
  phone: string
}

const KEYS = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['*','0','#'],
]
const SUB: Record<string,string> = {
  '1':'','2':'ABC','3':'DEF',
  '4':'GHI','5':'JKL','6':'MNO',
  '7':'PQRS','8':'TUV','9':'WXYZ',
  '*':'','0':'+','#':'',
}

const STORAGE_KEY = 'ptdt_recent_calls_v3'
function loadRecent(): RecentCall[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveRecent(c: RecentCall[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c.slice(0,20)))
}

// Animated waveform
function Waveform({ active }: { active: boolean }) {
  if (!active) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:3, height:32 }}>
      {Array.from({length:12}).map((_,i) => (
        <div key={i} style={{ width:3, height:4, borderRadius:2, background:'rgba(239,68,68,0.5)' }} />
      ))}
    </div>
  )
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:3, height:32 }}>
      {[0.5,0.9,0.6,1.2,0.7,1.0,0.5,1.3,0.8,0.6,1.1,0.7].map((h,i) => (
        <motion.div key={i}
          style={{ width:3, borderRadius:2, background:'linear-gradient(180deg,#fb0b8c,#8057d7)' }}
          animate={{ height:[h*6, h*22, h*6] }}
          transition={{ duration:0.7+i*0.06, repeat:Infinity, ease:'easeInOut', delay:i*0.055 }}
        />
      ))}
    </div>
  )
}

function fmt(s: number) {
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
}

export default function FloatingDialer() {
  const [state, setState]         = useState<WidgetState>('collapsed')
  const [tab, setTab]             = useState<ActiveTab>('controls')
  const [number, setNumber]       = useState('')
  const [contactName, setName]    = useState('')
  const [callSid, setCallSid]     = useState<string|null>(null)
  const [elapsed, setElapsed]     = useState(0)
  const [error, setError]         = useState<string|null>(null)
  const [loading, setLoading]     = useState(false)
  const [muted, setMuted]         = useState(false)
  const [dtmfBuf, setDtmfBuf]     = useState('')
  const [recent, setRecent]       = useState<RecentCall[]>(loadRecent)
  const [contacts, setContacts]   = useState<Contact[]>([])
  const [query, setQuery]         = useState('')
  const [suggestions, setSugg]    = useState(false)
  const [glowing, setGlowing]     = useState(false)
  const [pos, setPos]             = useState({ x: 0, y: 0 })
  const [dragging, setDragging]   = useState(false)

  const timerRef   = useRef<ReturnType<typeof setInterval>|null>(null)
  const callStart  = useRef<number>(0)
  const dragStart  = useRef<{mx:number; my:number; ox:number; oy:number}|null>(null)
  const widgetRef  = useRef<HTMLDivElement>(null)

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => () => stopTimer(), [stopTimer])

  useEffect(() => {
    if (state !== 'collapsed') {
      contactsAPI.getAll({ limit: 200 })
        .then((d: Contact[]) => setContacts(d || []))
        .catch(() => {})
    }
  }, [state])

  // Alt+D shortcut
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        setState(s => s === 'collapsed' ? 'dialpad' : (s === 'active' || s === 'calling' ? s : 'collapsed'))
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return contacts.filter(c => c.phone.includes(q) || c.name?.toLowerCase().includes(q)).slice(0,5)
  }, [query, contacts])

  // Drag logic (no framer-motion drag — avoids blank screen bug)
  const onDragStart = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y }
    setDragging(true)
  }, [pos])

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.mx
    const dy = e.clientY - dragStart.current.my
    setPos({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy })
  }, [])

  const onDragEnd = useCallback(() => {
    dragStart.current = null
    setDragging(false)
  }, [])

  const handleKey = (k: string) => {
    if (number.length >= 16) return
    setNumber(n => n + k)
    setQuery(n => n + k)
    setError(null)
    // glow pulse on key press
    setGlowing(true)
    setTimeout(() => setGlowing(false), 400)
  }

  const handleDelete = () => {
    setNumber(n => n.slice(0,-1))
    setQuery(n => n.slice(0,-1))
  }

  const selectContact = (c: Contact) => {
    setNumber(c.phone)
    setName(c.name || '')
    setQuery(c.phone)
    setSugg(false)
  }

  const handleCall = async () => {
    const cleaned = number.replace(/\s/g,'')
    if (cleaned.length < 5) { setError('Enter a valid number'); return }
    setError(null)
    setLoading(true)
    setState('calling')
    try {
      const res = await dialerAPI.makeAdhocCall(cleaned, contactName || undefined)
      setCallSid(res?.callSid || null)
      setState('active')
      setTab('controls')
      setElapsed(0)
      callStart.current = Date.now()
      timerRef.current  = setInterval(() => setElapsed(e => e+1), 1000)
      setGlowing(true)
      setTimeout(() => setGlowing(false), 1200)
    } catch (e: unknown) {
      const msg = (e as {response?:{data?:{message?:string}}})?.response?.data?.message || 'Call failed'
      setError(msg)
      setState('dialpad')
    } finally {
      setLoading(false)
    }
  }

  const handleHangup = useCallback(async () => {
    const dur = Math.round((Date.now() - callStart.current) / 1000)
    stopTimer()
    if (callSid) { try { await dialerAPI.hangupCall(callSid) } catch { /**/ } }
    const entry: RecentCall = {
      phone: number, name: contactName || undefined,
      at: Date.now(), duration: dur,
      outcome: dur > 3 ? 'answered' : 'missed',
    }
    const updated = [entry, ...recent]
    setRecent(updated)
    saveRecent(updated)
    setCallSid(null)
    setElapsed(0)
    setMuted(false)
    setState('dialpad')
  }, [callSid, number, contactName, recent, stopTimer])

  const handleDTMF = async (digit: string) => {
    setDtmfBuf(d => d + digit)
    if (callSid) { try { await dialerAPI.sendDTMF(callSid, digit) } catch { /**/ } }
  }

  const handleClose = useCallback(() => {
    if (state === 'active' || state === 'calling') handleHangup()
    setState('collapsed')
    setNumber(''); setName(''); setQuery(''); setError(''); setDtmfBuf('')
    setSugg(false)
  }, [state, handleHangup])

  const timeAgo = (ms: number) => {
    const m = Math.floor((Date.now()-ms)/60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m/60)
    return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`
  }

  const outcomeColor = (o: string) =>
    o==='answered' ? '#2ae97b' : o==='missed' ? '#f0b90b' : '#ef4444'

  const isOpen = state !== 'collapsed'

  return (
    <div
      ref={widgetRef}
      style={{
        position: 'fixed',
        bottom: 28 - pos.y,
        right:  28 - pos.x,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 12,
        pointerEvents: 'none',
      }}
    >
      {/* ─── MAIN PANEL ─── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ opacity:0, scale:0.85, y:32 }}
            animate={{ opacity:1, scale:1,    y:0  }}
            exit={{   opacity:0, scale:0.85, y:32  }}
            transition={{ type:'spring', stiffness:360, damping:30 }}
            style={{
              pointerEvents: 'all',
              width: 340,
              borderRadius: 28,
              background: 'linear-gradient(160deg, rgba(27,23,35,0.97) 0%, rgba(14,12,22,0.98) 100%)',
              border: '1px solid rgba(251,11,140,0.30)',
              boxShadow: glowing
                ? '0 0 0 3px rgba(251,11,140,0.35), 0 0 60px rgba(251,11,140,0.40), 0 0 120px rgba(128,87,215,0.25), 0 32px 80px rgba(0,0,0,0.60)'
                : state === 'active'
                ? '0 0 0 2px rgba(42,233,123,0.30), 0 0 50px rgba(42,233,123,0.20), 0 24px 60px rgba(0,0,0,0.55)'
                : '0 0 0 1px rgba(251,11,140,0.15), 0 24px 60px rgba(0,0,0,0.55), 0 0 40px rgba(128,87,215,0.12)',
              overflow: 'visible',
              userSelect: 'none',
              transition: 'box-shadow 0.4s ease',
            }}
          >
            {/* Outer glow ring — decorative */}
            <div style={{
              position:'absolute', inset:-1, borderRadius:28, pointerEvents:'none',
              background:'linear-gradient(135deg,rgba(251,11,140,0.12),rgba(128,87,215,0.10),rgba(42,233,123,0.06))',
              zIndex:0,
            }}/>

            {/* ── TOP SCREEN / HEADER ── */}
            <div
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
              style={{
                position:'relative',
                zIndex:1,
                padding:'16px 18px 14px',
                background:'linear-gradient(180deg,rgba(251,11,140,0.08) 0%,rgba(128,87,215,0.06) 100%)',
                borderBottom:'1px solid rgba(255,255,255,0.06)',
                cursor: dragging ? 'grabbing' : 'grab',
                borderRadius:'28px 28px 0 0',
              }}
            >
              {/* Brand strip */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{
                    width:36, height:36, borderRadius:'50%',
                    background: state==='active'
                      ? 'linear-gradient(135deg,#00a747,#2ae97b)'
                      : 'linear-gradient(135deg,#fb0b8c,#8057d7)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow: state==='active'
                      ? '0 0 18px rgba(42,233,123,0.50)'
                      : '0 0 18px rgba(251,11,140,0.50)',
                    transition:'all 0.3s',
                    flexShrink:0,
                  }}>
                    <Phone size={15} color="#fff"/>
                  </div>
                  <div>
                    <div style={{
                      fontSize:11, fontWeight:900, letterSpacing:1.5,
                      textTransform:'uppercase',
                      background:'linear-gradient(135deg,#fb0b8c,#8057d7)',
                      WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                      backgroundClip:'text',
                    }}>PTDT Dialer</div>
                    <div style={{ fontSize:9.5, fontFamily:'var(--font-mono)', fontWeight:600, color:'rgba(255,255,255,0.40)', letterSpacing:0.5 }}>
                      v3.0 · Alt+D
                    </div>
                  </div>
                </div>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={handleClose}
                  style={{
                    width:28, height:28, borderRadius:'50%',
                    background:'rgba(255,255,255,0.06)',
                    border:'1px solid rgba(255,255,255,0.10)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'rgba(255,255,255,0.45)', cursor:'pointer',
                    transition:'all .2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.20)'; e.currentTarget.style.color='#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='rgba(255,255,255,0.45)' }}
                >
                  <X size={12}/>
                </button>
              </div>

              {/* LCD display */}
              <div style={{
                background:'linear-gradient(180deg,#0d1a10 0%,#0a1209 100%)',
                border:'1px solid rgba(42,233,123,0.20)',
                borderRadius:14,
                padding:'12px 16px',
                minHeight:68,
                display:'flex', flexDirection:'column', justifyContent:'space-between',
                boxShadow:'inset 0 2px 12px rgba(0,0,0,0.60), 0 0 20px rgba(42,233,123,0.06)',
                position:'relative', overflow:'hidden',
              }}>
                {/* LCD scanlines */}
                <div style={{
                  position:'absolute', inset:0, pointerEvents:'none',
                  backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px)',
                  borderRadius:14,
                }}/>

                {state === 'active' ? (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span className="pulse-dot" style={{ width:6, height:6 }}/>
                      <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'#2ae97b', fontWeight:700, letterSpacing:1 }}>CONNECTED</span>
                      {muted && <span style={{ fontSize:9, color:'#ef4444', fontFamily:'var(--font-mono)', marginLeft:'auto' }}>● MUTED</span>}
                    </div>
                    <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'rgba(42,233,123,0.70)', letterSpacing:0.5, marginTop:2 }}>
                      {contactName || number}
                    </div>
                    <div style={{
                      fontSize:28, fontWeight:700, fontFamily:'var(--font-mono)',
                      color:'#2ae97b', letterSpacing:2,
                      textShadow:'0 0 20px rgba(42,233,123,0.60)',
                      lineHeight:1,
                    }}>
                      {fmt(elapsed)}
                    </div>
                  </>
                ) : state === 'calling' ? (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span className="pulse-dot pink" style={{ width:6, height:6 }}/>
                      <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'#fb0b8c', fontWeight:700, letterSpacing:1 }}>DIALING…</span>
                    </div>
                    <div style={{ fontSize:18, fontFamily:'var(--font-mono)', color:'rgba(251,11,140,0.90)', letterSpacing:2, marginTop:6 }}>
                      {number}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:9, fontFamily:'var(--font-mono)', color:'rgba(42,233,123,0.50)', letterSpacing:1, marginBottom:4 }}>
                      READY
                    </div>
                    <div style={{
                      fontSize: number ? 24 : 13,
                      fontFamily:'var(--font-mono)',
                      color: number ? '#fff' : 'rgba(255,255,255,0.20)',
                      letterSpacing: number ? 2 : 0.5,
                      fontWeight:700,
                      textShadow: number ? '0 0 16px rgba(255,255,255,0.20)' : 'none',
                      minHeight:32,
                      display:'flex', alignItems:'center',
                      transition:'font-size 0.15s',
                    }}>
                      {number || 'Enter number…'}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── BODY ── */}
            <div style={{ position:'relative', zIndex:1, padding:'14px 16px 18px' }}>

              {/* SEARCH (dialpad mode) */}
              {(state === 'dialpad' || state === 'calling') && (
                <div style={{ position:'relative', marginBottom:12 }}>
                  <div style={{
                    display:'flex', alignItems:'center',
                    background:'rgba(255,255,255,0.05)',
                    border:'1px solid rgba(255,255,255,0.10)',
                    borderRadius:10, padding:'8px 12px', gap:8,
                  }}>
                    <Search size={12} color="rgba(255,255,255,0.30)"/>
                    <input
                      value={query}
                      onChange={e => { setQuery(e.target.value); setNumber(e.target.value); setSugg(true); setError(null) }}
                      onFocus={() => setSugg(true)}
                      onBlur={() => setTimeout(() => setSugg(false), 150)}
                      placeholder="Search name or number…"
                      style={{
                        flex:1, background:'none', border:'none', outline:'none',
                        fontFamily:'var(--font-mono)', fontSize:12, fontWeight:600,
                        color:'rgba(255,255,255,0.85)',
                        '::placeholder': { color:'rgba(255,255,255,0.25)' },
                      } as React.CSSProperties}
                    />
                    {number && (
                      <button onClick={handleDelete} style={{ color:'rgba(255,255,255,0.35)', display:'flex', cursor:'pointer' }}>
                        <Delete size={13}/>
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {suggestions && filtered.length > 0 && (
                      <motion.div
                        initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                        style={{
                          position:'absolute', top:'100%', left:0, right:0, marginTop:4,
                          background:'rgba(14,12,22,0.98)',
                          border:'1px solid rgba(251,11,140,0.25)',
                          borderRadius:12, overflow:'hidden', zIndex:20,
                          boxShadow:'0 16px 40px rgba(0,0,0,0.60)',
                        }}
                      >
                        {filtered.map(c => (
                          <div key={c.id} onClick={() => selectContact(c)}
                            style={{
                              display:'flex', alignItems:'center', gap:10,
                              padding:'9px 12px', cursor:'pointer',
                              borderBottom:'1px solid rgba(255,255,255,0.05)',
                              transition:'background .12s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background='rgba(251,11,140,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background='transparent'}
                          >
                            <div style={{
                              width:26, height:26, borderRadius:'50%',
                              background:'rgba(251,11,140,0.12)',
                              border:'1px solid rgba(251,11,140,0.25)',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              flexShrink:0,
                            }}><UserIcon size={11} color="#fb0b8c"/></div>
                            <div>
                              <div style={{ fontSize:11.5, fontWeight:700, color:'#fff' }}>{c.name||'Unknown'}</div>
                              <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.40)', fontFamily:'var(--font-mono)' }}>{c.phone}</div>
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
                    initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                    style={{
                      fontSize:11, color:'#fca5a5',
                      background:'rgba(239,68,68,0.12)',
                      border:'1px solid rgba(239,68,68,0.28)',
                      borderRadius:8, padding:'7px 12px',
                      marginBottom:10, fontWeight:600,
                    }}
                  >{error}</motion.div>
                )}
              </AnimatePresence>

              {/* ── DIALPAD ── */}
              {(state === 'dialpad' || state === 'calling') && (
                <>
                  <div style={{
                    display:'grid', gridTemplateColumns:'repeat(3, 1fr)',
                    gap:9, marginBottom:12,
                    opacity: state==='calling' ? 0.35 : 1,
                    pointerEvents: state==='calling' ? 'none' : 'all',
                  }}>
                    {KEYS.flat().map(k => (
                      <button
                        key={k}
                        onClick={() => handleKey(k)}
                        style={{
                          height:50, borderRadius:12, cursor:'pointer',
                          background:'linear-gradient(180deg,rgba(255,255,255,0.09) 0%,rgba(255,255,255,0.04) 100%)',
                          border:'1px solid rgba(255,255,255,0.10)',
                          display:'flex', flexDirection:'column',
                          alignItems:'center', justifyContent:'center', gap:1,
                          transition:'all .12s',
                          boxShadow:'0 2px 8px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background='linear-gradient(180deg,rgba(251,11,140,0.18) 0%,rgba(128,87,215,0.12) 100%)'
                          e.currentTarget.style.borderColor='rgba(251,11,140,0.35)'
                          e.currentTarget.style.boxShadow='0 4px 14px rgba(251,11,140,0.20), inset 0 1px 0 rgba(255,255,255,0.10)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background='linear-gradient(180deg,rgba(255,255,255,0.09) 0%,rgba(255,255,255,0.04) 100%)'
                          e.currentTarget.style.borderColor='rgba(255,255,255,0.10)'
                          e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)'
                        }}
                        onMouseDown={e => { e.currentTarget.style.transform='scale(0.93)'; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.40)' }}
                        onMouseUp={e => { e.currentTarget.style.transform='scale(1)' }}
                      >
                        <span style={{ fontSize:18, fontWeight:800, color:'#fff', fontFamily:'var(--font-mono)', lineHeight:1 }}>{k}</span>
                        {SUB[k] && <span style={{ fontSize:7.5, fontWeight:700, color:'rgba(255,255,255,0.30)', letterSpacing:1 }}>{SUB[k]}</span>}
                      </button>
                    ))}
                  </div>

                  {/* Call button */}
                  <button
                    onClick={handleCall}
                    disabled={loading || state==='calling' || !number}
                    style={{
                      width:'100%', height:52, borderRadius:16, cursor: (!number||loading||state==='calling') ? 'not-allowed' : 'pointer',
                      background: (!number||loading||state==='calling')
                        ? 'rgba(255,255,255,0.06)'
                        : 'linear-gradient(135deg,#fb0b8c 0%,#c2148a 50%,#8057d7 100%)',
                      border:'none', color:'#fff',
                      fontWeight:800, fontSize:14, letterSpacing:0.5,
                      display:'flex', alignItems:'center', justifyContent:'center', gap:9,
                      opacity: (!number||loading||state==='calling') ? 0.40 : 1,
                      boxShadow: (!number||loading||state==='calling') ? 'none' : '0 8px 28px rgba(251,11,140,0.40), inset 0 1px 0 rgba(255,255,255,0.15)',
                      transition:'all .2s',
                    }}
                    onMouseEnter={e => { if (number && !loading && state!=='calling') e.currentTarget.style.transform='translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)' }}
                  >
                    {state==='calling'
                      ? <><span className="pulse-dot pink" style={{width:8,height:8}}/> Connecting…</>
                      : <><PhoneCall size={16}/> Call {contactName ? contactName : number ? number : ''}</>
                    }
                  </button>

                  {/* Recent calls in dialpad */}
                  {recent.length > 0 && (
                    <div style={{ marginTop:14 }}>
                      <div style={{
                        fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.25)',
                        letterSpacing:1.2, textTransform:'uppercase',
                        fontFamily:'var(--font-mono)', marginBottom:8,
                        display:'flex', alignItems:'center', gap:5,
                      }}><Clock size={9}/> Recent</div>
                      {recent.slice(0,3).map((c,i) => (
                        <div key={i} onClick={() => { setNumber(c.phone); setName(c.name||''); setQuery(c.phone) }}
                          style={{
                            display:'flex', alignItems:'center', gap:10,
                            padding:'7px 8px', borderRadius:9, cursor:'pointer',
                            transition:'background .12s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}
                        >
                          <div style={{ width:7, height:7, borderRadius:'50%', background:outcomeColor(c.outcome), flexShrink:0, boxShadow:`0 0 8px ${outcomeColor(c.outcome)}` }}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.80)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name||c.phone}</div>
                            <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.30)', fontFamily:'var(--font-mono)' }}>{fmt(c.duration)} · {timeAgo(c.at)}</div>
                          </div>
                          <Phone size={10} color="rgba(255,255,255,0.20)"/>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── ACTIVE CALL ── */}
              {state === 'active' && (
                <div>
                  {/* Avatar */}
                  <div style={{ textAlign:'center', marginBottom:14 }}>
                    <div style={{
                      width:56, height:56, borderRadius:'50%',
                      background:'linear-gradient(135deg,rgba(42,233,123,0.15),rgba(0,167,71,0.10))',
                      border:'2px solid rgba(42,233,123,0.30)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      margin:'0 auto 8px',
                      boxShadow:'0 0 28px rgba(42,233,123,0.25)',
                    }}><UserIcon size={22} color="#2ae97b"/></div>
                    <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>{contactName||'Unknown'}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontFamily:'var(--font-mono)' }}>{number}</div>
                  </div>

                  <Waveform active={!muted}/>

                  {/* Tab bar */}
                  <div style={{
                    display:'flex', background:'rgba(255,255,255,0.04)',
                    borderRadius:12, padding:3, gap:3, margin:'12px 0 10px',
                    border:'1px solid rgba(255,255,255,0.06)',
                  }}>
                    {(['controls','dtmf','history'] as ActiveTab[]).map(t => (
                      <button key={t} onClick={() => setTab(t)}
                        style={{
                          flex:1, padding:'7px 4px', borderRadius:9, border:'none',
                          fontSize:9.5, fontWeight:800, fontFamily:'var(--font-mono)',
                          textTransform:'uppercase', letterSpacing:0.6,
                          background: tab===t ? 'linear-gradient(135deg,rgba(251,11,140,0.30),rgba(128,87,215,0.20))' : 'transparent',
                          color: tab===t ? '#fb0b8c' : 'rgba(255,255,255,0.25)',
                          cursor:'pointer', transition:'all .15s',
                          display:'flex', alignItems:'center', justifyContent:'center', gap:4,
                          boxShadow: tab===t ? '0 2px 10px rgba(251,11,140,0.20)' : 'none',
                        }}
                      >
                        {t==='controls' && <><ChevronDown size={9}/> Controls</>}
                        {t==='dtmf'     && <><Hash size={9}/> Keypad</>}
                        {t==='history'  && <><Clock size={9}/> History</>}
                      </button>
                    ))}
                  </div>

                  {/* Controls */}
                  {tab==='controls' && (
                    <button onClick={() => setMuted(m => !m)}
                      style={{
                        width:'100%', height:44, borderRadius:12,
                        background: muted ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${muted ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.10)'}`,
                        color: muted ? '#fca5a5' : 'rgba(255,255,255,0.55)',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                        fontWeight:700, fontSize:12, cursor:'pointer',
                        marginBottom:10, transition:'all .2s',
                      }}
                    >
                      {muted ? <><MicOff size={14}/> Unmute</> : <><Mic size={14}/> Mute</>}
                    </button>
                  )}

                  {/* DTMF */}
                  {tab==='dtmf' && (
                    <div style={{ marginBottom:10 }}>
                      <div style={{
                        fontFamily:'var(--font-mono)', fontSize:15, fontWeight:700,
                        color:'#fff', letterSpacing:3, textAlign:'center',
                        padding:'6px 10px', background:'rgba(255,255,255,0.04)',
                        borderRadius:8, minHeight:32, marginBottom:8,
                        border:'1px solid rgba(255,255,255,0.06)',
                      }}>
                        {dtmfBuf || <span style={{ fontSize:10, color:'rgba(255,255,255,0.20)', letterSpacing:0 }}>Press keys</span>}
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                        {KEYS.flat().map(k => (
                          <button key={k} onClick={() => handleDTMF(k)}
                            style={{
                              height:38, borderRadius:9, cursor:'pointer',
                              background:'rgba(255,255,255,0.06)',
                              border:'1px solid rgba(255,255,255,0.08)',
                              color:'#fff', fontFamily:'var(--font-mono)',
                              fontSize:14, fontWeight:800, transition:'all .1s',
                            }}
                            onMouseDown={e => e.currentTarget.style.transform='scale(0.90)'}
                            onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
                          >{k}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* History */}
                  {tab==='history' && (
                    <div style={{ marginBottom:10, maxHeight:130, overflowY:'auto' }}>
                      {recent.length===0
                        ? <div style={{ textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.20)', padding:'16px 0' }}>No recent calls</div>
                        : recent.slice(0,5).map((c,i) => (
                          <div key={i} onClick={() => { setNumber(c.phone); setName(c.name||'') }}
                            style={{
                              display:'flex', alignItems:'center', gap:10,
                              padding:'7px 4px', borderBottom:'1px solid rgba(255,255,255,0.05)', cursor:'pointer',
                            }}
                          >
                            <div style={{ width:6, height:6, borderRadius:'50%', background:outcomeColor(c.outcome), flexShrink:0 }}/>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:11.5, fontWeight:700, color:'rgba(255,255,255,0.75)' }}>{c.name||c.phone}</div>
                              <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.30)', fontFamily:'var(--font-mono)' }}>{fmt(c.duration)} · {timeAgo(c.at)}</div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}

                  {/* Hangup */}
                  <button onClick={handleHangup}
                    style={{
                      width:'100%', height:52, borderRadius:16, cursor:'pointer',
                      background:'linear-gradient(135deg,#ef4444,#dc2626)',
                      border:'none', color:'#fff',
                      fontWeight:800, fontSize:14,
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                      boxShadow:'0 8px 28px rgba(239,68,68,0.40), inset 0 1px 0 rgba(255,255,255,0.15)',
                      transition:'all .2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
                    onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
                  >
                    <PhoneOff size={15}/> Hang Up
                  </button>
                </div>
              )}
            </div>

            {/* Bottom edge decoration */}
            <div style={{
              height:4, margin:'0 24px 16px',
              background:'linear-gradient(90deg,transparent,rgba(251,11,140,0.40),rgba(128,87,215,0.40),transparent)',
              borderRadius:4,
            }}/>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── FAB ─── */}
      <div
        style={{ pointerEvents:'all' }}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <button
          onClick={(e) => { e.stopPropagation(); state==='collapsed' ? setState('dialpad') : handleClose() }}
          title="PTDT Manual Dialer (Alt+D)"
          style={{
            width:60, height:60, borderRadius:'50%', cursor:'pointer',
            background: state==='active'
              ? 'linear-gradient(135deg,#00a747,#2ae97b)'
              : 'linear-gradient(135deg,#fb0b8c,#8057d7)',
            border: state==='active'
              ? '2px solid rgba(42,233,123,0.40)'
              : '2px solid rgba(251,11,140,0.40)',
            color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow: state==='active'
              ? '0 0 0 6px rgba(42,233,123,0.12), 0 10px 32px rgba(42,233,123,0.50)'
              : '0 0 0 6px rgba(251,11,140,0.12), 0 10px 32px rgba(251,11,140,0.50)',
            transition:'all 0.3s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform='scale(1.08)'}
          onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
          onMouseDown={e => e.currentTarget.style.transform='scale(0.94)'}
          onMouseUp={e => e.currentTarget.style.transform='scale(1.08)'}
        >
          <AnimatePresence mode="wait">
            {state==='active' ? (
              <motion.span key="a" initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}><PhoneCall size={24}/></motion.span>
            ) : isOpen ? (
              <motion.span key="o" initial={{scale:0,rotate:-90}} animate={{scale:1,rotate:0}} exit={{scale:0}}><X size={22}/></motion.span>
            ) : (
              <motion.span key="c" initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}><Phone size={24}/></motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  )
}
