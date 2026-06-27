import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Archive, BadgeDollarSign, BellRing, CreditCard, Plus, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react'
import { commercialControlApi, type CommercialAccount, type CommercialAddonCode, type CommercialCatalog, type CommercialPlanCode, type CommercialStatus, type CommercialSummary, type PaymentRequest } from '../api/commercialControl.api'
import api from '../api/axios'
import PtdtBusyOverlay from '../components/PtdtBusyOverlay'

const money = (value: string | number | null | undefined, currency = 'USD') => `${currency} ${Number(value || 0).toFixed(2)}`
const cardStyle = { padding: 18, borderRadius: 18 } as const
const CACHE_KEY = 'ptdt-commercial-control:last-good'

type PlanStatusValue = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
type LifecycleStatusValue = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED'

const planOptions: Array<{ value: CommercialPlanCode; label: string }> = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
]

const lifecycleOptions: Array<{ value: LifecycleStatusValue; label: string; help: string }> = [
  { value: 'ACTIVE', label: 'Active', help: 'Customer is live and usable.' },
  { value: 'INACTIVE', label: 'Non-Active', help: 'Customer exists but is not currently live.' },
  { value: 'SUSPENDED', label: 'Suspended', help: 'Customer is blocked or on hold by PTDT.' },
  { value: 'ARCHIVED', label: 'Archived', help: 'Customer is retired/hidden; team memberships become inactive.' },
]

const stateColor = (state?: string) => {
  if (state === 'HEALTHY' || state === 'ACTIVE' || state === 'APPROVED') return 'var(--green-2)'
  if (state === 'LOW_BALANCE' || state === 'UNDER_REVIEW' || state === 'INACTIVE') return 'var(--orange)'
  if (state === 'CRITICAL_BALANCE' || state === 'HARD_STOP' || state === 'SUSPENDED' || state === 'REJECTED' || state === 'ARCHIVED') return 'var(--danger)'
  return 'var(--text-3)'
}

const normalizePlanStatus = (status?: string | null): PlanStatusValue => {
  if (status === 'ACTIVE') return 'ACTIVE'
  if (status === 'SUSPENDED') return 'SUSPENDED'
  return 'INACTIVE'
}

const normalizeLifecycleStatus = (status?: string | null): LifecycleStatusValue => {
  if (status === 'ACTIVE') return 'ACTIVE'
  if (status === 'SUSPENDED') return 'SUSPENDED'
  if (status === 'ARCHIVED') return 'ARCHIVED'
  return 'INACTIVE'
}

const statusLabel = (status?: string | null) => {
  const normalized = normalizeLifecycleStatus(status)
  if (normalized === 'ACTIVE') return 'Active'
  if (normalized === 'SUSPENDED') return 'Suspended'
  if (normalized === 'ARCHIVED') return 'Archived'
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
  background: active ? 'linear-gradient(135deg, #13b85f, #08a64f)' : 'linear-gradient(135deg, #f3f4f6,#d9dce2)',
  cursor: pending ? 'progress' : 'pointer',
  opacity: pending ? .72 : 1,
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
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cache, savedAt: new Date().toISOString() })) } catch { /* best effort */ }
}

