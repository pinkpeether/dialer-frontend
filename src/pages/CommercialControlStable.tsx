import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeDollarSign, BellRing, CreditCard, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react'
import { commercialControlApi, type CommercialAccount, type CommercialAddonCode, type CommercialCatalog, type CommercialPlanCode, type CommercialStatus, type CommercialSummary, type PaymentRequest } from '../api/commercialControl.api'
import PtdtBusyOverlay from '../components/PtdtBusyOverlay'
import { commercialAccountLabel } from '../utils/displayText'

type CommercialData = { catalog: CommercialCatalog; summary: CommercialSummary; accounts: CommercialAccount[]; paymentRequests: PaymentRequest[] }
type CachedCommercialData = { selectedAccountId?: number; data: CommercialData; savedAt: string }

const CACHE_KEY = 'ptdt-commercial-control:swr-v2'
const SELECTED_KEY = 'ptdt-commercial-control:selected-v2'
const cardStyle = { padding: 18, borderRadius: 18 } as const
const money = (value: string | number | null | undefined, currency = 'USD') => `${currency} ${Number(value || 0).toFixed(2)}`
const stateColor = (state?: string) => state === 'ACTIVE' || state === 'HEALTHY' || state === 'APPROVED' ? 'var(--green-2)' : state === 'SUSPENDED' || state === 'REJECTED' || state === 'HARD_STOP' ? 'var(--danger)' : 'var(--text-3)'

function readCache(): CachedCommercialData | null {
  if (typeof window === 'undefined') return null
  try { const raw = window.localStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw) as CachedCommercialData : null } catch { return null }
}

function readSelected(cached: CachedCommercialData | null) {
  if (typeof window === 'undefined') return cached?.selectedAccountId
  const raw = window.localStorage.getItem(SELECTED_KEY)
  const value = raw ? Number(raw) : cached?.selectedAccountId
  return Number.isFinite(value) ? value : undefined
}

function writeCache(selectedAccountId: number | undefined, data: CommercialData) {
  if (typeof window === 'undefined') return
  try {
    if (selectedAccountId) window.localStorage.setItem(SELECTED_KEY, String(selectedAccountId))
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ selectedAccountId, data, savedAt: new Date().toISOString() }))
  } catch { /* ignore localStorage cache write failures */ }
}

async function fetchCommercialData(accountId?: number): Promise<CommercialData> {
  const [catalog, summary] = await Promise.all([commercialControlApi.getCatalog(), commercialControlApi.getSummary(accountId)])
  const [accountsResult, paymentsResult] = await Promise.allSettled([
    commercialControlApi.listAccounts(),
    commercialControlApi.listPaymentRequests(summary.account.id),
  ])
  return {
    catalog,
    summary,
    accounts: accountsResult.status === 'fulfilled' ? accountsResult.value : [summary.account],
    paymentRequests: paymentsResult.status === 'fulfilled' ? paymentsResult.value : [],
  }
}

const switchStyle = (active: boolean) => ({
  width: 74, height: 38, borderRadius: 999, padding: 3,
  border: active ? '1px solid rgba(0,167,71,.62)' : '1px solid rgba(148,163,184,.52)',
  background: active ? 'linear-gradient(135deg,#13b85f,#08a64f)' : 'linear-gradient(135deg,#f3f4f6,#d9dce2)',
  display: 'flex', alignItems: 'center', justifyContent: active ? 'flex-end' : 'flex-start', cursor: 'pointer',
}) as const
const switchThumbStyle = { width: 30, height: 30, borderRadius: '50%', background: '#fff', boxShadow: '0 4px 10px rgba(15,23,42,.22)' } as const

