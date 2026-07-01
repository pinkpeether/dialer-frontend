import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Building2, Eye, RefreshCw, ShieldAlert } from 'lucide-react'
import { accountReviewApi, type AccountActionResult, type AccountReview } from '../api/accountReview.api'
import { commercialControlApi, type CommercialAccount } from '../api/commercialControl.api'

const inputStyle: React.CSSProperties = {
  padding: '11px 14px',
  background: 'var(--bg-glass-hi)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
}

const dangerCardStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 18,
  border: '1px solid rgba(239,68,68,.38)',
  background: 'linear-gradient(135deg, rgba(239,68,68,.10), var(--bg-glass))',
}

const countLabels: Record<string, string> = {
  campaigns: 'Campaigns',
  contacts: 'Contacts',
  calls: 'Calls',
  callbacks: 'Callbacks',
  callTranscripts: 'Call Transcripts',
  callInsights: 'Call Insights',
  callerIds: 'Caller IDs',
  aiCallLogs: 'AI Call Logs',
  memberships: 'Account Memberships',
  subscriptions: 'Subscriptions',
  addons: 'Add-ons',
  paymentRequests: 'Payment Requests',
  billingAlerts: 'Billing Alerts',
  walletTransactions: 'Wallet Transactions',
  agentSessions: 'Agent Sessions',
  usersToRemove: 'Users To Remove',
  usersToRetain: 'Users To Retain',
}

const countOrder = Object.keys(countLabels)
const errorMessage = (err: unknown) => (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error)?.message || 'Unable to complete customer profile action.'

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: 12, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-glass-hi)' }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ marginTop: 5, fontSize: 22, fontWeight: 950, color: value > 0 ? 'var(--danger)' : 'var(--text-2)' }}>{value}</div>
    </div>
  )
}

