import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
} from 'lucide-react'
import { callsAPI } from '../api/calls.api'
import CallDispositionModal from '../components/CallDispositionModal'
import type { DispositionValue } from '../components/DispositionPanel'

const PTDT_MOBILE_PAGE_CSS = `
@media (max-width: 900px) {
  .ptdt-mobile-page {
    width: 100% !important;
    max-width: 100vw !important;
    margin: 0 !important;
    padding: 72px 12px 28px !important;
    overflow-x: hidden !important;
    box-sizing: border-box !important;
  }

  .ptdt-mobile-page *,
  .ptdt-mobile-page *::before,
  .ptdt-mobile-page *::after {
    box-sizing: border-box;
    min-width: 0;
  }

  .ptdt-mobile-page .eyebrow {
    max-width: 100% !important;
    white-space: normal !important;
    line-height: 1.35 !important;
  }

  .ptdt-mobile-page h1 {
    font-size: clamp(1.8rem, 8vw, 2.4rem) !important;
    line-height: 1.04 !important;
    overflow-wrap: anywhere !important;
  }

  .ptdt-mobile-page h2,
  .ptdt-mobile-page h3 {
    overflow-wrap: anywhere !important;
  }

  .ptdt-mobile-page p,
  .ptdt-mobile-page span,
  .ptdt-mobile-page div {
    max-width: 100%;
  }

  .ptdt-mobile-page .mono {
    overflow-wrap: anywhere !important;
    word-break: normal !important;
  }

  .ptdt-mobile-page [style*="display: grid"],
  .ptdt-mobile-page [style*="display:grid"] {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .ptdt-mobile-page [style*="grid-template-columns"],
  .ptdt-mobile-page [style*="gridTemplateColumns"] {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .ptdt-mobile-page [style*="grid-column"],
  .ptdt-mobile-page [style*="gridColumn"] {
    grid-column: auto !important;
  }

  .ptdt-mobile-page [style*="display: flex"],
  .ptdt-mobile-page [style*="display:flex"] {
    flex-wrap: wrap !important;
    min-width: 0 !important;
  }

  .ptdt-mobile-page [style*="justify-content: space-between"],
  .ptdt-mobile-page [style*="justifyContent: space-between"] {
    justify-content: flex-start !important;
  }

  .ptdt-mobile-page .glass,
  .ptdt-mobile-page .glass-hi,
  .ptdt-mobile-page .ptdt-card,
  .ptdt-mobile-page .lift {
    width: 100% !important;
    max-width: 100% !important;
    border-radius: 18px !important;
  }

  .ptdt-mobile-page .glass,
  .ptdt-mobile-page .glass-hi {
    padding: 14px !important;
  }

  .ptdt-mobile-page .glass:has(table),
  .ptdt-mobile-page .glass-hi:has(table),
  .ptdt-mobile-page .ptdt-card:has(table),
  .ptdt-mobile-page [style*="overflow-x"],
  .ptdt-mobile-page [style*="overflowX"] {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
  }

  .ptdt-mobile-page table {
    min-width: 640px !important;
    width: max-content !important;
    table-layout: auto !important;
    border-collapse: collapse !important;
  }

  .ptdt-mobile-page th,
  .ptdt-mobile-page td {
    white-space: nowrap !important;
    word-break: normal !important;
    overflow-wrap: normal !important;
    padding: 10px 12px !important;
    vertical-align: middle !important;
  }

  .ptdt-mobile-page input,
  .ptdt-mobile-page textarea,
  .ptdt-mobile-page select,
  .ptdt-mobile-page .ptdt-input,
  .ptdt-mobile-page .ptdt-select,
  .ptdt-mobile-page .ptdt-textarea {
    width: 100% !important;
    max-width: 100% !important;
  }

  .ptdt-mobile-page input[type="number"] {
    min-width: 82px !important;
    width: 100% !important;
  }

  .ptdt-mobile-page button,
  .ptdt-mobile-page .btn-brand,
  .ptdt-mobile-page .ptdt-action-btn,
  .ptdt-mobile-page .ptdt-action-icon-btn {
    max-width: 100% !important;
    white-space: normal !important;
  }

  .ptdt-mobile-page .btn-brand {
    min-height: 42px !important;
  }

  .ptdt-mobile-page .ptdt-action-icon-btn {
    width: 40px !important;
    min-width: 40px !important;
    flex: 0 0 auto !important;
  }

  .ptdt-mobile-page .ptdt-toolbar {
    width: 100% !important;
    justify-content: flex-start !important;
    overflow-x: auto !important;
    flex-wrap: nowrap !important;
    padding-bottom: 6px !important;
  }

  .ptdt-mobile-page .ptdt-toolbar > * {
    flex: 0 0 auto !important;
  }

  .ptdt-mobile-page svg,
  .ptdt-mobile-page canvas {
    max-width: 100% !important;
  }

  .ptdt-mobile-page .recharts-wrapper,
  .ptdt-mobile-page .recharts-surface,
  .ptdt-mobile-page .recharts-responsive-container {
    max-width: 100% !important;
  }

  .ptdt-mobile-page .recharts-legend-wrapper {
    max-width: 100% !important;
  }

  .ptdt-mobile-page audio,
  .ptdt-mobile-page video {
    max-width: 100% !important;
  }
}

@media (max-width: 560px) {
  .ptdt-mobile-page {
    padding: 66px 10px 24px !important;
  }

  .ptdt-mobile-page .glass,
  .ptdt-mobile-page .glass-hi {
    padding: 12px !important;
    border-radius: 16px !important;
  }

  .ptdt-mobile-page h1 {
    font-size: clamp(1.65rem, 9vw, 2.1rem) !important;
  }

  .ptdt-mobile-page table {
    min-width: 600px !important;
  }

  .ptdt-mobile-page th,
  .ptdt-mobile-page td {
    padding: 9px 10px !important;
    font-size: 12px !important;
  }
}
`


