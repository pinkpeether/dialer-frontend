import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronDown, ChevronUp, PhoneCall, RefreshCw, ShieldCheck } from 'lucide-react'
import { dynamicCallerIdApi, type DynamicCallerIdRecord } from '../api/dynamicCallerId.api'

export const DYNAMIC_CALLER_ID_SELECTION_KEY = 'ptdt-dialer:selected-dynamic-caller-id'

const PANEL_OPEN_KEY = 'ptdt-dialer:dynamic-caller-id-panel-open'

const selectableCallerIds = (items: DynamicCallerIdRecord[]) =>
  items.filter(item => item.isUsable || item.isVerified || ['ACTIVE', 'VERIFIED'].includes(String(item.approvalStatus)))

export default function DynamicCallerIdDialerSelector() {
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addonActive, setAddonActive] = useState(false)
  const [balanceState, setBalanceState] = useState('')
  const [numbers, setNumbers] = useState<DynamicCallerIdRecord[]>([])
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(PANEL_OPEN_KEY) === '1'
  })
  const [selectedId, setSelectedId] = useState(() => {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem(DYNAMIC_CALLER_ID_SELECTION_KEY) || ''
  })

  const onDialerPage = location.pathname === '/dialer'
  const selectedNumber = useMemo(() => numbers.find(item => String(item.id) === selectedId), [numbers, selectedId])

  const setPanelExpanded = (value: boolean) => {
    setExpanded(value)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PANEL_OPEN_KEY, value ? '1' : '0')
    }
  }

  const reconcileSavedSelection = (available: DynamicCallerIdRecord[]) => {
    const saved = typeof window === 'undefined' ? '' : window.localStorage.getItem(DYNAMIC_CALLER_ID_SELECTION_KEY) || ''
    const stillValid = available.some(item => String(item.id) === saved)
    if (!stillValid) {
      setSelectedId('')
      if (typeof window !== 'undefined') window.localStorage.removeItem(DYNAMIC_CALLER_ID_SELECTION_KEY)
    }
  }

  const load = async () => {
    if (!onDialerPage) return
    setLoading(true)
    setError('')
    try {
      const summary = await dynamicCallerIdApi.getSummary()
      const available = selectableCallerIds((summary.availableNumbers?.length ? summary.availableNumbers : summary.callerIds) || [])
      setAddonActive(Boolean(summary.addonActive || available.length > 0))
      setBalanceState(summary.balanceState)
      setNumbers(available)
      reconcileSavedSelection(available)
    } catch (err) {
      try {
        const all = await dynamicCallerIdApi.list()
        const available = selectableCallerIds(all)
        setAddonActive(available.length > 0)
        setBalanceState('ADMIN_CONTEXT')
        setNumbers(available)
        reconcileSavedSelection(available)
        setError(available.length ? '' : (err instanceof Error ? err.message : 'Dynamic Caller ID unavailable'))
      } catch (fallbackErr) {
        setAddonActive(false)
        setNumbers([])
        setError(fallbackErr instanceof Error ? fallbackErr.message : 'Dynamic Caller ID unavailable')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [onDialerPage]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (value: string) => {
    setSelectedId(value)
    if (typeof window === 'undefined') return
    if (value) window.localStorage.setItem(DYNAMIC_CALLER_ID_SELECTION_KEY, value)
    else window.localStorage.removeItem(DYNAMIC_CALLER_ID_SELECTION_KEY)
    window.dispatchEvent(new CustomEvent('ptdt-dynamic-caller-id-changed', { detail: { callerIdId: value || null } }))
  }

  if (!onDialerPage) return null

  const usable = numbers.length > 0
  const collapsedText = selectedNumber ? 'Dynamic Caller ID · Selected' : 'Dynamic Caller ID'

  return (
    <div
      className="ptdt-dynamic-caller-collapse"
      style={{
        position: 'fixed',
        right: 'clamp(455px, 29vw, 640px)',
        top: 18,
        zIndex: 22,
        width: expanded ? 'min(350px, calc(100vw - var(--sidebar-width, 280px) - 70px))' : 'min(250px, calc(100vw - var(--sidebar-width, 280px) - 70px))',
        transition: 'width .22s ease',
      }}
    >
      <style>{`
        @media (max-width: 900px) {
          .ptdt-dynamic-caller-collapse {
            left: 12px !important;
            right: 12px !important;
            top: 74px !important;
            width: auto !important;
          }
        }
      `}</style>

      {!expanded && (
        <button
          type="button"
          onClick={() => setPanelExpanded(true)}
          className="glass"
          style={{
            width: '100%',
            minHeight: 44,
            borderRadius: 18,
            padding: '9px 13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            border: '1px solid rgba(251,11,140,.22)',
            boxShadow: '0 14px 34px rgba(15,23,42,.12)',
            cursor: 'pointer',
            color: 'var(--text)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
            <span style={{ width: 30, height: 30, borderRadius: 12, display: 'grid', placeItems: 'center', color: '#fff', background: 'var(--grad-brand)', flexShrink: 0 }}>
              <PhoneCall size={15} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{collapsedText}</span>
              {selectedNumber && <span className="mono" style={{ display: 'block', marginTop: 1, fontSize: 9.5, color: 'var(--green-2)', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedNumber.displayNumber}</span>}
            </span>
          </span>
          <ChevronDown size={16} color="var(--pink)" />
        </button>
      )}

      {expanded && (
        <div
          className="glass"
          style={{
            width: '100%',
            padding: 13,
            borderRadius: 20,
            boxShadow: '0 18px 44px rgba(15,23,42,.16)',
            border: '1px solid rgba(251,11,140,.18)',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 9 }}>
            <button
              type="button"
              onClick={() => setPanelExpanded(false)}
              style={{
                flex: 1,
                minWidth: 0,
                border: 0,
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                textAlign: 'left',
              }}
              title="Collapse Dynamic Caller ID"
            >
              <span style={{ width: 28, height: 28, borderRadius: 12, display: 'grid', placeItems: 'center', color: '#fff', background: 'var(--grad-brand)', flexShrink: 0 }}><PhoneCall size={15} /></span>
              <span>
                <span className="mono" style={{ display: 'block', fontSize: 9.5, color: 'var(--text-3)', fontWeight: 900, letterSpacing: 1.1 }}>COMMERCIAL ADD-ON</span>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 950, color: 'var(--text)' }}>Dynamic Caller ID</span>
              </span>
              <ChevronUp size={15} color="var(--pink)" style={{ marginLeft: 'auto' }} />
            </button>
            <button type="button" className="ptdt-action-btn" onClick={() => void load()} disabled={loading} style={{ minHeight: 31, padding: '6px 9px' }} title="Refresh caller IDs">
              <RefreshCw size={13} />
            </button>
          </div>

          <select
            className="ptdt-select"
            value={selectedId}
            onChange={event => handleSelect(event.target.value)}
            disabled={loading}
            style={{ width: '100%', minHeight: 38, fontSize: 12.5, cursor: loading ? 'progress' : 'pointer' }}
          >
            <option value="">Default Caller ID / campaign fallback</option>
            {numbers.map(item => <option key={item.id} value={item.id}>{item.displayName ? `${item.displayName} — ` : ''}{item.displayNumber}</option>)}
          </select>

          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span className="ptdt-chip" style={{ color: addonActive ? 'var(--green-2)' : 'var(--danger)', borderColor: addonActive ? 'rgba(0,167,71,.24)' : 'rgba(239,68,68,.28)' }}>
              {addonActive ? 'ADD-ON ACTIVE' : 'ADD-ON INACTIVE'}
            </span>
            <span className="ptdt-chip"><ShieldCheck size={12} /> {numbers.length} verified</span>
          </div>

          {selectedNumber && <div className="mono" style={{ marginTop: 8, color: 'var(--green-2)', fontSize: 10.5, fontWeight: 900 }}>Selected: {selectedNumber.displayNumber}</div>}
          {error && <div style={{ marginTop: 8, color: 'var(--danger)', fontSize: 11, lineHeight: 1.45 }}>{error}</div>}
          {!error && !usable && <div style={{ marginTop: 8, color: 'var(--text-3)', fontSize: 11, lineHeight: 1.45 }}>No approved Dynamic Caller IDs are available for this account yet.</div>}
        </div>
      )}
    </div>
  )
}
