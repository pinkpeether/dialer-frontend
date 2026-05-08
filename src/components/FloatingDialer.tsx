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
  const [state, setState]       = useState<WidgetState>('collapsed')
  const [tab, setTab]           = useState<ActiveTab>('controls')
  const [number, setNumber]     = useState('')
  const [contactName, setName]  = useState('')
  const [callSid, setCallSid]   = useState<string|null>(null)
  const [elapsed, setElapsed]   = useState(0)
  const [error, setError]       = useState<string|null>(null)
  const [loading, setLoading]   = useState(false)
  const [muted, setMuted]       = useState(false)
  const [dtmfBuf, setDtmfBuf]   = useState('')
  const [recent, setRecent]     = useState<RecentCall[]>(loadRecent)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [query, setQuery]       = useState('')
  const [suggestions, setSugg]  = useState(false)
  const [glowing, setGlowing]   = useState(false)

  // Position state for dragging the whole widget
  const [pos, setPos]         = useState({ x: 0, y: 0 })
  const dragRef               = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null)

  const timerRef  = useRef<ReturnType<typeof setInterval>|null>(null)
  const callStart = useRef<number>(0)

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

  // ---- Drag handlers (header only) ----
  const onHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag from the header div itself, not its children (buttons etc.)
    if (e.target !== e.currentTarget) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y, moved: false }
  }, [pos])

  const onHeaderPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true
    setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy })
  }, [])

  const onHeaderPointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  // ---- FAB handlers (click only, no drag) ----
  const handleFABClick = useCallback(() => {
    if (state === 'collapsed') {
      setState('dialpad')
    } else if (state === 'dialpad') {
      setState('collapsed')
      setNumber(''); setName(''); setQuery(''); setError(null); setDtmfBuf('')
      setSugg(false)
    } else if (state === 'active' || state === 'calling') {
      // do nothing — use hangup button
    }
  }, [state])

  const glow = useCallback(() => {
    setGlowing(true)
    setTimeout(() => setGlowing(false), 500)
  }, [])

  const handleKey = (k: string) => {
    if (number.length >= 16) return
    setNumber(n => n + k)
    setQuery(n => n + k)
    setError(null)
    glow()
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
      timerRef.current  = setInterval(() => setElapsed(e => e + 1), 1000)
      glow()
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
    setCallSid(null); setElapsed(0); setMuted(false)
    setState('dialpad')
  }, [callSid, number, contactName, recent, stopTimer])

  const handleDTMF = async (digit: string) => {
    setDtmfBuf(d => d + digit)
    if (callSid) { try { await dialerAPI.sendDTMF(callSid, digit) } catch { /**/ } }
  }

  const handleClose = useCallback(() => {
    if (state === 'active' || state === 'calling') handleHangup()
    setState('collapsed')
    setNumber(''); setName(''); setQuery(''); setError(null); setDtmfBuf('')
    setSugg(false)
  }, [state, handleHangup])

  const timeAgo = (ms: number) => {
    const m = Math.floor((Date.now() - ms) / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`
  }

  const outcomeColor = (o: string) =>
    o === 'answered' ? '#2ae97b' : o === 'missed' ? '#f0b90b' : '#ef4444'

  const isOpen = state !== 'collapsed'

  const panelShadow = glowing
    ? '0 0 0 3px rgba(251,11,140,0.40), 0 0 70px rgba(251,11,140,0.45), 0 0 130px rgba(128,87,215,0.25), 0 32px 80px rgba(0,0,0,0.60)'
    : state === 'active'
    ? '0 0 0 2px rgba(42,233,123,0.30), 0 0 50px rgba(42,233,123,0.20), 0 24px 60px rgba(0,0,0,0.55)'
    : '0 0 0 1px rgba(251,11,140,0.15), 0 24px 60px rgba(0,0,0,0.55), 0 0 40px rgba(128,87,215,0.10)'

  return (
    <div style={{
      position: 'fixed',
      bottom: 28 - pos.y,
      right:  28 - pos.x,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 12,
    }}>

      {/* PANEL */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ opacity:0, scale:0.85, y:32 }}
            animate={{ opacity:1, scale:1,    y:0  }}
            exit={{   opacity:0, scale:0.85, y:32  }}
            transition={{ type:'spring', stiffness:360, damping:30 }}
            style={{
              width: 340,
              borderRadius: 28,
              background: 'linear-gradient(160deg, rgba(27,23,35,0.97) 0%, rgba(14,12,22,0.98) 100%)',
              border: '1px solid rgba(251,11,140,0.28)',
              boxShadow: panelShadow,
              overflow: 'visible',
              userSelect: 'none',
              transition: 'box-shadow 0.4s ease',
            }}
          >
            {/* HEADER / DRAG ZONE */}
            <div
              onPointerDown={onHeaderPointerDown}
              onPointerMove={onHeaderPointerMove}
              onPointerUp={onHeaderPointerUp}
              onPointerCancel={onHeaderPointerUp}
              style={{
                padding: '16px 18px 14px',
                background: 'linear-gradient(180deg,rgba(251,11,140,0.08) 0%,rgba(128,87,215,0.05) 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                cursor: 'grab',
                borderRadius: '28px 28px 0 0',
                touchAction: 'none',
              }}
            >
              {/* Brand row */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{
                    width:36, height:36, borderRadius:'50%',
                    background: state==='active' ? 'linear-gradient(135deg,#00a747,#2ae97b)' : 'linear-gradient(135deg,#fb0b8c,#8057d7)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow: state==='active' ? '0 0 18px rgba(42,233,123,0.55)' : '0 0 18px rgba(251,11,140,0.55)',
                    transition:'all 0.3s', flexShrink:0,
                  }}>
                    <Phone size={15} color="#fff"/>
                  </div>
                  <div>
                    <div style={{
                      fontSize:11, fontWeight:900, letterSpacing:1.8, textTransform:'uppercase',
                      background:'linear-gradient(135deg,#fb0b8c,#8057d7)',
                      WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                    }}>PTDT Dialer</div>
                    <div style={{ fontSize:9, fontFamily:'monospace', fontWeight:600, color:'rgba(255,255,255,0.35)', letterSpacing:0.5 }}>v3.0 · Alt+D to toggle</div>
                  </div>
                </div>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={handleClose}
                  style={{
                    width:28, height:28, borderRadius:'50%',
                    background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'rgba(255,255,255,0.40)', cursor:'pointer', transition:'all .2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.22)'; e.currentTarget.style.color='#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='rgba(255,255,255,0.40)' }}
                >
                  <X size={12}/>
                </button>
              </div>

              {/* LCD */}
              <div style={{
                background:'linear-gradient(180deg,#0d1a10 0%,#0a1209 100%)',
                border:'1px solid rgba(42,233,123,0.18)',
                borderRadius:14, padding:'12px 16px', minHeight:72,
                display:'flex', flexDirection:'column', justifyContent:'space-between',
                boxShadow:'inset 0 2px 12px rgba(0,0,0,0.65), 0 0 16px rgba(42,233,123,0.05)',
                position:'relative', overflow:'hidden',
              }}>
                <div style={{
                  position:'absolute', inset:0, pointerEvents:'none', borderRadius:14,
                  backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.14) 2px,rgba(0,0,0,0.14) 4px)',
                }}/>
                {state === 'active' ? (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:'#2ae97b', boxShadow:'0 0 8px #2ae97b', animation:'pulse 1.2s infinite' }}/>
                      <span style={{ fontSize:10, fontFamily:'monospace', color:'#2ae97b', fontWeight:800, letterSpacing:1 }}>CONNECTED</span>
                      {muted && <span style={{ fontSize:9, color:'#ef4444', fontFamily:'monospace', marginLeft:'auto', fontWeight:700 }}>MUTED</span>}
                    </div>
                    <div style={{ fontSize:11, fontFamily:'monospace', color:'rgba(42,233,123,0.65)', marginTop:2 }}>{contactName || number}</div>
                    <div style={{ fontSize:28, fontWeight:700, fontFamily:'monospace', color:'#2ae97b', letterSpacing:2, textShadow:'0 0 18px rgba(42,233,123,0.60)', lineHeight:1.1 }}>
                      {fmt(elapsed)}
                    </div>
                  </>
                ) : state === 'calling' ? (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:'#fb0b8c', boxShadow:'0 0 8px #fb0b8c', animation:'pulse 0.8s infinite' }}/>
                      <span style={{ fontSize:10, fontFamily:'monospace', color:'#fb0b8c', fontWeight:800, letterSpacing:1 }}>DIALING…</span>
                    </div>
                    <div style={{ fontSize:18, fontFamily:'monospace', color:'rgba(251,11,140,0.90)', letterSpacing:2, marginTop:6, fontWeight:700 }}>{number}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:9, fontFamily:'monospace', color:'rgba(42,233,123,0.45)', letterSpacing:1 }}>READY</div>
                    <div style={{
                      fontSize: number ? 22 : 13, fontFamily:'monospace', fontWeight:700,
                      color: number ? '#fff' : 'rgba(255,255,255,0.18)',
                      letterSpacing: number ? 2 : 0.3,
                      textShadow: number ? '0 0 14px rgba(255,255,255,0.18)' : 'none',
                      minHeight:34, display:'flex', alignItems:'center',
                      transition:'font-size 0.15s',
                    }}>
                      {number || 'Enter number…'}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* BODY — stopPropagation prevents pointer events from bubbling up to the header drag zone */}
            <div
              onPointerDown={e => e.stopPropagation()}
              style={{ padding:'14px 16px 18px' }}
            >

              {/* Search */}
              {(state === 'dialpad' || state === 'calling') && (
                <div style={{ position:'relative', marginBottom:12 }}>
                  <div style={{
                    display:'flex', alignItems:'center',
                    background:'rgba(255,255,255,0.05)',
                    border:'1px solid rgba(255,255,255,0.09)',
                    borderRadius:10, padding:'8px 12px', gap:8,
                  }}>
                    <Search size={12} color="rgba(255,255,255,0.28)"/>
                    <input
                      value={query}
                      onChange={e => { setQuery(e.target.value); setNumber(e.target.value); setSugg(true); setError(null) }}
                      onFocus={() => setSugg(true)}
                      onBlur={() => setTimeout(() => setSugg(false), 160)}
                      placeholder="Search name or number…"
                      style={{
                        flex:1, background:'none', border:'none', outline:'none',
                        fontFamily:'monospace', fontSize:13, fontWeight:600,
                        color:'rgba(255,255,255,0.85)',
                      }}
                    />
                    {number && (
                      <button onClick={handleDelete} style={{ color:'rgba(255,255,255,0.30)', display:'flex', cursor:'pointer', background:'none', border:'none' }}>
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
                          border:'1px solid rgba(251,11,140,0.22)',
                          borderRadius:12, overflow:'hidden', zIndex:20,
                          boxShadow:'0 16px 40px rgba(0,0,0,0.65)',
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
                              background:'rgba(251,11,140,0.12)', border:'1px solid rgba(251,11,140,0.22)',
                              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                            }}><UserIcon size={11} color="#fb0b8c"/></div>
                            <div>
                              <div style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{c.name||'Unknown'}</div>
                              <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.38)', fontFamily:'monospace' }}>{c.phone}</div>
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
                      background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)',
                      borderRadius:8, padding:'7px 12px', marginBottom:10, fontWeight:600,
                    }}
                  >{error}</motion.div>
                )}
              </AnimatePresence>

              {/* DIALPAD */}
              {(state === 'dialpad' || state === 'calling') && (
                <>
                  <div style={{
                    display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:9, marginBottom:12,
                    opacity: state==='calling' ? 0.30 : 1,
                    pointerEvents: state==='calling' ? 'none' : 'all',
                  }}>
                    {KEYS.flat().map(k => (
                      <button key={k} onClick={() => handleKey(k)}
                        style={{
                          height:52, borderRadius:13, cursor:'pointer',
                          background:'linear-gradient(180deg,rgba(255,255,255,0.10) 0%,rgba(255,255,255,0.04) 100%)',
                          border:'1px solid rgba(255,255,255,0.10)',
                          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1,
                          boxShadow:'0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.09)',
                          transition:'all .10s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background='linear-gradient(180deg,rgba(251,11,140,0.20) 0%,rgba(128,87,215,0.14) 100%)'
                          e.currentTarget.style.borderColor='rgba(251,11,140,0.38)'
                          e.currentTarget.style.boxShadow='0 4px 16px rgba(251,11,140,0.22), inset 0 1px 0 rgba(255,255,255,0.12)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background='linear-gradient(180deg,rgba(255,255,255,0.10) 0%,rgba(255,255,255,0.04) 100%)'
                          e.currentTarget.style.borderColor='rgba(255,255,255,0.10)'
                          e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.09)'
                        }}
                        onMouseDown={e => { e.currentTarget.style.transform='scale(0.91)'; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.50)' }}
                        onMouseUp={e => { e.currentTarget.style.transform='scale(1)' }}
                      >
                        <span style={{ fontSize:19, fontWeight:800, color:'#fff', fontFamily:'monospace', lineHeight:1 }}>{k}</span>
                        {SUB[k] && <span style={{ fontSize:7, fontWeight:700, color:'rgba(255,255,255,0.28)', letterSpacing:1 }}>{SUB[k]}</span>}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleCall}
                    disabled={loading || state==='calling' || !number}
                    style={{
                      width:'100%', height:52, borderRadius:16, cursor:(!number||loading||state==='calling')?'not-allowed':'pointer',
                      background:(!number||loading||state==='calling')
                        ? 'rgba(255,255,255,0.06)'
                        : 'linear-gradient(135deg,#fb0b8c 0%,#c2148a 50%,#8057d7 100%)',
                      border:'none', color:'#fff',
                      fontWeight:800, fontSize:14, letterSpacing:0.4,
                      display:'flex', alignItems:'center', justifyContent:'center', gap:9,
                      opacity:(!number||loading||state==='calling') ? 0.38 : 1,
                      boxShadow:(!number||loading||state==='calling') ? 'none' : '0 8px 28px rgba(251,11,140,0.42), inset 0 1px 0 rgba(255,255,255,0.15)',
                      transition:'all .18s',
                    }}
                    onMouseEnter={e => { if(number && !loading && state!=='calling') e.currentTarget.style.transform='translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)' }}
                  >
                    {state==='calling'
                      ? <><div style={{ width:8, height:8, borderRadius:'50%', background:'#fb0b8c', animation:'pulse 0.8s infinite' }}/> Connecting…</>
                      : <><PhoneCall size={15}/> {contactName ? `Call ${contactName}` : number ? `Call ${number}` : 'Enter a number'}</>
                    }
                  </button>

                  {recent.length > 0 && (
                    <div style={{ marginTop:14 }}>
                      <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.22)', letterSpacing:1.2, textTransform:'uppercase', fontFamily:'monospace', marginBottom:7, display:'flex', alignItems:'center', gap:5 }}>
                        <Clock size={9}/> Recent
                      </div>
                      {recent.slice(0,3).map((c,i) => (
                        <div key={i} onClick={() => { setNumber(c.phone); setName(c.name||''); setQuery(c.phone) }}
                          style={{
                            display:'flex', alignItems:'center', gap:10,
                            padding:'7px 8px', borderRadius:9, cursor:'pointer', transition:'background .12s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}
                        >
                          <div style={{ width:7, height:7, borderRadius:'50%', background:outcomeColor(c.outcome), flexShrink:0, boxShadow:`0 0 7px ${outcomeColor(c.outcome)}` }}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.78)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name||c.phone}</div>
                            <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.28)', fontFamily:'monospace' }}>{fmt(c.duration)} · {timeAgo(c.at)}</div>
                          </div>
                          <Phone size={9} color="rgba(255,255,255,0.18)"/>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ACTIVE CALL */}
              {state === 'active' && (
                <div>
                  <div style={{ textAlign:'center', marginBottom:14 }}>
                    <div style={{
                      width:56, height:56, borderRadius:'50%',
                      background:'linear-gradient(135deg,rgba(42,233,123,0.15),rgba(0,167,71,0.08))',
                      border:'2px solid rgba(42,233,123,0.28)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      margin:'0 auto 8px',
                      boxShadow:'0 0 30px rgba(42,233,123,0.22)',
                    }}><UserIcon size={22} color="#2ae97b"/></div>
                    <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>{contactName||'Unknown'}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.32)', fontFamily:'monospace' }}>{number}</div>
                  </div>

                  <Waveform active={!muted}/>

                  <div style={{
                    display:'flex', background:'rgba(255,255,255,0.04)',
                    borderRadius:12, padding:3, gap:3, margin:'12px 0 10px',
                    border:'1px solid rgba(255,255,255,0.06)',
                  }}>
                    {(['controls','dtmf','history'] as ActiveTab[]).map(t => (
                      <button key={t} onClick={() => setTab(t)}
                        style={{
                          flex:1, padding:'7px 4px', borderRadius:9, border:'none',
                          fontSize:9, fontWeight:800, fontFamily:'monospace',
                          textTransform:'uppercase', letterSpacing:0.6,
                          background: tab===t ? 'linear-gradient(135deg,rgba(251,11,140,0.28),rgba(128,87,215,0.18))' : 'transparent',
                          color: tab===t ? '#fb0b8c' : 'rgba(255,255,255,0.22)',
                          cursor:'pointer', transition:'all .15s',
                          display:'flex', alignItems:'center', justifyContent:'center', gap:4,
                          boxShadow: tab===t ? '0 2px 10px rgba(251,11,140,0.18)' : 'none',
                        }}
                      >
                        {t==='controls' && <><ChevronDown size={9}/> Controls</>}
                        {t==='dtmf'     && <><Hash size={9}/> Keypad</>}
                        {t==='history'  && <><Clock size={9}/> History</>}
                      </button>
                    ))}
                  </div>

                  {tab==='controls' && (
                    <button onClick={() => setMuted(m => !m)}
                      style={{
                        width:'100%', height:44, borderRadius:12,
                        background: muted ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
                        border:`1px solid ${muted ? 'rgba(239,68,68,0.32)' : 'rgba(255,255,255,0.09)'}`,
                        color: muted ? '#fca5a5' : 'rgba(255,255,255,0.50)',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                        fontWeight:700, fontSize:12, cursor:'pointer',
                        marginBottom:10, transition:'all .2s',
                      }}
                    >
                      {muted ? <><MicOff size={13}/> Unmute</> : <><Mic size={13}/> Mute</>}
                    </button>
                  )}

                  {tab==='dtmf' && (
                    <div style={{ marginBottom:10 }}>
                      <div style={{
                        fontFamily:'monospace', fontSize:15, fontWeight:700, color:'#fff',
                        letterSpacing:3, textAlign:'center', padding:'6px 10px',
                        background:'rgba(255,255,255,0.04)', borderRadius:8, minHeight:32, marginBottom:8,
                        border:'1px solid rgba(255,255,255,0.06)',
                      }}>
                        {dtmfBuf || <span style={{ fontSize:10, color:'rgba(255,255,255,0.18)', letterSpacing:0 }}>Press keys</span>}
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                        {KEYS.flat().map(k => (
                          <button key={k} onClick={() => handleDTMF(k)}
                            style={{
                              height:38, borderRadius:9, cursor:'pointer',
                              background:'rgba(255,255,255,0.06)',
                              border:'1px solid rgba(255,255,255,0.08)',
                              color:'#fff', fontFamily:'monospace', fontSize:14, fontWeight:800,
                              transition:'all .1s',
                            }}
                            onMouseDown={e => e.currentTarget.style.transform='scale(0.90)'}
                            onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
                          >{k}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {tab==='history' && (
                    <div style={{ marginBottom:10, maxHeight:130, overflowY:'auto' }}>
                      {recent.length===0
                        ? <div style={{ textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.18)', padding:'16px 0' }}>No recent calls</div>
                        : recent.slice(0,5).map((c,i) => (
                          <div key={i}
                            style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 4px', borderBottom:'1px solid rgba(255,255,255,0.05)', cursor:'pointer' }}
                          >
                            <div style={{ width:6, height:6, borderRadius:'50%', background:outcomeColor(c.outcome), flexShrink:0 }}/>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:11.5, fontWeight:700, color:'rgba(255,255,255,0.72)' }}>{c.name||c.phone}</div>
                              <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.28)', fontFamily:'monospace' }}>{fmt(c.duration)} · {timeAgo(c.at)}</div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}

                  <button onClick={handleHangup}
                    style={{
                      width:'100%', height:52, borderRadius:16, cursor:'pointer',
                      background:'linear-gradient(135deg,#ef4444,#dc2626)',
                      border:'none', color:'#fff', fontWeight:800, fontSize:14,
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                      boxShadow:'0 8px 28px rgba(239,68,68,0.42), inset 0 1px 0 rgba(255,255,255,0.14)',
                      transition:'all .18s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
                    onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
                  >
                    <PhoneOff size={15}/> Hang Up
                  </button>
                </div>
              )}
            </div>

            {/* Bottom accent */}
            <div style={{
              height:3, margin:'0 24px 16px',
              background:'linear-gradient(90deg,transparent,rgba(251,11,140,0.45),rgba(128,87,215,0.45),transparent)',
              borderRadius:4,
            }}/>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB — standalone, NO drag events */}
      <button
        onClick={handleFABClick}
        title="PTDT Dialer (Alt+D)"
        style={{
          width:60, height:60, borderRadius:'50%', cursor:'pointer',
          background: state==='active'
            ? 'linear-gradient(135deg,#00a747,#2ae97b)'
            : 'linear-gradient(135deg,#fb0b8c,#8057d7)',
          border: state==='active'
            ? '2px solid rgba(42,233,123,0.45)'
            : '2px solid rgba(251,11,140,0.45)',
          color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: state==='active'
            ? '0 0 0 7px rgba(42,233,123,0.12), 0 10px 32px rgba(42,233,123,0.55)'
            : '0 0 0 7px rgba(251,11,140,0.12), 0 10px 32px rgba(251,11,140,0.55)',
          transition:'all 0.28s',
          flexShrink:0,
        }}
        onMouseEnter={e => e.currentTarget.style.transform='scale(1.09)'}
        onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
        onMouseDown={e => e.currentTarget.style.transform='scale(0.94)'}
        onMouseUp={e => e.currentTarget.style.transform='scale(1.09)'}
      >
        <AnimatePresence mode="wait">
          {state==='active' ? (
            <motion.span key="a" initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}>
              <PhoneCall size={24}/>
            </motion.span>
          ) : isOpen ? (
            <motion.span key="o" initial={{scale:0,rotate:-90}} animate={{scale:1,rotate:0}} exit={{scale:0,rotate:90}}>
              <X size={22}/>
            </motion.span>
          ) : (
            <motion.span key="c" initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}>
              <Phone size={24}/>
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  )
}
