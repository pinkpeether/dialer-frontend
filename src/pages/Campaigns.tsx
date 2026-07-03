import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Eye, Megaphone, Pause, Play, Plus, Trash2, X } from 'lucide-react'
import { useCampaigns } from '../hooks/useCampaigns'
import StatsCard from '../components/StatsCard'
import DialingModeSelector from '../components/dialing/DialingModeSelector'
import DialingModeBadge from '../components/dialing/DialingModeBadge'
import PtdtDialog, { type PtdtDialogState } from '../components/PtdtDialog'
import CustomerAccordionHeader, { customerAccordionBodyStyle } from '../components/CustomerAccordionHeader'

const COL_PINK = '#fb0b8c'
const COL_GREEN = '#00a747'
const COL_PURPLE = '#8057d7'
const COL_GOLD = '#f0b90b'

type CampaignRecord = Record<string, unknown>
type CustomerAccount = { id: number | null; name: string; code: string; status: string }
type CampaignGroup = CustomerAccount & { key: string; campaigns: CampaignRecord[] }

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: 'var(--text-3)', bg: 'var(--bg-2)' },
  ACTIVE: { color: COL_GREEN, bg: 'rgba(0,167,71,0.10)' },
  PAUSED: { color: COL_GOLD, bg: 'rgba(240,185,11,0.12)' },
  COMPLETED: { color: COL_PURPLE, bg: 'rgba(128,87,215,0.12)' },
}
const inputStyle: CSSProperties = { padding: '11px 14px', background: 'var(--bg-glass-hi)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%' }
const campaignFieldLabelStyle: CSSProperties = { color: 'var(--text-2)', fontSize: 12, fontWeight: 900 }
const requiredStar = <span style={{ color: '#ef4444' }}> *</span>
const timezoneValue = (value: string, label?: string) => ({ value, label: label || value })

const TIMEZONE_GROUPS = [
  {
    label: 'Recommended',
    zones: [
      timezoneValue('UTC', 'UTC'),
    ],
  },
  {
    label: 'US & Canada',
    zones: [
      timezoneValue('America/New_York', 'USA Eastern — America/New_York'),
      timezoneValue('America/Chicago', 'USA Central — America/Chicago'),
      timezoneValue('America/Denver', 'USA Mountain — America/Denver'),
      timezoneValue('America/Los_Angeles', 'USA Pacific — America/Los_Angeles'),
      timezoneValue('America/Toronto', 'Canada Eastern — America/Toronto'),
      timezoneValue('America/Vancouver', 'Canada Pacific — America/Vancouver'),
    ],
  },
  {
    label: 'Australia & Pacific',
    zones: [
      timezoneValue('Australia/Sydney'),
      timezoneValue('Australia/Melbourne'),
      timezoneValue('Pacific/Auckland'),
    ],
  },
  {
    label: 'Europe',
    zones: [
      timezoneValue('Europe/London'),
      timezoneValue('Europe/Paris'),
      timezoneValue('Europe/Berlin'),
      timezoneValue('Europe/Madrid'),
      timezoneValue('Europe/Rome'),
      timezoneValue('Europe/Amsterdam'),
      timezoneValue('Europe/Istanbul'),
    ],
  },
  {
    label: 'Middle East & Asia',
    zones: [
      timezoneValue('Asia/Dubai'),
      timezoneValue('Asia/Riyadh'),
      timezoneValue('Asia/Qatar'),
      timezoneValue('Asia/Karachi'),
      timezoneValue('Asia/Kolkata'),
      timezoneValue('Asia/Dhaka'),
      timezoneValue('Asia/Singapore'),
      timezoneValue('Asia/Hong_Kong'),
      timezoneValue('Asia/Tokyo'),
      timezoneValue('Asia/Shanghai'),
    ],
  },
] as const

const getGlobalTimezones = () => {
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') || []
  const curated = new Set(TIMEZONE_GROUPS.flatMap(group => group.zones.map(zone => zone.value)))
  return supported
    .filter(zone => !curated.has(zone))
    .sort((a, b) => a.localeCompare(b))
}

const getNumber = (value: unknown, fallback = 0) => { const num = Number(value); return Number.isFinite(num) ? num : fallback }
const getText = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback

