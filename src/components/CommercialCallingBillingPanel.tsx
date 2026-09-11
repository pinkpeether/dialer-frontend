import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight, BadgeEuro, Check, CheckCircle2, CircleDollarSign, Clock3, FileKey2,
  Gauge, Globe2, KeyRound, Link2, LockKeyhole, Network, RadioTower, Save,
  ServerCog, Settings2, ShieldCheck, SlidersHorizontal, WalletCards,
} from 'lucide-react'
import { commercialControlApi, type CommercialCallingBillingSetup, type CommercialCallingRate, type CommercialProviderWallet } from '../api/commercialControl.api'

type Props = {
  accountId?: number
  accountName?: string
  accountCode?: string
  accountCurrency?: string
  accountBalance?: string | number | null
  disabled?: boolean
  onAllowanceApplied?: () => void
}

type WorkspaceTab = 'allowance' | 'provider' | 'rates'
type FieldProps = { label: string; icon?: typeof WalletCards; children: ReactNode; hint?: string }

const money = (value: string | number | null | undefined, currency = 'EUR') => `${currency} ${Number(value || 0).toFixed(2)}`
const inputStyle = { width: '100%', minWidth: 0 } as const

const providerToForm = (provider?: CommercialProviderWallet | null) => ({
  provider: provider?.provider || 'ILLYVOIP', displayName: provider?.displayName || 'illyVoIP', providerType: provider?.providerType || 'SIP_TRUNK',
  status: provider?.status || 'ACTIVE', balanceMode: provider?.balanceMode || 'MANUAL', trunkName: provider?.trunkName || 'illyvoip-out',
  apiBaseUrl: provider?.apiBaseUrl || '', apiUsername: provider?.apiUsername || '', apiName: provider?.apiName || 'SMS API only',
  apiKeyLabel: provider?.apiKeyLabel || '', apiSecretLabel: provider?.apiSecretLabel || '', passwordLabel: provider?.passwordLabel || '',
  docsUrl: provider?.docsUrl || '', notes: provider?.notes || '', currency: provider?.currency || 'EUR',
  availableBalance: String(provider?.availableBalance ?? 0), reserveBalance: String(provider?.reserveBalance ?? 5),
  enforcementEnabled: Boolean(provider?.enforcementEnabled),
})

const tabItems: Array<{ id: WorkspaceTab; label: string; detail: string; icon: typeof WalletCards }> = [
  { id: 'allowance', label: 'Customer Allowance', detail: 'Fund voice usage', icon: WalletCards },
  { id: 'provider', label: 'Provider Profile', detail: 'Capacity and trunk', icon: ServerCog },
  { id: 'rates', label: 'Rate Cards', detail: 'Country pricing', icon: Globe2 },
]

function Field({ label, icon: Icon, children, hint }: FieldProps) {
  return <label className="ptdt-voip-field"><span className="ptdt-voip-field-label">{Icon && <Icon size={13} />}{label}</span>{children}{hint && <small>{hint}</small>}</label>
}

