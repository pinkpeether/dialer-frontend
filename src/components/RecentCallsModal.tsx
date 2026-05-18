import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, PhoneCall, PhoneIncoming, PhoneMissed, PhoneOutgoing, X, Trash2, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export interface RecentCallItem {
  phone: string
  name?: string
  at: number
  duration: number
  direction: 'outgoing' | 'incoming'
  outcome: 'answered' | 'missed' | 'failed'
}

type RecentFilter = 'all' | 'dialled' | 'received' | 'missed' | 'failed'

interface RecentCallsModalProps {
  open: boolean
  calls: RecentCallItem[]
  onClose: () => void
  onClear: () => void
  onRedial: (call: RecentCallItem) => void
}

const brand = {
  ink: '#f9f7ff',
  muted: 'rgba(249,247,255,0.58)',
  faint: 'rgba(249,247,255,0.28)',
  pink: '#fb0b8c',
  green: '#00f5a0',
  purple: '#8b5cf6',
  cyan: '#22d3ee',
  red: '#ff3b5f',
  gold: '#f0b90b',
}

function fmtDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function timeAgo(ms: number) {
  const minutes = Math.floor((Date.now() - ms) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function outcomeStyle(outcome: RecentCallItem['outcome']) {
  if (outcome === 'answered') return { color: brand.green, label: 'ANSWERED' }
  if (outcome === 'missed') return { color: brand.gold, label: 'MISSED' }
  return { color: brand.red, label: 'FAILED' }
}

function directionStyle(call: RecentCallItem) {
  const direction = call.direction
  if (direction === 'incoming') {
    return { label: 'RECEIVED', icon: <PhoneIncoming size={12} />, color: brand.cyan }
  }
  return { label: 'DIALLED', icon: <PhoneOutgoing size={12} />, color: brand.green }
}

export default function RecentCallsModal({ open, calls, onClose, onClear, onRedial }: RecentCallsModalProps) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<RecentFilter>('all')
  const sortedCalls = useMemo(
    () => [...calls].sort((a, b) => b.at - a.at),
    [calls]
  )
  const filteredCalls = useMemo(() => {
    if (filter === 'all') return sortedCalls
    if (filter === 'dialled') return sortedCalls.filter(call => call.direction === 'outgoing')
    if (filter === 'received') return sortedCalls.filter(call => call.direction === 'incoming')
    if (filter === 'missed') return sortedCalls.filter(call => call.outcome === 'missed')
    return sortedCalls.filter(call => call.outcome === 'failed')
  }, [filter, sortedCalls])

  const filterItems: Array<{ key: RecentFilter; label: string; count: number }> = [
    { key: 'all', label: 'All', count: sortedCalls.length },
    { key: 'dialled', label: 'Dialled', count: sortedCalls.filter(call => call.direction === 'outgoing').length },
    { key: 'received', label: 'Received', count: sortedCalls.filter(call => call.direction === 'incoming').length },
    { key: 'missed', label: 'Missed', count: sortedCalls.filter(call => call.outcome === 'missed').length },
    { key: 'failed', label: 'Failed', count: sortedCalls.filter(call => call.outcome === 'failed').length },
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="ptdt-recent-calls-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10020,
            background: 'rgba(3,2,8,0.56)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ y: 32, scale: 0.94, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            style={{
              width: 'min(460px, 94vw)',
              maxHeight: 'min(680px, 88vh)',
              borderRadius: 30,
              background: `
                radial-gradient(circle at 16% 0%,rgba(251,11,140,0.24),transparent 36%),
                radial-gradient(circle at 88% 8%,rgba(0,245,160,0.18),transparent 34%),
                linear-gradient(150deg,rgba(8,5,18,0.98),rgba(16,10,30,0.97))
              `,
              border: '1px solid rgba(255,255,255,0.13)',
              boxShadow: '0 34px 90px rgba(0,0,0,0.62),0 0 70px rgba(251,11,140,0.18)',
              overflow: 'hidden',
              color: brand.ink,
            }}
          >
            <style>{`
              .ptdt-recent-scroll::-webkit-scrollbar { width: 5px; }
              .ptdt-recent-scroll::-webkit-scrollbar-track { background: transparent; }
              .ptdt-recent-scroll::-webkit-scrollbar-thumb { background: rgba(251,11,140,0.38); border-radius: 999px; }
            `}</style>

            <div style={{
              padding: '18px 18px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 16,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'linear-gradient(145deg,rgba(251,11,140,0.25),rgba(0,245,160,0.12))',
                  border: '1px solid rgba(255,255,255,0.11)',
                  boxShadow: '0 0 26px rgba(251,11,140,0.18)',
                }}>
                  <Clock size={20} color={brand.green} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 950, letterSpacing: 0.2 }}>
                    Recent Calls / Signals
                  </div>
                  <div style={{ fontSize: 11, color: brand.muted, marginTop: 2 }}>
                    {filteredCalls.length} of {sortedCalls.length} saved calls
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={onClear}
                  disabled={sortedCalls.length === 0}
                  title="Clear recent calls"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.10)',
                    background: sortedCalls.length ? 'rgba(255,59,95,0.13)' : 'rgba(255,255,255,0.04)',
                    color: sortedCalls.length ? brand.red : brand.faint,
                    cursor: sortedCalls.length ? 'pointer' : 'not-allowed',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={onClose}
                  title="Close"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.10)',
                    background: 'rgba(255,255,255,0.07)',
                    color: brand.ink,
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {sortedCalls.length > 0 && (
              <div
                style={{
                  padding: '10px 14px 0',
                  display: 'flex',
                  gap: 7,
                  overflowX: 'auto',
                }}
              >
                {filterItems.map(item => {
                  const active = filter === item.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFilter(item.key)}
                      style={{
                        border: active ? `1px solid ${brand.pink}` : '1px solid rgba(255,255,255,0.10)',
                        background: active ? 'rgba(251,11,140,0.18)' : 'rgba(255,255,255,0.045)',
                        color: active ? brand.ink : brand.muted,
                        borderRadius: 999,
                        padding: '6px 9px',
                        fontSize: 10,
                        fontWeight: 900,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        letterSpacing: 0.4,
                      }}
                    >
                      {item.label} · {item.count}
                    </button>
                  )
                })}
              </div>
            )}

            <div
              className="ptdt-recent-scroll"
              style={{
                padding: 14,
                maxHeight: 'calc(min(680px, 88vh) - 126px)',
                overflowY: 'auto',
              }}
            >
              {sortedCalls.length === 0 ? (
                <div style={{
                  minHeight: 220,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  textAlign: 'center',
                  color: brand.muted,
                }}>
                  <PhoneCall size={34} color={brand.faint} />
                  <div style={{ fontWeight: 850, color: brand.ink }}>No recent calls yet</div>
                  <div style={{ fontSize: 12, lineHeight: 1.45, maxWidth: 280 }}>
                    Calls made or received from the Floating Dialer will appear here.
                  </div>
                </div>
              ) : filteredCalls.length === 0 ? (
                <div style={{
                  minHeight: 180,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  textAlign: 'center',
                  color: brand.muted,
                }}>
                  <PhoneCall size={30} color={brand.faint} />
                  <div style={{ fontWeight: 850, color: brand.ink }}>No calls in this filter</div>
                  <div style={{ fontSize: 12, lineHeight: 1.45, maxWidth: 280 }}>
                    Try another recent-history filter.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredCalls.map((call, index) => {
                    const outcome = outcomeStyle(call.outcome)
                    const direction = directionStyle(call)
                    return (
                      <motion.div
                        key={`${call.phone}-${call.at}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.025, 0.18) }}
                        style={{
                          borderRadius: 20,
                          padding: 13,
                          background: 'linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.028))',
                          border: '1px solid rgba(255,255,255,0.09)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07),0 10px 28px rgba(0,0,0,0.20)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {call.name || call.phone}
                            </div>
                            {call.name && (
                              <div style={{ fontSize: 12, color: brand.muted, marginTop: 3 }}>
                                {call.phone}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => onRedial(call)}
                            title="Redial"
                            style={{
                              minWidth: 42,
                              height: 38,
                              borderRadius: 15,
                              border: '1px solid rgba(0,245,160,0.28)',
                              background: 'linear-gradient(145deg,rgba(0,245,160,0.19),rgba(251,11,140,0.08))',
                              color: brand.green,
                              cursor: 'pointer',
                              display: 'grid',
                              placeItems: 'center',
                              boxShadow: '0 0 22px rgba(0,245,160,0.11)',
                            }}
                          >
                            <RotateCcw size={16} />
                          </button>
                        </div>

                        <div style={{
                          marginTop: 11,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 10,
                            fontWeight: 950,
                            letterSpacing: 0.9,
                            color: outcome.color,
                            background: `${outcome.color}18`,
                            border: `1px solid ${outcome.color}38`,
                            borderRadius: 999,
                            padding: '5px 8px',
                          }}>
                            {call.outcome === 'missed' ? <PhoneMissed size={12} /> : direction.icon}
                            {outcome.label}
                          </span>

                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 10,
                            fontWeight: 900,
                            color: direction.color,
                            background: `${direction.color}14`,
                            border: `1px solid ${direction.color}30`,
                            borderRadius: 999,
                            padding: '5px 8px',
                          }}>
                            {direction.icon}
                            {direction.label}
                          </span>

                          <span style={{ fontSize: 11, color: brand.muted }}>
                            {fmtDuration(call.duration)} • {timeAgo(call.at)}
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

            {sortedCalls.length > 0 && (
              <div
                style={{
                  padding: '10px 14px 14px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 11,
                  color: brand.muted,
                }}
              >
                <span>Local recent calls only.</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    navigate('/calls')
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: brand.cyan,
                    fontWeight: 900,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    padding: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  View full history
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
