import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, RadioTower, RefreshCw, WalletCards } from 'lucide-react'
import { commercialControlApi, type CommercialAccount, type CommercialSummary } from '../api/commercialControl.api'
import CommercialCallingBillingPanel from '../components/CommercialCallingBillingPanel'
import { cleanDisplayText, commercialAccountLabel } from '../utils/displayText'

const cardStyle = { padding: 18, borderRadius: 18 } as const
const money = (value: string | number | null | undefined, currency = 'EUR') => `${currency} ${Number(value || 0).toFixed(2)}`
const minutes = (seconds?: number | null) => `${Math.floor(Number(seconds || 0) / 60).toLocaleString()} min`

export default function VoipBilling() {
  const [accounts, setAccounts] = useState<CommercialAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>()
  const [summary, setSummary] = useState<CommercialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const selectedAccount = useMemo(
    () => accounts.find(account => account.id === selectedAccountId) || summary?.account || accounts[0],
    [accounts, selectedAccountId, summary?.account],
  )
  const selectedCurrency = summary?.wallet?.currency || selectedAccount?.currency || 'EUR'

  const loadData = useCallback(async (accountId?: number, options: { silent?: boolean } = {}) => {
    if (options.silent) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      const nextAccounts = await commercialControlApi.listAccounts({ silent: true })
      const resolvedAccountId = accountId || nextAccounts[0]?.id
      const nextSummary = resolvedAccountId ? await commercialControlApi.getSummary(resolvedAccountId, { silent: true }) : null
      setAccounts(nextAccounts)
      setSelectedAccountId(nextSummary?.account.id || resolvedAccountId)
      setSummary(nextSummary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load VoIP billing')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void loadData(undefined, { silent: false }) }, [loadData])

  const handleAccountChange = (accountId: number) => {
    setSelectedAccountId(accountId)
    void loadData(accountId, { silent: true })
  }

  return (
    <div className="ptdt-page">
      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow green" style={{ marginBottom: 12 }}><RadioTower size={12} /> Customers</div>
          <h1 className="ptdt-page-title">VoIP <span className="gradient-brand-text">Billing</span></h1>
          <p className="ptdt-page-desc">Manage provider profiles, provider reserve, country rate cards, and customer outbound calling allowance from one focused page.</p>
        </div>
        <div className="ptdt-toolbar">
          {refreshing && <span className="ptdt-chip" style={{ color: 'var(--green-2)' }}>Refreshing...</span>}
          <button type="button" className="ptdt-action-btn" onClick={() => void loadData(selectedAccountId, { silent: true })} disabled={loading || refreshing}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="glass" style={{ padding: 14, marginBottom: 14, color: 'var(--danger)', borderColor: 'rgba(239,68,68,.28)' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <div className="glass" style={{ ...cardStyle, display: 'grid', alignContent: 'start', gap: 10 }}>
          <div className="eyebrow pink"><Building2 size={12} /> Customer Account</div>
          <select
            className="ptdt-select"
            value={selectedAccountId || ''}
            onChange={event => handleAccountChange(Number(event.target.value))}
            disabled={loading || refreshing || accounts.length === 0}
          >
            <option value="">{loading ? 'Loading customers...' : 'Select customer'}</option>
            {accounts.map(account => <option key={account.id} value={account.id}>{commercialAccountLabel(account)}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="ptdt-chip">{selectedAccount ? cleanDisplayText(selectedAccount.status) : 'No customer selected'}</span>
            <span className="ptdt-chip">{selectedCurrency}</span>
          </div>
        </div>

        <div className="glass" style={cardStyle}>
          <div className="eyebrow green"><WalletCards size={12} /> Available</div>
          <div style={{ fontSize: 24, fontWeight: 950, marginTop: 8 }}>{money(summary?.wallet?.availableBalance, selectedCurrency)}</div>
        </div>
        <div className="glass" style={cardStyle}>
          <div className="eyebrow pink"><WalletCards size={12} /> Held</div>
          <div style={{ fontSize: 24, fontWeight: 950, marginTop: 8 }}>{money(summary?.wallet?.heldBalance, selectedCurrency)}</div>
        </div>
        <div className="glass" style={cardStyle}>
          <div className="eyebrow purple"><WalletCards size={12} /> Included</div>
          <div style={{ fontSize: 24, fontWeight: 950, marginTop: 8 }}>{minutes(summary?.wallet?.includedSeconds)}</div>
        </div>
      </div>

      <CommercialCallingBillingPanel
        accountId={selectedAccountId}
        accountCurrency={selectedCurrency}
        disabled={loading || refreshing || !selectedAccountId}
        onAllowanceApplied={() => { void loadData(selectedAccountId, { silent: true }) }}
      />
    </div>
  )
}
