import { useEffect, useState, type FormEvent } from 'react'
import { Building2, CheckCircle2, Crown, RefreshCw, UserPlus } from 'lucide-react'
import { agentsAPI } from '../api/agents.api'
import { administrationApi } from '../api/administration.api'
import { commercialControlApi, type CommercialCatalog, type CommercialPlanCode } from '../api/commercialControl.api'
import PtdtBusyOverlay from '../components/PtdtBusyOverlay'

const card = { padding: 18, borderRadius: 18 } as const

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

const fieldGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
}

const errorMessage = (err: unknown) => (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error)?.message || 'Something went wrong'

export default function CustomerOnboarding() {
  const [catalog, setCatalog] = useState<CommercialCatalog | null>(null)
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [created, setCreated] = useState<{ accountName: string; accountCode: string; adminEmail: string } | null>(null)
  const [form, setForm] = useState({
    accountName: '',
    accountCode: '',
    billingEmail: '',
    billingPhone: '',
    currency: 'USD',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPhone: '',
    adminExtension: '',
    planCode: '' as CommercialPlanCode | '',
    subscriptionStatus: 'TRIAL' as 'TRIAL' | 'ACTIVE',
    initialWalletBalance: '0',
  })

  useEffect(() => {
    let mounted = true
    commercialControlApi.getCatalog()
      .then(nextCatalog => { if (mounted) setCatalog(nextCatalog) })
      .catch(err => { if (mounted) setError(errorMessage(err)) })
      .finally(() => { if (mounted) setLoadingCatalog(false) })
    return () => { mounted = false }
  }, [])

  const setField = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    setCreated(null)

    try {
      const account = await commercialControlApi.createAccount({
        name: form.accountName,
        code: form.accountCode || undefined,
        email: form.billingEmail || form.adminEmail,
        phone: form.billingPhone || form.adminPhone,
        currency: form.currency || 'USD',
      })

      const customerAdmin = await agentsAPI.create({
        name: form.adminName,
        email: form.adminEmail,
        password: form.adminPassword,
        role: 'CUSTOMER_ADMIN',
        phone: form.adminPhone || undefined,
        extension: form.adminExtension || undefined,
      })

      await administrationApi.addPlatformAccountMember(account.id, {
        userId: Number(customerAdmin.id),
        accountRole: 'OWNER',
        status: 'ACTIVE',
        canManageUsers: true,
        canManageBilling: true,
        canManageCampaigns: true,
        canViewReports: true,
        canUseDynamicCallerId: true,
        notes: 'Created by Customer Admin onboarding flow',
      })

      if (form.planCode) {
        await commercialControlApi.activatePlan(account.id, {
          planCode: form.planCode,
          status: form.subscriptionStatus,
          notes: 'Activated during Customer Admin onboarding',
        })
      }

      if (Number(form.initialWalletBalance || 0) > 0) {
        await commercialControlApi.topUpWallet(account.id, {
          amount: form.initialWalletBalance,
          reference: `customer-onboarding:${account.code}`,
          description: 'Opening wallet balance added during Customer Admin onboarding',
        })
      }

      setCreated({ accountName: account.name, accountCode: account.code, adminEmail: customerAdmin.email })
      setMessage('Customer Admin account created and assigned successfully.')
      setForm({
        accountName: '', accountCode: '', billingEmail: '', billingPhone: '', currency: 'USD',
        adminName: '', adminEmail: '', adminPassword: '', adminPhone: '', adminExtension: '',
        planCode: '', subscriptionStatus: 'TRIAL', initialWalletBalance: '0',
      })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ptdt-page">
      <PtdtBusyOverlay active={busy} label="Creating Customer Admin account..." />
      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow pink"><Crown size={12} /> PTDT Platform Setup</div>
          <h1 className="ptdt-page-title">Customer Admin <span className="gradient-brand-text">Onboarding</span></h1>
          <p className="ptdt-page-desc">Create a new customer account and its first Customer Admin login in one guided flow. Manager role is intentionally not used.</p>
        </div>
        <button type="button" className={`ptdt-action-btn ${loadingCatalog ? 'ptdt-refresh-active' : ''}`} onClick={() => window.location.reload()} disabled={busy || loadingCatalog}><RefreshCw size={14} /> Refresh</button>
      </div>

      {error && <div className="glass" style={{ padding: 14, marginBottom: 14, color: 'var(--danger)', borderColor: 'rgba(239,68,68,.28)' }}>{error}</div>}
      {message && <div className="glass" style={{ padding: 14, marginBottom: 14, color: 'var(--green-2)', borderColor: 'rgba(0,167,71,.28)' }}>{message}</div>}
      {created && (
        <div className="glass" style={{ ...card, marginBottom: 18, borderColor: 'rgba(0,167,71,.30)' }}>
          <div className="eyebrow green"><CheckCircle2 size={12} /> Created</div>
          <h3 style={{ margin: '8px 0 4px' }}>{created.accountName}</h3>
          <p style={{ margin: 0, color: 'var(--text-3)' }}>Account Code: <strong>{created.accountCode}</strong> · Customer Admin: <strong>{created.adminEmail}</strong></p>
        </div>
      )}

      <div className="glass" style={{ ...card, marginBottom: 18 }}>
        <div className="eyebrow green"><Building2 size={12} /> Hierarchy</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 14 }}>
          {['PTDT Super Admin', 'Commercial Account', 'Customer Admin', 'Supervisor', 'Agent'].map((label, index) => (
            <div key={label} style={{ padding: 14, borderRadius: 14, background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>
              <div className="mono" style={{ color: 'var(--text-3)', fontSize: 11 }}>STEP {index + 1}</div>
              <div style={{ fontWeight: 950, color: 'var(--text)', marginTop: 5 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="glass" style={{ ...card }}>
        <h3 style={{ marginTop: 0 }}>Create Customer Admin Account</h3>
        <p style={{ marginTop: -4, color: 'var(--text-3)' }}>This creates the customer/company account, creates the first Customer Admin login, then assigns that user as the account owner.</p>

        <div className="eyebrow pink" style={{ margin: '18px 0 10px' }}>Customer / Company</div>
        <div style={fieldGrid}>
          <input style={inputStyle} value={form.accountName} onChange={event => setField('accountName', event.target.value)} placeholder="Customer / company name" required />
          <input style={inputStyle} value={form.accountCode} onChange={event => setField('accountCode', event.target.value)} placeholder="Optional account code" />
          <input style={inputStyle} value={form.billingEmail} onChange={event => setField('billingEmail', event.target.value)} placeholder="Billing email" type="email" />
          <input style={inputStyle} value={form.billingPhone} onChange={event => setField('billingPhone', event.target.value)} placeholder="Billing phone" />
          <input style={inputStyle} value={form.currency} onChange={event => setField('currency', event.target.value.toUpperCase().slice(0, 3))} placeholder="Currency" />
        </div>

        <div className="eyebrow green" style={{ margin: '18px 0 10px' }}>Customer Admin Login</div>
        <div style={fieldGrid}>
          <input style={inputStyle} value={form.adminName} onChange={event => setField('adminName', event.target.value)} placeholder="Customer Admin full name" required />
          <input style={inputStyle} value={form.adminEmail} onChange={event => setField('adminEmail', event.target.value)} placeholder="Customer Admin login email" type="email" required />
          <input style={inputStyle} value={form.adminPassword} onChange={event => setField('adminPassword', event.target.value)} placeholder="Temporary password" type="password" required />
          <input style={inputStyle} value={form.adminPhone} onChange={event => setField('adminPhone', event.target.value)} placeholder="Admin phone" />
          <input style={inputStyle} value={form.adminExtension} onChange={event => setField('adminExtension', event.target.value)} placeholder="Extension" />
        </div>

        <div className="eyebrow purple" style={{ margin: '18px 0 10px' }}>Plan / Wallet</div>
        <div style={fieldGrid}>
          <select className="ptdt-select" value={form.planCode} onChange={event => setField('planCode', event.target.value)}>
            <option value="">No plan yet</option>
            {catalog?.plans.map(plan => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
          </select>
          <select className="ptdt-select" value={form.subscriptionStatus} onChange={event => setField('subscriptionStatus', event.target.value)} disabled={!form.planCode}>
            <option value="TRIAL">Trial</option>
            <option value="ACTIVE">Active</option>
          </select>
          <input style={inputStyle} value={form.initialWalletBalance} onChange={event => setField('initialWalletBalance', event.target.value)} placeholder="Opening wallet balance" inputMode="decimal" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <button className="btn-brand" type="submit" disabled={busy}><UserPlus size={14} /> Create Customer Admin</button>
        </div>
      </form>
    </div>
  )
}
