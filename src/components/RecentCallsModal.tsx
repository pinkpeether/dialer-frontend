import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, PhoneCall, PhoneOutgoing, X, Trash2, RotateCcw } from 'lucide-react'

export interface RecentCallItem {
  phone: string
  name?: string
  at: number
  duration: number
  outcome: 'answered' | 'missed' | 'failed'
}

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

export default function RecentCallsModal({ open, calls, onClose, onClear, onRedial }: RecentCallsModalProps) {
  const sortedCalls = useMemo(
    () => [...calls].sort((a, b) => b.at - a.at),
    [calls]
  )

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
                    {sortedCalls.length} saved call{sortedCalls.length === 1 ? '' : 's'}
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

            <div
              className="ptdt-recent-scroll"
              style={{
                padding: 14,
                maxHeight: 'calc(min(680px, 88vh) - 76px)',
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
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sortedCalls.map((call, index) => {
                    const outcome = outcomeStyle(call.outcome)
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
                            <PhoneOutgoing size={12} />
                            {outcome.label}
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