export default function CustomerOnboardingDangerZone() {
  const [accounts, setAccounts] = useState<CommercialAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number | ''>('')
  const [review, setReview] = useState<AccountReview | null>(null)
  const [typedPhrase, setTypedPhrase] = useState('')
  const [finalArmed, setFinalArmed] = useState(false)
  const [result, setResult] = useState<AccountActionResult | null>(null)
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [loadingReview, setLoadingReview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const selectedAccount = useMemo(() => accounts.find(account => Number(account.id) === Number(selectedAccountId)), [accounts, selectedAccountId])
  const phraseMatched = Boolean(review?.confirmationPhrase && typedPhrase.trim() === review.confirmationPhrase)

  const loadAccounts = async () => {
    setLoadingAccounts(true)
    setError('')
    try {
      const items = await commercialControlApi.listAccounts({ silent: true })
      setAccounts(items)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoadingAccounts(false)
    }
  }

  const loadReview = async () => {
    if (!selectedAccountId) return
    setLoadingReview(true)
    setError('')
    setReview(null)
    setTypedPhrase('')
    setFinalArmed(false)
    setResult(null)
    try {
      setReview(await accountReviewApi.getReview(Number(selectedAccountId)))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoadingReview(false)
    }
  }

  const runFinalAction = async () => {
    if (!review || !selectedAccountId || !phraseMatched || !finalArmed) return
    setSubmitting(true)
    setError('')
    try {
      const actionResult = await accountReviewApi.runAction(Number(selectedAccountId), typedPhrase.trim())
      setResult(actionResult)
      setAccounts(prev => prev.filter(account => Number(account.id) !== Number(selectedAccountId)))
      setSelectedAccountId('')
      setReview(null)
      setTypedPhrase('')
      setFinalArmed(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => { void loadAccounts() }, [])

  return (
    <section className="glass" style={{ ...dangerCardStyle, marginTop: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--danger)', marginBottom: 10 }}><ShieldAlert size={12} /> Danger Zone</div>
          <h3 style={{ margin: 0, color: 'var(--text)', fontSize: 22 }}>Delete Customer Profile</h3>
          <p style={{ margin: '8px 0 0', color: 'var(--text-3)', maxWidth: 820, fontSize: 13 }}>
            Super Admin only. Review the full impact, type the exact confirmation phrase, then arm the final action.
          </p>
        </div>
        <button type="button" className="ptdt-action-btn" onClick={() => void loadAccounts()} disabled={loadingAccounts}>
          <RefreshCw size={14} /> {loadingAccounts ? 'Loading...' : 'Refresh Accounts'}
        </button>
      </div>

      {error && <div style={{ marginTop: 14, padding: 12, borderRadius: 14, border: '1px solid rgba(239,68,68,.28)', color: 'var(--danger)', background: 'rgba(239,68,68,.08)', fontWeight: 800 }}>{error}</div>}
      {result && <div style={{ marginTop: 14, padding: 12, borderRadius: 14, border: '1px solid rgba(0,167,71,.30)', color: 'var(--green-2)', background: 'rgba(0,167,71,.08)', fontWeight: 900 }}>Customer profile removed: {result.account.name}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) auto', gap: 12, alignItems: 'end', marginTop: 18 }}>
        <div>
          <label className="mono" style={{ display: 'block', marginBottom: 6, color: 'var(--text-3)', fontSize: 11, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>Customer Profile</label>
          <select className="ptdt-select" style={inputStyle} value={selectedAccountId} onChange={event => { setSelectedAccountId(event.target.value ? Number(event.target.value) : ''); setReview(null); setTypedPhrase(''); setFinalArmed(false); setResult(null) }}>
            <option value="">Select customer profile</option>
            {accounts.map(account => <option key={account.id} value={account.id}>{account.name} — {account.code}</option>)}
          </select>
        </div>
        <button type="button" className="ptdt-action-btn active" onClick={() => void loadReview()} disabled={!selectedAccountId || loadingReview}>
          <Eye size={14} /> {loadingReview ? 'Reviewing...' : 'Load Impact'}
        </button>
      </div>

      {selectedAccount && !review && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', fontWeight: 900 }}><Building2 size={14} /> {selectedAccount.name}</div>
          <div className="mono" style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 4 }}>Customer Code: {selectedAccount.code} · Status: {selectedAccount.status}</div>
        </div>
      )}

      {review && (
        <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
          <div style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(239,68,68,.30)', background: 'rgba(239,68,68,.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)', fontWeight: 950 }}><AlertTriangle size={16} /> Irreversible Action Review</div>
            <p style={{ margin: '8px 0 0', color: 'var(--text-2)', fontSize: 13 }}>{review.warning}</p>
            <p style={{ margin: '6px 0 0', color: 'var(--text-3)', fontSize: 12 }}>{review.storageNote}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            {countOrder.map(key => <CountTile key={key} label={countLabels[key]} value={Number(review.counts[key] || 0)} />)}
          </div>

          <div style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(239,68,68,.30)', background: 'rgba(239,68,68,.07)' }}>
            <label className="mono" style={{ display: 'block', marginBottom: 8, color: 'var(--danger)', fontSize: 11, fontWeight: 950, letterSpacing: 1, textTransform: 'uppercase' }}>Required confirmation phrase</label>
            <div className="mono" style={{ padding: 10, borderRadius: 12, background: 'var(--bg-2)', color: 'var(--text)', fontWeight: 950, marginBottom: 10 }}>{review.confirmationPhrase}</div>
            <input style={inputStyle} value={typedPhrase} onChange={event => { setTypedPhrase(event.target.value); setFinalArmed(false) }} placeholder="Type the confirmation phrase here" />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <button type="button" className="ptdt-action-btn" disabled={!phraseMatched || submitting} onClick={() => setFinalArmed(true)}>
                I Understand — Enable Final Action
              </button>
              <button type="button" className="ptdt-action-btn" disabled={!phraseMatched || !finalArmed || submitting} onClick={() => void runFinalAction()} style={{ color: phraseMatched && finalArmed ? 'var(--danger)' : 'var(--text-3)', borderColor: phraseMatched && finalArmed ? 'rgba(239,68,68,.50)' : 'var(--border)' }}>
                {submitting ? 'Processing...' : 'Permanently Remove Customer Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