export default function CommercialControlStable() {
  const queryClient = useQueryClient()
  const cached = useMemo(() => readCache(), [])
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(() => readSelected(cached))
  const [busyLabel, setBusyLabel] = useState('Applying commercial control changes')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [planForm, setPlanForm] = useState({ planCode: 'PREMIUM' as CommercialPlanCode, status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TRIAL', monthlyFeeOverride: '', notes: '' })
  const [topupForm, setTopupForm] = useState({ amount: '100', reference: '', description: 'Manual wallet top-up approved by PTDT Admin' })
  const [thresholdForm, setThresholdForm] = useState({ lowBalanceThreshold: '10', criticalBalanceThreshold: '3', hardStopEnabled: true })

  const query = useQuery({
    queryKey: ['commercial-control-stable', selectedAccountId],
    queryFn: () => fetchCommercialData(selectedAccountId),
    initialData: cached?.data,
    staleTime: 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: previousData => previousData,
  })

  const data = query.data
  const summary = data?.summary
  const catalog = data?.catalog
  const accounts = data?.accounts || []
  const currentAccountId = selectedAccountId || summary?.account.id || accounts[0]?.id
  const currentCurrency = summary?.account.currency || 'USD'

  useEffect(() => {
    if (!data?.summary) return
    const nextId = selectedAccountId || data.summary.account.id
    if (!selectedAccountId) setSelectedAccountId(nextId)
    writeCache(nextId, data)
    setThresholdForm({
      lowBalanceThreshold: String(data.summary.account.lowBalanceThreshold || '10'),
      criticalBalanceThreshold: String(data.summary.account.criticalBalanceThreshold || '3'),
      hardStopEnabled: Boolean(data.summary.account.hardStopEnabled),
    })
  }, [data, selectedAccountId])

  const run = async (label: string, task: () => Promise<unknown>, success: string) => {
    setBusyLabel(label); setBusy(true); setError(''); setMessage('')
    try {
      await task()
      await queryClient.invalidateQueries({ queryKey: ['commercial-control-stable'] })
      if (currentAccountId) await queryClient.fetchQuery({ queryKey: ['commercial-control-stable', currentAccountId], queryFn: () => fetchCommercialData(currentAccountId) })
      setMessage(success)
    } catch (err) { setError(err instanceof Error ? err.message : 'Action failed') }
    finally { setBusy(false) }
  }

  const switchAccount = async (accountId: number) => {
    if (!accountId || accountId === currentAccountId) return
    setSelectedAccountId(accountId)
    if (typeof window !== 'undefined') window.localStorage.setItem(SELECTED_KEY, String(accountId))
    await run('Switching customer account', () => queryClient.fetchQuery({ queryKey: ['commercial-control-stable', accountId], queryFn: () => fetchCommercialData(accountId) }), 'Customer account loaded.')
  }

  const refresh = () => run('Refreshing commercial control data', () => query.refetch(), 'Commercial control data refreshed.')
  const applyPlan = (event: FormEvent) => { event.preventDefault(); if (currentAccountId) void run('Applying subscription plan', () => commercialControlApi.activatePlan(currentAccountId, planForm), 'Subscription plan updated.') }
  const topup = (event: FormEvent) => { event.preventDefault(); if (currentAccountId) void run('Applying wallet top-up', () => commercialControlApi.topUpWallet(currentAccountId, topupForm), 'Wallet balance updated.') }
  const saveThresholds = (event: FormEvent) => { event.preventDefault(); if (currentAccountId) void run('Saving low-balance rules', () => commercialControlApi.updateThresholds(currentAccountId, thresholdForm), 'Low-balance thresholds updated.') }
  const toggleAddon = (addonCode: CommercialAddonCode, status: CommercialStatus) => { if (currentAccountId) void run('Updating paid add-on', () => commercialControlApi.setAddonStatus(currentAccountId, addonCode, { status: status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE', notes: 'Set from Commercial Control UI' }), 'Paid add-on updated.') }

  return (
    <div className="ptdt-page" style={{ opacity: busy ? 0.58 : 1, transition: 'opacity .18s ease' }}>
      <PtdtBusyOverlay active={busy} label={busyLabel} />
      <div className="ptdt-page-header">
        <div><div className="eyebrow pink"><CreditCard size={12} /> Commercial Controls</div><h1 className="ptdt-page-title">Commercial <span className="gradient-brand-text">Control Layer</span></h1><p className="ptdt-page-desc">Commercial plans, wallet balance, paid add-ons, and account billing controls.</p></div>
        <div className="ptdt-toolbar">{query.isFetching && !busy && <span className="ptdt-chip">Syncing...</span>}<button className={`ptdt-action-btn ${busyLabel.includes('Refreshing') && busy ? 'ptdt-refresh-active' : ''}`} onClick={() => void refresh()} disabled={busy}><RefreshCw size={14} /> Refresh</button></div>
      </div>
      {error && <div className="glass" style={{ color: 'var(--danger)', marginBottom: 14, padding: 14 }}>{error}</div>}
      {message && <div className="glass" style={{ color: 'var(--green-2)', marginBottom: 14, padding: 14 }}>{message}</div>}
      {query.isLoading && !data && <div className="glass" style={cardStyle}>Loading commercial control data...</div>}
      {summary && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14, marginBottom: 18 }}>
          <div className="glass" style={cardStyle}><div className="eyebrow green"><BadgeDollarSign size={12} /> Current Plan</div><div style={{ fontSize: 26, fontWeight: 950 }}>{summary.subscription?.plan?.name || 'No active plan'}</div><div className="mono" style={{ color: stateColor(summary.subscription?.status), fontWeight: 900 }}>{summary.subscription?.status || 'INACTIVE'}</div></div>
          <div className="glass" style={cardStyle}><div className="eyebrow pink"><WalletCards size={12} /> Calling Wallet</div><div style={{ fontSize: 26, fontWeight: 950 }}>{money(summary.wallet?.availableBalance, currentCurrency)}</div><div className="mono" style={{ color: stateColor(summary.balanceState), fontWeight: 900 }}>{summary.balanceState.replace(/_/g, ' ')}</div></div>
          <div className="glass" style={cardStyle}><div className="eyebrow purple"><BellRing size={12} /> Low Balance Rules</div><div>Low: {money(summary.account.lowBalanceThreshold, currentCurrency)}</div><div>Critical: {money(summary.account.criticalBalanceThreshold, currentCurrency)}</div></div>
          <div className="glass" style={cardStyle}><div className="eyebrow green"><ShieldCheck size={12} /> Dynamic Caller ID</div><div style={{ fontSize: 26, fontWeight: 950, color: summary.callerIdControl.dynamicCallerIdEnabled ? 'var(--green-2)' : 'var(--text-3)' }}>{summary.callerIdControl.dynamicCallerIdEnabled ? 'ACTIVE' : 'INACTIVE'}</div><div className="mono" style={{ color: 'var(--text-3)' }}>{summary.callerIdControl.activeVerifiedCallerIds} active verified IDs</div></div>
        </div>
        <div className="glass" style={{ padding: 16, marginBottom: 18 }}><strong>Account:</strong> <select className="ptdt-select" value={currentAccountId || ''} onChange={e => void switchAccount(Number(e.target.value))} disabled={busy} style={{ minWidth: 260, marginLeft: 12 }}>{accounts.map(account => <option key={account.id} value={account.id}>{commercialAccountLabel(account)}</option>)}</select> <span className="ptdt-chip">{summary.account.status}</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 18 }}>
          <form onSubmit={applyPlan} className="glass" style={cardStyle}><h3>Activate / Change Plan</h3><select className="ptdt-select" value={planForm.planCode} onChange={e => setPlanForm({ ...planForm, planCode: e.target.value as CommercialPlanCode })}>{catalog?.plans.map(plan => <option key={plan.code} value={plan.code}>{plan.name} — {money(plan.monthlyFee, currentCurrency)}</option>)}</select><select className="ptdt-select" value={planForm.status} onChange={e => setPlanForm({ ...planForm, status: e.target.value as typeof planForm.status })}><option value="ACTIVE">ACTIVE</option><option value="TRIAL">TRIAL</option><option value="INACTIVE">INACTIVE</option><option value="SUSPENDED">SUSPENDED</option></select><button className="btn-brand" disabled={busy}>Apply Plan</button></form>
          <form onSubmit={topup} className="glass" style={cardStyle}><h3>Manual Wallet Top-up</h3><input className="ptdt-input" value={topupForm.amount} onChange={e => setTopupForm({ ...topupForm, amount: e.target.value })} /><input className="ptdt-input" value={topupForm.reference} onChange={e => setTopupForm({ ...topupForm, reference: e.target.value })} placeholder="Reference" /><button className="btn-brand" disabled={busy}>Credit Wallet</button></form>
          <form onSubmit={saveThresholds} className="glass" style={cardStyle}><h3>Low Balance Alerts</h3><input className="ptdt-input" value={thresholdForm.lowBalanceThreshold} onChange={e => setThresholdForm({ ...thresholdForm, lowBalanceThreshold: e.target.value })} /><input className="ptdt-input" value={thresholdForm.criticalBalanceThreshold} onChange={e => setThresholdForm({ ...thresholdForm, criticalBalanceThreshold: e.target.value })} /><button className="btn-brand" disabled={busy}>Save Thresholds</button></form>
        </div>
        <div className="glass" style={cardStyle}><h3>Paid Add-ons</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>{summary.addons.map(item => <div key={item.addon.code} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 14 }}><strong>{item.addon.name}</strong><p style={{ color: 'var(--text-3)' }}>{item.addon.description}</p><button type="button" role="switch" onClick={() => toggleAddon(item.addon.code, item.status)} disabled={busy} style={switchStyle(item.status === 'ACTIVE')}><span style={switchThumbStyle} /></button></div>)}</div></div>
      </>}
    </div>
  )
}