type CallDirection = 'incoming' | 'outgoing'
type CallStatus = 'answered' | 'missed' | 'failed' | 'in_progress' | 'queued' | 'completed' | 'unknown'

interface CallRow {
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
  isDynamicCallerIdBackendCall: boolean
}

interface PagedResponse {
  items: CallRow[]
  page: number
  limit: number
  total: number
}

const brand = {
  ink: 'var(--text)',
  muted: 'var(--text-3)',
  faint: 'var(--muted)',
  pink: 'var(--pink)',
  green: 'var(--green-2)',
  red: 'var(--danger)',
  gold: 'var(--warning)',
  cyan: '#22d3ee',
  purple: 'var(--purple)',
  surface: 'var(--bg-glass-hi)',
  panel: 'var(--bg-glass)',
  border: 'var(--border)',
  borderStrong: 'var(--border-strong)',
}

const glassPanel: CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--bg-glass-hi)',
  boxShadow: 'var(--shadow-md)',
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const stringValue = (value: unknown, fallback = '') => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return fallback
}

const numberValue = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const nestedName = (value: unknown) => {
  if (!isRecord(value)) return ''
  return stringValue(value.name || value.title || value.fullName)
}

const nestedString = (value: unknown, key: string) => {
  if (!isRecord(value)) return ''
  return stringValue(value[key])
}

function getItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!isRecord(payload)) return []

  for (const key of ['items', 'calls', 'results', 'data']) {
    const value = payload[key]
    if (Array.isArray(value)) return value
  }

  return []
}

function normalizeStatus(value: unknown): CallStatus {
  const status = stringValue(value, 'unknown').toLowerCase().replace(/\s+/g, '_')
  if (status === 'answered' || status === 'completed') return status
  if (status === 'missed' || status === 'no_answer' || status === 'noanswer') return 'missed'
  if (status === 'failed' || status === 'busy') return 'failed'
  if (status === 'queued' || status === 'pending') return 'queued'
  if (status === 'in_progress' || status === 'calling' || status === 'active') return 'in_progress'
  return 'unknown'
}

