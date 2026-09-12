import { useEffect, useState, type ElementType, type FormEvent, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2, FileKey2, KeyRound, Link2, LockKeyhole, RadioTower, Save,
  ServerCog, ShieldCheck,
} from 'lucide-react'
import { commercialControlApi, type CommercialProviderWallet } from '../api/commercialControl.api'
import '../voip-billing.css'

const inputStyle = { width: '100%', minWidth: 0 } as const

const providerToForm = (provider?: CommercialProviderWallet | null) => ({
  provider: provider?.provider || 'ILLYVOIP',
  displayName: provider?.displayName || 'illyVoIP',
  providerType: provider?.providerType || 'SIP_TRUNK',
  status: provider?.status || 'ACTIVE',
  balanceMode: provider?.balanceMode || 'MANUAL',
  trunkName: provider?.trunkName || 'illyvoip-out',
  apiBaseUrl: provider?.apiBaseUrl || '',
  apiUsername: provider?.apiUsername || '',
  apiName: provider?.apiName || 'SMS API only',
  apiKeyLabel: provider?.apiKeyLabel || '',
  apiSecretLabel: provider?.apiSecretLabel || '',
  passwordLabel: provider?.passwordLabel || '',
  docsUrl: provider?.docsUrl || '',
  notes: provider?.notes || '',
  currency: provider?.currency || 'EUR',
  availableBalance: String(provider?.availableBalance ?? 0),
  reserveBalance: String(provider?.reserveBalance ?? 5),
  enforcementEnabled: Boolean(provider?.enforcementEnabled),
})