const accountForCampaign = (campaign: CampaignRecord): CustomerAccount => {
  const account = campaign.commercialAccount as Record<string, unknown> | null | undefined
  return { id: account?.id ? Number(account.id) : null, name: getText(account?.name, 'PTDT Super Admin'), code: getText(account?.code, '—'), status: getText(account?.status, '—') }
}
const groupCampaignsByCustomer = (campaigns: CampaignRecord[]) => {
  const map = new Map<string, CampaignGroup>()
  campaigns.forEach(campaign => {
    const account = accountForCampaign(campaign)
    const key = account.id ? `account-${account.id}` : 'account-unassigned'
    if (!map.has(key)) map.set(key, { ...account, key, campaigns: [] })
    map.get(key)?.campaigns.push(campaign)
  })
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function TimezonePicker({
  value,
  onChange,
  globalTimezones,
}: {
  value: string
  onChange: (value: string) => void
  globalTimezones: string[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  // ptdt-timezone-picker-escape
  useEffect(() => {
    if (!open) return undefined

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) return
      event.preventDefault()
      setQuery('')
      setOpen(false)
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open])

  const allCuratedZones = TIMEZONE_GROUPS.flatMap(group => group.zones)
  const selectedLabel = allCuratedZones.find(zone => zone.value === value)?.label || value || 'Select timezone'
  const normalizedQuery = query.trim().toLowerCase()
  const matches = (zone: { value: string; label: string }) =>
    !normalizedQuery || `${zone.label} ${zone.value}`.toLowerCase().includes(normalizedQuery)

  const curatedGroups = TIMEZONE_GROUPS
    .map(group => ({ label: group.label, zones: group.zones.filter(matches) }))
    .filter(group => group.zones.length > 0)

  const curatedValues = new Set(allCuratedZones.map(zone => zone.value))
  const globalMatches = globalTimezones
    .filter(zone => !curatedValues.has(zone))
    .filter(zone => !normalizedQuery || zone.toLowerCase().includes(normalizedQuery))

  const selectZone = (zone: string) => {
    onChange(zone)
    setQuery('')
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setOpen(previous => !previous)}
        style={{
          ...inputStyle,
          minHeight: 43,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <span>{selectedLabel}</span>
        <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            zIndex: 50,
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            minWidth: 360,
            borderRadius: 18,
            border: '1px solid var(--border)',
            background: 'var(--bg-glass-hi)',
            boxShadow: '0 18px 45px rgba(0,0,0,0.22)',
            padding: 10,
          }}
        >
          <input
            autoFocus
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search timezone..."
            style={{ ...inputStyle, marginBottom: 10 }}
          />

          <div style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
            {curatedGroups.map(group => (
              <div key={group.label} style={{ marginBottom: 10 }}>
                <div className="mono" style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-3)', letterSpacing: 1, textTransform: 'uppercase', margin: '6px 6px' }}>
                  {group.label}
                </div>
                {group.zones.map(zone => (
                  <button
                    key={`${group.label}-${zone.value}`}
                    type="button"
                    onClick={() => selectZone(zone.value)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 10px',
                      borderRadius: 12,
                      border: zone.value === value ? '1px solid rgba(251,11,140,0.38)' : '1px solid transparent',
                      background: zone.value === value ? 'rgba(251,11,140,0.10)' : 'transparent',
                      color: zone.value === value ? 'var(--pink)' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: 12.5,
                      fontWeight: 750,
                    }}
                  >
                    {zone.label}
                  </button>
                ))}
              </div>
            ))}

            {globalMatches.length > 0 && (
              <div>
                <div className="mono" style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-3)', letterSpacing: 1, textTransform: 'uppercase', margin: '6px 6px' }}>
                  All Global Timezones
                </div>
                {globalMatches.map(zone => (
                  <button
                    key={`global-${zone}`}
                    type="button"
                    onClick={() => selectZone(zone)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 10px',
                      borderRadius: 12,
                      border: zone === value ? '1px solid rgba(251,11,140,0.38)' : '1px solid transparent',
                      background: zone === value ? 'rgba(251,11,140,0.10)' : 'transparent',
                      color: zone === value ? 'var(--pink)' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: 12.5,
                      fontWeight: 750,
                    }}
                  >
                    {zone}
                  </button>
                ))}
              </div>
            )}

            {curatedGroups.length === 0 && globalMatches.length === 0 && (
              <div style={{ padding: 14, color: 'var(--text-3)', fontSize: 12.5 }}>
                No timezone found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Campaigns() {
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [dialog, setDialog] = useState<PtdtDialogState | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState({ name: '', description: '', mode: 'PROGRESSIVE', dialingRatio: 1, script: '', timezone: 'Asia/Karachi' })
  const { campaigns, stats, loading, error, createCampaign, updateStatus, cloneCampaign, deleteCampaign, refetch } = useCampaigns({ limit: 200 })
  const groupedCampaigns = useMemo(() => groupCampaignsByCustomer(campaigns), [campaigns])
  const globalTimezones = useMemo(() => getGlobalTimezones(), [])

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault(); setActionError('')
    try { const dialingRatio = Math.max(1, Math.min(10, Number(form.dialingRatio) || 1)); await createCampaign({ ...form, dialingRatio, dialRatio: dialingRatio }); setShowForm(false); setForm({ name: '', description: '', mode: 'PROGRESSIVE', dialingRatio: 1, script: '', timezone: 'Asia/Karachi' }) }
    catch (err: unknown) { const data = (err as { response?: { data?: { message?: string; errors?: string[] } } })?.response?.data; setActionError(data?.errors?.join('\n') || data?.message || (err as Error).message || 'Failed to create campaign') }
  }
  const runAction = async (id: number, action: () => Promise<void>) => { setBusyId(id); setActionError(''); try { await action() } catch (err: unknown) { const data = (err as { response?: { data?: { message?: string; errors?: string[] } } })?.response?.data; setActionError(data?.errors?.join('\n') || data?.message || (err as Error).message || 'Campaign action failed') } finally { setBusyId(null) } }
  const safeStats = stats || { total: campaigns.length, active: campaigns.filter(c => c.status === 'ACTIVE').length, paused: campaigns.filter(c => c.status === 'PAUSED').length, draft: campaigns.filter(c => c.status === 'DRAFT').length, completed: campaigns.filter(c => c.status === 'COMPLETED').length }
  const confirmDeleteCampaign = (campaignId: number, campaignName: string) => setDialog({ tone: 'confirm', title: 'Delete campaign?', message: `This will remove ${campaignName} and its related campaign contacts/calls from this workspace.`, confirmLabel: 'Delete Campaign', onConfirm: () => { setDialog(null); void runAction(campaignId, async () => { await deleteCampaign(campaignId); setDialog({ tone: 'success', title: 'Campaign deleted', message: 'The campaign has been deleted.' }) }) } })
  const toggleGroup = (key: string, currentlyOpen = false) => setExpandedGroups(prev => ({ ...prev, [key]: !currentlyOpen }))

  const renderCampaignCard = (campaign: CampaignRecord, index: number) => {
    const campaignId = getNumber(campaign.id), campaignStatus = getText(campaign.status, 'DRAFT'), campaignMode = getText(campaign.mode, 'PROGRESSIVE')
    const style = STATUS_CONFIG[campaignStatus] || STATUS_CONFIG.DRAFT
    const dialingRatio = getNumber(campaign.dialingRatio ?? campaign.dialRatio, 1), maxRetries = getNumber(campaign.maxRetries, 3), timezone = getText(campaign.timezone, 'UTC')
    const statsData = campaign.stats as Record<string, unknown> | undefined
    const total = getNumber(campaign.totalContacts ?? statsData?.total, 0), answered = getNumber(statsData?.answered, 0), pending = getNumber(statsData?.pending, 0), missed = getNumber(statsData?.missed, 0)
    return <div key={campaignId || index} className="glass lift" style={{ padding: 22 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 10 }}><div className="display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>{getText(campaign.name, 'Untitled Campaign')}</div><div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}><DialingModeBadge mode={campaignMode} /><span className="badge" style={{ color: style.color, background: style.bg, border: `1px solid ${style.color}`, flexShrink: 0 }}>{campaignStatus}</span></div></div><p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.5, minHeight: 36 }}>{getText(campaign.description, 'No description provided')}</p>{total > 0 && <div style={{ marginBottom: 14, display: 'flex', gap: 12, flexWrap: 'wrap' }}><span style={{ fontSize: 10.5, color: COL_GREEN, fontWeight: 700 }}>✓ {answered} answered</span><span style={{ fontSize: 10.5, color: COL_GOLD, fontWeight: 700 }}>◷ {pending} pending</span><span style={{ fontSize: 10.5, color: 'rgba(255,59,95,0.80)', fontWeight: 700 }}>✕ {missed} missed</span><span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 700 }}>{total} total</span></div>}<div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: 'var(--text-3)', marginBottom: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}><span>Ratio <b className="mono" style={{ color: 'var(--text)' }}>{dialingRatio}x</b></span><span>Retries <b className="mono" style={{ color: 'var(--text)' }}>{maxRetries}</b></span><span>TZ <b style={{ color: 'var(--text)' }}>{timezone.split('/')[1] || timezone}</b></span></div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><ActionBtn onClick={() => navigate(`/campaigns/${campaignId}`)} icon={<Eye size={12} />} label="Details" color="var(--pink)" bg="rgba(251,11,140,0.10)" />{campaignStatus === 'DRAFT' && <ActionBtn disabled={busyId === campaignId} onClick={() => runAction(campaignId, () => updateStatus(campaignId, 'ACTIVE'))} icon={<Play size={12} />} label="Activate" color="var(--green-2)" bg="rgba(0,167,71,0.10)" />}{campaignStatus === 'ACTIVE' && <ActionBtn disabled={busyId === campaignId} onClick={() => runAction(campaignId, () => updateStatus(campaignId, 'PAUSED'))} icon={<Pause size={12} />} label="Pause" color="var(--warning)" bg="rgba(240,185,11,0.12)" />}{campaignStatus === 'PAUSED' && <ActionBtn disabled={busyId === campaignId} onClick={() => runAction(campaignId, () => updateStatus(campaignId, 'ACTIVE'))} icon={<Play size={12} />} label="Resume" color="var(--green-2)" bg="rgba(0,167,71,0.10)" />}<IconBtn disabled={busyId === campaignId} onClick={() => runAction(campaignId, () => cloneCampaign(campaignId))} icon={<Copy size={12} />} color="var(--text-3)" /><IconBtn disabled={busyId === campaignId} onClick={() => confirmDeleteCampaign(campaignId, getText(campaign.name, 'this campaign'))} icon={<Trash2 size={12} />} color="var(--danger)" border="rgba(239,68,68,0.32)" /></div></div>
  }

  return <div className="ptdt-mobile-page ptdt-mobile-page-campaigns" style={{ padding: '32px 36px', maxWidth: 1600, margin: '0 auto' }}><PtdtDialog dialog={dialog} onClose={() => setDialog(null)} /><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, gap: 18, flexWrap: 'wrap' }}><div><div className="eyebrow pink" style={{ marginBottom: 14 }}><Megaphone size={11} /> PTDT-Dialer Campaigns</div><h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, lineHeight: 1.05, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 10 }}>Campaign <span className="gradient-brand-text">Management</span></h1><p style={{ fontSize: 14.5, color: 'var(--text-3)' }}>Create, inspect, and orchestrate customer-grouped outbound campaigns.</p></div><button onClick={() => setShowForm(previous => !previous)} className="btn-brand" style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 'var(--radius-full)', padding: '0 22px', fontSize: 13.5, minHeight: 46 }}>{showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Cancel' : 'New Campaign'}</button></div>{(error || actionError) && <div style={{ whiteSpace: 'pre-wrap', marginBottom: 18, padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.28)', background: 'rgba(239,68,68,0.10)', color: 'var(--danger)', fontWeight: 700 }}>{actionError || error}</div>}<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>{[{ label: 'Total', value: getNumber(safeStats.total), color: COL_PINK, bg: 'rgba(251,11,140,0.10)' }, { label: 'Active', value: getNumber(safeStats.active), color: COL_GREEN, bg: 'rgba(0,167,71,0.10)' }, { label: 'Paused', value: getNumber(safeStats.paused), color: COL_GOLD, bg: 'rgba(240,185,11,0.12)' }, { label: 'Draft', value: getNumber(safeStats.draft), color: COL_PURPLE, bg: 'rgba(128,87,215,0.12)' }, { label: 'Completed', value: getNumber(safeStats.completed), color: COL_PURPLE, bg: 'rgba(128,87,215,0.12)' }].map((item, index) => <StatsCard key={item.label} index={index} label={item.label} value={item.value} icon={<Megaphone size={16} />} color={item.color} bg={item.bg} />)}</div>{showForm && <form onSubmit={handleCreate} className="glass" style={{ padding: 24, marginBottom: 24 }}><h3 className="display" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>New Campaign</h3><div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.25fr) minmax(280px, 1.25fr) minmax(88px, 0.35fr) minmax(150px, 0.55fr) minmax(280px, 1.25fr)', gap: 14, marginBottom: 14, alignItems: 'start' }}><label style={{ display: 'grid', gap: 6, minWidth: 260 }}><span style={campaignFieldLabelStyle}>Campaign Name{requiredStar}</span><input value={form.name} onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} required style={inputStyle} /></label><label style={{ display: 'grid', gap: 6, minWidth: 260 }}><span style={campaignFieldLabelStyle}>Description</span><input value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} style={inputStyle} /></label><label style={{ display: 'grid', gap: 6, maxWidth: 96 }}><span style={campaignFieldLabelStyle}>Dialing Ratio{requiredStar}</span><input type="number" value={form.dialingRatio} onChange={event => setForm(previous => ({ ...previous, dialingRatio: Number(event.target.value) }))} required style={inputStyle} min={1} max={10} /></label><div style={{ maxWidth: 170, minWidth: 145 }}><DialingModeSelector value={form.mode} onChange={mode => setForm(previous => ({ ...previous, mode }))} /></div><label style={{ display: 'grid', gap: 6, minWidth: 280 }}><span style={campaignFieldLabelStyle}>Timezone{requiredStar}</span><TimezonePicker value={form.timezone} onChange={timezone => setForm(previous => ({ ...previous, timezone }))} globalTimezones={globalTimezones} /></label><label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}><span style={campaignFieldLabelStyle}>Call Script</span><textarea value={form.script} onChange={event => setForm(previous => ({ ...previous, script: event.target.value }))} rows={3} style={{ ...inputStyle, minHeight: 88, resize: 'vertical' }} /></label></div><div style={{ display: 'flex', gap: 10 }}><button type="submit" className="btn-brand" style={{ borderRadius: 'var(--radius-md)', padding: '10px 22px', fontSize: 13, color: '#fff' }}>Create Campaign</button><button type="button" onClick={() => setShowForm(false)} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 22px', color: 'var(--text-3)', fontSize: 13, fontWeight: 600 }}>Cancel</button></div></form>}{loading ? <div className="glass" style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>Loading campaigns…</div> : campaigns.length === 0 ? <div className="glass" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>No campaigns found. Create a campaign to get started.<div style={{ marginTop: 16 }}><button onClick={() => void refetch()}>Refresh</button></div></div> : <div style={{ display: 'grid', gap: 12 }}>{groupedCampaigns.map((group, groupIndex) => { const isOpen = expandedGroups[group.key] ?? groupIndex === 0; const active = group.campaigns.filter(campaign => campaign.status === 'ACTIVE').length; const draft = group.campaigns.filter(campaign => campaign.status === 'DRAFT').length; const paused = group.campaigns.filter(campaign => campaign.status === 'PAUSED').length; return <div key={group.key} className="glass" style={{ overflow: 'hidden' }}><CustomerAccordionHeader isOpen={isOpen} onClick={() => toggleGroup(group.key, isOpen)} name={group.name} meta={`Customer Code: ${group.code} · Status: ${group.status}`} badges={[{ label: `${group.campaigns.length} Campaigns` }, { label: `${active} Active`, color: COL_GREEN, bg: 'rgba(0,167,71,.10)', border: '1px solid rgba(0,167,71,.28)' }, { label: `${paused} Paused`, color: COL_GOLD, bg: 'rgba(240,185,11,.12)', border: '1px solid rgba(240,185,11,.28)' }, { label: `${draft} Draft`, color: 'var(--text-3)', bg: 'var(--bg-2)', border: '1px solid var(--border)' }]} />{isOpen && <div style={{ ...customerAccordionBodyStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, padding: 16 }}>{group.campaigns.map(renderCampaignCard)}</div>}</div> })}</div>}</div>
}

function ActionBtn({ icon, label, onClick, color, bg, disabled }: { icon: ReactNode; label: string; onClick?: () => void; color: string; bg: string; disabled?: boolean }) { return <button disabled={disabled} onClick={onClick} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: bg, border: `1px solid ${color}`, borderRadius: 'var(--radius-md)', padding: '9px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, color, fontSize: 12, fontWeight: 600, minWidth: 94 }}>{icon} {label}</button> }
function IconBtn({ icon, onClick, color, border, disabled }: { icon: ReactNode; onClick?: () => void; color: string; border?: string; disabled?: boolean }) { return <button disabled={disabled} onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-glass)', border: `1px solid ${border || 'var(--border)'}`, borderRadius: 'var(--radius-md)', padding: '9px 11px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, color, fontSize: 12 }}>{icon}</button> }
