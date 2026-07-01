import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Filter, PhoneCall, PhoneIncoming, PhoneOutgoing } from 'lucide-react'
import { callsAPI } from '../api/calls.api'
import CallDispositionModal from '../components/CallDispositionModal'
import type { DispositionValue } from '../components/DispositionPanel'
import CustomerAccordionHeader, { customerAccordionBodyStyle } from '../components/CustomerAccordionHeader'

type CallDirection = 'incoming' | 'outgoing'
type CallStatus = 'answered' | 'missed' | 'failed' | 'in_progress' | 'queued' | 'completed' | 'unknown'
type CustomerAccount = { id: number | null; name: string; code: string; status: string }
type CallRow = {
  id: string | number
  direction: CallDirection
  remoteName?: string | null
  remoteNumber: string
  campaignName?: string | null
  agentName?: string | null
  status: CallStatus
  disposition?: DispositionValue | null
  notes?: string | null
  callbackAt?: string | null
  durationSeconds: number
  startedAt: string
  commercialAccount: CustomerAccount
}
type CallGroup = CustomerAccount & { key: string; calls: CallRow[] }

const brand = { pink: 'var(--pink)', green: 'var(--green-2)', red: 'var(--danger)', gold: 'var(--warning)', muted: 'var(--text-3)', ink: 'var(--text)' }
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const stringValue = (value: unknown, fallback = '') => typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback
const numberValue = (value: unknown, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? n : fallback }
const nestedName = (value: unknown) => isRecord(value) ? stringValue(value.name || value.title || value.fullName) : ''
const nestedString = (value: unknown, key: string) => isRecord(value) ? stringValue(value[key]) : ''
const getItems = (payload: unknown) => {
  if (Array.isArray(payload)) return payload
  if (!isRecord(payload)) return []
  for (const key of ['items', 'calls', 'results', 'data']) if (Array.isArray(payload[key])) return payload[key] as unknown[]
  return []
}

