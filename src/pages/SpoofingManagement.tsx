import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { PhoneCall, RefreshCw, Trash2 } from 'lucide-react'
import { dynamicCallerIdApi, type DynamicCallerIdRecord, type DynamicCallerIdStatus } from '../api/dynamicCallerId.api'
import { commercialControlApi, type CommercialAccount } from '../api/commercialControl.api'
import { useAuthStore } from '../store/auth.store'

const emptyForm = { displayNumber: '' }

const statusColor = (status: string) => {
  if (status === 'ACTIVE') return 'var(--green-2)'
  if (status === 'SUSPENDED' || status === 'REJECTED') return 'var(--danger)'
  if (status === 'INACTIVE') return 'var(--text-3)'
  return 'var(--orange)'
}

const statusLabel = (status: string) => {
  if (status === 'ACTIVE') return 'ACTIVATED'
  if (status === 'INACTIVE') return 'INACTIVATED'
  return status
}

const accountLabel = (account?: CommercialAccount) => {
  if (!account) return 'Commercial account scope'
  return `${account.name} (${account.code || account.id})`
}

export default function SpoofingManagement() {
  const user = useAuthStore(state => state.user)
  const isPlatformAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'

  const [accounts, setAccounts] = useState<CommercialAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [records, setRecords] = useState<DynamicCallerIdRecord[]>([])
  const [summary, setSummary] = useState<{
    addonActive?: boolean
    availableNumbers?: DynamicCallerIdRecord[]
    account?: { id?: number; name: string; code: string }
  } | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const selectedAccount = useMemo(
    () => accounts.find(item => String(item.id) === selectedAccountId),
    [accounts, selectedAccountId],
  )

  const visibleRecords = useMemo(
    () => records.filter(item => item.approvalStatus !== 'REJECTED'),
    [records],
  )

  const activeCount = useMemo(
    () => visibleRecords.filter(item => item.isUsable).length,
    [visibleRecords],
  )

  const addonActive = Boolean(summary?.addonActive || activeCount > 0)

  const loadData = async (preferredAccountId = selectedAccountId) => {
    setLoading(true)
    setError('')

    try {
      let accountId = preferredAccountId

      if (isPlatformAdmin) {
        const nextAccounts = await commercialControlApi.listAccounts()
        setAccounts(nextAccounts)

        if (!accountId && nextAccounts.length > 0) {
          accountId = String(nextAccounts[0].id)
          setSelectedAccountId(accountId)
        }
      }

      const scopedAccountId = isPlatformAdmin ? accountId : undefined
      const nextSummary = await dynamicCallerIdApi.getSummary(scopedAccountId || undefined).catch(() => null)
      const nextRecords = await dynamicCallerIdApi.list(scopedAccountId || undefined)

      setSummary(nextSummary)
      setRecords(nextRecords)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Dynamic Caller ID data')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadData() }, [])

  const changeAccount = (value: string) => {
    setSelectedAccountId(value)
    setForm(emptyForm)
    void loadData(value)
  }

  const submitRequest = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      if (isPlatformAdmin) {
        if (!selectedAccountId) throw new Error('Please select a commercial account first.')
        await dynamicCallerIdApi.adminCreate({
          accountId: selectedAccountId,
          displayNumber: form.displayNumber,
          provider: 'illyvoip',
          status: 'INACTIVE',
        })
        setMessage('Dynamic Caller ID added. Activate it when ready.')
      } else {
        await dynamicCallerIdApi.request({
          displayNumber: form.displayNumber,
          provider: 'illyvoip',
        })
        setMessage('Dynamic Caller ID request submitted. PTDT Super Admin must activate it before use.')
      }

      setForm(emptyForm)
      await loadData(selectedAccountId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit Dynamic Caller ID')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (record: DynamicCallerIdRecord, status: DynamicCallerIdStatus) => {
    setSaving(true)
    setError('')
    setMessage('')

    try {
      await dynamicCallerIdApi.setStatus(record.id, status)
      setMessage(
        status === 'REJECTED'
          ? `Caller ID ${record.displayNumber} removed from active view.`
          : `Caller ID ${record.displayNumber} marked ${statusLabel(status)}.`,
      )
      await loadData(selectedAccountId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update Dynamic Caller ID status')
    } finally {
      setSaving(false)
    }
  }

  const activationPill = (record: DynamicCallerIdRecord) => {
    const active = record.approvalStatus === 'ACTIVE'
    const inactive = record.approvalStatus === 'INACTIVE'

    return (
      <div
        style={{
          width: 330,
          maxWidth: '100%',
          height: 44,
          borderRadius: 999,
          padding: 4,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 3,
          background: active
            ? 'linear-gradient(90deg, rgba(0,167,71,.18), rgba(0,229,160,.16))'
            : 'linear-gradient(90deg, rgba(148,163,184,.16), rgba(148,163,184,.10))',
          border: active ? '1px solid rgba(0,167,71,.35)' : '1px solid rgba(15,23,42,.18)',
          boxShadow: active ? '0 12px 28px rgba(0,167,71,.18)' : 'inset 0 1px 2px rgba(15,23,42,.08)',
        }}
      >
        <button
          type="button"
          disabled={saving || active}
          onClick={() => void updateStatus(record, 'ACTIVE')}
          style={{
            border: 0,
            borderRadius: 999,
            cursor: saving || active ? 'default' : 'pointer',
            fontWeight: 900,
            fontSize: 12,
            letterSpacing: '.02em',
            color: active ? '#fff' : 'rgba(15,23,42,.22)',
            background: active ? 'linear-gradient(180deg, #00c853, #009d3a)' : 'transparent',
            boxShadow: active ? '0 8px 18px rgba(0,167,71,.28)' : 'none',
            textShadow: active ? '0 1px 0 rgba(0,0,0,.18)' : '0 1px 0 rgba(255,255,255,.55)',
          }}
        >
          ACTIVATED
        </button>

        <button
          type="button"
          disabled={saving || inactive}
          onClick={() => void updateStatus(record, 'INACTIVE')}
          style={{
            border: 0,
            borderRadius: 999,
            cursor: saving || inactive ? 'default' : 'pointer',
            fontWeight: 900,
            fontSize: 12,
            letterSpacing: '.02em',
            color: inactive ? '#fff' : 'rgba(15,23,42,.22)',
            background: inactive ? 'linear-gradient(180deg, #6b7280, #404040)' : 'transparent',
            boxShadow: inactive ? '0 8px 18px rgba(15,23,42,.22)' : 'none',
            textShadow: inactive ? '0 1px 0 rgba(0,0,0,.18)' : '0 1px 0 rgba(255,255,255,.55)',
          }}
        >
          INACTIVATED
        </button>
      </div>
    )
  }

  const suspendedButton = (record: DynamicCallerIdRecord) => {
    const active = record.approvalStatus === 'SUSPENDED'

    return (
      <button
        className="ptdt-action-btn danger"
        type="button"
        disabled={saving || active}
        onClick={() => void updateStatus(record, 'SUSPENDED')}
        style={{
          minHeight: 44,
          borderRadius: 999,
          padding: '0 18px',
          gap: 10,
          fontWeight: 900,
          fontSize: 12,
        }}
      >
        <span
          style={{
            width: 38,
            height: 20,
            borderRadius: 999,
            padding: 2,
            background: active ? 'rgba(239,68,68,.28)' : 'rgba(148,163,184,.22)',
            border: '1px solid rgba(239,68,68,.18)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: active ? 'flex-end' : 'flex-start',
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: active ? 'var(--danger)' : 'rgba(71,85,105,.72)',
            }}
          />
        </span>
        SUSPENDED
      </button>
    )
  }

  return (
    <div className="ptdt-page">
      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}>
            <PhoneCall size={12} /> Commercial Add-on
          </div>
          <h1 className="ptdt-page-title">
            Dynamic <span className="gradient-brand-text">Caller ID</span>
          </h1>
          <p className="ptdt-page-desc">
            Customer-requested, PTDT-approved caller ID pool. Numbers may be saved with or without +.
            Only ACTIVATED caller IDs can be selected for outbound calls.
          </p>
        </div>

        <div className="ptdt-toolbar">
          <button
            type="button"
            className="ptdt-action-btn"
            onClick={() => void loadData(selectedAccountId)}
            disabled={loading || saving}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="glass" style={{ color: 'var(--danger)', marginBottom: 14, padding: 14, borderColor: 'rgba(239,68,68,.28)' }}>
          {error}
        </div>
      )}

      {message && (
        <div className="glass" style={{ color: 'var(--green-2)', marginBottom: 14, padding: 14, borderColor: 'rgba(0,167,71,.24)' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <div className="glass" style={{ padding: 18 }}>
          <div className="eyebrow green">Add-on</div>
          <h2 style={{ margin: '8px 0', color: addonActive ? 'var(--green-2)' : 'var(--danger)' }}>
            {addonActive ? 'ACTIVE' : 'INACTIVE'}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-3)' }}>
            {summary?.account ? `${summary.account.name} (${summary.account.code})` : accountLabel(selectedAccount)}
          </p>
        </div>

        <div className="glass" style={{ padding: 18 }}>
          <div className="eyebrow pink">Usable Caller IDs</div>
          <h2 style={{ margin: '8px 0' }}>{activeCount}</h2>
          <p style={{ margin: 0, color: 'var(--text-3)' }}>ACTIVATED only</p>
        </div>

        <div className="glass" style={{ padding: 18 }}>
          <div className="eyebrow purple">Control</div>
          <h2 style={{ margin: '8px 0' }}>{isPlatformAdmin ? 'PTDT Admin' : 'Customer Request'}</h2>
          <p style={{ margin: 0, color: 'var(--text-3)' }}>
            {isPlatformAdmin ? 'Add, activate, suspend, remove.' : 'Submit request; PTDT activates.'}
          </p>
        </div>
      </div>

      <form
        onSubmit={submitRequest}
        className="glass"
        style={{
          padding: 22,
          marginBottom: 18,
          borderColor: 'rgba(0,167,71,.22)',
          background: 'linear-gradient(135deg, rgba(0,229,160,.08), rgba(251,10,139,.035), rgba(255,255,255,.82))',
          boxShadow: '0 16px 44px rgba(15,23,42,.08)',
        }}
      >
        <div className="eyebrow green" style={{ marginBottom: 12 }}>Commercial Account</div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isPlatformAdmin ? 'minmax(280px, 1.05fr) minmax(260px, 1fr) auto' : 'minmax(260px, 1fr) auto',
            gap: 14,
            alignItems: 'center',
          }}
        >
          {isPlatformAdmin && (
            <div style={{ position: 'relative' }}>
              <select
                className="ptdt-input"
                value={selectedAccountId}
                onChange={event => changeAccount(event.target.value)}
                disabled={loading || saving}
                required
                style={{
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  paddingRight: 48,
                  fontFamily: 'Inter, Montserrat, system-ui, sans-serif',
                  fontWeight: 800,
                  letterSpacing: '-.015em',
                  color: 'var(--text-1)',
                }}
              >
                <option value="">Select commercial account</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {accountLabel(account)}
                  </option>
                ))}
              </select>

              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(15,23,42,.04)',
                  color: 'var(--text-2)',
                  fontWeight: 900,
                }}
              >
                ▾
              </span>
            </div>
          )}

          <input
            className="ptdt-input"
            value={form.displayNumber}
            onChange={event => setForm({ ...form, displayNumber: event.target.value })}
            placeholder="Caller ID, e.g. 14155552671 or +14155552671"
            required
            style={{
              fontFamily: 'Inter, Montserrat, system-ui, sans-serif',
              fontWeight: 650,
            }}
          />

          <button type="submit" className="btn-brand" disabled={saving} style={{ minHeight: 54, paddingInline: 28, whiteSpace: 'nowrap' }}>
            {saving ? 'Saving...' : isPlatformAdmin ? 'Add Caller ID' : 'Submit Request'}
          </button>
        </div>
      </form>

      <div className="glass" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ptdt-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1220 }}>
            <thead>
              <tr style={{ background: 'var(--bg-glass)' }}>
                {['Number', 'Account', 'Status', 'Usable', 'Actions'].map(header => (
                  <th key={header} style={{ padding: '13px 16px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 30, color: 'var(--text-3)' }}>
                    Loading Dynamic Caller IDs...
                  </td>
                </tr>
              ) : visibleRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 30, color: 'var(--text-3)' }}>
                    No Dynamic Caller IDs configured yet.
                  </td>
                </tr>
              ) : visibleRecords.map(record => (
                <tr className="table-row" key={record.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="mono" style={{ padding: '18px 16px', fontWeight: 900, fontSize: 17 }}>
                    {record.displayNumber}
                  </td>

                  <td style={{ padding: '18px 16px' }}>
                    {selectedAccount ? accountLabel(selectedAccount) : record.commercialAccountId ? `#${record.commercialAccountId}` : '—'}
                  </td>

                  <td style={{ padding: '18px 16px' }}>
                    <span className="badge" style={{ color: statusColor(record.approvalStatus), border: `1px solid ${statusColor(record.approvalStatus)}`, fontWeight: 900 }}>
                      {statusLabel(record.approvalStatus)}
                    </span>
                  </td>

                  <td style={{ padding: '18px 16px' }}>
                    {record.isUsable ? <span className="badge badge-answered">YES</span> : <span className="badge badge-pending">NO</span>}
                  </td>

                  <td style={{ padding: '16px 16px', minWidth: 620 }}>
                    {isPlatformAdmin ? (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'nowrap' }}>
                        {activationPill(record)}
                        {suspendedButton(record)}
                        <button
                          className="ptdt-action-btn danger"
                          type="button"
                          disabled={saving}
                          onClick={() => void updateStatus(record, 'REJECTED')}
                          style={{ minHeight: 44, borderRadius: 999, paddingInline: 18, fontWeight: 900, fontSize: 12 }}
                        >
                          <Trash2 size={16} /> Remove
                        </button>
                      </div>
                    ) : (
                      'PTDT activation required'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