export default function CommercialCallingBillingPanel({ accountId, accountName, accountCode, accountCurrency, accountBalance, disabled, onAllowanceApplied }: Props) {
  const [setup, setSetup] = useState<CommercialCallingBillingSetup | null>(null)
  const [providerForm, setProviderForm] = useState(providerToForm(null))
  const [allowanceForm, setAllowanceForm] = useState({ credit: '', includedMinutes: '', reference: '', description: '' })
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('allowance')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const rates = useMemo(() => setup?.rates || [], [setup?.rates])
  const activeRates = rates.filter(rate => rate.isActive).length
  const enteredCredit = Number(allowanceForm.credit || 0)
  const enteredMinutes = Number(allowanceForm.includedMinutes || 0)
  const allocatableCredit = Number(setup?.allocatableCustomerCredit || 0)
  const projectedCustomerBalance = Number(accountBalance || 0) + enteredCredit
  const allocationValid = enteredCredit > 0 || enteredMinutes > 0

  const load = async () => {
    const next = await commercialControlApi.getCallingBillingSetup()
    setSetup(next)
    setProviderForm(providerToForm(next.provider))
  }

  useEffect(() => { void load().catch(err => setError(err instanceof Error ? err.message : 'Unable to load calling billing')) }, [])

  const save = async (task: () => Promise<void>, success: string) => {
    setSaving(true); setError(''); setMessage('')
    try { await task(); await load(); setMessage(success) }
    catch (err) { setError(err instanceof Error ? err.message : 'Calling billing update failed') }
    finally { setSaving(false) }
  }

  const saveProvider = (event: FormEvent) => {
    event.preventDefault()
    void save(async () => { await commercialControlApi.updateCallingProvider(providerForm) }, `${providerForm.displayName || providerForm.provider} provider profile saved.`)
  }
  const saveRate = (rate: CommercialCallingRate) => void save(async () => { await commercialControlApi.saveCallingRate({ ...rate }) }, `${rate.destinationName} rate saved.`)
  const updateRate = (id: number, patch: Partial<CommercialCallingRate>) => setSetup(current => current ? { ...current, rates: current.rates.map(rate => rate.id === id ? { ...rate, ...patch } : rate) } : current)

  const allocate = (event: FormEvent) => {
    event.preventDefault()
    if (!accountId || !allocationValid) return
    void save(async () => {
      await commercialControlApi.grantCallingAllowance(accountId, allowanceForm)
      setAllowanceForm({ credit: '', includedMinutes: '', reference: '', description: '' })
      onAllowanceApplied?.()
    }, `Voice allowance allocated to ${accountName || 'customer'}.`)
  }

  return (
    <section className="ptdt-voip-workspace">
      <div className="ptdt-voip-workspace-nav" role="tablist" aria-label="VoIP billing controls">
        <div className="ptdt-voip-workspace-nav-copy"><span>Billing workspace</span><strong>Configure & allocate</strong></div>
        <div className="ptdt-voip-workspace-tabs">
          {tabItems.map(({ id, label, detail, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={activeTab === id} className={activeTab === id ? 'is-active' : ''} onClick={() => { setActiveTab(id); setMessage(''); setError('') }}>
              <Icon size={17} /><span><strong>{label}</strong><small>{detail}</small></span>{activeTab === id && <motion.i layoutId="voip-tab-marker" />}
            </button>
          ))}
        </div>
        <div className={`ptdt-voip-enforcement ${setup?.provider.enforcementEnabled ? 'is-on' : 'is-off'}`}>
          <span /><div><small>Call enforcement</small><strong>{setup?.provider.enforcementEnabled ? 'Protected' : 'Disabled'}</strong></div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} className="ptdt-voip-workspace-body" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
          {(error || message) && <div className={`ptdt-voip-notice ${error ? 'is-error' : 'is-success'}`}>{error ? <LockKeyhole size={16} /> : <CheckCircle2 size={16} />}<span>{error || message}</span></div>}

          {activeTab === 'allowance' && (
            <div className="ptdt-voip-allowance-layout">
              <form className="ptdt-voip-allocation-form" onSubmit={allocate}>
                <div className="ptdt-voip-section-heading">
                  <span className="ptdt-voip-section-icon is-pink"><BadgeEuro size={20} /></span>
                  <div><span>Selected customer</span><h2>Allocate voice allowance</h2><p>Add prepaid calling credit, included minutes, or both.</p></div>
                </div>
                <div className="ptdt-voip-allocation-recipient">
                  <div className="ptdt-voip-recipient-mark">{(accountName || 'C').charAt(0).toUpperCase()}</div>
                  <div><span>Credit recipient</span><strong>{accountName || 'Select a customer'}</strong><small>{accountCode || 'No account selected'}</small></div>
                  <ShieldCheck size={18} />
                </div>
                <div className="ptdt-voip-allocation-fields">
                  <Field label="Calling credit" icon={CircleDollarSign} hint="Adds directly to the customer's voice wallet.">
                    <div className="ptdt-voip-money-input"><span>EUR</span><input className="ptdt-input" inputMode="decimal" value={allowanceForm.credit} onChange={event => setAllowanceForm({ ...allowanceForm, credit: event.target.value })} placeholder="0.00" /></div>
                  </Field>
                  <Field label="Included minutes" icon={Clock3} hint="Consumed before monetary credit where eligible.">
                    <div className="ptdt-voip-money-input"><span>MIN</span><input className="ptdt-input" inputMode="numeric" value={allowanceForm.includedMinutes} onChange={event => setAllowanceForm({ ...allowanceForm, includedMinutes: event.target.value })} placeholder="0" /></div>
                  </Field>
                </div>
                <div className="ptdt-voip-allocation-fields">
                  <Field label="Billing reference" icon={FileKey2} hint="Use an invoice, payment or approval reference.">
                    <input className="ptdt-input" style={inputStyle} value={allowanceForm.reference} onChange={event => setAllowanceForm({ ...allowanceForm, reference: event.target.value })} placeholder="e.g. INV-2026-0042" />
                  </Field>
                  <Field label="Internal note" icon={Settings2} hint="Visible in the administrative wallet ledger.">
                    <input className="ptdt-input" style={inputStyle} value={allowanceForm.description} onChange={event => setAllowanceForm({ ...allowanceForm, description: event.target.value })} placeholder="Reason for allocation" />
                  </Field>
                </div>
                {accountCurrency !== 'EUR' && <div className="ptdt-voip-currency-warning">Allowance funding currently requires an EUR customer wallet.</div>}
                <button className="ptdt-voip-allocate-action" disabled={disabled || saving || !accountId || accountCurrency !== 'EUR' || !allocationValid}>
                  <span className="ptdt-voip-allocate-action-icon"><WalletCards size={20} /></span>
                  <span><strong>{saving ? 'Processing allocation...' : 'Allocate to customer wallet'}</strong><small>Creates an auditable billing ledger entry</small></span><ArrowRight size={19} />
                </button>
              </form>

              <aside className="ptdt-voip-allocation-review">
                <div className="ptdt-voip-section-heading compact"><span className="ptdt-voip-section-icon is-green"><Gauge size={19} /></span><div><span>Capacity check</span><h2>Allocation preview</h2></div></div>
                <div className="ptdt-voip-capacity-figure">
                  <span>Provider credit available to allocate</span><strong>{money(setup?.allocatableCustomerCredit)}</strong>
                  <div><i style={{ width: `${Math.min(100, Math.max(4, allocatableCredit ? ((allocatableCredit - enteredCredit) / allocatableCredit) * 100 : 4))}%` }} /></div>
                  <small>{money(setup?.outstandingCustomerCredit)} already committed across customers</small>
                </div>
                <div className="ptdt-voip-review-equation">
                  <div><span>Current wallet</span><strong>{money(accountBalance, accountCurrency)}</strong></div><span>+</span>
                  <div><span>New credit</span><strong>{money(enteredCredit, accountCurrency)}</strong></div><span>=</span>
                  <div className="is-result"><span>Projected wallet</span><strong>{money(projectedCustomerBalance, accountCurrency)}</strong></div>
                </div>
                <div className="ptdt-voip-review-list">
                  <div><Check size={15} /><span>Included minutes</span><strong>{enteredMinutes.toLocaleString()} min</strong></div>
                  <div><Check size={15} /><span>Provider reserve</span><strong>{money(setup?.provider.reserveBalance)}</strong></div>
                  <div><Check size={15} /><span>Ledger reference</span><strong>{allowanceForm.reference || 'Auto-generated'}</strong></div>
                </div>
              </aside>
            </div>
          )}

          {activeTab === 'provider' && (
            <form className="ptdt-voip-provider-form" onSubmit={saveProvider}>
              <div className="ptdt-voip-provider-overview">
                <div className="ptdt-voip-section-heading"><span className="ptdt-voip-section-icon is-green"><RadioTower size={20} /></span><div><span>Upstream voice carrier</span><h2>{providerForm.displayName || providerForm.provider}</h2><p>Provider identity, capacity, connection and credential references.</p></div></div>
                <div className="ptdt-voip-provider-stats"><div><span>Available</span><strong>{money(providerForm.availableBalance, providerForm.currency)}</strong></div><div><span>Reserve</span><strong>{money(providerForm.reserveBalance, providerForm.currency)}</strong></div><div><span>Trunk</span><strong>{providerForm.trunkName || 'Not set'}</strong></div></div>
              </div>

              <div className="ptdt-voip-provider-section">
                <div className="ptdt-voip-provider-section-title"><ServerCog size={17} /><div><strong>Provider identity</strong><span>Choose an existing profile or define a new carrier.</span></div></div>
                {Boolean(setup?.providers?.length) && <Field label="Saved provider profile"><select className="ptdt-select" style={inputStyle} value={providerForm.provider} onChange={event => { const nextProvider = setup?.providers?.find(provider => provider.provider === event.target.value); setProviderForm(providerToForm(nextProvider || null)) }}>{setup?.providers?.map(provider => <option key={provider.provider} value={provider.provider}>{provider.displayName || provider.provider} ({provider.provider})</option>)}</select></Field>}
                <div className="ptdt-voip-provider-grid cols-4">
                  <Field label="Provider code"><input className="ptdt-input" value={providerForm.provider} onChange={event => setProviderForm({ ...providerForm, provider: event.target.value })} /></Field>
                  <Field label="Display name"><input className="ptdt-input" value={providerForm.displayName} onChange={event => setProviderForm({ ...providerForm, displayName: event.target.value })} /></Field>
                  <Field label="Connection type"><select className="ptdt-select" value={providerForm.providerType} onChange={event => setProviderForm({ ...providerForm, providerType: event.target.value })}><option value="SIP_TRUNK">SIP Trunk</option><option value="REST_API">REST API</option><option value="HYBRID">Hybrid</option><option value="CUSTOM">Custom</option></select></Field>
                  <Field label="Provider status"><select className="ptdt-select" value={providerForm.status} onChange={event => setProviderForm({ ...providerForm, status: event.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="TESTING">Testing</option></select></Field>
                </div>
              </div>

              <div className="ptdt-voip-provider-section">
                <div className="ptdt-voip-provider-section-title"><Network size={17} /><div><strong>Connection & balance</strong><span>Map this profile to FreePBX and define available carrier funds.</span></div></div>
                <div className="ptdt-voip-provider-grid cols-4">
                  <Field label="Balance mode"><select className="ptdt-select" value={providerForm.balanceMode} onChange={event => setProviderForm({ ...providerForm, balanceMode: event.target.value })}><option value="MANUAL">Manual</option><option value="LIVE_API">Live API</option><option value="WEBHOOK">Webhook</option></select></Field>
                  <Field label="FreePBX trunk"><input className="ptdt-input" value={providerForm.trunkName} onChange={event => setProviderForm({ ...providerForm, trunkName: event.target.value })} /></Field>
                  <Field label="Currency"><input className="ptdt-input" value={providerForm.currency} onChange={event => setProviderForm({ ...providerForm, currency: event.target.value.toUpperCase() })} /></Field>
                  <Field label="API name"><input className="ptdt-input" value={providerForm.apiName} onChange={event => setProviderForm({ ...providerForm, apiName: event.target.value })} /></Field>
                  <Field label="Available balance"><input className="ptdt-input" inputMode="decimal" value={providerForm.availableBalance} onChange={event => setProviderForm({ ...providerForm, availableBalance: event.target.value })} /></Field>
                  <Field label="Reserve balance"><input className="ptdt-input" inputMode="decimal" value={providerForm.reserveBalance} onChange={event => setProviderForm({ ...providerForm, reserveBalance: event.target.value })} /></Field>
                  <Field label="API base URL"><input className="ptdt-input" value={providerForm.apiBaseUrl} onChange={event => setProviderForm({ ...providerForm, apiBaseUrl: event.target.value })} placeholder="https://api.provider.com" /></Field>
                  <Field label="API username"><input className="ptdt-input" value={providerForm.apiUsername} onChange={event => setProviderForm({ ...providerForm, apiUsername: event.target.value })} /></Field>
                </div>
              </div>

              <div className="ptdt-voip-provider-section">
                <div className="ptdt-voip-provider-section-title"><KeyRound size={17} /><div><strong>Credential references</strong><span>Store masked labels or secret-manager references only.</span></div><span className="ptdt-voip-secure-badge"><ShieldCheck size={13} /> Secret safe</span></div>
                <div className="ptdt-voip-provider-grid cols-3">
                  <Field label="Password reference" icon={LockKeyhole}><input className="ptdt-input" value={providerForm.passwordLabel} onChange={event => setProviderForm({ ...providerForm, passwordLabel: event.target.value })} placeholder="Masked/reference only" /></Field>
                  <Field label="API key reference" icon={FileKey2}><input className="ptdt-input" value={providerForm.apiKeyLabel} onChange={event => setProviderForm({ ...providerForm, apiKeyLabel: event.target.value })} placeholder="Masked/reference only" /></Field>
                  <Field label="API secret reference" icon={KeyRound}><input className="ptdt-input" value={providerForm.apiSecretLabel} onChange={event => setProviderForm({ ...providerForm, apiSecretLabel: event.target.value })} placeholder="Masked/reference only" /></Field>
                  <Field label="Documentation URL" icon={Link2}><input className="ptdt-input" value={providerForm.docsUrl} onChange={event => setProviderForm({ ...providerForm, docsUrl: event.target.value })} /></Field>
                  <Field label="Provider notes"><input className="ptdt-input" value={providerForm.notes} onChange={event => setProviderForm({ ...providerForm, notes: event.target.value })} /></Field>
                </div>
              </div>

              <div className="ptdt-voip-provider-footer">
                <label className="ptdt-voip-enforcement-toggle"><input type="checkbox" checked={providerForm.enforcementEnabled} onChange={event => setProviderForm({ ...providerForm, enforcementEnabled: event.target.checked })} /><span><i /><ShieldCheck size={17} /></span><div><strong>Enforce customer wallet before AMI calls</strong><small>Blocks outbound initiation when customer funds are insufficient.</small></div></label>
                <button className="ptdt-voip-save-provider" disabled={disabled || saving}><Save size={16} /> {saving ? 'Saving profile...' : 'Save provider profile'}</button>
              </div>
            </form>
          )}

          {activeTab === 'rates' && (
            <div className="ptdt-voip-rates-panel">
              <div className="ptdt-voip-rates-heading">
                <div className="ptdt-voip-section-heading"><span className="ptdt-voip-section-icon is-purple"><SlidersHorizontal size={20} /></span><div><span>Outbound pricing</span><h2>Destination rate cards</h2><p>Carrier cost, customer price and billing increments by dial prefix.</p></div></div>
                <div className="ptdt-voip-rate-count"><strong>{activeRates}</strong><span>of {rates.length}<small>active routes</small></span></div>
              </div>
              <div className="ptdt-voip-rate-table-wrap">
                <table className="ptdt-voip-rate-table">
                  <thead><tr><th>Destination</th><th>Dial prefix</th><th>Carrier / min</th><th>Customer / min</th><th>Margin</th><th>Min / increment</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>{rates.map(rate => {
                    const carrier = Number(rate.carrierRatePerMinute || 0); const customer = Number(rate.customerRatePerMinute || 0)
                    const margin = customer > 0 ? ((customer - carrier) / customer) * 100 : 0
                    return <tr key={rate.id}>
                      <td><div className="ptdt-voip-destination"><span>{rate.destinationName.charAt(0)}</span><input className="ptdt-input" value={rate.destinationName} onChange={event => updateRate(rate.id, { destinationName: event.target.value })} /></div></td>
                      <td><input className="ptdt-input mono" value={rate.dialPrefix} onChange={event => updateRate(rate.id, { dialPrefix: event.target.value })} /></td>
                      <td><div className="ptdt-voip-rate-money"><BadgeEuro size={13} /><input className="ptdt-input" inputMode="decimal" value={rate.carrierRatePerMinute} onChange={event => updateRate(rate.id, { carrierRatePerMinute: event.target.value })} /></div></td>
                      <td><div className="ptdt-voip-rate-money"><BadgeEuro size={13} /><input className="ptdt-input" inputMode="decimal" value={rate.customerRatePerMinute} onChange={event => updateRate(rate.id, { customerRatePerMinute: event.target.value })} /></div></td>
                      <td><span className={`ptdt-voip-margin ${margin < 0 ? 'is-negative' : ''}`}>{margin.toFixed(1)}%</span></td>
                      <td><div className="ptdt-voip-increment"><input className="ptdt-input" inputMode="numeric" value={rate.minimumSeconds} onChange={event => updateRate(rate.id, { minimumSeconds: Number(event.target.value) })} /><span>/</span><input className="ptdt-input" inputMode="numeric" value={rate.incrementSeconds} onChange={event => updateRate(rate.id, { incrementSeconds: Number(event.target.value) })} /><small>sec</small></div></td>
                      <td><label className="ptdt-voip-route-toggle"><input type="checkbox" checked={rate.isActive} onChange={event => updateRate(rate.id, { isActive: event.target.checked })} /><span><i /></span><small>{rate.isActive ? 'Active' : 'Off'}</small></label></td>
                      <td><button type="button" className="ptdt-voip-rate-save" disabled={disabled || saving} onClick={() => saveRate(rate)} title={`Save ${rate.destinationName} rate`}><Save size={15} /><span>Save</span></button></td>
                    </tr>
                  })}</tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