const normalizeStatus = (value: unknown): CallStatus => {
  const status = stringValue(value, 'unknown').toLowerCase().replace(/\s+/g, '_')
  if (status === 'answered' || status === 'completed') return status
  if (status === 'missed' || status === 'no_answer' || status === 'noanswer') return 'missed'
  if (status === 'failed' || status === 'busy') return 'failed'
  if (status === 'queued' || status === 'pending' || status === 'initiated') return 'queued'
  if (status === 'in_progress' || status === 'calling' || status === 'active' || status === 'ringing') return 'in_progress'
  return 'unknown'
}
const normalizeDirection = (value: unknown): CallDirection => String(value || '').toLowerCase().startsWith('in') ? 'incoming' : 'outgoing'
const DISPOSITION_LABELS: Record<DispositionValue, string> = { ANSWERED: 'Answered', NO_ANSWER: 'No Answer', VOICEMAIL: 'Voicemail', CALLBACK: 'Callback', WRONG_NUMBER: 'Wrong Number', DO_NOT_CALL: 'Do Not Call' }
const normalizeDisposition = (value: unknown): DispositionValue | null => { const d = stringValue(value).toUpperCase().replace(/\s+/g, '_') as DispositionValue; return d in DISPOSITION_LABELS ? d : null }
const dispositionLabel = (value?: DispositionValue | null) => value ? DISPOSITION_LABELS[value] : ''
const fmtDuration = (seconds: number) => seconds > 0 ? `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '00:00'
const fmtDateTime = (iso: string) => { const date = new Date(iso); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString() }
const statusPill = (status: CallStatus) => status === 'answered' || status === 'completed' ? { label: 'COMPLETED', color: brand.green } : status === 'missed' ? { label: 'MISSED', color: brand.gold } : status === 'failed' ? { label: 'FAILED', color: brand.red } : status === 'in_progress' ? { label: 'IN PROGRESS', color: 'var(--purple)' } : status === 'queued' ? { label: 'QUEUED', color: '#22d3ee' } : { label: 'UNKNOWN', color: brand.muted }
const visibleCampaignName = (call: CallRow) => call.campaignName === '__adhoc__' ? 'Manual Ad-hoc Call' : call.campaignName === '__sip__' ? 'SIP Internal Leg' : call.campaignName || '-'

const accountForCall = (row: Record<string, unknown>): CustomerAccount => {
  const direct = row.commercialAccount as Record<string, unknown> | null | undefined
  const campaign = row.campaign as Record<string, unknown> | null | undefined
  const account = direct?.id || direct?.name ? direct : campaign?.commercialAccount as Record<string, unknown> | null | undefined
  return { id: account?.id ? Number(account.id) : null, name: stringValue(account?.name, 'Unassigned Customer'), code: stringValue(account?.code, '—'), status: stringValue(account?.status, '—') }
}

const normalizeCall = (item: unknown, index: number): CallRow => {
  const row = isRecord(item) ? item : {}
  const campaign = row.campaign
  const agent = row.agent
  const contact = row.contact
  return {
    id: stringValue(row.id, `call-${index}`),
    direction: normalizeDirection(row.direction || row.type),
    remoteName: stringValue(row.remoteName) || stringValue(row.name) || stringValue(row.contactName) || nestedName(contact) || null,
    remoteNumber: stringValue(row.remoteNumber) || stringValue(row.phone) || stringValue(row.phoneNumber) || nestedString(contact, 'phone') || stringValue(row.destination) || stringValue(row.to) || stringValue(row.from) || 'Unknown number',
    campaignName: stringValue(row.campaignName) || nestedName(campaign) || null,
    agentName: stringValue(row.agentName) || nestedName(agent) || null,
    status: normalizeStatus(row.status || row.disposition),
    disposition: normalizeDisposition(row.disposition),
    notes: stringValue(row.notes) || null,
    callbackAt: stringValue(row.callbackAt) || nestedString(contact, 'callbackAt') || null,
    durationSeconds: numberValue(row.durationSeconds ?? row.duration),
    startedAt: stringValue(row.startedAt || row.createdAt || row.updatedAt),
    commercialAccount: accountForCall(row),
  }
}
const groupCallsByCustomer = (calls: CallRow[]) => {
  const map = new Map<string, CallGroup>()
  calls.forEach(call => {
    const account = call.commercialAccount
    const key = account.id ? `account-${account.id}` : 'account-unassigned'
    if (!map.has(key)) map.set(key, { ...account, key, calls: [] })
    map.get(key)?.calls.push(call)
  })
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export default function CallsCustomerGrouped() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedForDisposition, setSelectedForDisposition] = useState<CallRow | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const page = Math.max(1, numberValue(searchParams.get('page'), 1))
  const limit = Math.max(1, numberValue(searchParams.get('limit'), 100))
  const statusFilter = searchParams.get('status') || ''
  const directionFilter = searchParams.get('direction') || ''
  const queryParams = useMemo(() => ({ page, limit, ...(statusFilter ? { status: statusFilter } : {}), ...(directionFilter ? { direction: directionFilter } : {}) }), [page, limit, statusFilter, directionFilter])
  const callsQuery = useQuery({ queryKey: ['calls', queryParams], queryFn: async () => callsAPI.getAll(queryParams, { timeout: 45000 }).then((res: unknown) => getItems(res).map(normalizeCall)), staleTime: 60_000, refetchOnWindowFocus: false, placeholderData: previousData => previousData })
  const calls = callsQuery.data ?? []
  const filtered = useMemo(() => { const q = search.trim().toLowerCase(); return q ? calls.filter(call => [call.remoteName, call.remoteNumber, call.campaignName, call.agentName, call.commercialAccount.name, call.status].some(v => String(v || '').toLowerCase().includes(q))) : calls }, [calls, search])
  const groups = useMemo(() => groupCallsByCustomer(filtered), [filtered])
  const updateParam = (key: string, value: string) => { const next = new URLSearchParams(searchParams); value ? next.set(key, value) : next.delete(key); next.set('page', '1'); setSearchParams(next) }
  const toggleGroup = (key: string) => setExpandedGroups(prev => ({ ...prev, [key]: !(prev[key] ?? true) }))
  const selectedDispositionCallId = selectedForDisposition ? numberValue(selectedForDisposition.id, Number.NaN) : Number.NaN

  const renderCallRow = (call: CallRow) => {
    const pill = statusPill(call.status)
    const currentDisposition = dispositionLabel(call.disposition)
    return <tr key={call.id} style={{ borderBottom: '1px solid var(--border)' }}><td className="mono" style={{ padding: 12, color: 'var(--danger)', fontWeight: 950 }}>{call.id}</td><td style={{ padding: 12 }}>{call.direction === 'incoming' ? <PhoneIncoming size={15} color="#22d3ee" /> : <PhoneOutgoing size={15} color="var(--green-2)" />}</td><td style={{ padding: 12, fontWeight: 900 }}>{call.remoteName || call.remoteNumber}<br /><span className="mono" style={{ color: brand.muted, fontSize: 11 }}>{call.remoteNumber}</span></td><td style={{ padding: 12, color: brand.muted }}>{visibleCampaignName(call)}</td><td style={{ padding: 12, color: brand.muted }}>{call.agentName || '—'}</td><td className="mono" style={{ padding: 12 }}>{fmtDuration(call.durationSeconds)}</td><td style={{ padding: 12, color: brand.muted }}>{fmtDateTime(call.startedAt)}</td><td style={{ padding: 12 }}><span className="badge" style={{ color: pill.color, border: `1px solid ${pill.color}`, background: 'rgba(148,163,184,0.08)' }}>{currentDisposition || pill.label}</span></td><td style={{ padding: 12 }}><button type="button" className="ptdt-action-btn" onClick={() => setSelectedForDisposition(call)}>{call.disposition ? 'Edit' : 'Set'} Disposition</button></td></tr>
  }

  return <div className="ptdt-page"><div className="ptdt-page-header"><div><div className="eyebrow pink"><PhoneCall size={12} /> PTDT-Dialer Calls</div><h1 className="ptdt-page-title">My <span className="gradient-brand-text">Calls</span></h1><p className="ptdt-page-desc">Customer-grouped call history for quick operational review.</p></div></div><div className="glass" style={{ padding: 16, marginBottom: 18, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}><span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 280px' }}><Filter size={14} color="var(--pink)" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, number, campaign, agent..." className="ptdt-input" /></span><select className="ptdt-select" value={directionFilter} onChange={e => updateParam('direction', e.target.value)}><option value="">All directions</option><option value="outgoing">Outgoing</option><option value="incoming">Incoming</option></select><select className="ptdt-select" value={statusFilter} onChange={e => updateParam('status', e.target.value)}><option value="">All statuses</option><option value="answered">Answered</option><option value="missed">Missed</option><option value="failed">Failed</option><option value="queued">Queued</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></div>{callsQuery.isLoading ? <div className="glass" style={{ padding: 32, color: brand.muted }}>Loading call history...</div> : callsQuery.error ? <div className="glass" style={{ padding: 18, color: brand.red }}>Failed to load calls.</div> : groups.length === 0 ? <div className="glass" style={{ padding: 32, color: brand.muted }}>No calls found for the current filters.</div> : <div style={{ display: 'grid', gap: 12 }}>{groups.map((group, index) => { const isOpen = expandedGroups[group.key] ?? index === 0; const completed = group.calls.filter(call => call.status === 'completed' || call.status === 'answered').length; const missed = group.calls.filter(call => call.status === 'missed').length; const outgoing = group.calls.filter(call => call.direction === 'outgoing').length; return <div key={group.key} className="glass" style={{ overflow: 'hidden' }}><CustomerAccordionHeader isOpen={isOpen} onClick={() => toggleGroup(group.key)} name={group.name} meta={`Customer Code: ${group.code} · Status: ${group.status}`} badges={[{ label: `${group.calls.length} Calls` }, { label: `${completed} Completed`, color: brand.green, bg: 'rgba(0,167,71,.10)', border: '1px solid rgba(0,167,71,.28)' }, { label: `${missed} Missed`, color: brand.gold, bg: 'rgba(240,185,11,.12)', border: '1px solid rgba(240,185,11,.28)' }, { label: `${outgoing} Outgoing`, color: 'var(--text-2)', bg: 'var(--bg-2)', border: '1px solid var(--border)' }]} />{isOpen && <div style={{ ...customerAccordionBodyStyle, overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}><thead><tr>{['Call ID', 'Dir', 'Contact', 'Campaign', 'Agent', 'Duration', 'Started', 'Status', 'Disposition'].map(label => <th key={label} style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid var(--border)', color: brand.muted, fontSize: 11, textTransform: 'uppercase' }}>{label}</th>)}</tr></thead><tbody>{group.calls.map(renderCallRow)}</tbody></table></div>}</div> })}</div>}<CallDispositionModal open={Boolean(selectedForDisposition) && Number.isFinite(selectedDispositionCallId)} callId={Number.isFinite(selectedDispositionCallId) ? selectedDispositionCallId : null} contactName={selectedForDisposition?.remoteName} contactNumber={selectedForDisposition?.remoteNumber} defaultDisposition={selectedForDisposition?.disposition} defaultNotes={selectedForDisposition?.notes} defaultCallbackAt={selectedForDisposition?.callbackAt} onClose={() => setSelectedForDisposition(null)} onSaved={() => { setSelectedForDisposition(null); void queryClient.invalidateQueries({ queryKey: ['calls'], exact: false }); void queryClient.refetchQueries({ queryKey: ['calls'], exact: false, type: 'active' }) }} /></div>
}
