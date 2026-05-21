import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookUser, Clock, Phone, PhoneCall, PhoneIncoming, PhoneOutgoing } from 'lucide-react'
import { contactsAPI } from '../api/contacts.api'
import { useSipStore } from '../store/sip.store'
import { useToast } from '../hooks/useToast'

type ContactRecord = {
  id: number
  name?: string | null
  phone: string
  status: string
  campaignId?: number | null
  campaignName?: string | null
  email?: string | null
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}

type CallHistoryRow = {
  id: number | string
  direction: string
  status: string
  disposition?: string | null
  durationSeconds?: number | null
  agentName?: string | null
  createdAt: string
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  PENDING:      { color: '#f0b90b',       bg: 'rgba(240,185,11,0.12)' },
  CALLING:      { color: '#fb0b8c',       bg: 'rgba(251,11,140,0.10)' },
  CONTACTED:    { color: '#00a747',       bg: 'rgba(0,167,71,0.10)' },
  ANSWERED:     { color: '#00a747',       bg: 'rgba(0,167,71,0.10)' },
  NO_ANSWER:    { color: '#f0b90b',       bg: 'rgba(240,185,11,0.12)' },
  VOICEMAIL:    { color: '#8057d7',       bg: 'rgba(128,87,215,0.12)' },
  CALLBACK:     { color: '#f0b90b',       bg: 'rgba(240,185,11,0.12)' },
  WRONG_NUMBER: { color: '#ef4444',       bg: 'rgba(239,68,68,0.12)' },
  DNC:          { color: 'var(--text-3)', bg: 'var(--bg-glass)' },
  DONE:         { color: '#00a747',       bg: 'rgba(0,167,71,0.10)' },
}