function ApiField({ label, children, hint, icon: Icon }: { label: string; children: ReactNode; hint?: string; icon?: ElementType }) {
  return (
    <label className="ptdt-voip-field">
      <span className="ptdt-voip-field-label">{Icon && <Icon size={13} />}{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

export default function VoipApiInfo() {
  const [providers, setProviders] = useState<CommercialProviderWallet[]>([])
  const [form, setForm] = useState(providerToForm(null))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    const setup = await commercialControlApi.getCallingBillingSetup()
    setProviders(setup.providers || [])
    setForm(providerToForm(setup.provider))
  }

  useEffect(() => {
    void load().catch(err => setError(err instanceof Error ? err.message : 'Unable to load provider API information'))
  }, [])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await commercialControlApi.updateCallingProvider(form)
      await load()
      setMessage(`${form.displayName || form.provider} API information saved.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'API information update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ptdt-page ptdt-voip-billing-page">
      <motion.header className="ptdt-voip-page-heading" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34 }}>
        <div>
          <div className="eyebrow pink"><ServerCog size={12} /> Provider Integration</div>
          <h1 className="ptdt-page-title">API <span className="gradient-brand-text">Info</span></h1>
          <p className="ptdt-page-desc">Provider identity, documentation links, and masked credential references for future live-balance integrations.</p>
        </div>
        <div className="ptdt-voip-heading-meta">
          <ShieldCheck size={15} />
          <strong>Secret-safe references only</strong>
        </div>
      </motion.header>

      <section className="ptdt-voip-workspace">
        <div className="ptdt-voip-workspace-header">
          <div className="ptdt-voip-workspace-nav-copy"><span>API workspace</span><strong>Provider references</strong></div>
          <div className="ptdt-voip-enforcement is-on">
            <span /><div><small>Storage policy</small><strong>Masked only</strong></div>
          </div>
        </div>

        {(error || message) && <div className={`ptdt-voip-notice ${error ? 'is-error' : 'is-success'}`}>{error ? <LockKeyhole size={16} /> : <CheckCircle2 size={16} />}<span>{error || message}</span></div>}

        <form className="ptdt-voip-provider-form ptdt-voip-api-form" onSubmit={save}>
          <div className="ptdt-voip-provider-overview">
            <div className="ptdt-voip-section-heading">
              <span className="ptdt-voip-section-icon is-purple"><RadioTower size={20} /></span>
              <div><span>Saved provider</span><h2>{form.displayName || form.provider}</h2><p>Use this page for API metadata and credential labels. Calling balance and rate cards stay inside VoIP Billing.</p></div>
            </div>
            <div className="ptdt-voip-provider-stats">
              <div><span>Provider</span><strong>{form.provider}</strong></div>
              <div><span>Mode</span><strong>{form.balanceMode}</strong></div>
              <div><span>Trunk</span><strong>{form.trunkName || 'Not set'}</strong></div>
            </div>
          </div>

          <div className="ptdt-voip-provider-section">
            <div className="ptdt-voip-provider-section-title"><ServerCog size={17} /><div><strong>Provider identity</strong><span>Select a saved carrier and maintain API labels separately from billing controls.</span></div></div>
            {Boolean(providers.length) && (
              <ApiField label="Saved provider profile">
                <select className="ptdt-select" style={inputStyle} value={form.provider} onChange={event => {
                  const nextProvider = providers.find(provider => provider.provider === event.target.value)
                  setForm(providerToForm(nextProvider || null))
                }}>
                  {providers.map(provider => <option key={provider.provider} value={provider.provider}>{provider.displayName || provider.provider} ({provider.provider})</option>)}
                </select>
              </ApiField>
            )}
            <div className="ptdt-voip-provider-grid cols-4">
              <ApiField label="Provider code"><input className="ptdt-input" value={form.provider} onChange={event => setForm({ ...form, provider: event.target.value })} /></ApiField>
              <ApiField label="Display name"><input className="ptdt-input" value={form.displayName} onChange={event => setForm({ ...form, displayName: event.target.value })} /></ApiField>
              <ApiField label="Connection type"><select className="ptdt-select" value={form.providerType} onChange={event => setForm({ ...form, providerType: event.target.value })}><option value="SIP_TRUNK">SIP Trunk</option><option value="REST_API">REST API</option><option value="HYBRID">Hybrid</option><option value="CUSTOM">Custom</option></select></ApiField>
              <ApiField label="API name"><input className="ptdt-input" value={form.apiName} onChange={event => setForm({ ...form, apiName: event.target.value })} /></ApiField>
            </div>
          </div>

          <div className="ptdt-voip-provider-section">
            <div className="ptdt-voip-provider-section-title"><Link2 size={17} /><div><strong>API connection</strong><span>Provider endpoints and documentation references for future adapter work.</span></div></div>
            <div className="ptdt-voip-provider-grid cols-3">
              <ApiField label="API base URL" icon={Link2}><input className="ptdt-input" value={form.apiBaseUrl} onChange={event => setForm({ ...form, apiBaseUrl: event.target.value })} placeholder="https://api.provider.com" /></ApiField>
              <ApiField label="API username"><input className="ptdt-input" value={form.apiUsername} onChange={event => setForm({ ...form, apiUsername: event.target.value })} /></ApiField>
              <ApiField label="Documentation URL" icon={Link2}><input className="ptdt-input" value={form.docsUrl} onChange={event => setForm({ ...form, docsUrl: event.target.value })} /></ApiField>
            </div>
          </div>

          <div className="ptdt-voip-provider-section">
            <div className="ptdt-voip-provider-section-title"><KeyRound size={17} /><div><strong>Credential references</strong><span>Store masked labels or secret-manager references only. Do not paste raw secrets here.</span></div><span className="ptdt-voip-secure-badge"><ShieldCheck size={13} /> Secret safe</span></div>
            <div className="ptdt-voip-provider-grid cols-3">
              <ApiField label="Password reference" icon={LockKeyhole}><input className="ptdt-input" value={form.passwordLabel} onChange={event => setForm({ ...form, passwordLabel: event.target.value })} placeholder="Masked/reference only" /></ApiField>
              <ApiField label="API key reference" icon={FileKey2}><input className="ptdt-input" value={form.apiKeyLabel} onChange={event => setForm({ ...form, apiKeyLabel: event.target.value })} placeholder="Masked/reference only" /></ApiField>
              <ApiField label="API secret reference" icon={KeyRound}><input className="ptdt-input" value={form.apiSecretLabel} onChange={event => setForm({ ...form, apiSecretLabel: event.target.value })} placeholder="Masked/reference only" /></ApiField>
            </div>
          </div>

          <div className="ptdt-voip-provider-section">
            <div className="ptdt-voip-provider-section-title"><FileKey2 size={17} /><div><strong>Provider notes</strong><span>Operational notes for admins and future provider integrations.</span></div></div>
            <ApiField label="Notes">
              <textarea className="ptdt-input ptdt-voip-notes-input" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} placeholder="Calling API docs are currently unavailable; provider balance is maintained manually." />
            </ApiField>
          </div>

          <div className="ptdt-voip-provider-footer">
            <span className="ptdt-voip-api-footnote">API Info is separate from customer wallet allocation and rate cards.</span>
            <button className="ptdt-voip-save-provider" disabled={saving}><Save size={16} /> {saving ? 'Saving API info...' : 'Save API info'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