function normalizeDirection(value: unknown): CallDirection {
  const direction = stringValue(value).toLowerCase()
  return direction === 'incoming' || direction === 'inbound' ? 'incoming' : 'outgoing'
}

const DISPOSITION_LABELS: Record<DispositionValue, string> = {
  ANSWERED: 'Answered',
  NO_ANSWER: 'No Answer',
  VOICEMAIL: 'Voicemail',
  CALLBACK: 'Callback',
  WRONG_NUMBER: 'Wrong Number',
  DO_NOT_CALL: 'Do Not Call',
}

function normalizeDisposition(value: unknown): DispositionValue | null {
  const disposition = stringValue(value).toUpperCase().replace(/\s+/g, '_') as DispositionValue
  return disposition in DISPOSITION_LABELS ? disposition : null
}

function dispositionLabel(value?: DispositionValue | null) {
  return value ? DISPOSITION_LABELS[value] : ''
}

function normalizeCall(item: unknown, index: number): CallRow {
  const row = isRecord(item) ? item : {}
  const campaign = row.campaign
  const agent = row.agent
  const contact = row.contact

  const remoteName =
    stringValue(row.remoteName) ||
    stringValue(row.name) ||
    stringValue(row.contactName) ||
    nestedName(contact) ||
    null

  const remoteNumber =
    stringValue(row.remoteNumber) ||
    stringValue(row.phone) ||
    stringValue(row.phoneNumber) ||
    nestedString(contact, 'phone') ||
    stringValue(row.destination) ||
    stringValue(row.to) ||
    stringValue(row.from) ||
    'Unknown number'

  const campaignName = stringValue(row.campaignName) || nestedName(campaign) || null
  const direction = normalizeDirection(row.direction || row.type)
  const source = stringValue(row.source).toLowerCase()
  const providerCallId = stringValue(row.providerCallId).toLowerCase()
  const dynamicText = [
    remoteName,
    remoteNumber,
    stringValue(row.notes),
    nestedName(contact),
    stringValue(row.name),
  ].join(' ').toLowerCase()

  const isDynamicCallerIdBackendCall =
    campaignName === '__adhoc__' &&
    direction === 'outgoing' &&
    (
      dynamicText.includes('dynamic caller id') ||
      source.includes('sip_trunk') ||
      providerCallId.startsWith('ami_') ||
      providerCallId.startsWith('pending_ami_')
    )

  return {
    id: stringValue(row.id, `call-${index}`),
    direction,
    remoteName,
    remoteNumber,
    campaignName,
    agentName: stringValue(row.agentName) || nestedName(agent) || null,
    status: normalizeStatus(row.status || row.disposition),
    disposition: normalizeDisposition(row.disposition),
    notes: stringValue(row.notes) || null,
    callbackAt: stringValue(row.callbackAt) || nestedString(contact, 'callbackAt') || null,
    durationSeconds: numberValue(row.durationSeconds ?? row.duration),
    startedAt: stringValue(row.startedAt || row.createdAt || row.updatedAt),
    isDynamicCallerIdBackendCall,
  }
}

function normalizeResponse(payload: unknown, page: number, limit: number): PagedResponse {
  const items = getItems(payload).map(normalizeCall)
  const record = isRecord(payload) ? payload : {}

  return {
    items,
    page: numberValue(record.page ?? (isRecord(record.pagination) ? record.pagination.page : undefined), page),
    limit: numberValue(record.limit ?? (isRecord(record.pagination) ? record.pagination.limit : undefined), limit),
    total: numberValue(
      record.total ?? record.count ?? (isRecord(record.pagination) ? record.pagination.total : undefined),
      items.length
    ),
  }
}

function fmtDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function fmtDateTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

function directionIcon(direction: CallDirection) {
  if (direction === 'incoming') return <PhoneIncoming size={16} color={brand.cyan} />
  return <PhoneOutgoing size={16} color={brand.green} />
}

