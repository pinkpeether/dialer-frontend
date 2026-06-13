import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PhoneCall, RefreshCw, ShieldCheck } from 'lucide-react'
import { dynamicCallerIdApi, type DynamicCallerIdRecord } from '../api/dynamicCallerId.api'

export const DYNAMIC_CALLER_ID_SELECTION_KEY = 'ptdt-dialer:selected-dynamic-caller-id'

const usableOnly = (items: DynamicCallerIdRecord[]) => items.filter(item => item.isUsable)

export default function DynamicCallerIdDialerSelector() {
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addonActive, setAddonActive] = useState(false)
  const [balanceState, setBalanceState] = useState('')
  const [numbers, setNumbers] = useState<DynamicCallerIdRecord[]>([])
  const [selectedId, setSelectedId] = useState(() => {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem(DYNAMIC_CALLER_ID_SELECTION_KEY) || ''
  })

  const onDialerPage = location.pathname === '/dialer'
  const selectedNumber = useMemo(() => numbers.find(item => String(item.id) === selectedId), [numbers, selectedId])

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
      const available = summary.availableNumbers || []
      setAddonActive(Boolean(summary.addonActive))
      setBalanceState(summary.balanceState)
      setNumbers(available)
      reconcileSavedSelection(available)
    } catch (err) {
      // Platform admins may not have a single customer account context on the Dialer page.
      // In that case, show all globally usable Dynamic Caller IDs for testing/admin calls.
      try {
        const all = await dynamicCallerIdApi.list()
        const available = usableOnly(all)
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load() }, [onDialerPage])

  const handleSelect = (value: string) => {
    setSelectedId(value)
    if (typeof window === 'undefined') return
    if (value) window.localStorage.setItem(DYNAMIC_CALLER_ID_SELECTION_KEY, value)
    else window.localStorage.removeItem(DYNAMIC_CALLER_ID_SELECTION_KEY)
    window.dispatchEvent(new CustomEvent('ptdt-dynamic-caller-id-changed', { detail: { callerIdId: value || null } }))
  }

  if (!onDialerPage) return null

  const usable = addonActive && numbers.length > 0 && balanceState !== 'HARD_STOP'

  return (
    <div
      className="glass"
      style={{
        position: 'fixed',
        right: 22,
        top: 18,
        zIndex: 20,
        width: 'min(340px, calc(100vw - 44px))',
        padding: 13,
        borderRadius: 18,
        boxShadow: '0 14px 36px rgba(15,23,42,.18)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 30, height: 30, borderRadius: 12, display: 'grid', placeItems: 'center', color: '#fff', background: 'var(--grad-brand)' }}><PhoneCall size={15} /></span>
          <div>
            <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-3)', fontWeight: 900, letterSpacing: 1.1 }}>COMMERCIAL ADD-ON</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text)' }}>Dynamic Caller ID</div>
          </div>
        </div>
        <button type="button" className="ptdt-action-btn" onClick={() => void load()} disabled={loading} style={{ minHeight: 31, padding: '6px 9px' }} title="Refresh caller IDs">
          <RefreshCw size={13} />
        </button>
      </div>

      <select
        className="ptdt-select"
        value={selectedId}
        onChange={event => handleSelect(event.target.value)}
        disabled={!usable || loading}
        style={{ width: '100%', minHeight: 38, fontSize: 12.5 }}
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

      {selectedNumber && <div className="mono" style={{ marginTop: 8, color: 'var(--green-2)', fontSize: 10.5, fontWeight: 800 }}>Selected: {selectedNumber.displayNumber}</div>}
      {error && <div style={{ marginTop: 8, color: 'var(--danger)', fontSize: 11, lineHeight: 1.45 }}>{error}</div>}
      {!error && !usable && <div style={{ marginTop: 8, color: 'var(--text-3)', fontSize: 11, lineHeight: 1.45 }}>Caller ID selector unlocks after Dynamic Caller ID add-on is active, wallet is usable, and numbers are approved.</div>}
    </div>
  )
}
