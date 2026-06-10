import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { BadgeDollarSign, BellRing, CreditCard, Plus, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react'
import { commercialControlApi, type CommercialAccount, type CommercialAddonCode, type CommercialCatalog, type CommercialPlanCode, type CommercialSummary, type PaymentRequest } from '../api/commercialControl.api'

const money = (value: string | number | null | undefined, currency = 'USD') => {
  const amount = Number(value || 0)
  return `${currency} ${amount.toFixed(2)}`
}

const stateColor = (state?: string) => {
  if (state === 'HEALTHY' || state === 'ACTIVE' || state === 'APPROVED') return 'var(--green-2)'
  if (state === 'LOW_BALANCE' || state === 'TRIAL' || state === 'UNDER_REVIEW') return 'var(--orange)'
  if (state === 'CRITICAL_BALANCE' || state === 'HARD_STOP' || state === 'SUSPENDED' || state === 'REJECTED') return 'var(--danger)'
  return 'var(--text-3)'
}

const cardStyle = { padding: 18, borderRadius: 18 } as const

export default function CommercialControl() {
  const [summary, setSummary] = useState<CommercialSummary | null>(null)
  const [catalog, setCatalog] = useState<CommercialCatalog | null>(null)
  const [accounts, setAccounts] = useState<CommercialAccount[]>([])
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [message, setMessage] = useState('')

  const [accountForm, setAccountForm] = useState({ name: '', code: '', email: '', phone: '', currency: 'USD' })
  const [paymentForm, setPaymentForm] = useState({ amount: '100', requestedPlanCode: 'PREMIUM' as CommercialPlanCode | '', requestedAddonCodes: ['DYNAMIC_CALLER_ID'] as CommercialAddonCode[], paymentMethod: 'Manual Bank Transfer', paymentReference: '', proofUrl: '', notes: '' })
  const [topupForm, setTopupForm] = useState({ amount: '100', reference: '', description: 'Manual wallet top-up approved by PTDT Admin' })
  const [planForm, setPlanForm] = useState({ planCode: 'PREMIUM' as CommercialPlanCode, status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TRIAL', monthlyFeeOverride: '', notes: '' })
  const [thresholdForm, setThresholdForm] = useState({ lowBalanceThreshold: '10', criticalBalanceThreshold: '3', hardStopEnabled: true })

  const currentAccountId = selectedAccountId || summary?.account.id || accounts[0]?.id
  const currentCurrency = summary?.account.currency || 'USD'

  const activePlanName = summary?.subscription?.plan?.name || 'No active plan'
  const activeAddonCodes = useMemo(() => new Set(summary?.addons.filter(item => item.status === 'ACTIVE').map(item => item.addon.code) || []), [summary])

  const runStep = useCallback(async <T,>(label: string, task: () => Promise<T>) => {
    try {
      return await task()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      throw new Error(`${label}: ${message}`, { cause: err })
    }
  }, [])

  const loadData = useCallback(async (accountId?: number) => {
    setLoading(true)
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
      setCatalog(catalogRes)
      setSummary(summaryRes)
      setAccounts(
        accountsResult.status === 'fulfilled'
          ? accountsResult.value
          : [summaryRes.account],
      )
      setPaymentRequests(requestsResult.status === 'fulfilled' ? requestsResult.value : [])
      setSelectedAccountId(resolvedAccountId)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load commercial control data')
    } finally {
      setLoading(false)
    }
  }, [runStep])

  useEffect(() => { void loadData() }, [loadData])

  const withSave = async (fn: () => Promise<void>, successMessage: string) => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await fn()
      setMessage(successMessage)
      await loadData(currentAccountId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setSaving(false)
    }
  }

  const handleSeed = () => withSave(async () => { await commercialControlApi.seedCatalog() }, 'Commercial catalog seeded and default account ensured.')

  const handleCreateAccount = (event: FormEvent) => {
    event.preventDefault()
    void withSave(async () => {
      const created = await commercialControlApi.createAccount(accountForm)
      setSelectedAccountId(created.id)
      setAccountForm({ name: '', code: '', email: '', phone: '', currency: 'USD' })
    }, 'Commercial account created.')
  }

  const handlePaymentRequest = (event: FormEvent) => {
    event.preventDefault()
    if (!currentAccountId) return
    void withSave(async () => {
      await commercialControlApi.createPaymentRequest({ accountId: currentAccountId, ...paymentForm })
      setPaymentForm(prev => ({ ...prev, paymentReference: '', proofUrl: '', notes: '' }))
    }, 'Manual payment request submitted for verification.')
  }

  const handleTopup = (event: FormEvent) => {
    event.preventDefault()
    if (!currentAccountId) return
    void withSave(async () => { await commercialControlApi.topUpWallet(currentAccountId, topupForm) }, 'Wallet balance updated.')
  }

  const handlePlanActivation = (event: FormEvent) => {
    event.preventDefault()
    if (!currentAccountId) return
    void withSave(async () => { await commercialControlApi.activatePlan(currentAccountId, planForm) }, 'Subscription plan updated.')
  }

  const handleThresholds = (event: FormEvent) => {
    event.preventDefault()
    if (!currentAccountId) return
    void withSave(async () => { await commercialControlApi.updateThresholds(currentAccountId, thresholdForm) }, 'Low-balance thresholds updated.')
  }

  const handleAddonToggle = (addonCode: CommercialAddonCode) => {
    if (!currentAccountId) return
    const nextStatus = activeAddonCodes.has(addonCode) ? 'INACTIVE' : 'ACTIVE'
    void withSave(async () => {
      await commercialControlApi.setAddonStatus(currentAccountId, addonCode, { status: nextStatus, notes: `Set from Commercial Control UI` })
    }, `${addonCode.replace(/_/g, ' ')} set to ${nextStatus}.`)
  }

  const handlePaymentStatus = (request: PaymentRequest, status: PaymentRequest['status']) => {
    void withSave(async () => { await commercialControlApi.updatePaymentRequestStatus(request.id, status) }, `Payment request #${request.id} marked ${status}.`)
  }

  return (
    <div className="ptdt-page">
      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}><CreditCard size={12} /> Phase 4 Sprint 11</div>
          <h1 className="ptdt-page-title">Commercial <span className="gradient-brand-text">Control Layer</span></h1>
          <p className="ptdt-page-desc">Control customer plan, manual payment verification, wallet balance, low-balance alerts, and paid add-ons like Dynamic Caller ID — without adding card/crypto payment gateways.</p>
        </div>
        <div className="ptdt-toolbar">
          <button type="button" className="ptdt-action-btn" onClick={() => void loadData(currentAccountId)} disabled={loading}><RefreshCw size={14} /> Refresh</button>
          <button type="button" className="btn-brand" onClick={handleSeed} disabled={saving} style={{ minHeight: 38, fontSize: 12 }}><ShieldCheck size={14} /> Seed Catalog</button>
        </div>
      </div>

      {error && <div className="glass" style={{ color: 'var(--danger)', marginBottom: 14, padding: 14, borderColor: 'rgba(239,68,68,.28)' }}>{error}</div>}
      {warning && <div className="glass" style={{ color: 'var(--orange)', marginBottom: 14, padding: 14, borderColor: 'rgba(240,185,11,.28)' }}>{warning}</div>}
      {message && <div className="glass" style={{ color: 'var(--green-2)', marginBottom: 14, padding: 14, borderColor: 'rgba(0,229,160,.28)' }}>{message}</div>}

      {loading && <div className="glass" style={{ ...cardStyle, color: 'var(--text-3)' }}>Loading commercial control data...</div>}

      {!loading && summary && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14, marginBottom: 18 }}>
            <div className="glass" style={cardStyle}>
              <div className="eyebrow green"><BadgeDollarSign size={12} /> Current Plan</div>
              <div style={{ fontSize: 26, fontWeight: 950, color: 'var(--text)', marginTop: 8 }}>{activePlanName}</div>
              <div className="mono" style={{ color: stateColor(summary.subscription?.status), marginTop: 6, fontWeight: 900 }}>{summary.subscription?.status || 'INACTIVE'}</div>
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
              <select className="ptdt-select" value={currentAccountId || ''} onChange={e => { const id = Number(e.target.value); setSelectedAccountId(id); void loadData(id) }} style={{ minWidth: 260 }}>
                {accounts.map(account => <option key={account.id} value={account.id}>{account.name} ({account.code})</option>)}
              </select>
              <span className="ptdt-chip">{summary.account.status}</span>
              <span className="ptdt-chip">{summary.account.currency}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 18 }}>
            <form onSubmit={handlePlanActivation} className="glass" style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Activate / Change Plan</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                <select className="ptdt-select" value={planForm.planCode} onChange={e => setPlanForm({ ...planForm, planCode: e.target.value as CommercialPlanCode })}>
                  {catalog?.plans.map(plan => <option key={plan.code} value={plan.code}>{plan.name} — {money(plan.monthlyFee, currentCurrency)}</option>)}
                </select>
                <select className="ptdt-select" value={planForm.status} onChange={e => setPlanForm({ ...planForm, status: e.target.value as typeof planForm.status })}>
                  <option value="ACTIVE">ACTIVE</option><option value="TRIAL">TRIAL</option><option value="INACTIVE">INACTIVE</option><option value="SUSPENDED">SUSPENDED</option>
                </select>
                <input className="ptdt-input" value={planForm.monthlyFeeOverride} onChange={e => setPlanForm({ ...planForm, monthlyFeeOverride: e.target.value })} placeholder="Optional monthly fee override" />
                <input className="ptdt-input" value={planForm.notes} onChange={e => setPlanForm({ ...planForm, notes: e.target.value })} placeholder="Internal notes" />
                <button className="btn-brand" disabled={saving}>Apply Plan</button>
              </div>
            </form>

            <form onSubmit={handleTopup} className="glass" style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Manual Wallet Top-up</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                <input className="ptdt-input" value={topupForm.amount} onChange={e => setTopupForm({ ...topupForm, amount: e.target.value })} placeholder="Amount" required />
                <input className="ptdt-input" value={topupForm.reference} onChange={e => setTopupForm({ ...topupForm, reference: e.target.value })} placeholder="Payment reference / slip number" />
                <input className="ptdt-input" value={topupForm.description} onChange={e => setTopupForm({ ...topupForm, description: e.target.value })} placeholder="Description" />
                <button className="btn-brand" disabled={saving}>Credit Wallet</button>
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
                <button className="btn-brand" disabled={saving}>Save Thresholds</button>
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
                    <button type="button" className={`ptdt-action-btn ${item.status === 'ACTIVE' ? 'danger' : 'active'}`} onClick={() => handleAddonToggle(item.addon.code)} disabled={saving}>{item.status === 'ACTIVE' ? 'Disable' : 'Enable'}</button>
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
                  {catalog?.plans.map(plan => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
                </select>
                <select className="ptdt-select" value={paymentForm.requestedAddonCodes[0] || ''} onChange={e => setPaymentForm({ ...paymentForm, requestedAddonCodes: e.target.value ? [e.target.value as CommercialAddonCode] : [] })}>
                  <option value="">No add-on</option>
                  {catalog?.addons.map(addon => <option key={addon.code} value={addon.code}>{addon.name}</option>)}
                </select>
                <input className="ptdt-input" value={paymentForm.paymentReference} onChange={e => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })} placeholder="Payment reference" />
                <input className="ptdt-input" value={paymentForm.proofUrl} onChange={e => setPaymentForm({ ...paymentForm, proofUrl: e.target.value })} placeholder="Proof URL / slip location" />
                <input className="ptdt-input" value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="Notes" />
                <button className="btn-brand" disabled={saving}>Submit Request</button>
              </div>
            </form>

            <form onSubmit={handleCreateAccount} className="glass" style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Create Commercial Account</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                <input className="ptdt-input" value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="Customer / company name" required />
                <input className="ptdt-input" value={accountForm.code} onChange={e => setAccountForm({ ...accountForm, code: e.target.value })} placeholder="Optional account code" />
                <input className="ptdt-input" value={accountForm.email} onChange={e => setAccountForm({ ...accountForm, email: e.target.value })} placeholder="Billing email" />
                <input className="ptdt-input" value={accountForm.phone} onChange={e => setAccountForm({ ...accountForm, phone: e.target.value })} placeholder="Billing phone" />
                <button className="btn-brand" disabled={saving}><Plus size={14} /> Create Account</button>
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
                    <tr key={request.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="mono" style={{ padding: '13px 16px' }}>#{request.id}</td>
                      <td style={{ padding: '13px 16px' }}>{request.account?.name || summary.account.name}</td>
                      <td style={{ padding: '13px 16px', fontWeight: 900 }}>{money(request.amount, request.currency)}</td>
                      <td style={{ padding: '13px 16px' }}>{request.requestedPlan?.name || '—'}</td>
                      <td style={{ padding: '13px 16px' }}>{Array.isArray(request.requestedAddons) && request.requestedAddons.length ? request.requestedAddons.join(', ') : '—'}</td>
                      <td style={{ padding: '13px 16px' }}>{request.paymentReference || '—'}</td>
                      <td style={{ padding: '13px 16px' }}><span className="mono" style={{ color: stateColor(request.status), fontWeight: 900 }}>{request.status}</span></td>
                      <td style={{ padding: '13px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {request.status !== 'APPROVED' && <button className="ptdt-action-btn active" type="button" onClick={() => handlePaymentStatus(request, 'APPROVED')}>Approve</button>}
                        {request.status !== 'REJECTED' && <button className="ptdt-action-btn danger" type="button" onClick={() => handlePaymentStatus(request, 'REJECTED')}>Reject</button>}
                        {request.status !== 'UNDER_REVIEW' && <button className="ptdt-action-btn" type="button" onClick={() => handlePaymentStatus(request, 'UNDER_REVIEW')}>Review</button>}
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
