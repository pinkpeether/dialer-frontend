import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, CheckCircle2, Clock, Phone, RefreshCw, X, XCircle } from 'lucide-react'
import { useCallbacks } from '../hooks/useCallbacks'
import { type CallbackRecord, type CallbackStatus } from '../api/callbacks.api'
import { useSipStore } from '../store/sip.store'

const STATUS_THEME: Record<CallbackStatus, { color: string; bg: string; label: string }> = {
  PENDING:     { color: '#f0b90b',       bg: 'rgba(240,185,11,0.12)',   label: 'Pending' },
  COMPLETED:   { color: '#00a747',       bg: 'rgba(0,167,71,0.10)',     label: 'Completed' },
  RESCHEDULED: { color: '#8057d7',       bg: 'rgba(128,87,215,0.12)',   label: 'Rescheduled' },
  CANCELLED:   { color: 'var(--text-3)', bg: 'var(--bg-glass)',         label: 'Cancelled' },
}

const FILTERS: { label: string; value: CallbackStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Rescheduled', value: 'RESCHEDULED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

const fmtDatetime = (iso: string) => {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

const isDue = (iso: string) => {
  try { return new Date(iso).getTime() <= Date.now() } catch { return false }
}

const inputStyle: React.CSSProperties = {
  padding: '10px 13px',
  background: 'var(--bg-glass-hi)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
}

export default function Callbacks() {
  const [filter, setFilter] = useState<CallbackStatus | 'ALL'>('PENDING')
  const [rescheduling, setRescheduling] = useState<CallbackRecord | null>(null)
  const [newDatetime, setNewDatetime] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [actionId, setActionId] = useState<number | string | null>(null)

  const sipCall = useSipStore(s => s.call)

  const { callbacks, loading, error, refresh, markCompleted, markCancelled, reschedule } =
    useCallbacks({ status: filter === 'ALL' ? undefined : filter, autoRefreshMs: 60_000 })

  const handleComplete = async (id: number | string) => {
    setActionId(id)
    try { await markCompleted(id) } finally { setActionId(null) }
  }

  const handleCancel = async (id: number | string) => {
    if (!confirm('Cancel this callback?')) return
    setActionId(id)
    try { await markCancelled(id) } finally { setActionId(null) }
  }

  const openReschedule = (cb: CallbackRecord) => {
    const d = new Date()
    d.setHours(d.getHours() + 1)
    d.setSeconds(0, 0)
    setNewDatetime(d.toISOString().slice(0, 16))
    setNewNotes(cb.notes || '')
    setRescheduling(cb)
  }

  const handleReschedule = async () => {
    if (!rescheduling || !newDatetime) return
    setActionId(rescheduling.id)
    try {
      await reschedule(rescheduling.id, new Date(newDatetime).toISOString(), newNotes || undefined)
      setRescheduling(null)
    } finally {
      setActionId(null)
    }
  }

  const handleDialNow = async (cb: CallbackRecord) => {
    const phone = cb.contactPhone
    if (!phone) return alert('No phone number on this callback record.')
    try {
      await sipCall(phone)
    } catch {
      alert(`Could not initiate SIP call to ${phone}`)
    }
  }

  const pendingCount = callbacks.filter(c => c.status === 'PENDING' && isDue(c.scheduledAt)).length

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <div className="eyebrow pink" style={{ marginBottom: 14 }}>
          <Calendar size={11} /> PTDT-Dialer Callbacks
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, lineHeight: 1.05, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 10 }}>
              Callback <span className="gradient-brand-text">Queue</span>
            </h1>
            <p style={{ fontSize: 14.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
              {pendingCount > 0
                ? <><span className="pulse-dot pink" /> <span style={{ color: '#f0b90b', fontWeight: 700 }}>{pendingCount} callback{pendingCount !== 1 ? 's' : ''} due now</span></>
                : <><span className="pulse-dot" /> No callbacks currently overdue</>
              }
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            style={{ height: 42, width: 42, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text-3)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </motion.div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            style={{
              padding: '8px 18px',
              borderRadius: 999,
              border: filter === f.value ? '1px solid var(--pink)' : '1px solid var(--border)',
              background: filter === f.value ? 'rgba(251,11,140,0.12)' : 'var(--bg-glass)',
              color: filter === f.value ? 'var(--pink)' : 'var(--text-3)',
              fontWeight: 800,
              fontSize: 12.5,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', marginBottom: 16, borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.28)', background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', fontSize: 13 }}>
          {error} — showing empty state. <button type="button" onClick={() => void refresh()} style={{ color: 'var(--pink)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800 }}>Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="glass" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-glass)' }}>
                {['Scheduled At', 'Contact', 'Phone', 'Notes', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '13px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>Loading callbacks…</td></tr>
              ) : callbacks.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>No callbacks in this category.</td></tr>
              ) : callbacks.map((cb, i) => {
                const theme = STATUS_THEME[cb.status] || STATUS_THEME.PENDING
                const due = cb.status === 'PENDING' && isDue(cb.scheduledAt)
                const busy = actionId === cb.id

                return (
                  <motion.tr
                    key={cb.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.025 }}
                    style={{ borderBottom: '1px solid var(--border)', background: due ? 'rgba(240,185,11,0.04)' : 'transparent' }}
                  >
                    {/* Scheduled at */}
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        {due && <Clock size={13} color="#f0b90b" />}
                        <span className="mono" style={{ fontSize: 12.5, color: due ? '#f0b90b' : 'var(--text-2)', fontWeight: due ? 800 : 600 }}>
                          {fmtDatetime(cb.scheduledAt)}
                        </span>
                      </div>
                      {due && <div style={{ fontSize: 10, color: '#f0b90b', fontWeight: 700, marginTop: 2 }}>DUE NOW</div>}
                    </td>

                    {/* Contact */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>
                        {cb.contactName || '—'}
                      </div>
                      {cb.agentName && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>via {cb.agentName}</div>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="mono" style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-2)' }}>
                      {cb.contactPhone || '—'}
                    </td>

                    {/* Notes */}
                    <td style={{ padding: '14px 16px', maxWidth: 220 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cb.notes || '—'}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge" style={{ color: theme.color, background: theme.bg, border: `1px solid ${theme.color}`, whiteSpace: 'nowrap' }}>
                        {theme.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                        {cb.status === 'PENDING' && (
                          <>
                            {/* Dial Now */}
                            {cb.contactPhone && (
                              <ActionBtn
                                icon={<Phone size={11} />}
                                label="Dial"
                                color="var(--green-2)"
                                bg="rgba(0,167,71,0.10)"
                                disabled={busy}
                                onClick={() => void handleDialNow(cb)}
                              />
                            )}
                            {/* Mark complete */}
                            <ActionBtn
                              icon={<CheckCircle2 size={11} />}
                              label="Done"
                              color="var(--green-2)"
                              bg="rgba(0,167,71,0.10)"
                              disabled={busy}
                              onClick={() => void handleComplete(cb.id)}
                            />
                            {/* Reschedule */}
                            <ActionBtn
                              icon={<Clock size={11} />}
                              label="Reschedule"
                              color="#8057d7"
                              bg="rgba(128,87,215,0.10)"
                              disabled={busy}
                              onClick={() => openReschedule(cb)}
                            />
                            {/* Cancel */}
                            <ActionBtn
                              icon={<XCircle size={11} />}
                              label=""
                              color="var(--danger)"
                              bg="rgba(239,68,68,0.08)"
                              disabled={busy}
                              onClick={() => void handleCancel(cb.id)}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reschedule modal */}
      <AnimatePresence>
        {rescheduling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 10040, background: 'rgba(3,2,8,0.60)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}
            onMouseDown={e => { if (e.target === e.currentTarget) setRescheduling(null) }}
          >
            <motion.div
              initial={{ y: 24, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 16, scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              style={{ width: 'min(400px, 96vw)', borderRadius: 28, background: 'linear-gradient(150deg,rgba(8,5,18,0.98),rgba(16,10,30,0.97))', border: '1px solid rgba(255,255,255,0.14)', padding: 24, boxShadow: '0 34px 90px rgba(0,0,0,0.60)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>Reschedule Callback</div>
                <button type="button" onClick={() => setRescheduling(null)} style={{ width: 30, height: 30, borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <X size={15} />
                </button>
              </div>

              <div style={{ fontSize: 13, color: 'rgba(249,247,255,0.68)', marginBottom: 16 }}>
                {rescheduling.contactName || rescheduling.contactPhone || `Callback #${rescheduling.id}`}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, marginBottom: 6 }}>NEW DATE & TIME</label>
                <input
                  type="datetime-local"
                  value={newDatetime}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={e => setNewDatetime(e.target.value)}
                  required
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, marginBottom: 6 }}>NOTES (OPTIONAL)</label>
                <textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Reason for reschedule…"
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn-brand"
                  disabled={!newDatetime || actionId === rescheduling.id}
                  onClick={() => void handleReschedule()}
                  style={{ flex: 1, minHeight: 40, borderRadius: 'var(--radius-md)', opacity: !newDatetime ? 0.6 : 1 }}
                >
                  {actionId === rescheduling.id ? 'Saving…' : 'Confirm Reschedule'}
                </button>
                <button
                  type="button"
                  onClick={() => setRescheduling(null)}
                  style={{ flex: 1, minHeight: 40, borderRadius: 'var(--radius-md)', background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-3)', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ActionBtn({
  icon, label, color, bg, disabled, onClick,
}: {
  icon: React.ReactNode; label: string; color: string; bg: string; disabled?: boolean; onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: label ? '7px 11px' : '7px 9px',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${color}`,
        background: bg,
        color,
        fontSize: 11.5,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        whiteSpace: 'nowrap',
        transition: 'all 0.15s',
      }}
    >
      {icon}{label}
    </button>
  )
}