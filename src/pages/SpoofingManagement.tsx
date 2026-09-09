import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { PhoneCall, RefreshCw, Trash2 } from 'lucide-react'
import { dynamicCallerIdApi, type DynamicCallerIdRecord, type DynamicCallerIdStatus } from '../api/dynamicCallerId.api'
import { commercialControlApi, type CommercialAccount } from '../api/commercialControl.api'
import { useAuthStore } from '../store/auth.store'
import { commercialAccountLabel } from '../utils/displayText'

const emptyForm = { displayNumber: '' }
const CACHE_KEY = 'ptdt-dynamic-caller-id:last-good'

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
  return commercialAccountLabel(account, 'Commercial account scope')
}

const isArchivedAccount = (account?: CommercialAccount | null) => String(account?.status || '').toUpperCase() === 'ARCHIVED'
const operationalAccounts = (accounts: CommercialAccount[] = []) => accounts.filter(account => !isArchivedAccount(account))

type DynamicCallerIdCache = {
  savedAt: string
  accounts: CommercialAccount[]
  selectedAccountId: string
  records: DynamicCallerIdRecord[]
  summary: {
    addonActive?: boolean
    availableNumbers?: DynamicCallerIdRecord[]
    account?: { id?: number; name: string; code: string }
  } | null
}

const readCache = (): DynamicCallerIdCache | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DynamicCallerIdCache
    const accounts = operationalAccounts(parsed.accounts || [])
    const selectedAccountId = accounts.some(account => String(account.id) === String(parsed.selectedAccountId)) ? String(parsed.selectedAccountId) : ''
    return { ...parsed, accounts, selectedAccountId }
  } catch {
    return null
  }
}

const writeCache = (cache: Omit<DynamicCallerIdCache, 'savedAt'>) => {
  if (typeof window === 'undefined') return
  try {
    const accounts = operationalAccounts(cache.accounts || [])
    const selectedAccountId = accounts.some(account => String(account.id) === String(cache.selectedAccountId)) ? cache.selectedAccountId : ''
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cache, accounts, selectedAccountId, savedAt: new Date().toISOString() }))
  } catch {
    // Best-effort UI cache only. Backend remains the source of truth.
  }
}

