import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { BadgeDollarSign, BellRing, CreditCard, Plus, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react'
import { commercialControlApi, type CommercialAccount, type CommercialAddonCode, type CommercialCatalog, type CommercialPlanCode, type CommercialStatus, type CommercialSummary, type PaymentRequest } from '../api/commercialControl.api'
import PtdtBusyOverlay from '../components/PtdtBusyOverlay'

const money = (value: string | number | null | undefined, currency = 'USD') => {
  const amount = Number(value || 0)
  return `${currency} ${amount.toFixed(2)}`
}

const stateColor = (state?: string) => {
  if (state === 'HEALTHY' || state === 'ACTIVE' || state === 'APPROVED') return 'var(--green-2)'
  if (state === 'LOW_BALANCE' || state === 'UNDER_REVIEW') return 'var(--orange)'
  if (state === 'CRITICAL_BALANCE' || state === 'HARD_STOP' || state === 'SUSPENDED' || state === 'REJECTED') return 'var(--danger)'
  return 'var(--text-3)'
}

const cardStyle = { padding: 18, borderRadius: 18 } as const
const CACHE_KEY = 'ptdt-commercial-control:last-good'

type PlanStatusValue = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

const planOptions: Array<{ value: CommercialPlanCode; label: string }> = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
]

const normalizePlanStatus = (status?: string | null): PlanStatusValue => {
  if (status === 'ACTIVE') return 'ACTIVE'
  if (status === 'SUSPENDED') return 'SUSPENDED'
  return 'INACTIVE'
}

const planStatusLabel = (status?: string | null) => {
  const normalized = normalizePlanStatus(status)
  if (normalized === 'ACTIVE') return 'Active'
  if (normalized === 'SUSPENDED') return 'Suspended'
  return 'Non-Active'
}

const isAllowedPlanCode = (code?: string | null): code is CommercialPlanCode => Boolean(code && planOptions.some(plan => plan.value === code))
const normalizePlanCode = (code?: string | null, fallback: CommercialPlanCode = 'STANDARD'): CommercialPlanCode => isAllowedPlanCode(code) ? code : fallback

const switchStyle = (active: boolean, pending: boolean) => ({
  width: 74,
  height: 38,
  border: active ? '1px solid rgba(0, 167, 71, .62)' : '1px solid rgba(148, 163, 184, .52)',
  borderRadius: 999,
  padding: 3,
  background: active ? 'linear-gradient(135deg, #13b85f, #08a64f)' : 'linear-gradient(135deg, #f3f4f6, #d9dce2)',
  boxShadow: active ? '0 12px 24px rgba(19, 184, 95, .22)' : 'inset 0 2px 5px rgba(15, 23, 42, .12)',
  cursor: pending ? 'progress' : 'pointer',
  opacity: pending ? .72 : 1,
  transition: 'background .18s ease, border-color .18s ease, box-shadow .18s ease, opacity .18s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: active ? 'flex-end' : 'flex-start',
  flexShrink: 0,
}) as const

const switchThumbStyle = {
  width: 30,
  height: 30,
  borderRadius: '50%',
  background: '#fff',
  boxShadow: '0 4px 10px rgba(15, 23, 42, .22)',
  transition: 'transform .18s ease',
} as const

type CommercialControlCache = {
  savedAt: string
  selectedAccountId?: number
  catalog: CommercialCatalog | null
  summary: CommercialSummary | null
  accounts: CommercialAccount[]
  paymentRequests: PaymentRequest[]
}

const readCache = (): CommercialControlCache | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) as CommercialControlCache : null
  } catch {
    return null
  }
}

const writeCache = (cache: Omit<CommercialControlCache, 'savedAt'>) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cache, savedAt: new Date().toISOString() }))
  } catch {
    // Storage is best-effort; the backend remains the source of truth.
  }
}

