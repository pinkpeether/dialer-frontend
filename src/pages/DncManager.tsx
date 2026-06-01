import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, RefreshCw, Search, ShieldOff, Trash2, X } from 'lucide-react'
import { dncAPI, type DncEntry } from '../api/dnc.api'
import { useAuthStore } from '../store/auth.store'

const fmtDate = (iso?: string) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString() } catch { return iso }
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

export default function DncManager() {
  const user = useAuthStore(state => state.user)
  const [entries, setEntries] = useState<DncEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [addPhone, setAddPhone] = useState('')
  const [addReason, setAddReason] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<number | string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canRemove = user?.role === 'ADMIN'

  const load = useCallback(async (q?: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await dncAPI.getAll({ limit: 200, search: q || undefined })
      setEntries(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load DNC list')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const handleSearch = (val: string) => {
    setSearch(val)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => void load(val), 400)
  }

  const handleAdd = async () => {
    const phone = addPhone.trim()
    if (!phone) return
    setAdding(true)
    setError(null)
    try {
      await dncAPI.add(phone, addReason.trim() || undefined)
      setAddOpen(false)
      setAddPhone('')
      setAddReason('')
      await load()
      setSuccessMsg(`✓ ${phone} added to DNC list`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add number')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (entry: DncEntry) => {
    if (!confirm(`Remove ${entry.phone} from DNC list?`)) return
    setRemovingId(entry.id)
    try {
      await dncAPI.remove(entry.id)
      await load()
      setSuccessMsg(`✓ ${entry.phone} removed from DNC`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove entry')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="ptdt-page">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <div className="eyebrow pink" style={{ marginBottom: 14 }}>
          <ShieldOff size={11} /> PTDT-Dialer DNC
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, lineHeight: 1.05, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 10 }}>
              Do Not Call <span className="gradient-brand-text">Registry</span>
            </h1>
            <p style={{ fontSize: 14.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="pulse-dot" /> {entries.length} numbers blocked from dialing
            </p>
          </div>
          <div className="ptdt-toolbar">
            <button type="button" onClick={() => void load(search)} className="ptdt-action-icon-btn">
              <RefreshCw size={16} />
            </button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setAddOpen(true)} className="btn-brand" style={{ minHeight: 38, fontSize: 12 }}>
              <Plus size={15} /> Add Number
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Messages */}
      {error && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.28)', background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', fontSize: 13 }}>
          {error}
        </div>
      )}
      {successMsg && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,167,71,0.28)', background: 'rgba(0,167,71,0.08)', color: 'var(--green-2)', fontSize: 13, fontWeight: 700 }}>
          {successMsg}
        </motion.div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Search by phone number…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          style={{ ...inputStyle, paddingLeft: 38 }}
        />
      </div>

      {/* Table */}
      <div className="glass" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ptdt-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-glass)' }}>
                {['Phone Number', 'Reason', 'Added By', 'Date Added', 'Action'].map(h => (
                  <th key={h} className="mono" style={{ padding: '13px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>Loading DNC list…</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>
                  {search ? 'No matching numbers found.' : 'DNC list is empty.'}
                </td></tr>
              ) : entries.map((entry, i) => (
                <motion.tr
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td className="mono" style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text)', fontSize: 13.5 }}>
                    {entry.phone}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-3)', fontSize: 13 }}>
                    {entry.reason || '—'}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-3)', fontSize: 13 }}>
                    {entry.addedBy || '—'}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-3)', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                    {fmtDate(entry.createdAt)}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {canRemove ? (
                      <button
                        type="button"
                        disabled={removingId === entry.id}
                        onClick={() => void handleRemove(entry)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.32)', background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', fontSize: 12, fontWeight: 700, cursor: removingId === entry.id ? 'not-allowed' : 'pointer', opacity: removingId === entry.id ? 0.55 : 1 }}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    ) : (
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>Admin only</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Number modal */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 10040, background: 'rgba(3,2,8,0.60)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}
            onMouseDown={e => { if (e.target === e.currentTarget) setAddOpen(false) }}
          >
            <motion.div
              initial={{ y: 24, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 16, scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              style={{ width: 'min(400px, 96vw)', borderRadius: 28, background: 'linear-gradient(150deg,rgba(8,5,18,0.98),rgba(16,10,30,0.97))', border: '1px solid rgba(255,255,255,0.14)', padding: 26, boxShadow: '0 34px 90px rgba(0,0,0,0.60)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldOff size={16} color="#fb0b8c" /> Add to DNC List
                </div>
                <button type="button" onClick={() => setAddOpen(false)} style={{ width: 30, height: 30, borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <X size={15} />
                </button>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, marginBottom: 6 }}>PHONE NUMBER *</label>
                <input
                  type="tel"
                  placeholder="+1234567890"
                  value={addPhone}
                  onChange={e => setAddPhone(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void handleAdd() }}
                  required
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, marginBottom: 6 }}>REASON (OPTIONAL)</label>
                <input
                  type="text"
                  placeholder="e.g. Customer requested, complaint…"
                  value={addReason}
                  onChange={e => setAddReason(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </div>

              <div className="ptdt-toolbar">
                <button type="button" className="btn-brand" disabled={!addPhone.trim() || adding} onClick={() => void handleAdd()} style={{ flex: 1, minHeight: 42, borderRadius: 'var(--radius-md)', opacity: !addPhone.trim() ? 0.6 : 1 }}>
                  {adding ? 'Adding…' : 'Add to DNC'}
                </button>
                <button type="button" onClick={() => setAddOpen(false)} style={{ flex: 1, minHeight: 42, borderRadius: 'var(--radius-md)', background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-3)', fontWeight: 700, cursor: 'pointer' }}>
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
