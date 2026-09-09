import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { RadioTower, Save, WalletCards } from 'lucide-react'
import { commercialControlApi, type CommercialCallingBillingSetup, type CommercialCallingRate } from '../api/commercialControl.api'

type Props = {
  accountId?: number
  accountCurrency?: string
  disabled?: boolean
  onAllowanceApplied?: () => void
}

const money = (value: string | number | undefined) => `EUR ${Number(value || 0).toFixed(2)}`

const inputStyle = { width: '100%', minWidth: 0 } as const

export default function CommercialCallingBillingPanel({ accountId, accountCurrency, disabled, onAllowanceApplied }: Props) {
  const [setup, setSetup] = useState<CommercialCallingBillingSetup | null>(null)
  const [providerForm, setProviderForm] = useState({ availableBalance: '', reserveBalance: '5', enforcementEnabled: false })
  const [allowanceForm, setAllowanceForm] = useState({ credit: '', includedMinutes: '', reference: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const rates = useMemo(() => setup?.rates || [], [setup?.rates])

  const load = async () => {
    const next = await commercialControlApi.getCallingBillingSetup()
    setSetup(next)
    setProviderForm({
      availableBalance: String(next.provider.availableBalance ?? 0),
      reserveBalance: String(next.provider.reserveBalance ?? 5),
      enforcementEnabled: Boolean(next.provider.enforcementEnabled),
    })
  }

  useEffect(() => { void load().catch(err => setError(err instanceof Error ? err.message : 'Unable to load calling billing')) }, [])

  const save = async (task: () => Promise<void>, success: string) => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await task()
      await load()
      setMessage(success)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calling billing update failed')
    } finally {
      setSaving(false)
    }
  }

  const saveProvider = (event: FormEvent) => {
    event.preventDefault()
    void save(async () => { await commercialControlApi.updateCallingProvider(providerForm) }, 'IllyVoIP provider wallet saved.')
  }

  const saveRate = (rate: CommercialCallingRate) => {
    void save(async () => { await commercialControlApi.saveCallingRate({ ...rate }) }, `${rate.destinationName} rate saved.`)
  }

  const updateRate = (id: number, patch: Partial<CommercialCallingRate>) => {
    setSetup(current => current ? { ...current, rates: current.rates.map(rate => rate.id === id ? { ...rate, ...patch } : rate) } : current)
  }

  const allocate = (event: FormEvent) => {
    event.preventDefault()
    if (!accountId) return
    void save(async () => {
      await commercialControlApi.grantCallingAllowance(accountId, allowanceForm)
      setAllowanceForm({ credit: '', includedMinutes: '', reference: '', description: '' })
      onAllowanceApplied?.()
    }, 'Customer calling allowance allocated.')
  }

  return (
    <section className="glass" style={{ padding: 18, marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <div><div className="eyebrow green"><RadioTower size={12} /> IllyVoIP Calling Billing</div><h3 style={{ margin: '7px 0 0' }}>Provider Capacity & Rate Cards</h3></div>
        <div className="mono" style={{ color: setup?.provider.enforcementEnabled ? 'var(--green-2)' : 'var(--orange)', fontWeight: 900 }}>{setup?.provider.enforcementEnabled ? 'ENFORCEMENT ON' : 'ENFORCEMENT OFF'}</div>
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</div>}
      {message && <div style={{ color: 'var(--green-2)', marginBottom: 12 }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14, marginBottom: 16 }}>
        <form onSubmit={saveProvider} style={{ display: 'grid', gap: 10, padding: 14, border: '1px solid var(--border)', borderRadius: 8 }}>
          <strong>Provider Wallet</strong>
          <label>IllyVoIP available EUR<input className="ptdt-input" style={inputStyle} inputMode="decimal" value={providerForm.availableBalance} onChange={event => setProviderForm({ ...providerForm, availableBalance: event.target.value })} /></label>
          <label>Reserve EUR<input className="ptdt-input" style={inputStyle} inputMode="decimal" value={providerForm.reserveBalance} onChange={event => setProviderForm({ ...providerForm, reserveBalance: event.target.value })} /></label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={providerForm.enforcementEnabled} onChange={event => setProviderForm({ ...providerForm, enforcementEnabled: event.target.checked })} /> Enforce customer wallet before AMI calls</label>
          <button className="btn-brand" disabled={disabled || saving}><Save size={14} /> Save Provider</button>
        </form>

        <form onSubmit={allocate} style={{ display: 'grid', gap: 10, padding: 14, border: '1px solid var(--border)', borderRadius: 8 }}>
          <strong>Selected Customer Allowance</strong>
          <div className="mono" style={{ color: 'var(--text-3)' }}>Available to allocate: {money(setup?.allocatableCustomerCredit)}</div>
          <label>EUR calling credit<input className="ptdt-input" style={inputStyle} inputMode="decimal" value={allowanceForm.credit} onChange={event => setAllowanceForm({ ...allowanceForm, credit: event.target.value })} /></label>
          <label>Included minutes<input className="ptdt-input" style={inputStyle} inputMode="numeric" value={allowanceForm.includedMinutes} onChange={event => setAllowanceForm({ ...allowanceForm, includedMinutes: event.target.value })} /></label>
          <label>Reference<input className="ptdt-input" style={inputStyle} value={allowanceForm.reference} onChange={event => setAllowanceForm({ ...allowanceForm, reference: event.target.value })} /></label>
          <button className="btn-brand" disabled={disabled || saving || !accountId || accountCurrency !== 'EUR'}><WalletCards size={14} /> Allocate Allowance</button>
        </form>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="ptdt-table" style={{ width: '100%', minWidth: 850, borderCollapse: 'collapse' }}>
          <thead><tr><th>Destination</th><th>Prefix</th><th>Carrier EUR/min</th><th>Customer EUR/min</th><th>Minimum sec</th><th>Increment sec</th><th>Active</th><th /></tr></thead>
          <tbody>{rates.map(rate => <tr key={rate.id} style={{ borderTop: '1px solid var(--border)' }}>
            <td style={{ padding: 8 }}><input className="ptdt-input" style={inputStyle} value={rate.destinationName} onChange={event => updateRate(rate.id, { destinationName: event.target.value })} /></td>
            <td style={{ padding: 8 }}><input className="ptdt-input" style={inputStyle} value={rate.dialPrefix} onChange={event => updateRate(rate.id, { dialPrefix: event.target.value })} /></td>
            <td style={{ padding: 8 }}><input className="ptdt-input" style={inputStyle} inputMode="decimal" value={rate.carrierRatePerMinute} onChange={event => updateRate(rate.id, { carrierRatePerMinute: event.target.value })} /></td>
            <td style={{ padding: 8 }}><input className="ptdt-input" style={inputStyle} inputMode="decimal" value={rate.customerRatePerMinute} onChange={event => updateRate(rate.id, { customerRatePerMinute: event.target.value })} /></td>
            <td style={{ padding: 8 }}><input className="ptdt-input" style={inputStyle} inputMode="numeric" value={rate.minimumSeconds} onChange={event => updateRate(rate.id, { minimumSeconds: Number(event.target.value) })} /></td>
            <td style={{ padding: 8 }}><input className="ptdt-input" style={inputStyle} inputMode="numeric" value={rate.incrementSeconds} onChange={event => updateRate(rate.id, { incrementSeconds: Number(event.target.value) })} /></td>
            <td style={{ padding: 8, textAlign: 'center' }}><input type="checkbox" checked={rate.isActive} onChange={event => updateRate(rate.id, { isActive: event.target.checked })} /></td>
            <td style={{ padding: 8 }}><button type="button" className="ptdt-action-btn" disabled={disabled || saving} onClick={() => saveRate(rate)}>Save</button></td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  )
}