const fmtDuration = (s?: number | null) => {
  if (!s || s < 1) return '—'
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

const fmtDate = (iso?: string) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

const FALLBACK_CONTACT: ContactRecord = {
  id: 0,
  name: 'Unknown Contact',
  phone: '—',
  status: 'PENDING',
}

const str = (v: unknown, fallback = '—') =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback

const nullableStr = (v: unknown) =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : null

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const sipCall = useSipStore(s => s.call)

  const [contact, setContact] = useState<ContactRecord | null>(null)
  const [calls, setCalls] = useState<CallHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [calling, setCalling] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      contactsAPI.getById(id),
      contactsAPI.getCallHistory(id),
    ]).then(([contactData, callData]) => {
      if (contactData) {
        setContact({
          id: Number(contactData.id ?? id),
          name: nullableStr(contactData.name),
          phone: str(contactData.phone, '—'),
          status: str(contactData.status, 'PENDING'),
          campaignId: contactData.campaignId as number | null,
          campaignName: nullableStr(contactData.campaignName ?? (contactData.campaign as Record<string,unknown> | null)?.name),
          email: nullableStr(contactData.email),
          notes: nullableStr(contactData.notes),
          createdAt: nullableStr(contactData.createdAt) ?? undefined,
          updatedAt: nullableStr(contactData.updatedAt) ?? undefined,
        })
      }
      setCalls(
        callData.map(c => ({
          id: c.id as number | string,
          direction: str(c.direction, 'outbound'),
          status: str(c.status, '—'),
          disposition: nullableStr(c.disposition),
          durationSeconds: typeof c.durationSeconds === 'number'
            ? c.durationSeconds
            : typeof c.duration === 'number'
              ? c.duration
              : null,
          agentName: nullableStr(c.agentName ?? (c.agent as Record<string,unknown>|null)?.name),
          createdAt: str(c.startedAt ?? c.createdAt, new Date().toISOString()),
        }))
      )
    }).catch(() => {
      setContact(FALLBACK_CONTACT)
    }).finally(() => setLoading(false))
  }, [id])

  const handleCallNow = async () => {
    const phone = contact?.phone
    if (!phone || phone === '—') { toast.error('No phone number'); return }
    setCalling(true)
    try {
      await sipCall(phone)
      toast.success(`Calling ${contact?.name || phone}…`)
    } catch {
      toast.error('SIP call failed — check SIP settings')
    } finally {
      setCalling(false)
    }
  }

  const sc = STATUS_COLORS[contact?.status || 'PENDING'] || STATUS_COLORS.PENDING

  if (loading) {
    return (
      <div style={{ padding: '32px 36px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: 'var(--text-3)' }}>
        Loading contact…
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Back */}
      <button
        type="button"
        onClick={() => navigate('/contacts')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 22, padding: '9px 14px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text-3)', fontWeight: 800, cursor: 'pointer' }}
      >
        <ArrowLeft size={14} /> Back to Contacts
      </button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div className="eyebrow purple" style={{ marginBottom: 14 }}>
          <BookUser size={11} /> Contact Detail
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 20, background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#fff', boxShadow: 'var(--shadow-pink)', flexShrink: 0 }}>
              {contact?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 2.6vw, 36px)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 6 }}>
                {contact?.name || 'Unknown Contact'}
              </h1>
              <div className="mono" style={{ fontSize: 13.5, color: 'var(--text-2)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span>{contact?.phone}</span>
                {contact?.email && <span style={{ color: 'var(--text-3)' }}>{contact.email}</span>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge" style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.color}`, fontSize: 12, padding: '6px 14px' }}>
              {contact?.status}
            </span>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              disabled={calling}
              onClick={() => void handleCallNow()}
              className="btn-brand"
              style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 42, borderRadius: 'var(--radius-full)', padding: '0 22px', fontSize: 13.5, opacity: calling ? 0.65 : 1 }}
            >
              <PhoneCall size={15} /> {calling ? 'Calling…' : 'Call Now'}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
        <InfoCard label="Campaign" value={contact?.campaignName || (contact?.campaignId ? `#${contact.campaignId}` : '—')} />
        <InfoCard label="Phone" value={contact?.phone || '—'} mono />
        <InfoCard label="Added" value={fmtDate(contact?.createdAt)} />
        <InfoCard label="Last Updated" value={fmtDate(contact?.updatedAt)} />
        {contact?.notes && <InfoCard label="Notes" value={contact.notes} span2 />}
      </div>

      {/* Call history */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <Phone size={16} color="var(--pink)" />
          <span className="display" style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Call History</span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginLeft: 6 }}>{calls.length} calls</span>
        </div>

        {calls.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>
            No calls logged for this contact yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Direction', 'Status', 'Disposition', 'Duration', 'Agent', 'Date'].map(h => (
                    <th key={h} className="mono" style={{ padding: '12px 12px', fontSize: 10.5, color: 'var(--text-3)', letterSpacing: 1.1, textTransform: 'uppercase', textAlign: 'left', fontWeight: 700 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calls.map((call, i) => {
                  const isIn = call.direction === 'incoming' || call.direction === 'inbound'
                  return (
                    <motion.tr
                      key={call.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td style={{ padding: '13px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: isIn ? 'var(--green-2)' : 'var(--pink)', fontWeight: 700, fontSize: 12.5 }}>
                          {isIn ? <PhoneIncoming size={13} /> : <PhoneOutgoing size={13} />}
                          {isIn ? 'Inbound' : 'Outbound'}
                        </div>
                      </td>
                      <td style={{ padding: '13px 12px' }}>
                        <span className="badge" style={{ fontSize: 10, padding: '3px 8px' }}>{call.status}</span>
                      </td>
                      <td style={{ padding: '13px 12px', color: 'var(--text-3)', fontSize: 12.5 }}>
                        {call.disposition || '—'}
                      </td>
                      <td className="mono" style={{ padding: '13px 12px', fontSize: 12.5, color: 'var(--text-2)' }}>
                        {fmtDuration(call.durationSeconds)}
                      </td>
                      <td style={{ padding: '13px 12px', fontSize: 12.5, color: 'var(--text-3)' }}>
                        {call.agentName || '—'}
                      </td>
                      <td style={{ padding: '13px 12px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-3)' }}>
                          <Clock size={11} />
                          {fmtDate(call.createdAt)}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>
    </div>
  )
}

function InfoCard({ label, value, mono, span2 }: { label: string; value: string; mono?: boolean; span2?: boolean }) {
  return (
    <div className="glass lift" style={{ padding: '14px 18px', gridColumn: span2 ? 'span 2' : undefined }}>
      <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-3)', letterSpacing: 1.2, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', wordBreak: 'break-all' }}>
        {value}
      </div>
    </div>
  )
}
