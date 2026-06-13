import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { PhoneCall, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { dynamicCallerIdApi, type DynamicCallerIdRecord, type DynamicCallerIdStatus } from '../api/dynamicCallerId.api'
import { commercialControlApi, type CommercialAccount } from '../api/commercialControl.api'
import { useAuthStore } from '../store/auth.store'

const emptyForm = { displayNumber: '' }
const statusOptions: DynamicCallerIdStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED']

const statusColor = (status: string) => {
  if (status === 'ACTIVE') return 'var(--green-2)'
  if (status === 'SUSPENDED' || status === 'REJECTED') return 'var(--danger)'
  if (status === 'INACTIVE') return 'var(--text-3)'
  return 'var(--orange)'
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
  const [showForm, setShowForm] = useState(false)
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
    setShowForm(false)
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
      setShowForm(false)
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
          : `Caller ID ${record.displayNumber} marked ${status}.`,
      )
      await loadData(selectedAccountId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update Dynamic Caller ID status')
    } finally {
      setSaving(false)
    }
  }

  const actionButton = (record: DynamicCallerIdRecord, status: DynamicCallerIdStatus) => {
    const active = record.approvalStatus === status
    const danger = status === 'SUSPENDED'

    return (
      <button
        key={status}
        className={`ptdt-action-btn ${status === 'ACTIVE' ? 'active' : ''} ${danger ? 'danger' : ''}`}
        type="button"
        disabled={saving || active}
        onClick={() => void updateStatus(record, status)}
        style={{ gap: 8 }}
      >
        <span
          style={{
            width: 32,
            height: 17,
            borderRadius: 999,
            background: active
              ? danger
                ? 'rgba(239,68,68,.24)'
                : 'rgba(0,167,71,.24)'
              : 'rgba(148,163,184,.18)',
            border: '1px solid var(--border)',
            display: 'inline-flex',
            justifyContent: active ? 'flex-end' : 'flex-start',
            alignItems: 'center',
            padding: 2,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: active ? statusColor(status) : 'var(--text-3)',
            }}
          />
        </span>
        {status === 'ACTIVE' ? <ShieldCheck size={14} /> : null}
        {status}
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
            Only ACTIVE caller IDs can be selected for outbound calls.
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

          <button
            type="button"
            className="btn-brand"
            onClick={() => setShowForm(value => !value)}
            style={{ minHeight: 38, fontSize: 12 }}
          >
            <Plus size={14} /> {showForm ? 'Cancel' : isPlatformAdmin ? 'Add Caller ID' : 'Request Caller ID'}
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
          <p style={{ margin: 0, color: 'var(--text-3)' }}>ACTIVE only</p>
        </div>

        <div className="glass" style={{ padding: 18 }}>
          <div className="eyebrow purple">Control</div>
          <h2 style={{ margin: '8px 0' }}>{isPlatformAdmin ? 'PTDT Admin' : 'Customer Request'}</h2>
          <p style={{ margin: 0, color: 'var(--text-3)' }}>
            {isPlatformAdmin ? 'Add, activate, suspend, remove.' : 'Submit request; PTDT activates.'}
          </p>
        </div>
      </div>

      {isPlatformAdmin && (
        <div className="glass" style={{ padding: 16, marginBottom: 18, display: 'grid', gridTemplateColumns: 'minmax(260px, 420px)', gap: 10 }}>
          <div className="eyebrow green">Commercial Account</div>
          <select
            className="ptdt-input"
            value={selectedAccountId}
            onChange={event => changeAccount(event.target.value)}
            disabled={loading || saving}
          >
            <option value="">Select commercial account</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {accountLabel(account)}
              </option>
            ))}
          </select>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={submitRequest}
          className="glass"
          style={{ padding: 18, display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) auto', gap: 12, marginBottom: 18 }}
        >
          <input
            className="ptdt-input"
            value={form.displayNumber}
            onChange={event => setForm({ ...form, displayNumber: event.target.value })}
            placeholder="Caller ID, e.g. 923321026110 or +923321026110"
            required
          />

          <button type="submit" className="btn-brand" disabled={saving}>
            {saving ? 'Saving...' : isPlatformAdmin ? 'Add Caller ID' : 'Submit Request'}
          </button>
        </form>
      )}

      <div className="glass" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ptdt-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
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
                  <td className="mono" style={{ padding: '13px 16px', fontWeight: 900 }}>
                    {record.displayNumber}
                  </td>

                  <td style={{ padding: '13px 16px' }}>
                    {selectedAccount ? accountLabel(selectedAccount) : record.commercialAccountId ? `#${record.commercialAccountId}` : '—'}
                  </td>

                  <td style={{ padding: '13px 16px' }}>
                    <span className="badge" style={{ color: statusColor(record.approvalStatus), border: `1px solid ${statusColor(record.approvalStatus)}` }}>
                      {record.approvalStatus}
                    </span>
                  </td>

                  <td style={{ padding: '13px 16px' }}>
                    {record.isUsable ? <span className="badge badge-answered">YES</span> : <span className="badge badge-pending">NO</span>}
                  </td>

                  <td style={{ padding: '13px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {isPlatformAdmin ? (
                      <>
                        {statusOptions.map(status => actionButton(record, status))}
                        <button
                          className="ptdt-action-btn danger"
                          type="button"
                          disabled={saving}
                          onClick={() => void updateStatus(record, 'REJECTED')}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </>
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