export default function CommercialControl() {
  const cached = useMemo(() => readCache(), [])
  const [summary, setSummary] = useState<CommercialSummary | null>(cached?.summary ?? null)
  const [catalog, setCatalog] = useState<CommercialCatalog | null>(cached?.catalog ?? null)
  const [accounts, setAccounts] = useState<CommercialAccount[]>(cached?.accounts ?? [])
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>(cached?.paymentRequests ?? [])
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(cached?.selectedAccountId)
  const [loading, setLoading] = useState(!cached?.summary)
  const [refreshing, setRefreshing] = useState(Boolean(cached?.summary))
  const hasVisibleDataRef = useRef(Boolean(cached?.summary))
  const [saving, setSaving] = useState(false)
  const [pendingAddonCode, setPendingAddonCode] = useState<CommercialAddonCode | null>(null)
  const [pendingPaymentRequestId, setPendingPaymentRequestId] = useState<number | null>(null)
  const [busyLabel, setBusyLabel] = useState('Refreshing commercial control data')
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [message, setMessage] = useState('')

  const [accountForm, setAccountForm] = useState({ name: '', code: '', email: '', phone: '', currency: 'USD' })
  const [paymentForm, setPaymentForm] = useState({ amount: '100', requestedPlanCode: 'PREMIUM' as CommercialPlanCode | '', requestedAddonCodes: ['DYNAMIC_CALLER_ID'] as CommercialAddonCode[], paymentMethod: 'Manual Bank Transfer', paymentReference: '', proofUrl: '', notes: '' })
  const [topupForm, setTopupForm] = useState({ amount: '100', reference: '', description: 'Manual wallet top-up approved by PTDT Admin' })
  const [planForm, setPlanForm] = useState({ planCode: 'PREMIUM' as CommercialPlanCode, status: 'ACTIVE' as PlanStatusValue, monthlyFeeOverride: '', notes: '' })
  const [thresholdForm, setThresholdForm] = useState({ lowBalanceThreshold: '10', criticalBalanceThreshold: '3', hardStopEnabled: true })

  const currentAccountId = selectedAccountId || summary?.account.id || accounts[0]?.id
  const currentCurrency = summary?.account.currency || 'USD'
  const currentPlanStatus = normalizePlanStatus(summary?.subscription?.status || summary?.account.status)
  const initialLoading = loading && !summary
  const pageBusy = initialLoading || saving
  const refreshButtonActive = loading || refreshing

  const activePlanName = summary?.subscription?.plan?.name || 'No active plan'
  const activeAddonCodes = useMemo(() => new Set(summary?.addons.filter(item => item.status === 'ACTIVE').map(item => item.addon.code) || []), [summary])

  const applyAddonState = useCallback((current: CommercialSummary, addonCode: CommercialAddonCode, status: CommercialStatus, patch?: Partial<CommercialSummary['addons'][number]>) => ({
    ...current,
    addons: current.addons.map(item =>
      item.addon.code === addonCode
        ? { ...item, ...patch, status }
        : item,
    ),
    callerIdControl: addonCode === 'DYNAMIC_CALLER_ID'
      ? {
          ...current.callerIdControl,
          dynamicCallerIdEnabled: status === 'ACTIVE' && current.callerIdControl.activeVerifiedCallerIds > 0,
        }
      : current.callerIdControl,
  }), [])

  const runStep = useCallback(async <T,>(label: string, task: () => Promise<T>) => {
    try {
      return await task()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      throw new Error(`${label}: ${message}`, { cause: err })
    }
  }, [])

  const loadData = useCallback(async (accountId?: number, options: { silent?: boolean; label?: string } = {}) => {
    setBusyLabel(options.label || 'Refreshing commercial control data')
    if (options.silent || hasVisibleDataRef.current) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError('')
    setWarning('')
    setMessage('')
    try {
      const [catalogRes, summaryRes] = await Promise.all([
        runStep('Catalog request failed', () => commercialControlApi.getCatalog()),
        runStep('Summary request failed', () => commercialControlApi.getSummary(accountId)),
      ])
      const resolvedAccountId = summaryRes.account.id
      const [accountsResult, requestsResult] = await Promise.allSettled([
        commercialControlApi.listAccounts(),
        commercialControlApi.listPaymentRequests(resolvedAccountId),
      ])
      const nextAccounts =
        accountsResult.status === 'fulfilled'
          ? accountsResult.value
          : [summaryRes.account]
      const nextPaymentRequests = requestsResult.status === 'fulfilled' ? requestsResult.value : []
      setCatalog(catalogRes)
      setSummary(summaryRes)
      setAccounts(nextAccounts)
      setPaymentRequests(nextPaymentRequests)
      setSelectedAccountId(resolvedAccountId)
      writeCache({
        selectedAccountId: resolvedAccountId,
        catalog: catalogRes,
        summary: summaryRes,
        accounts: nextAccounts,
        paymentRequests: nextPaymentRequests,
      })
      if (accountsResult.status === 'rejected') {
        const detail = accountsResult.reason instanceof Error ? accountsResult.reason.message : 'Unknown error'
        setWarning(`Accounts list could not be refreshed. Showing current account only. ${detail}`)
      } else if (requestsResult.status === 'rejected') {
        const detail = requestsResult.reason instanceof Error ? requestsResult.reason.message : 'Unknown error'
        setWarning(`Payment requests could not be refreshed. ${detail}`)
      }
      setThresholdForm({
        lowBalanceThreshold: String(summaryRes.account.lowBalanceThreshold || '10'),
        criticalBalanceThreshold: String(summaryRes.account.criticalBalanceThreshold || '3'),
        hardStopEnabled: Boolean(summaryRes.account.hardStopEnabled),
      })
      setPlanForm(prev => ({
        ...prev,
        planCode: normalizePlanCode(summaryRes.subscription?.plan?.code, normalizePlanCode(prev.planCode)),
        status: normalizePlanStatus(summaryRes.subscription?.status || summaryRes.account.status),
        monthlyFeeOverride: '',
      }))
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Failed to load commercial control data'
      if (hasVisibleDataRef.current) {
        setWarning(`Showing cached commercial control data. ${detail}`)
      } else {
        setError(detail)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [runStep])

  useEffect(() => { void loadData(cached?.selectedAccountId, { silent: Boolean(cached?.summary), label: 'Refreshing commercial control data' }) }, [cached?.selectedAccountId, cached?.summary, loadData])

  useEffect(() => {
    hasVisibleDataRef.current = Boolean(summary)
  }, [summary])

  const withSave = async (fn: () => Promise<void>, successMessage: string, label = 'Applying commercial control changes') => {
    setBusyLabel(label)
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await fn()
      setMessage(successMessage)
      await loadData(currentAccountId, { silent: true, label: 'Refreshing commercial control data' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setSaving(false)
    }
  }

  const handleSeed = () => withSave(async () => { await commercialControlApi.seedCatalog() }, 'Commercial catalog seeded and default account ensured.', 'Seeding commercial catalog')

  const handleCreateAccount = (event: FormEvent) => {
    event.preventDefault()
    void withSave(async () => {
      const created = await commercialControlApi.createAccount(accountForm)
      setSelectedAccountId(created.id)
      setAccountForm({ name: '', code: '', email: '', phone: '', currency: 'USD' })
    }, 'Commercial account created.', 'Creating commercial account')
  }

  const handlePaymentRequest = (event: FormEvent) => {
    event.preventDefault()
    if (!currentAccountId) return
    void withSave(async () => {
      await commercialControlApi.createPaymentRequest({ accountId: currentAccountId, ...paymentForm })
      setPaymentForm(prev => ({ ...prev, paymentReference: '', proofUrl: '', notes: '' }))
    }, 'Manual payment request submitted for verification.', 'Submitting manual payment request')
  }

  const handleTopup = (event: FormEvent) => {
    event.preventDefault()
    if (!currentAccountId) return
    void withSave(async () => { await commercialControlApi.topUpWallet(currentAccountId, topupForm) }, 'Wallet balance updated.', 'Applying wallet top-up')
  }

  const handlePlanActivation = (event: FormEvent) => {
    event.preventDefault()
    if (!currentAccountId) return
    void withSave(async () => { await commercialControlApi.activatePlan(currentAccountId, planForm) }, 'Subscription plan updated.', 'Applying subscription plan')
  }

  const handleThresholds = (event: FormEvent) => {
    event.preventDefault()
    if (!currentAccountId) return
    void withSave(async () => { await commercialControlApi.updateThresholds(currentAccountId, thresholdForm) }, 'Low-balance thresholds updated.', 'Saving low-balance rules')
  }

  const handleAddonToggle = (addonCode: CommercialAddonCode) => {
    if (!currentAccountId || pendingAddonCode) return
    const nextStatus = activeAddonCodes.has(addonCode) ? 'INACTIVE' : 'ACTIVE'
    const previousSummary = summary
    if (previousSummary) {
      const optimisticSummary = applyAddonState(previousSummary, addonCode, nextStatus)
      setSummary(optimisticSummary)
      writeCache({
        selectedAccountId: optimisticSummary.account.id,
        catalog,
        summary: optimisticSummary,
        accounts,
        paymentRequests,
      })
    }
    setBusyLabel('Updating paid add-on')
    setPendingAddonCode(addonCode)
    setError('')
    setMessage('')
    void commercialControlApi
      .setAddonStatus(currentAccountId, addonCode, { status: nextStatus, notes: `Set from Commercial Control UI` })
      .then(updatedAddon => {
        setSummary(current => {
          if (!current) return current
          const nextSummary = applyAddonState(current, addonCode, updatedAddon?.status || nextStatus, {
            id: typeof updatedAddon?.id === 'number' ? updatedAddon.id : undefined,
            priceOverride: updatedAddon?.priceOverride ?? undefined,
            startsAt: updatedAddon?.startsAt ?? undefined,
            endsAt: updatedAddon?.endsAt ?? undefined,
            notes: updatedAddon?.notes ?? undefined,
          })
          writeCache({
            selectedAccountId: nextSummary.account.id,
            catalog,
            summary: nextSummary,
            accounts,
            paymentRequests,
          })
          return nextSummary
        })
        setMessage(`${addonCode.replace(/_/g, ' ')} set to ${nextStatus}.`)
      })
      .catch(err => {
        if (previousSummary) {
          setSummary(previousSummary)
          writeCache({
            selectedAccountId: previousSummary.account.id,
            catalog,
            summary: previousSummary,
            accounts,
            paymentRequests,
          })
        }
        setError(err instanceof Error ? err.message : 'Add-on update failed')
      })
      .finally(() => {
        setPendingAddonCode(null)
      })
  }

  const handlePaymentStatus = (request: PaymentRequest, status: PaymentRequest['status']) => {
    const previousRequests = paymentRequests
    const optimisticRequests = paymentRequests.map(item => item.id === request.id ? { ...item, status } : item)
    setPaymentRequests(optimisticRequests)
    writeCache({ selectedAccountId: currentAccountId, catalog, summary, accounts, paymentRequests: optimisticRequests })
    setPendingPaymentRequestId(request.id)
    setError('')
    setMessage('')

    void commercialControlApi.updatePaymentRequestStatus(request.id, status)
      .then(updated => {
        const nextRequests = optimisticRequests.map(item => item.id === updated.id ? updated : item)
        setPaymentRequests(nextRequests)
        writeCache({ selectedAccountId: currentAccountId, catalog, summary, accounts, paymentRequests: nextRequests })
        setMessage(`Payment request #${request.id} marked ${status}.`)
        void loadData(currentAccountId, { silent: true, label: 'Refreshing commercial control data' })
      })
      .catch(err => {
        setPaymentRequests(previousRequests)
        writeCache({ selectedAccountId: currentAccountId, catalog, summary, accounts, paymentRequests: previousRequests })
        setError(err instanceof Error ? err.message : 'Payment request update failed')
      })
      .finally(() => setPendingPaymentRequestId(null))
  }

  const handleAccountSwitch = (accountId: number) => {
    if (!accountId || accountId === currentAccountId) return
    setSelectedAccountId(accountId)
    void loadData(accountId, { silent: true, label: 'Switching customer account' })
  }

  return (
    <div className="ptdt-page">
      <PtdtBusyOverlay active={initialLoading} label={busyLabel} />
      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}><CreditCard size={12} /> Phase 4 Sprint 11</div>
          <h1 className="ptdt-page-title">Commercial <span className="gradient-brand-text">Control Layer</span></h1>
          <p className="ptdt-page-desc">Control customer plan, manual payment verification, wallet balance, low-balance alerts, and paid add-ons like Dynamic Caller ID — without adding card/crypto payment gateways.</p>
        </div>
        <div className="ptdt-toolbar">
          {refreshing && <span className="ptdt-chip" style={{ color: 'var(--green-2)', borderColor: 'rgba(0,167,71,.32)' }}>Refreshing...</span>}
          <button type="button" className={`ptdt-action-btn ${refreshButtonActive ? 'ptdt-refresh-active' : ''}`} onClick={() => void loadData(currentAccountId, { silent: true, label: 'Refreshing commercial control data' })} disabled={pageBusy}><RefreshCw size={14} /> Refresh</button>
          <button type="button" className="btn-brand" onClick={handleSeed} disabled={pageBusy} style={{ minHeight: 38, fontSize: 12 }}><ShieldCheck size={14} /> Seed Catalog</button>
        </div>
      </div>

      {error && <div className="glass" style={{ color: 'var(--danger)', marginBottom: 14, padding: 14, borderColor: 'rgba(239,68,68,.28)' }}>{error}</div>}
      {warning && <div className="glass" style={{ color: 'var(--orange)', marginBottom: 14, padding: 14, borderColor: 'rgba(240,185,11,.28)' }}>{warning}</div>}
      {message && <div className="glass" style={{ color: 'var(--green-2)', marginBottom: 14, padding: 14, borderColor: 'rgba(0,229,160,.28)' }}>{message}</div>}

      {initialLoading && <div className="glass" style={{ ...cardStyle, color: 'var(--text-3)' }}>Loading commercial control data...</div>}

      {!initialLoading && summary && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14, marginBottom: 18 }}>
            <div className="glass" style={cardStyle}>
              <div className="eyebrow green"><BadgeDollarSign size={12} /> Current Plan</div>
              <div style={{ fontSize: 26, fontWeight: 950, color: 'var(--text)', marginTop: 8 }}>{activePlanName}</div>
              <div className="mono" style={{ color: stateColor(currentPlanStatus), marginTop: 6, fontWeight: 900 }}>{planStatusLabel(currentPlanStatus)}</div>
            </div>
            <div className="glass" style={cardStyle}>
              <div className="eyebrow pink"><WalletCards size={12} /> Calling Wallet</div>
              <div style={{ fontSize: 26, fontWeight: 950, color: 'var(--text)', marginTop: 8 }}>{money(summary.wallet?.availableBalance, currentCurrency)}</div>
              <div className="mono" style={{ color: stateColor(summary.balanceState), marginTop: 6, fontWeight: 900 }}>{summary.balanceState.replace(/_/g, ' ')}</div>
            </div>
            <div className="glass" style={cardStyle}>
              <div className="eyebrow purple"><BellRing size={12} /> Low Balance Rules</div>
              <div style={{ fontSize: 16, fontWeight: 850, color: 'var(--text)', marginTop: 8 }}>Low: {money(summary.account.lowBalanceThreshold, currentCurrency)}</div>
              <div style={{ fontSize: 16, fontWeight: 850, color: 'var(--text)', marginTop: 6 }}>Critical: {money(summary.account.criticalBalanceThreshold, currentCurrency)}</div>
            </div>
            <div className="glass" style={cardStyle}>
              <div className="eyebrow green"><ShieldCheck size={12} /> Dynamic Caller ID</div>
              <div style={{ fontSize: 26, fontWeight: 950, color: summary.callerIdControl.dynamicCallerIdEnabled ? 'var(--green-2)' : 'var(--text-3)', marginTop: 8 }}>{summary.callerIdControl.dynamicCallerIdEnabled ? 'ACTIVE' : 'INACTIVE'}</div>
              <div className="mono" style={{ color: 'var(--text-3)', marginTop: 6 }}>{summary.callerIdControl.activeVerifiedCallerIds} active verified IDs</div>
            </div>
          </div>

          <div className="glass" style={{ padding: 16, marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong>Account:</strong>
              <select className="ptdt-select" value={currentAccountId || ''} onChange={e => handleAccountSwitch(Number(e.target.value))} disabled={pageBusy} style={{ minWidth: 260 }}>
                {accounts.map(account => <option key={account.id} value={account.id}>{account.name} ({account.code})</option>)}
              </select>
              <span className="ptdt-chip">{planStatusLabel(currentPlanStatus)}</span>
              <span className="ptdt-chip">{summary.account.currency}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 18 }}>
            <form onSubmit={handlePlanActivation} className="glass" style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Activate / Change Plan</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                <select className="ptdt-select" value={planForm.planCode} onChange={e => setPlanForm({ ...planForm, planCode: e.target.value as CommercialPlanCode })}>
                  {planOptions.map(plan => <option key={plan.value} value={plan.value}>{plan.label}</option>)}
                </select>
                <select className="ptdt-select" value={planForm.status} onChange={e => setPlanForm({ ...planForm, status: e.target.value as PlanStatusValue })}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Non-Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                <input className="ptdt-input" value={planForm.monthlyFeeOverride} onChange={e => setPlanForm({ ...planForm, monthlyFeeOverride: e.target.value })} placeholder="Optional monthly fee override" />
                <input className="ptdt-input" value={planForm.notes} onChange={e => setPlanForm({ ...planForm, notes: e.target.value })} placeholder="Private notes" />
                <button className="btn-brand" disabled={pageBusy}>Apply Plan</button>
              </div>
            </form>

            <form onSubmit={handleTopup} className="glass" style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Manual Wallet Top-up</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                <input className="ptdt-input" value={topupForm.amount} onChange={e => setTopupForm({ ...topupForm, amount: e.target.value })} placeholder="Amount" required />
                <input className="ptdt-input" value={topupForm.reference} onChange={e => setTopupForm({ ...topupForm, reference: e.target.value })} placeholder="Payment reference / slip number" />
                <input className="ptdt-input" value={topupForm.description} onChange={e => setTopupForm({ ...topupForm, description: e.target.value })} placeholder="Description" />
                <button className="btn-brand" disabled={pageBusy}>Credit Wallet</button>
              </div>
            </form>

            <form onSubmit={handleThresholds} className="glass" style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Low Balance Alerts</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                <input className="ptdt-input" value={thresholdForm.lowBalanceThreshold} onChange={e => setThresholdForm({ ...thresholdForm, lowBalanceThreshold: e.target.value })} placeholder="Low balance threshold" />
                <input className="ptdt-input" value={thresholdForm.criticalBalanceThreshold} onChange={e => setThresholdForm({ ...thresholdForm, criticalBalanceThreshold: e.target.value })} placeholder="Critical balance threshold" />
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-2)', fontWeight: 800 }}>
                  <input type="checkbox" checked={thresholdForm.hardStopEnabled} onChange={e => setThresholdForm({ ...thresholdForm, hardStopEnabled: e.target.checked })} /> Hard stop at zero balance
                </label>
                <button className="btn-brand" disabled={pageBusy}>Save Thresholds</button>
              </div>
            </form>
          </div>

          <div className="glass" style={{ ...cardStyle, marginBottom: 18 }}>
            <h3 style={{ marginTop: 0 }}>Paid Add-ons</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              {summary.addons.map(item => (
                <div key={item.addon.code} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 14, background: 'var(--bg-glass)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <strong>{item.addon.name}</strong>
                    <span className="mono" style={{ color: stateColor(item.status), fontWeight: 900 }}>{item.status}</span>
                  </div>
                  <p style={{ color: 'var(--text-3)', fontSize: 12.5, lineHeight: 1.5 }}>{item.addon.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <span className="ptdt-chip">{money(item.priceOverride || item.addon.monthlyFee, currentCurrency)}/mo</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.status === 'ACTIVE'}
                      aria-label={`${item.status === 'ACTIVE' ? 'Disable' : 'Enable'} ${item.addon.name}`}
                      title={pendingAddonCode === item.addon.code ? 'Saving...' : item.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                      onClick={() => handleAddonToggle(item.addon.code)}
                      disabled={Boolean(pendingAddonCode)}
                      style={switchStyle(item.status === 'ACTIVE', pendingAddonCode === item.addon.code)}
                    >
                      <span style={switchThumbStyle} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 18 }}>
            <form onSubmit={handlePaymentRequest} className="glass" style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Submit Manual Payment Request</h3>
              <p style={{ color: 'var(--text-3)', marginTop: -4 }}>Use this when customer pays outside PTDT-Dialer and sends slip/reference by WhatsApp or email.</p>
              <div style={{ display: 'grid', gap: 10 }}>
                <input className="ptdt-input" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="Amount" required />
                <select className="ptdt-select" value={paymentForm.requestedPlanCode} onChange={e => setPaymentForm({ ...paymentForm, requestedPlanCode: e.target.value as CommercialPlanCode | '' })}>
                  <option value="">No plan change</option>
                  {planOptions.map(plan => <option key={plan.value} value={plan.value}>{plan.label}</option>)}
                </select>
                <select className="ptdt-select" value={paymentForm.requestedAddonCodes[0] || ''} onChange={e => setPaymentForm({ ...paymentForm, requestedAddonCodes: e.target.value ? [e.target.value as CommercialAddonCode] : [] })}>
                  <option value="">No add-on</option>
                  {catalog?.addons.map(addon => <option key={addon.code} value={addon.code}>{addon.name}</option>)}
                </select>
                <input className="ptdt-input" value={paymentForm.paymentReference} onChange={e => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })} placeholder="Payment reference" />
                <input className="ptdt-input" value={paymentForm.proofUrl} onChange={e => setPaymentForm({ ...paymentForm, proofUrl: e.target.value })} placeholder="Proof URL / slip location" />
                <input className="ptdt-input" value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="Notes" />
                <button className="btn-brand" disabled={pageBusy}>Submit Request</button>
              </div>
            </form>

            <form onSubmit={handleCreateAccount} className="glass" style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Create Commercial Account</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                <input className="ptdt-input" value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="Customer / company name" required />
                <input className="ptdt-input" value={accountForm.code} onChange={e => setAccountForm({ ...accountForm, code: e.target.value })} placeholder="Optional account code" />
                <input className="ptdt-input" value={accountForm.email} onChange={e => setAccountForm({ ...accountForm, email: e.target.value })} placeholder="Billing email" />
                <input className="ptdt-input" value={accountForm.phone} onChange={e => setAccountForm({ ...accountForm, phone: e.target.value })} placeholder="Billing phone" />
                <button className="btn-brand" disabled={pageBusy}><Plus size={14} /> Create Account</button>
              </div>
            </form>
          </div>

          <div className="glass" style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
            <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}><strong>Payment Requests</strong></div>
            <div style={{ overflowX: 'auto' }}>
              <table className="ptdt-table" style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: 'var(--bg-glass)' }}>{['ID', 'Account', 'Amount', 'Plan', 'Add-ons', 'Reference', 'Status', 'Actions'].map(h => <th key={h} style={{ padding: '13px 16px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {paymentRequests.length === 0 ? <tr><td colSpan={8} style={{ padding: 22, color: 'var(--text-3)' }}>No payment requests yet.</td></tr> : paymentRequests.map(request => (
                    <tr
                      key={request.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        opacity: pendingPaymentRequestId === request.id ? 0.52 : 1,
                        transition: 'opacity .18s ease',
                      }}
                    >
                      <td className="mono" style={{ padding: '13px 16px' }}>#{request.id}</td>
                      <td style={{ padding: '13px 16px' }}>{request.account?.name || summary.account.name}</td>
                      <td style={{ padding: '13px 16px', fontWeight: 900 }}>{money(request.amount, request.currency)}</td>
                      <td style={{ padding: '13px 16px' }}>{request.requestedPlan?.name || '—'}</td>
                      <td style={{ padding: '13px 16px' }}>{Array.isArray(request.requestedAddons) && request.requestedAddons.length ? request.requestedAddons.join(', ') : '—'}</td>
                      <td style={{ padding: '13px 16px' }}>{request.paymentReference || '—'}</td>
                      <td style={{ padding: '13px 16px' }}><span className="mono" style={{ color: stateColor(request.status), fontWeight: 900 }}>{request.status}</span></td>
                      <td style={{ padding: '13px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {request.status !== 'APPROVED' && <button className="ptdt-action-btn active" type="button" disabled={pendingPaymentRequestId === request.id} onClick={() => handlePaymentStatus(request, 'APPROVED')}>Approve</button>}
                        {request.status !== 'REJECTED' && <button className="ptdt-action-btn danger" type="button" disabled={pendingPaymentRequestId === request.id} onClick={() => handlePaymentStatus(request, 'REJECTED')}>Reject</button>}
                        {request.status !== 'UNDER_REVIEW' && <button className="ptdt-action-btn" type="button" disabled={pendingPaymentRequestId === request.id} onClick={() => handlePaymentStatus(request, 'UNDER_REVIEW')}>Review</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}><strong>Latest Wallet Ledger</strong></div>
            <div style={{ overflowX: 'auto' }}>
              <table className="ptdt-table" style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: 'var(--bg-glass)' }}>{['Date', 'Type', 'Direction', 'Amount', 'Balance After', 'Description'].map(h => <th key={h} style={{ padding: '13px 16px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {summary.latestTransactions.length === 0 ? <tr><td colSpan={6} style={{ padding: 22, color: 'var(--text-3)' }}>No wallet transactions yet.</td></tr> : summary.latestTransactions.map(tx => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '13px 16px' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '13px 16px' }}>{tx.type}</td>
                      <td style={{ padding: '13px 16px' }}>{tx.direction}</td>
                      <td style={{ padding: '13px 16px', fontWeight: 900 }}>{money(tx.amount, currentCurrency)}</td>
                      <td style={{ padding: '13px 16px' }}>{money(tx.balanceAfter, currentCurrency)}</td>
                      <td style={{ padding: '13px 16px' }}>{tx.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