const updateLifecycle = async (accountId: number, status: LifecycleStatusValue, notes?: string) => {
  const res = await api.patch(`/commercial-control/admin/accounts/${accountId}/lifecycle`, { status, notes }, { timeout: 45000 })
  return res.data.data as CommercialSummary
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
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)

  const [accountForm, setAccountForm] = useState({ name: '', code: '', email: '', phone: '', currency: 'USD' })
  const [paymentForm, setPaymentForm] = useState({ amount: '100', requestedPlanCode: 'PREMIUM' as CommercialPlanCode | '', requestedAddonCodes: ['DYNAMIC_CALLER_ID'] as CommercialAddonCode[], paymentMethod: 'Manual Bank Transfer', paymentReference: '', proofUrl: '', notes: '' })
  const [topupForm, setTopupForm] = useState({ amount: '100', reference: '', description: 'Manual wallet top-up approved by PTDT Admin' })
  const [planForm, setPlanForm] = useState({ planCode: 'PREMIUM' as CommercialPlanCode, status: 'ACTIVE' as PlanStatusValue, monthlyFeeOverride: '', notes: '' })
  const [thresholdForm, setThresholdForm] = useState({ lowBalanceThreshold: '10', criticalBalanceThreshold: '3', hardStopEnabled: true })
  const [lifecycleForm, setLifecycleForm] = useState({ status: 'ACTIVE' as LifecycleStatusValue, notes: '' })

  const currentAccountId = selectedAccountId || summary?.account.id || accounts[0]?.id
  const currentCurrency = summary?.account.currency || 'USD'
  const currentLifecycleStatus = normalizeLifecycleStatus(summary?.account.status || summary?.subscription?.status)
  const currentPlanStatus = normalizePlanStatus(summary?.subscription?.status || summary?.account.status)
  const currentPlanDisplayStatus = currentLifecycleStatus === 'ARCHIVED' ? 'Suspended / Archived' : statusLabel(currentPlanStatus)
  const initialLoading = loading && !summary
  const pageBusy = initialLoading || saving
  const refreshButtonActive = loading || refreshing
  const activePlanName = summary?.subscription?.plan?.name || 'Plan not selected'
  const activeAddonCodes = useMemo(() => new Set(summary?.addons.filter(item => item.status === 'ACTIVE').map(item => item.addon.code) || []), [summary])

  const applyAddonState = useCallback((current: CommercialSummary, addonCode: CommercialAddonCode, status: CommercialStatus, patch?: Partial<CommercialSummary['addons'][number]>) => ({
    ...current,
    addons: current.addons.map(item => item.addon.code === addonCode ? { ...item, ...patch, status } : item),
    callerIdControl: addonCode === 'DYNAMIC_CALLER_ID'
      ? { ...current.callerIdControl, dynamicCallerIdEnabled: status === 'ACTIVE' && current.callerIdControl.activeVerifiedCallerIds > 0 }
      : current.callerIdControl,
  }), [])

  const runStep = useCallback(async <T,>(label: string, task: () => Promise<T>) => {
    try { return await task() } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error'
      throw new Error(`${label}: ${detail}`, { cause: err })
    }
  }, [])

  const loadData = useCallback(async (accountId?: number, options: { silent?: boolean; label?: string } = {}) => {
    setBusyLabel(options.label || 'Refreshing commercial control data')
    const requestOptions = { silent: Boolean(options.silent || hasVisibleDataRef.current) }
    if (options.silent || hasVisibleDataRef.current) setRefreshing(true)
    else setLoading(true)
    setError('')
    setWarning('')
    setMessage('')
    try {
      const [catalogRes, summaryRes] = await Promise.all([
        runStep('Catalog request failed', () => commercialControlApi.getCatalog(requestOptions)),
        runStep('Summary request failed', () => commercialControlApi.getSummary(accountId, requestOptions)),
      ])
      const resolvedAccountId = summaryRes.account.id
      const [accountsResult, requestsResult] = await Promise.allSettled([
        commercialControlApi.listAccounts(requestOptions),
        commercialControlApi.listPaymentRequests(resolvedAccountId, requestOptions),
      ])
      const nextAccounts = accountsResult.status === 'fulfilled' ? accountsResult.value : [summaryRes.account]
      const nextPaymentRequests = requestsResult.status === 'fulfilled' ? requestsResult.value : []
      setCatalog(catalogRes)
      setSummary(summaryRes)
      setAccounts(nextAccounts)
      setPaymentRequests(nextPaymentRequests)
      setSelectedAccountId(resolvedAccountId)
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
      setLifecycleForm(prev => ({ ...prev, status: normalizeLifecycleStatus(summaryRes.account.status || summaryRes.subscription?.status), notes: '' }))
      writeCache({ selectedAccountId: resolvedAccountId, catalog: catalogRes, summary: summaryRes, accounts: nextAccounts, paymentRequests: nextPaymentRequests })
      if (accountsResult.status === 'rejected') setWarning('Accounts list could not be refreshed. Showing current account only.')
      if (requestsResult.status === 'rejected') setWarning('Payment requests could not be refreshed.')
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Failed to load commercial control data'
      if (hasVisibleDataRef.current) setWarning(`Showing cached commercial control data. ${detail}`)
      else setError(detail)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [runStep])

  useEffect(() => { void loadData(cached?.selectedAccountId, { silent: Boolean(cached?.summary), label: 'Refreshing commercial control data' }) }, [cached?.selectedAccountId, cached?.summary, loadData])
  useEffect(() => { hasVisibleDataRef.current = Boolean(summary) }, [summary])
  useEffect(() => {
    if (!archiveConfirmOpen) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setArchiveConfirmOpen(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [archiveConfirmOpen])

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
  const applyLifecycle = () => {
    if (!currentAccountId) return
    void withSave(async () => {
      const nextSummary = await updateLifecycle(currentAccountId, lifecycleForm.status, lifecycleForm.notes)
      setSummary(nextSummary)
    }, `Customer account set to ${statusLabel(lifecycleForm.status)}.`, 'Updating customer lifecycle')
  }
  const handleLifecycle = (event: FormEvent) => {
    event.preventDefault()
    if (!currentAccountId) return
    if (lifecycleForm.status === 'ARCHIVED') {
      setArchiveConfirmOpen(true)
      return
    }
    applyLifecycle()
  }
  const confirmArchiveLifecycle = () => {
    setArchiveConfirmOpen(false)
    applyLifecycle()
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
    if (previousSummary) setSummary(applyAddonState(previousSummary, addonCode, nextStatus))
    setBusyLabel('Updating paid add-on')
    setPendingAddonCode(addonCode)
    setError('')
    setMessage('')
    void commercialControlApi.setAddonStatus(currentAccountId, addonCode, { status: nextStatus, notes: 'Set from Commercial Control UI' })
      .then(updatedAddon => {
        setSummary(current => current ? applyAddonState(current, addonCode, updatedAddon?.status || nextStatus, updatedAddon) : current)
        setMessage(`${addonCode.replace(/_/g, ' ')} set to ${nextStatus}.`)
      })
      .catch(err => { if (previousSummary) setSummary(previousSummary); setError(err instanceof Error ? err.message : 'Add-on update failed') })
      .finally(() => setPendingAddonCode(null))
  }
  const handlePaymentStatus = (request: PaymentRequest, status: PaymentRequest['status']) => {
    const previousRequests = paymentRequests
    const optimisticRequests = paymentRequests.map(item => item.id === request.id ? { ...item, status } : item)
    setPaymentRequests(optimisticRequests)
    setPendingPaymentRequestId(request.id)
    setError('')
    setMessage('')
    void commercialControlApi.updatePaymentRequestStatus(request.id, status)
      .then(updated => {
        setPaymentRequests(optimisticRequests.map(item => item.id === updated.id ? updated : item))
        setMessage(`Payment request #${request.id} marked ${status}.`)
        void loadData(currentAccountId, { silent: true, label: 'Refreshing commercial control data' })
      })
      .catch(err => { setPaymentRequests(previousRequests); setError(err instanceof Error ? err.message : 'Payment request update failed') })
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
      {archiveConfirmOpen && (
        <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setArchiveConfirmOpen(false) }} style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(10,12,20,.50)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          <div role="dialog" aria-modal="true" aria-labelledby="archive-account-title" onMouseDown={event => event.stopPropagation()} className="glass" style={{ width: 'min(560px, 96vw)', padding: 24, borderRadius: 24, border: '1px solid rgba(251,11,140,.28)', boxShadow: '0 28px 80px rgba(15,23,42,.32)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, display: 'grid', placeItems: 'center', color: 'var(--pink)', background: 'linear-gradient(135deg, rgba(251,11,140,.16), rgba(128,87,215,.12))', border: '1px solid rgba(251,11,140,.25)', flexShrink: 0 }}><Archive size={22} /></div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="eyebrow pink">PTDT Customer Lifecycle</div>
                <h2 id="archive-account-title" style={{ margin: '8px 0 8px', fontSize: 26, lineHeight: 1.12 }}>Archive customer account?</h2>
                <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>This will retire the selected customer account and make its team memberships inactive. The customer data remains preserved for records and audit history.</p>
              </div>
              <button type="button" aria-label="Close archive confirmation" onClick={() => setArchiveConfirmOpen(false)} style={{ width: 34, height: 34, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-glass)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'grid', gap: 10, marginTop: 18, padding: 14, borderRadius: 16, border: '1px solid rgba(239,68,68,.24)', background: 'rgba(239,68,68,.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><span style={{ color: 'var(--text-3)', fontWeight: 850 }}>Customer</span><strong>{summary?.account.name || 'Selected account'}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><span style={{ color: 'var(--text-3)', fontWeight: 850 }}>Account Code</span><strong className="mono">{summary?.account.code || '—'}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><span style={{ color: 'var(--text-3)', fontWeight: 850 }}>New Status</span><strong style={{ color: 'var(--danger)' }}>Archived</strong></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
              <button type="button" className="ptdt-action-btn" onClick={() => setArchiveConfirmOpen(false)}>Cancel</button>
              <button type="button" className="btn-brand" onClick={confirmArchiveLifecycle} disabled={pageBusy} style={{ minHeight: 40 }}>Archive Account</button>
            </div>
          </div>
        </div>
      )}

      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}><CreditCard size={12} /> Commercial Lifecycle</div>
          <h1 className="ptdt-page-title">Commercial <span className="gradient-brand-text">Control Layer</span></h1>
          <p className="ptdt-page-desc">Control customer lifecycle, plan, manual payment verification, wallet balance, low-balance alerts, and paid add-ons.</p>
        </div>
        <div className="ptdt-toolbar">
          {refreshing && <span className="ptdt-chip" style={{ color: 'var(--green-2)', borderColor: 'rgba(0,167,71,.32)' }}>Refreshing...</span>}
          <button type="button" className={`ptdt-action-btn ${refreshButtonActive ? 'ptdt-refresh-active' : ''}`} onClick={() => void loadData(currentAccountId, { silent: true })} disabled={pageBusy}><RefreshCw size={14} /> Refresh</button>
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
            <div className="glass" style={cardStyle}><div className="eyebrow green"><BadgeDollarSign size={12} /> Current Plan</div><div style={{ fontSize: 26, fontWeight: 950, color: 'var(--text)', marginTop: 8 }}>{activePlanName}</div><div className="mono" style={{ color: currentLifecycleStatus === 'ARCHIVED' ? 'var(--danger)' : stateColor(currentPlanStatus), marginTop: 6, fontWeight: 900 }}>{currentPlanDisplayStatus}</div></div>
            <div className="glass" style={cardStyle}><div className="eyebrow pink"><WalletCards size={12} /> Calling Wallet</div><div style={{ fontSize: 26, fontWeight: 950, color: 'var(--text)', marginTop: 8 }}>{money(summary.wallet?.availableBalance, currentCurrency)}</div><div className="mono" style={{ color: stateColor(summary.balanceState), marginTop: 6, fontWeight: 900 }}>{summary.balanceState.replace(/_/g, ' ')}</div></div>
            <div className="glass" style={cardStyle}><div className="eyebrow purple"><BellRing size={12} /> Low Balance Rules</div><div style={{ fontSize: 16, fontWeight: 850, color: 'var(--text)', marginTop: 8 }}>Low: {money(summary.account.lowBalanceThreshold, currentCurrency)}</div><div style={{ fontSize: 16, fontWeight: 850, color: 'var(--text)', marginTop: 6 }}>Critical: {money(summary.account.criticalBalanceThreshold, currentCurrency)}</div></div>
            <div className="glass" style={cardStyle}><div className="eyebrow green"><ShieldCheck size={12} /> Dynamic Caller ID</div><div style={{ fontSize: 26, fontWeight: 950, color: summary.callerIdControl.dynamicCallerIdEnabled ? 'var(--green-2)' : 'var(--text-3)', marginTop: 8 }}>{summary.callerIdControl.dynamicCallerIdEnabled ? 'ACTIVE' : 'INACTIVE'}</div><div className="mono" style={{ color: 'var(--text-3)', marginTop: 6 }}>{summary.callerIdControl.activeVerifiedCallerIds} active verified IDs</div></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1.15fr) minmax(320px, .85fr)', gap: 24, alignItems: 'stretch', marginBottom: 24 }}>
            <div className="glass" style={{ padding: 18, borderRadius: 18, display: 'grid', alignContent: 'start', gap: 12 }}>
              <strong style={{ fontSize: 18 }}>Account:</strong>
              <select className="ptdt-select" value={currentAccountId || ''} onChange={e => handleAccountSwitch(Number(e.target.value))} disabled={pageBusy}>{accounts.map(account => <option key={account.id} value={account.id}>{account.name} ({account.code})</option>)}</select>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span className="ptdt-chip" style={{ color: stateColor(currentLifecycleStatus) }}>{statusLabel(currentLifecycleStatus)}</span>
                <span className="ptdt-chip">{summary.account.currency}</span>
              </div>
            </div>

            <form onSubmit={handleLifecycle} className="glass" style={{ ...cardStyle, borderColor: lifecycleForm.status === 'ARCHIVED' ? 'rgba(239,68,68,.35)' : 'rgba(251,11,140,.22)', display: 'grid', alignContent: 'start', gap: 10 }}>
              <div className="eyebrow pink"><Archive size={12} /> Account Lifecycle</div>
              <h3 style={{ margin: '2px 0 0' }}>Customer Account Status</h3>
              <select className="ptdt-select" value={lifecycleForm.status} onChange={e => setLifecycleForm({ ...lifecycleForm, status: e.target.value as LifecycleStatusValue })}>{lifecycleOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              <input className="ptdt-input" value={lifecycleForm.notes} onChange={e => setLifecycleForm({ ...lifecycleForm, notes: e.target.value })} placeholder="Private lifecycle notes" />
              <p style={{ margin: 0, color: lifecycleForm.status === 'ARCHIVED' ? 'var(--danger)' : 'var(--text-3)', fontSize: 12.5, lineHeight: 1.5 }}>{lifecycleOptions.find(option => option.value === lifecycleForm.status)?.help}</p>
              <button className="btn-brand" disabled={pageBusy}>Apply Lifecycle</button>
            </form>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, marginBottom: 24 }}>
            <form onSubmit={handlePlanActivation} className="glass" style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Activate / Change Plan</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                <select className="ptdt-select" value={planForm.planCode} onChange={e => setPlanForm({ ...planForm, planCode: e.target.value as CommercialPlanCode })}>{planOptions.map(plan => <option key={plan.value} value={plan.value}>{plan.label}</option>)}</select>
                <select className="ptdt-select" value={planForm.status} onChange={e => setPlanForm({ ...planForm, status: e.target.value as PlanStatusValue })}><option value="ACTIVE">Active</option><option value="INACTIVE">Non-Active</option><option value="SUSPENDED">Suspended</option></select>
                <input className="ptdt-input" value={planForm.monthlyFeeOverride} onChange={e => setPlanForm({ ...planForm, monthlyFeeOverride: e.target.value })} placeholder="Optional monthly fee override" />
                <input className="ptdt-input" value={planForm.notes} onChange={e => setPlanForm({ ...planForm, notes: e.target.value })} placeholder="Private notes" />
                <button className="btn-brand" disabled={pageBusy}>Apply Plan</button>
              </div>
            </form>

            <form onSubmit={handleTopup} className="glass" style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Manual Wallet Top-up</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                <input className="ptdt-input" value={topupForm.amount} onChange={e => setTopupForm({ ...topupForm, amount: e.target.value })} placeholder="Amount" required />
                <input className="ptdt-input" value={topupForm.reference} onChange={e => setTopupForm({ ...topupForm, reference: e.target.value })} placeholder="Payment reference / slip number" />
                <input className="ptdt-input" value={topupForm.description} onChange={e => setTopupForm({ ...topupForm, description: e.target.value })} placeholder="Description" />
                <button className="btn-brand" disabled={pageBusy}>Credit Wallet</button>
              </div>
            </form>

            <form onSubmit={handleThresholds} className="glass" style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Low Balance Alerts</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                <input className="ptdt-input" value={thresholdForm.lowBalanceThreshold} onChange={e => setThresholdForm({ ...thresholdForm, lowBalanceThreshold: e.target.value })} placeholder="Low balance threshold" />
                <input className="ptdt-input" value={thresholdForm.criticalBalanceThreshold} onChange={e => setThresholdForm({ ...thresholdForm, criticalBalanceThreshold: e.target.value })} placeholder="Critical balance threshold" />
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-2)', fontWeight: 800 }}><input type="checkbox" checked={thresholdForm.hardStopEnabled} onChange={e => setThresholdForm({ ...thresholdForm, hardStopEnabled: e.target.checked })} /> Hard stop at zero balance</label>
                <button className="btn-brand" disabled={pageBusy}>Save Thresholds</button>
              </div>
            </form>
          </div>

          <div className="glass" style={{ ...cardStyle, marginBottom: 18 }}>
            <h3 style={{ marginTop: 0 }}>Paid Add-ons</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>{summary.addons.map(item => <div key={item.addon.code} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 14, background: 'var(--bg-glass)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><strong>{item.addon.name}</strong><span className="mono" style={{ color: stateColor(item.status), fontWeight: 900 }}>{item.status}</span></div><p style={{ color: 'var(--text-3)', fontSize: 12.5, lineHeight: 1.5 }}>{item.addon.description}</p><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}><span className="ptdt-chip">{money(item.priceOverride || item.addon.monthlyFee, currentCurrency)}/mo</span><button type="button" role="switch" aria-checked={item.status === 'ACTIVE'} aria-label={`${item.status === 'ACTIVE' ? 'Disable' : 'Enable'} ${item.addon.name}`} onClick={() => handleAddonToggle(item.addon.code)} disabled={Boolean(pendingAddonCode)} style={switchStyle(item.status === 'ACTIVE', pendingAddonCode === item.addon.code)}><span style={switchThumbStyle} /></button></div></div>)}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 18 }}>
            <form onSubmit={handlePaymentRequest} className="glass" style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Submit Manual Payment Request</h3>
              <p style={{ color: 'var(--text-3)', marginTop: -4 }}>Use this when customer pays outside PTDT-Dialer and sends slip/reference by WhatsApp or email.</p>
              <div style={{ display: 'grid', gap: 10 }}><input className="ptdt-input" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="Amount" required /><select className="ptdt-select" value={paymentForm.requestedPlanCode} onChange={e => setPaymentForm({ ...paymentForm, requestedPlanCode: e.target.value as CommercialPlanCode | '' })}><option value="">No plan change</option>{planOptions.map(plan => <option key={plan.value} value={plan.value}>{plan.label}</option>)}</select><select className="ptdt-select" value={paymentForm.requestedAddonCodes[0] || ''} onChange={e => setPaymentForm({ ...paymentForm, requestedAddonCodes: e.target.value ? [e.target.value as CommercialAddonCode] : [] })}><option value="">No add-on</option>{catalog?.addons.map(addon => <option key={addon.code} value={addon.code}>{addon.name}</option>)}</select><input className="ptdt-input" value={paymentForm.paymentReference} onChange={e => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })} placeholder="Payment reference" /><input className="ptdt-input" value={paymentForm.proofUrl} onChange={e => setPaymentForm({ ...paymentForm, proofUrl: e.target.value })} placeholder="Proof URL / slip location" /><input className="ptdt-input" value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="Notes" /><button className="btn-brand" disabled={pageBusy}>Submit Request</button></div>
            </form>

            <form onSubmit={handleCreateAccount} className="glass" style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Create Commercial Account</h3>
              <div style={{ display: 'grid', gap: 10 }}><input className="ptdt-input" value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="Customer / company name" required /><input className="ptdt-input" value={accountForm.code} onChange={e => setAccountForm({ ...accountForm, code: e.target.value })} placeholder="Optional account code" /><input className="ptdt-input" value={accountForm.email} onChange={e => setAccountForm({ ...accountForm, email: e.target.value })} placeholder="Billing email" /><input className="ptdt-input" value={accountForm.phone} onChange={e => setAccountForm({ ...accountForm, phone: e.target.value })} placeholder="Billing phone" /><button className="btn-brand" disabled={pageBusy}><Plus size={14} /> Create Account</button></div>
            </form>
          </div>

          <div className="glass" style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
            <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}><strong>Payment Requests</strong></div>
            <div style={{ overflowX: 'auto' }}><table className="ptdt-table" style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}><thead><tr style={{ background: 'var(--bg-glass)' }}>{['ID', 'Account', 'Amount', 'Plan', 'Add-ons', 'Reference', 'Status', 'Actions'].map(h => <th key={h} style={{ padding: '13px 16px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead><tbody>{paymentRequests.length === 0 ? <tr><td colSpan={8} style={{ padding: 22, color: 'var(--text-3)' }}>No payment requests yet.</td></tr> : paymentRequests.map(request => <tr key={request.id} style={{ borderBottom: '1px solid var(--border)', opacity: pendingPaymentRequestId === request.id ? 0.52 : 1 }}><td className="mono" style={{ padding: '13px 16px' }}>#{request.id}</td><td style={{ padding: '13px 16px' }}>{request.account?.name || summary.account.name}</td><td style={{ padding: '13px 16px', fontWeight: 900 }}>{money(request.amount, request.currency)}</td><td style={{ padding: '13px 16px' }}>{request.requestedPlan?.name || '—'}</td><td style={{ padding: '13px 16px' }}>{Array.isArray(request.requestedAddons) && request.requestedAddons.length ? request.requestedAddons.join(', ') : '—'}</td><td style={{ padding: '13px 16px' }}>{request.paymentReference || '—'}</td><td style={{ padding: '13px 16px' }}><span className="mono" style={{ color: stateColor(request.status), fontWeight: 900 }}>{request.status}</span></td><td style={{ padding: '13px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>{request.status !== 'APPROVED' && <button className="ptdt-action-btn active" type="button" disabled={pendingPaymentRequestId === request.id} onClick={() => handlePaymentStatus(request, 'APPROVED')}>Approve</button>}{request.status !== 'REJECTED' && <button className="ptdt-action-btn danger" type="button" disabled={pendingPaymentRequestId === request.id} onClick={() => handlePaymentStatus(request, 'REJECTED')}>Reject</button>}{request.status !== 'UNDER_REVIEW' && <button className="ptdt-action-btn" type="button" disabled={pendingPaymentRequestId === request.id} onClick={() => handlePaymentStatus(request, 'UNDER_REVIEW')}>Review</button>}</td></tr>)}</tbody></table></div>
          </div>

          <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}><strong>Latest Wallet Ledger</strong></div>
            <div style={{ overflowX: 'auto' }}><table className="ptdt-table" style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}><thead><tr style={{ background: 'var(--bg-glass)' }}>{['Date', 'Type', 'Direction', 'Amount', 'Balance After', 'Description'].map(h => <th key={h} style={{ padding: '13px 16px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead><tbody>{summary.latestTransactions.length === 0 ? <tr><td colSpan={6} style={{ padding: 22, color: 'var(--text-3)' }}>No wallet transactions yet.</td></tr> : summary.latestTransactions.map(tx => <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '13px 16px' }}>{new Date(tx.createdAt).toLocaleString()}</td><td style={{ padding: '13px 16px' }}>{tx.type}</td><td style={{ padding: '13px 16px' }}>{tx.direction}</td><td style={{ padding: '13px 16px', fontWeight: 900 }}>{money(tx.amount, currentCurrency)}</td><td style={{ padding: '13px 16px' }}>{money(tx.balanceAfter, currentCurrency)}</td><td style={{ padding: '13px 16px' }}>{tx.description || '—'}</td></tr>)}</tbody></table></div>
          </div>
        </>
      )}
    </div>
  )
}