function statusPill(status: CallStatus) {
  if (status === 'answered' || status === 'completed') return { label: status === 'completed' ? 'COMPLETED' : 'ANSWERED', color: brand.green }
  if (status === 'missed') return { label: 'MISSED', color: brand.gold }
  if (status === 'failed') return { label: 'FAILED', color: brand.red }
  if (status === 'queued') return { label: 'QUEUED', color: brand.cyan }
  if (status === 'in_progress') return { label: 'IN PROGRESS', color: brand.purple }
  return { label: 'UNKNOWN', color: brand.faint }
}

function visibleStatusPill(call: CallRow) {
  if (call.isDynamicCallerIdBackendCall && call.status === 'unknown') {
    return { label: 'AWAITING DISPOSITION', color: brand.gold }
  }
  return statusPill(call.status)
}

function visibleCampaignName(call: CallRow) {
  if (call.isDynamicCallerIdBackendCall) return 'Manual Dynamic CID Call'
  if (call.campaignName === '__adhoc__') return 'Manual Ad-hoc Call'
  if (call.campaignName === '__sip__') return 'SIP Internal Leg'
  return call.campaignName || '-'
}

function visibleDuration(call: CallRow) {
  if (call.isDynamicCallerIdBackendCall && call.durationSeconds <= 0) return 'Pending'
  return fmtDuration(call.durationSeconds)
}

function visibleDurationDetail(call: CallRow) {
  if (call.isDynamicCallerIdBackendCall && call.durationSeconds <= 0) return 'Pending tracking'
  return fmtDuration(call.durationSeconds)
}

function callHistoryErrorMessage(err: unknown) {
  if (isRecord(err)) {
    const response = isRecord(err.response) ? err.response : null
    const status = numberValue(response?.status)
    if (status === 502 || status === 503 || status === 504) {
      return `Call history backend is not responding (HTTP ${status}). Please check the backend service and try again.`
    }

    const data = response && isRecord(response.data) ? response.data : null
    const backendMessage = stringValue(data?.message || data?.error)
    if (backendMessage) return backendMessage
  }

  if (err instanceof Error) {
    const message = err.message.toLowerCase()
    if (message.includes('timeout')) {
      return 'Call history request timed out. The backend did not respond in time.'
    }
    if (message.includes('network') || message.includes('failed to fetch')) {
      return 'Call history backend is unreachable. Please check the backend service/network and try again.'
    }
    return err.message
  }

  return 'Failed to load call history'
}

function FieldShell({ children, flex = '0 0 auto' }: { children: ReactNode; flex?: string }) {
  return (
    <div
      style={{
        flex,
        minWidth: 0,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderRadius: 999,
        border: '1px solid var(--border-strong)',
        background: 'var(--surface)',
        padding: '0 11px',
      }}
    >
      {children}
    </div>
  )
}

function DetailField({
  label,
  value,
  color,
  mono,
}: {
  label: string
  value: string
  color?: string
  mono?: boolean
}) {
  return (
    <div>
      <div style={{
        fontSize: 9.5, fontWeight: 800, color: brand.faint,
        textTransform: 'uppercase', letterSpacing: 1.0, marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 12.5,
        fontWeight: 700,
        color: color || brand.ink,
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
      }}>
        {value}
      </div>
    </div>
  )
}

