import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Building2, Clock3, RadioTower, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react'
import { commercialControlApi, type CommercialAccount, type CommercialSummary } from '../api/commercialControl.api'
import CommercialCallingBillingPanel from '../components/CommercialCallingBillingPanel'
import { cleanDisplayText, commercialAccountLabel } from '../utils/displayText'
import '../voip-billing.css'

const money = (value: string | number | null | undefined, currency = 'EUR') => `${currency} ${Number(value || 0).toFixed(2)}`
const minutes = (seconds?: number | null) => `${Math.floor(Number(seconds || 0) / 60).toLocaleString()} min`

const balanceTone = (state?: CommercialSummary['balanceState']) => {
  if (state === 'HEALTHY') return 'healthy'
  if (state === 'LOW_BALANCE') return 'warning'
  return 'critical'
}

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
  const accountInitials = (selectedAccount?.name || 'Customer')
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
  const walletTone = balanceTone(summary?.balanceState)

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
    <div className="ptdt-page ptdt-voip-billing-page">
      <motion.header className="ptdt-voip-page-heading" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34 }}>
        <div>
          <div className="eyebrow green"><RadioTower size={12} /> Commercial Voice</div>
          <h1 className="ptdt-page-title">VoIP <span className="gradient-brand-text">Billing</span></h1>
          <p className="ptdt-page-desc">Control customer voice credit, provider capacity and destination pricing.</p>
        </div>
        <div className="ptdt-voip-heading-meta">
          <span className="ptdt-voip-live-dot" />
          <span>Billing control plane</span>
          <span className="ptdt-voip-heading-separator" />
          <ShieldCheck size={15} />
          <strong>Super Admin</strong>
        </div>
      </motion.header>

      {error && <div className="ptdt-voip-notice is-error">{error}</div>}

      <motion.section className="ptdt-voip-account-bar" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, delay: 0.04 }}>
        <div className="ptdt-voip-account-identity">
          <span className="ptdt-voip-account-avatar">{accountInitials}</span>
          <div>
            <span className="ptdt-voip-kicker"><Building2 size={12} /> Customer account</span>
            <strong>{selectedAccount?.name || (loading ? 'Loading customer...' : 'No customer selected')}</strong>
            <span className="ptdt-voip-account-code">{selectedAccount?.code || 'Select an account to continue'}</span>
          </div>
        </div>

        <label className="ptdt-voip-customer-picker">
          <span>Working account</span>
          <select className="ptdt-select" value={selectedAccountId || ''} onChange={event => handleAccountChange(Number(event.target.value))} disabled={loading || refreshing || accounts.length === 0}>
            <option value="">{loading ? 'Loading customers...' : 'Select customer'}</option>
            {accounts.map(account => <option key={account.id} value={account.id}>{commercialAccountLabel(account)}</option>)}
          </select>
        </label>

        <div className="ptdt-voip-account-state">
          <span>Account status</span>
          <strong className={`is-${selectedAccount?.status === 'ACTIVE' ? 'active' : 'inactive'}`}><span /> {cleanDisplayText(selectedAccount?.status || 'Unavailable')}</strong>
        </div>

        <button type="button" className="ptdt-voip-refresh-btn" onClick={() => void loadData(selectedAccountId, { silent: true })} disabled={loading || refreshing} title="Refresh billing data">
          <RefreshCw size={17} className={refreshing ? 'is-spinning' : ''} />
          <span>{refreshing ? 'Syncing' : 'Refresh'}</span>
        </button>
      </motion.section>

      <motion.section className="ptdt-voip-financial-strip" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
        <div className={`ptdt-voip-balance-feature is-${walletTone}`}>
          <span className="ptdt-voip-finance-icon"><WalletCards size={20} /></span>
          <div><span>Customer wallet</span><strong>{money(summary?.wallet?.availableBalance, selectedCurrency)}</strong><small>{cleanDisplayText(summary?.balanceState || 'Awaiting wallet')}</small></div>
        </div>
        <div className="ptdt-voip-finance-metric">
          <span><Clock3 size={14} /> Minutes left</span>
          <strong>{minutes(summary?.wallet?.includedSeconds)}</strong>
          <small>{minutes(summary?.wallet?.heldIncludedSeconds)} currently held</small>
        </div>
        <div className="ptdt-voip-finance-metric">
          <span><Activity size={14} /> Held for calls</span>
          <strong>{money(summary?.wallet?.heldBalance, selectedCurrency)}</strong>
          <small>Reserved by active calls</small>
        </div>
        <div className="ptdt-voip-finance-metric">
          <span><ShieldCheck size={14} /> Credit limit</span>
          <strong>{money(summary?.wallet?.creditLimit, selectedCurrency)}</strong>
          <small>{summary?.account.hardStopEnabled ? 'Hard stop enabled' : 'Soft limit policy'}</small>
        </div>
      </motion.section>

      <CommercialCallingBillingPanel
        accountId={selectedAccountId}
        accountName={selectedAccount?.name}
        accountCode={selectedAccount?.code}
        accountCurrency={selectedCurrency}
        accountBalance={summary?.wallet?.availableBalance}
        disabled={loading || refreshing || !selectedAccountId}
        onAllowanceApplied={() => { void loadData(selectedAccountId, { silent: true }) }}
      />
    </div>
  )
}