export default function SpoofingManagement() {
  const cached = useMemo(() => readCache(), [])
  const user = useAuthStore(state => state.user)
  const isPlatformAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'

  const [accounts, setAccounts] = useState<CommercialAccount[]>(isPlatformAdmin ? [] : cached?.accounts ?? [])
  const [accountsLoaded, setAccountsLoaded] = useState(!isPlatformAdmin && Boolean(cached?.accounts?.length))
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState(isPlatformAdmin ? '' : cached?.selectedAccountId ?? '')
  const [records, setRecords] = useState<DynamicCallerIdRecord[]>(isPlatformAdmin ? [] : cached?.records ?? [])
  const [summary, setSummary] = useState<{
    addonActive?: boolean
    availableNumbers?: DynamicCallerIdRecord[]
    account?: { id?: number; name: string; code: string }
  } | null>(isPlatformAdmin ? null : cached?.summary ?? null)

  const [loading, setLoading] = useState(!isPlatformAdmin && !cached?.records.length)
  const [refreshing, setRefreshing] = useState(!isPlatformAdmin && Boolean(cached?.records.length))
  const [saving, setSaving] = useState(false)
  const [pendingRecordId, setPendingRecordId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'success' | 'danger'>('success')

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

  const loadAccounts = async () => {
    if (!isPlatformAdmin || accountsLoading || accountsLoaded) return
    setAccountsLoading(true)
    setError('')

    try {
      const nextAccounts = operationalAccounts(await commercialControlApi.listAccounts())
      setAccounts(nextAccounts)
      setAccountsLoaded(true)
      if (selectedAccountId && !nextAccounts.some(account => String(account.id) === selectedAccountId)) {
        setSelectedAccountId('')
        setRecords([])
        setSummary(null)
        writeCache({ accounts: nextAccounts, selectedAccountId: '', records: [], summary: null })
      } else {
        writeCache({ accounts: nextAccounts, selectedAccountId, records, summary })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load commercial accounts')
    } finally {
      setAccountsLoading(false)
    }
  }

  const loadData = async (preferredAccountId = selectedAccountId, options: { silent?: boolean; accountSwitch?: boolean } = {}) => {
    if (isPlatformAdmin && !preferredAccountId) {
      setLoading(false)
      setRefreshing(false)
      setRecords([])
      setSummary(null)
      return
    }

    if (options.silent || records.length > 0) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      let accountId = preferredAccountId
      let nextAccounts = accounts

      if (isPlatformAdmin && !accountsLoaded) {
        nextAccounts = operationalAccounts(await commercialControlApi.listAccounts())
        setAccounts(nextAccounts)
        setAccountsLoaded(true)
      }

      if (isPlatformAdmin && accountId && !nextAccounts.some(account => String(account.id) === String(accountId))) {
        accountId = ''
        setSelectedAccountId('')
        setRecords([])
        setSummary(null)
        writeCache({ accounts: nextAccounts, selectedAccountId: '', records: [], summary: null })
        return
      }

      const scopedAccountId = isPlatformAdmin ? accountId : undefined
      const nextSummary = await dynamicCallerIdApi.getSummary(scopedAccountId || undefined).catch(() => null)
      const nextRecords = await dynamicCallerIdApi.list(scopedAccountId || undefined)

      setSummary(nextSummary)
      setRecords(nextRecords)
      writeCache({
        accounts: nextAccounts,
        selectedAccountId: accountId,
        records: nextRecords,
        summary: nextSummary,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Dynamic Caller ID data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadData(undefined, { silent: Boolean(cached?.records.length) }) }, [])

  const changeAccount = (value: string) => {
    setSelectedAccountId(value)
    setForm(emptyForm)
    if (!value) {
      setRecords([])
      setSummary(null)
      writeCache({ accounts, selectedAccountId: '', records: [], summary: null })
      return
    }
    void loadData(value, { accountSwitch: true })
  }

  const submitRequest = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    setMessageTone('success')

    try {
      if (isPlatformAdmin) {
        if (!selectedAccountId) throw new Error('Please select a commercial account first.')
        await dynamicCallerIdApi.adminCreate({
          accountId: selectedAccountId,
          displayNumber: form.displayNumber,
          status: 'INACTIVE',
        })
        setMessage('Dynamic Caller ID added. Activate it when ready.')
      } else {
        await dynamicCallerIdApi.request({
          displayNumber: form.displayNumber,
        })
        setMessage('Dynamic Caller ID request submitted. PTDT Super Admin must activate it before use.')
      }

      setForm(emptyForm)
      await loadData(selectedAccountId, { silent: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit Dynamic Caller ID')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (record: DynamicCallerIdRecord, status: DynamicCallerIdStatus) => {
    const previousRecords = records
    const optimisticRecords = records
      .map(item => item.id === record.id
        ? {
          ...item,
          approvalStatus: status,
          isActive: status === 'ACTIVE',
          isVerified: status === 'ACTIVE' ? true : item.isVerified,
          isUsable: status === 'ACTIVE',
        }
        : item)
      .filter(item => item.approvalStatus !== 'REJECTED')

    setRecords(optimisticRecords)
    writeCache({ accounts, selectedAccountId, records: optimisticRecords, summary })
    setPendingRecordId(record.id)
    setSaving(true)
    setError('')
    setMessage('')
    setMessageTone(status === 'INACTIVE' || status === 'SUSPENDED' || status === 'REJECTED' ? 'danger' : 'success')

    try {
      const updated = await dynamicCallerIdApi.setStatus(record.id, status)
      const nextRecords = optimisticRecords
        .map(item => item.id === updated.id ? updated : item)
        .filter(item => item.approvalStatus !== 'REJECTED')
      setRecords(nextRecords)
      writeCache({ accounts, selectedAccountId, records: nextRecords, summary })
      setMessage(
        status === 'REJECTED'
          ? `Caller ID ${record.displayNumber} removed from active view.`
          : `Caller ID ${record.displayNumber} marked ${statusLabel(status)}.`,
      )
      void loadData(selectedAccountId, { silent: true })
    } catch (err) {
      setRecords(previousRecords)
      writeCache({ accounts, selectedAccountId, records: previousRecords, summary })
      setError(err instanceof Error ? err.message : 'Failed to update Dynamic Caller ID status')
    } finally {
      setSaving(false)
      setPendingRecordId(null)
    }
  }

  const statusSwitch = (
    record: DynamicCallerIdRecord,
    checked: boolean,
    tone: 'green' | 'red',
    onToggle: () => void,
  ) => (
    <button
      type="button"
      aria-pressed={checked}
      disabled={pendingRecordId === record.id}
      onClick={onToggle}
      style={{
        width: 74,
        height: 38,
        borderRadius: 999,
        border: checked
          ? tone === 'green' ? '1px solid rgba(0,167,71,.42)' : '1px solid rgba(255,26,65,.42)'
          : '1px solid rgba(15,23,42,.16)',
        background: checked
          ? tone === 'green' ? 'linear-gradient(135deg, #18c964, #00a747)' : 'linear-gradient(135deg, #ff4963, #ff123f)'
          : 'linear-gradient(135deg, #777, #5f6368)',
        boxShadow: checked
          ? tone === 'green' ? '0 12px 26px rgba(0,167,71,.22)' : '0 12px 26px rgba(239,68,68,.20)'
          : 'inset 0 1px 2px rgba(15,23,42,.16)',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        margin: '0 auto',
        cursor: pendingRecordId === record.id ? 'wait' : 'pointer',
        opacity: pendingRecordId === record.id ? 0.7 : 1,
        transition: 'background .18s ease, box-shadow .18s ease, opacity .18s ease',
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 5px 14px rgba(15,23,42,.22)',
        }}
      />
    </button>
  )

  return (
    <div className="ptdt-page dynamic-cid-page">
      <div className="dynamic-cid-page-content">
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
          {refreshing && <span className="ptdt-chip">Refreshing...</span>}
          <button
            type="button"
            className="ptdt-action-btn"
            onClick={() => void loadData(selectedAccountId)}
            disabled={loading || refreshing || saving}
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
        <div
          className="glass"
          style={{
            color: messageTone === 'danger' ? 'var(--danger)' : 'var(--green-2)',
            marginBottom: 14,
            padding: 14,
            borderColor: messageTone === 'danger' ? 'rgba(239,68,68,.28)' : 'rgba(0,167,71,.24)',
          }}
        >
          {message}
        </div>
      )}

      <div
        className="dynamic-cid-summary-grid"
        style={{
          display: 'grid',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <div className="glass" style={{ padding: 18 }}>
          <div className="eyebrow green">Add-on</div>
          <h2 style={{ margin: '8px 0', color: addonActive ? 'var(--green-2)' : 'var(--danger)' }}>
            {addonActive ? 'ACTIVE' : 'INACTIVE'}
          </h2>
          <p style={{ margin: 0, color: 'var(--pink)', fontWeight: 650 }}>
            {summary?.account ? commercialAccountLabel(summary.account) : accountLabel(selectedAccount)}
          </p>
        </div>

        <div className="glass" style={{ padding: 18 }}>
          <div className="eyebrow pink">Usable Caller IDs</div>
          <h2 style={{ margin: '8px 0' }}>{activeCount}</h2>
          <p style={{ margin: 0, color: 'var(--pink)', fontWeight: 650 }}>ACTIVATED only</p>
        </div>

        <div className="glass" style={{ padding: 18 }}>
          <div className="eyebrow purple">Control</div>
          <h2 style={{ margin: '8px 0' }}>{isPlatformAdmin ? 'PTDT Admin' : 'Customer Request'}</h2>
          <p style={{ margin: 0, color: 'var(--pink)', fontWeight: 650 }}>
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
          className="dynamic-cid-form-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: isPlatformAdmin ? 'minmax(220px, .9fr) minmax(220px, 1fr) auto' : 'minmax(220px, 1fr) auto',
            gap: 14,
            alignItems: 'center',
          }}
        >
          {isPlatformAdmin && (
            <div style={{ position: 'relative' }}>
              <select
                className="ptdt-select"
                value={selectedAccountId}
                onChange={event => changeAccount(event.target.value)}
                onFocus={() => void loadAccounts()}
                onMouseDown={() => void loadAccounts()}
                disabled={loading || saving || accountsLoading}
                required
                style={{
                  fontFamily: 'Inter, Montserrat, system-ui, sans-serif',
                  fontWeight: 800,
                  letterSpacing: 0,
                  fontStretch: 'normal',
                  color: 'var(--text-1)',
                }}
              >
                <option value="">{accounts.length ? 'Select commercial account' : 'No active commercial accounts available'}</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {accountLabel(account)}
                  </option>
                ))}
              </select>
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
              letterSpacing: 0,
              fontStretch: 'normal',
              opacity: accountsLoading ? 0.45 : 1,
              transition: 'opacity .18s ease',
            }}
          />

          <button
            type="submit"
            className="btn-brand"
            disabled={saving || accountsLoading}
            style={{ minHeight: 54, paddingInline: 28, whiteSpace: 'nowrap', opacity: accountsLoading ? 0.55 : 1 }}
          >
            {saving ? 'Saving...' : isPlatformAdmin ? 'Add Caller ID' : 'Submit Request'}
          </button>
        </div>
      </form>

      <div className="glass" style={{ overflow: 'hidden', padding: 0, opacity: accountsLoading ? 0.42 : 1, transition: 'opacity .18s ease' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ptdt-table dynamic-cid-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1180, tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: 'var(--bg-glass)' }}>
                <th style={{ padding: '15px 18px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>CID Number</th>
                <th style={{ padding: '15px 18px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Commercial Account</th>
                <th style={{ padding: '15px 18px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Status</th>
                <th style={{ padding: '15px 18px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Usable</th>
                <th style={{ padding: '15px 18px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--green-2)' }}>Activate</span>/Inactivate
                </th>
                <th style={{ padding: '15px 18px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                  <div>Suspension</div>
                  <div><span style={{ color: 'var(--danger)' }}>Yes</span> / No</div>
                </th>
                <th style={{ padding: '15px 18px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && visibleRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 30, color: 'var(--text-3)' }}>
                    Loading Dynamic Caller IDs...
                  </td>
                </tr>
              ) : isPlatformAdmin && !selectedAccountId ? (
                <tr>
                  <td colSpan={7} style={{ padding: 30, color: 'var(--text-3)' }}>
                    Select commercial account to load Dynamic Caller IDs.
                  </td>
                </tr>
              ) : visibleRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 30, color: 'var(--text-3)' }}>
                    No Dynamic Caller IDs configured yet.
                  </td>
                </tr>
              ) : visibleRecords.map(record => (
                <tr
                  className="table-row"
                  key={record.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    opacity: pendingRecordId === record.id ? 0.52 : 1,
                    transition: 'opacity .18s ease',
                  }}
                >
                  <td className="mono" style={{ padding: '18px 14px', fontWeight: 900, fontSize: 15.5, whiteSpace: 'nowrap' }}>
                    {record.displayNumber}
                  </td>

                  <td style={{ padding: '18px 14px', fontSize: 12.5, lineHeight: 1.35, fontWeight: 800, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                    {selectedAccount ? accountLabel(selectedAccount) : record.commercialAccountId ? `#${record.commercialAccountId}` : '—'}
                  </td>

                  <td style={{ padding: '18px 14px', textAlign: 'center' }}>
                    <span className="badge" style={{ color: statusColor(record.approvalStatus), border: `1px solid ${statusColor(record.approvalStatus)}`, fontWeight: 900 }}>
                      {statusLabel(record.approvalStatus)}
                    </span>
                  </td>

                  <td style={{ padding: '18px 14px', textAlign: 'center' }}>
                    {record.isUsable ? <span className="badge badge-answered">YES</span> : <span className="badge badge-pending">NO</span>}
                  </td>

                  <td style={{ padding: '18px 14px', textAlign: 'center' }}>
                    {isPlatformAdmin ? (
                      statusSwitch(
                        record,
                        record.approvalStatus === 'ACTIVE',
                        'green',
                        () => void updateStatus(record, record.approvalStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'),
                      )
                    ) : (
                      'PTDT activation required'
                    )}
                  </td>

                  <td style={{ padding: '18px 14px', textAlign: 'center' }}>
                    {isPlatformAdmin ? (
                      statusSwitch(
                        record,
                        record.approvalStatus === 'SUSPENDED',
                        'red',
                        () => void updateStatus(record, record.approvalStatus === 'SUSPENDED' ? 'INACTIVE' : 'SUSPENDED'),
                      )
                    ) : (
                      '—'
                    )}
                  </td>

                  <td style={{ padding: '18px 14px', textAlign: 'center' }}>
                    {isPlatformAdmin ? (
                      <button
                        className="ptdt-action-btn danger"
                        type="button"
                        disabled={pendingRecordId === record.id}
                        onClick={() => void updateStatus(record, 'REJECTED')}
                        style={{ minHeight: 44, borderRadius: 999, paddingInline: 22, fontWeight: 900, fontSize: 12, whiteSpace: 'nowrap' }}
                      >
                        <Trash2 size={16} /> Remove
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  )
}