export default function Calls() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftEndDate, setDraftEndDate] = useState('')
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [selectedForDisposition, setSelectedForDisposition] = useState<CallRow | null>(null)
  const [expandedId, setExpandedId] = useState<string | number | null>(null)

  const page = Math.max(1, numberValue(searchParams.get('page'), 1))
  const limit = Math.max(1, numberValue(searchParams.get('limit'), 25))
  const statusFilter = (searchParams.get('status') || '') as '' | CallStatus
  const directionFilter = (searchParams.get('direction') || '') as '' | CallDirection
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''

  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = { page, limit }
    if (statusFilter) params.status = statusFilter
    if (directionFilter) params.direction = directionFilter
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    return params
  }, [page, limit, statusFilter, directionFilter, startDate, endDate])

  const callsQuery = useQuery<PagedResponse>({
    queryKey: ['calls', queryParams],
    queryFn: async () => {
      try {
        const res = await callsAPI.getAll(queryParams, { timeout: 30000 })
        return normalizeResponse(res, page, limit)
      } catch (err) {
        if (err instanceof Error && err.message.includes('timeout')) {
          const res = await callsAPI.getAll(queryParams, { timeout: 45000 })
          return normalizeResponse(res, page, limit)
        }
        throw err
      }
    },
    staleTime: 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: previousData => previousData,
  })

  const data = callsQuery.data ?? null
  const loading = callsQuery.isLoading
  const error = callsQuery.error ? callHistoryErrorMessage(callsQuery.error) : null

  const hasNext = data ? data.page * data.limit < data.total : false
  const hasPrev = page > 1
  const dateRangeLabel = draftStartDate || draftEndDate
    ? `${draftStartDate || 'Any'} to ${draftEndDate || 'Any'}`
    : 'Date range'

  useEffect(() => {
    setDraftStartDate(startDate)
    setDraftEndDate(endDate)
  }, [startDate, endDate])

  const filteredItems = useMemo(() => {
    if (!data?.items) return []

    const withoutInternalSipLegs = data.items.filter((item) => {
      const remoteName = String(item.remoteName || '').toLowerCase()
      const remoteNumber = String(item.remoteNumber || '').toLowerCase()
      const campaignName = String(item.campaignName || '').toLowerCase()

      const isDynamicCallerIdInternalSipLeg = item.direction === 'incoming' &&
        campaignName.includes('__sip__') &&
        (remoteName.startsWith('sip ') || remoteName.startsWith('sip:') || remoteNumber.startsWith('sip:')) &&
        (remoteName.includes('@') || remoteNumber.includes('@'))

      return !isDynamicCallerIdInternalSipLeg
    })

    const query = search.trim().toLowerCase()
    if (!query) return withoutInternalSipLegs

    return withoutInternalSipLegs.filter((item) => {
      return [
        item.remoteName,
        item.remoteNumber,
        item.campaignName,
        item.agentName,
        item.status,
      ].some(value => String(value || '').toLowerCase().includes(query))
    })
  }, [data, search])

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    setSearchParams(next)
  }

  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(Math.max(1, nextPage)))
    setSearchParams(next)
  }

  const applyDateRange = () => {
    const next = new URLSearchParams(searchParams)
    if (draftStartDate) next.set('startDate', draftStartDate)
    else next.delete('startDate')
    if (draftEndDate) next.set('endDate', draftEndDate)
    else next.delete('endDate')
    next.set('page', '1')
    setSearchParams(next)
    setDatePickerOpen(false)
  }

  const clearDateRange = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('startDate')
    next.delete('endDate')
    next.set('page', '1')
    setDraftStartDate('')
    setDraftEndDate('')
    setSearchParams(next)
    setDatePickerOpen(false)
  }

  const selectedDispositionCallId = selectedForDisposition
    ? numberValue(selectedForDisposition.id, Number.NaN)
    : Number.NaN

  return (
    <div className="ptdt-mobile-page ptdt-mobile-page-calls" style={{ padding: 24, color: brand.ink }}>
      <style>{PTDT_MOBILE_PAGE_CSS}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 16,
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(145deg,rgba(251,11,140,0.25),rgba(0,245,160,0.12))',
              border: '1px solid var(--border)',
              boxShadow: '0 0 26px rgba(251,11,140,0.18)',
              flexShrink: 0,
            }}
          >
            <PhoneCall size={20} color={brand.green} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 950 }}>Call History</div>
            <div style={{ fontSize: 12, color: brand.muted, marginTop: 3 }}>
              Backend-backed SIP and campaign call records.
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 11px',
            borderRadius: 999,
            border: '1px solid var(--border)',
            background: brand.surface,
            fontSize: 11,
            color: brand.muted,
          }}
        >
          <Clock size={14} />
          <span>
            Page {data?.page ?? page} - {data?.total ?? 0} calls
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <FieldShell flex="1 1 260px">
          <Filter size={14} color={brand.cyan} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search number, name, campaign, agent..."
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              background: 'transparent',
              color: brand.ink,
              fontSize: 12,
              outline: 'none',
            }}
          />
        </FieldShell>

        <select
          value={directionFilter || ''}
          onChange={(e) => updateParam('direction', e.target.value || null)}
          style={{
            height: 36,
            borderRadius: 999,
            border: '1px solid var(--border-strong)',
            background: brand.surface,
            color: brand.ink,
            fontSize: 12,
            padding: '0 10px',
          }}
        >
          <option value="">All directions</option>
          <option value="outgoing">Outgoing</option>
          <option value="incoming">Incoming</option>
        </select>

        <select
          value={statusFilter || ''}
          onChange={(e) => updateParam('status', e.target.value || null)}
          style={{
            height: 36,
            borderRadius: 999,
            border: '1px solid var(--border-strong)',
            background: brand.surface,
            color: brand.ink,
            fontSize: 12,
            padding: '0 10px',
          }}
        >
          <option value="">All statuses</option>
          <option value="answered">Answered</option>
          <option value="missed">Missed</option>
          <option value="failed">Failed</option>
          <option value="queued">Queued</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </select>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setDatePickerOpen(value => !value)}
            style={{
              height: 36,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 999,
              border: '1px solid var(--border-strong)',
              background: brand.surface,
              color: brand.ink,
              fontSize: 12,
              padding: '0 12px',
              cursor: 'pointer',
            }}
          >
            <Calendar size={14} />
            <span>{dateRangeLabel}</span>
          </button>

          {datePickerOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                zIndex: 30,
                width: 278,
                borderRadius: 18,
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-card)',
                boxShadow: 'var(--shadow-lg)',
                padding: 12,
                display: 'grid',
                gap: 10,
              }}
            >
              <label style={{ display: 'grid', gap: 6, color: brand.muted, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                From
                <input
                  type="date"
                  value={draftStartDate}
                  onChange={(e) => setDraftStartDate(e.target.value)}
                  aria-label="Start date"
                  style={{
                    height: 34,
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: brand.ink,
                    fontSize: 12,
                    outline: 'none',
                    padding: '0 10px',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6, color: brand.muted, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                To
                <input
                  type="date"
                  value={draftEndDate}
                  onChange={(e) => setDraftEndDate(e.target.value)}
                  aria-label="End date"
                  style={{
                    height: 34,
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: brand.ink,
                    fontSize: 12,
                    outline: 'none',
                    padding: '0 10px',
                  }}
                />
              </label>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={applyDateRange}
          disabled={!draftStartDate && !draftEndDate}
          style={{
            height: 36,
            borderRadius: 999,
            border: '1px solid rgba(0,122,77,0.92)',
            background: '#007a4d',
            color: '#ffffff',
            fontSize: 11,
            fontWeight: 950,
            textTransform: 'uppercase',
            letterSpacing: 0.9,
            padding: '0 17px',
            cursor: draftStartDate || draftEndDate ? 'pointer' : 'default',
            opacity: draftStartDate || draftEndDate ? 1 : 0.78,
            boxShadow: '0 0 18px rgba(0,122,77,0.22), inset 0 -10px 18px rgba(0,48,31,0.20)',
            textShadow: '0 1px 8px rgba(0,0,0,0.55)',
          }}
        >
          GO
        </button>

          {(draftStartDate || draftEndDate || startDate || endDate) && (
            <button
              type="button"
              onClick={clearDateRange}
              style={{
                height: 36,
                borderRadius: 999,
                border: `1px solid ${brand.pink}66`,
                background: 'rgba(251,11,140,0.10)',
                color: brand.pink,
                fontSize: 10,
                fontWeight: 950,
                textTransform: 'uppercase',
                letterSpacing: 0.7,
                padding: '0 14px',
                cursor: 'pointer',
              }}
            >
              CLEAR
            </button>
          )}
      </div>

      <div style={{ ...glassPanel, borderRadius: 20, overflowX: 'auto', overflowY: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '86px minmax(180px, 1.35fr) minmax(130px, 1fr) minmax(120px, 0.8fr) 110px 150px 136px',
            minWidth: 1010,
            padding: '10px 12px',
            fontSize: 10.5,
            color: brand.faint,
            borderBottom: '1px solid var(--border)',
            textTransform: 'uppercase',
            letterSpacing: 0.9,
            fontWeight: 850,
          }}
        >
          <div>Direction</div>
          <div>Contact</div>
          <div>Campaign</div>
          <div>Agent</div>
          <div style={{ textAlign: 'right' }}>Duration</div>
          <div style={{ textAlign: 'right' }}>Started</div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              height: '100%',
              margin: '-10px -12px -10px 0',
              padding: '10px 12px 10px 16px',
            }}
          >
            <span
              style={{
                borderRadius: 999,
                border: `1px solid ${brand.pink}88`,
                background: 'linear-gradient(135deg,rgba(251,11,140,0.18),rgba(251,11,140,0.04))',
                color: brand.pink,
                padding: '6px 12px',
                boxShadow: '0 0 26px rgba(251,11,140,0.18)',
                textShadow: '0 0 16px rgba(251,11,140,0.28)',
              }}
            >
              DISPOSITION
            </span>
          </div>
        </div>

        <div>
          {loading && <div style={{ padding: 18, fontSize: 12, color: brand.muted }}>Loading call history...</div>}

          {error && !loading && <div style={{ padding: 18, fontSize: 12, color: brand.red }}>{error}</div>}

          {!loading && !error && filteredItems.length === 0 && (
            <div style={{ padding: 22, fontSize: 12, color: brand.muted, display: 'flex', alignItems: 'center', gap: 10 }}>
              <PhoneCall size={18} color={brand.faint} />
              <span>No calls found for the current filters.</span>
            </div>
          )}

          {!loading && !error && filteredItems.map((call) => {
            const pill = visibleStatusPill(call)
            const hasName = Boolean(call.remoteName)
            const isExpanded = expandedId === call.id
            const currentDisposition = dispositionLabel(call.disposition)

            return (
              <div key={call.id}>
                {/* Main row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : call.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '86px minmax(180px, 1.35fr) minmax(130px, 1fr) minmax(120px, 0.8fr) 110px 150px 136px',
                    minWidth: 1010,
                    padding: '11px 12px',
                    fontSize: 12,
                    borderTop: '1px solid var(--border)',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(251,11,140,0.05)' : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {directionIcon(call.direction)}
                    <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.7, color: pill.color }}>
                      {call.direction === 'incoming' ? 'IN' : 'OUT'}
                    </span>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {call.remoteName || call.remoteNumber}
                    </div>
                    {hasName && (
                      <div style={{ fontSize: 11, color: brand.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {call.remoteNumber}
                      </div>
                    )}
                    <div style={{ display: 'inline-flex', marginTop: 5, borderRadius: 999, border: `1px solid ${pill.color}44`, color: pill.color, padding: '3px 7px', fontSize: 9.5, fontWeight: 900 }}>
                      {pill.label}
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: call.isDynamicCallerIdBackendCall ? brand.green : brand.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: call.isDynamicCallerIdBackendCall ? 850 : 500 }}>
                    {visibleCampaignName(call)}
                  </div>

                  <div style={{ fontSize: 11, color: brand.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {call.agentName || '-'}
                  </div>

                  <div style={{ fontSize: 11, textAlign: 'right', color: call.isDynamicCallerIdBackendCall && call.durationSeconds <= 0 ? brand.gold : brand.ink, fontWeight: call.isDynamicCallerIdBackendCall && call.durationSeconds <= 0 ? 850 : 500 }}>
                    {visibleDuration(call)}
                  </div>

                  <div style={{ fontSize: 11, textAlign: 'right', color: brand.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {fmtDateTime(call.startedAt)}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      justifyItems: 'end',
                      alignItems: 'center',
                      gap: 5,
                      minHeight: 42,
                      margin: '-11px -12px -11px 0',
                      padding: '11px 12px 11px 16px',
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    {currentDisposition && (
                      <span
                        style={{
                          borderRadius: 999,
                          border: '1px solid rgba(0,167,71,0.28)',
                          background: 'rgba(0,167,71,0.08)',
                          color: brand.green,
                          padding: '3px 8px',
                          fontSize: 9,
                          fontWeight: 950,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        {currentDisposition}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedForDisposition(call)}
                      style={{
                        minWidth: 112, height: 32, borderRadius: 999,
                        border: `1px solid ${brand.pink}cc`,
                        background: 'linear-gradient(135deg,rgba(251,11,140,0.42),rgba(128,87,215,0.22),rgba(0,245,160,0.12))',
                        color: brand.ink, fontSize: 10.5, fontWeight: 950,
                        cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.45,
                        boxShadow: '0 0 24px rgba(251,11,140,0.28), inset 0 0 12px rgba(255,255,255,0.06)',
                        textShadow: '0 1px 8px rgba(0,0,0,0.5)',
                      }}
                    >
                      {call.disposition ? 'Edit disposition' : 'Set disposition'}
                    </button>
                  </div>
                </div>

                {/* Expanded drawer */}
                {isExpanded && (
                  <div style={{
                    padding: '14px 20px 18px',
                    borderTop: '1px solid rgba(251,11,140,0.18)',
                    background: 'linear-gradient(180deg,rgba(251,11,140,0.04),transparent)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 14,
                    minWidth: 1010,
                  }}>
                    <DetailField label="Full Number" value={call.remoteNumber} />
                    <DetailField label="Contact Name" value={call.remoteName || '-'} />
                    <DetailField label="Campaign" value={visibleCampaignName(call)} color={call.isDynamicCallerIdBackendCall ? brand.green : undefined} />
                    <DetailField label="Agent" value={call.agentName || '-'} />
                    <DetailField label="Status" value={pill.label} color={pill.color} />
                    <DetailField label="Disposition" value={currentDisposition || '-'} color={currentDisposition ? brand.green : undefined} />
                    <DetailField label="Notes" value={call.notes || '-'} />
                    <DetailField label="Direction" value={call.direction === 'incoming' ? 'Inbound' : 'Outbound'} />
                    <DetailField label="Duration" value={visibleDurationDetail(call)} color={call.isDynamicCallerIdBackendCall && call.durationSeconds <= 0 ? brand.gold : undefined} />
                    <DetailField label="Started At" value={fmtDateTime(call.startedAt)} />
                    <DetailField label="Call ID" value={String(call.id)} mono />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 11, color: brand.muted, flexWrap: 'wrap' }}>
        <span>
          Showing {filteredItems.length} of {data?.total ?? 0} calls
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => changePage(page - 1)}
            disabled={!hasPrev}
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              border: '1px solid var(--border-strong)',
              background: hasPrev ? brand.surface : brand.panel,
              color: brand.ink,
              display: 'grid',
              placeItems: 'center',
              cursor: hasPrev ? 'pointer' : 'default',
              opacity: hasPrev ? 1 : 0.55,
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => changePage(page + 1)}
            disabled={!hasNext}
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              border: '1px solid var(--border-strong)',
              background: hasNext ? brand.surface : brand.panel,
              color: brand.ink,
              display: 'grid',
              placeItems: 'center',
              cursor: hasNext ? 'pointer' : 'default',
              opacity: hasNext ? 1 : 0.55,
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <CallDispositionModal
        open={Boolean(selectedForDisposition) && Number.isFinite(selectedDispositionCallId)}
        callId={Number.isFinite(selectedDispositionCallId) ? selectedDispositionCallId : null}
        contactName={selectedForDisposition?.remoteName}
        contactNumber={selectedForDisposition?.remoteNumber}
        defaultDisposition={selectedForDisposition?.disposition}
        defaultNotes={selectedForDisposition?.notes}
        defaultCallbackAt={selectedForDisposition?.callbackAt}
        onClose={() => setSelectedForDisposition(null)}
        onSaved={() => { void queryClient.invalidateQueries({ queryKey: ['calls'] }) }}
      />
    </div>
  )
}
