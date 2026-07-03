import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { BookUser, Building2, Plus, Search, Trash2, Upload, X } from 'lucide-react'
import { useContacts } from '../hooks/useContacts'
import StatsCard from '../components/StatsCard'
import { campaignsAPI } from '../api/campaigns.api'
import { administrationApi } from '../api/administration.api'
import { commercialControlApi, type CommercialAccount } from '../api/commercialControl.api'
import PtdtDialog, { type PtdtDialogState } from '../components/PtdtDialog'
import CustomerAccordionHeader, { customerAccordionBodyStyle } from '../components/CustomerAccordionHeader'
import { mergeMasterCustomerGroups, useMasterCustomerAccounts } from '../hooks/useMasterCustomerAccounts'

const COL_PINK = '#fb0b8c'
const COL_GREEN = '#00a747'
const COL_GOLD = '#f0b90b'
const COL_DANGER = '#ef4444'
const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  PENDING: { color: COL_GOLD, bg: 'rgba(240,185,11,0.12)' },
  CALLING: { color: COL_PINK, bg: 'rgba(251,11,140,0.10)' },
  ANSWERED: { color: COL_GREEN, bg: 'rgba(0,167,71,0.10)' },
  DONE: { color: COL_GREEN, bg: 'rgba(0,167,71,0.10)' },
  NO_ANSWER: { color: COL_GOLD, bg: 'rgba(240,185,11,0.12)' },
  BUSY: { color: COL_DANGER, bg: 'rgba(239,68,68,0.12)' },
  DNC: { color: 'var(--text-3)', bg: 'var(--bg-2)' },
}
const filterStyle: React.CSSProperties = { padding: '9px 14px', background: 'var(--bg-glass-hi)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', fontSize: 13, outline: 'none', backdropFilter: 'blur(8px)' }

type CustomerAccount = { id: number | null; name: string; code: string; status: string }
type CampaignRecord = Record<string, unknown> & { commercialAccount?: CustomerAccount | null }
type ContactRecord = Record<string, unknown> & { commercialAccount?: CustomerAccount | null; campaign?: { id: number; name: string; commercialAccount?: CustomerAccount | null } | null }
type ContactGroup = CustomerAccount & { key: string; contacts: ContactRecord[] }

const fallbackAccount: CustomerAccount = { id: null, name: 'PTDT Super Admin', code: '—', status: '—' }
const asAccount = (value?: Partial<CustomerAccount | CommercialAccount> | null): CustomerAccount | null => value && (value.id || value.name) ? { id: value.id ? Number(value.id) : null, name: String(value.name || 'PTDT Super Admin'), code: String(value.code || '—'), status: String(value.status || '—') } : null
const accountId = (account?: CustomerAccount | null) => account?.id ? Number(account.id) : null
const uniqueAccounts = (accounts: Array<CustomerAccount | null | undefined>) => { const map = new Map<number | string, CustomerAccount>(); accounts.forEach(account => { if (!account) return; map.set(account.id ?? account.name, account) }); return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)) }
const accountForCampaignId = (campaignId: unknown, campaigns: CampaignRecord[]) => asAccount(campaigns.find(c => Number(c.id) === Number(campaignId))?.commercialAccount)
const accountForContact = (contact: ContactRecord, campaigns: CampaignRecord[]) => asAccount(contact.commercialAccount) || asAccount(contact.campaign?.commercialAccount) || accountForCampaignId(contact.campaignId, campaigns) || fallbackAccount
const groupContactsByCustomer = (contacts: ContactRecord[], campaigns: CampaignRecord[]) => { const map = new Map<string, ContactGroup>(); contacts.forEach(contact => { const account = accountForContact(contact, campaigns); const key = account.id ? `account-${account.id}` : 'account-unassigned'; if (!map.has(key)) map.set(key, { ...account, key, contacts: [] }); map.get(key)?.contacts.push(contact) }); return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)) }

export default function Contacts() {
  const [search, setSearch] = useState('')
  const [customerId, setCustomerId] = useState<number | undefined>()
  const [campId, setCampId] = useState<number | undefined>()
  const [status, setStatus] = useState<string | undefined>()
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([])
  const [accountOptions, setAccountOptions] = useState<CustomerAccount[]>([])
  const [uploading, setUploading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', notes: '' })
  const [contactCampaignId, setContactCampaignId] = useState<number | ''>('')
  const [dialog, setDialog] = useState<PtdtDialogState | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const fileRef = useRef<HTMLInputElement>(null)
  const masterAccounts = useMasterCustomerAccounts()

  const { contacts, stats, loading, error, pagination, uploadCSV, createContact, deleteContact } = useContacts({ campaignId: campId, commercialAccountId: customerId, status: status || undefined, search: search || undefined, limit: 50 })
  const contactRows = contacts as ContactRecord[]
  const customers = useMemo(() => uniqueAccounts([...accountOptions, ...campaigns.map(c => asAccount(c.commercialAccount)), ...contactRows.map(c => accountForContact(c, campaigns))]), [accountOptions, campaigns, contactRows])
  const visibleCampaigns = useMemo(() => customerId ? campaigns.filter(c => accountId(asAccount(c.commercialAccount)) === customerId) : campaigns, [campaigns, customerId])
  const visibleContacts = useMemo(() => contactRows.filter(contact => { const q = search.toLowerCase(); return (!customerId || accountId(accountForContact(contact, campaigns)) === customerId) && (!campId || Number(contact.campaignId) === campId) && (!status || String(contact.status) === status) && (!q || String(contact.name || '').toLowerCase().includes(q) || String(contact.phone || '').toLowerCase().includes(q)) }), [contactRows, campaigns, customerId, campId, status, search])
  const groupedContacts = useMemo(() => mergeMasterCustomerGroups(masterAccounts, groupContactsByCustomer(visibleContacts, campaigns), 'contacts'), [visibleContacts, campaigns, masterAccounts])
  const visibleTotal = Number((pagination as Record<string, number> | undefined)?.total ?? contacts.length)
  const toggleGroup = (key: string) => setExpandedGroups(prev => ({ ...prev, [key]: !(prev[key] ?? true) }))

  useEffect(() => {
    let cancelled = false
    const loadMeta = async () => {
      const [campaignResult, meResult, commercialResult] = await Promise.allSettled([
        campaignsAPI.getAll({ limit: 500 }),
        administrationApi.getMe({ silent: true }),
        commercialControlApi.listAccounts({ silent: true }),
      ])
      if (cancelled) return
      const campaignList = campaignResult.status === 'fulfilled' ? (campaignResult.value.campaigns || []) as CampaignRecord[] : []
      setCampaigns(campaignList)

      const membershipAccounts = meResult.status === 'fulfilled' ? meResult.value.memberships.map(membership => asAccount(membership.account)) : []
      let platformAccounts: Array<CustomerAccount | null> = []
      if (commercialResult.status === 'fulfilled') platformAccounts = commercialResult.value.map(account => asAccount(account))
      if (platformAccounts.length === 0 && meResult.status === 'fulfilled' && meResult.value.platformAccess) {
        try {
          const overview = await administrationApi.getPlatformOverview({ silent: true })
          platformAccounts = overview.accounts.map(account => asAccount(account))
        } catch {
          platformAccounts = []
        }
      }
      if (!cancelled) setAccountOptions(uniqueAccounts([...platformAccounts, ...membershipAccounts, ...campaignList.map(c => asAccount(c.commercialAccount))]))
    }
    void loadMeta()
    return () => { cancelled = true }
  }, [])

  useEffect(() => { if (campId && !visibleCampaigns.some(c => Number(c.id) === campId)) setCampId(undefined); if (contactCampaignId && !visibleCampaigns.some(c => Number(c.id) === Number(contactCampaignId))) setContactCampaignId('') }, [visibleCampaigns, campId, contactCampaignId])

  const handleCSV = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (!campId) { setDialog({ tone: 'error', title: 'Select a campaign', message: 'Choose a campaign before uploading contacts. Contacts are stored inside a campaign.' }); if (fileRef.current) fileRef.current.value = ''; return } setUploading(true); try { const result = await uploadCSV(campId, file); setDialog({ tone: 'success', title: 'CSV import complete', message: `Imported: ${result.imported} | Duplicates: ${result.duplicates} | DNC: ${result.dncSkipped}` }) } catch (err) { setDialog({ tone: 'error', title: 'CSV upload failed', message: err instanceof Error ? err.message : 'Upload failed' }) } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' } }
  const handleCreateContact = async () => { if (!newContact.phone.trim()) { setDialog({ tone: 'error', title: 'Phone number required', message: 'Enter a phone number before adding this contact.' }); return } if (!contactCampaignId) { setDialog({ tone: 'error', title: 'Select a campaign', message: 'Choose a campaign before adding this contact.' }); return } setCreating(true); try { await createContact({ name: newContact.name.trim() || newContact.phone.trim(), phone: newContact.phone.trim(), email: newContact.email.trim() || undefined, notes: newContact.notes.trim() || undefined, campaignId: contactCampaignId }); setNewContact({ name: '', phone: '', email: '', notes: '' }); setAddOpen(false); setDialog({ tone: 'success', title: 'Contact added', message: 'The contact has been added to the selected campaign.' }) } catch (err) { setDialog({ tone: 'error', title: 'Cannot add contact', message: err instanceof Error ? err.message : 'Failed to add contact' }) } finally { setCreating(false) } }
  const confirmDeleteContact = (contact: ContactRecord) => { const contactId = Number(contact.id); const label = String(contact.name || contact.phone || 'this contact'); setDialog({ tone: 'confirm', title: 'Delete contact?', message: `This will remove ${label} from the contact list.`, confirmLabel: 'Delete Contact', onConfirm: async () => { setDialog(null); try { await deleteContact(contactId); setDialog({ tone: 'success', title: 'Contact deleted', message: 'The contact has been deleted.' }) } catch (err) { setDialog({ tone: 'error', title: 'Cannot delete contact', message: err instanceof Error ? err.message : 'Failed to delete contact' }) } } }) }
  const renderContactRow = (contact: ContactRecord, index: number) => { const sc = STATUS_COLORS[String(contact.status)] || STATUS_COLORS.PENDING; const campaign = campaigns.find(item => Number(item.id) === Number(contact.campaignId)); return <motion.tr key={Number(contact.id)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(index * 0.015, 0.18) }} className="table-row" style={{ borderBottom: '1px solid var(--border)' }}><td className="mono" style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-3)' }}>{String(index + 1).padStart(2, '0')}</td><td style={{ padding: '14px 16px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', boxShadow: '0 0 12px rgba(251,11,140,0.32)' }}>{String(contact.name || '?').charAt(0).toUpperCase()}</div><span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{String(contact.name || '—')}</span></div></td><td className="mono" style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-2)' }}>{String(contact.phone || '—')}</td><td className="mono" style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-3)' }}>{String(campaign?.name || `#${Number(contact.campaignId)}`)}</td><td style={{ padding: '14px 16px' }}><span className="badge" style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.color}` }}>{String(contact.status || 'PENDING')}</span></td><td style={{ padding: '14px 16px' }}><button onClick={() => confirmDeleteContact(contact)} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.32)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', cursor: 'pointer', color: COL_DANGER, display: 'inline-flex', alignItems: 'center' }}><Trash2 size={13} /></button></td></motion.tr> }

  return <div className="ptdt-page ptdt-mobile-page ptdt-mobile-page-contacts"><PtdtDialog dialog={dialog} onClose={() => setDialog(null)} /><motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, gap: 18, flexWrap: 'wrap' }}><div><div className="eyebrow purple" style={{ marginBottom: 14 }}><BookUser size={11} /> PTDT-Dialer Contacts</div><h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, lineHeight: 1.05, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 10 }}>Contact <span className="gradient-brand-text">Management</span></h1><p style={{ fontSize: 14.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><span className="pulse-dot" /> {`${visibleTotal} total PTDT-Dialer contacts`}</p>{error && <p style={{ marginTop: 8, fontSize: 12.5, color: 'var(--danger)', fontWeight: 700 }}>{error}</p>}</div><div className="ptdt-toolbar"><input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} style={{ display: 'none' }} /><button type="button" className="ptdt-action-btn active" onClick={() => { setContactCampaignId(campId ?? ''); setAddOpen(true) }}><Plus size={14} /> Add Contact</button><motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => fileRef.current?.click()} disabled={uploading} className="ptdt-action-btn active" style={{ color: COL_GREEN }}><Upload size={15} /> {uploading ? 'Uploading…' : 'Upload CSV'}</motion.button></div></motion.div>
    {stats && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>{[{ label: 'Total', value: Number(stats.total), color: COL_PINK, bg: 'rgba(251,11,140,0.10)' }, { label: 'Pending', value: Number(stats.pending), color: COL_GOLD, bg: 'rgba(240,185,11,0.12)' }, { label: 'Answered', value: Number(stats.answered), color: COL_GREEN, bg: 'rgba(0,167,71,0.10)' }, { label: 'No Answer', value: Number(stats.noAnswer), color: COL_DANGER, bg: 'rgba(239,68,68,0.12)' }, { label: 'Answer %', value: `${stats.answerRate}%`, color: COL_PINK, bg: 'rgba(251,11,140,0.10)' }].map((item, index) => <StatsCard key={item.label} index={index} label={item.label} value={item.value} icon={<BookUser size={16} />} color={item.color} bg={item.bg} />)}</div>}
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}><div style={{ position: 'relative' }}><Search size={14} color="var(--text-3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ ...filterStyle, paddingLeft: 34, width: 220 }} /></div><div style={{ position: 'relative' }}><Building2 size={14} color="var(--text-3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} /><select value={customerId ?? ''} onChange={e => { setCustomerId(e.target.value ? Number(e.target.value) : undefined); setCampId(undefined) }} style={{ ...filterStyle, paddingLeft: 34 }}><option value="">All Customers</option>{customers.map(customer => <option key={customer.id || customer.name} value={customer.id || ''}>{customer.name}</option>)}</select></div><select value={campId ?? ''} onChange={e => setCampId(e.target.value ? Number(e.target.value) : undefined)} style={filterStyle}><option value="">All Campaigns</option>{visibleCampaigns.map(c => <option key={Number(c.id)} value={Number(c.id)}>{String(c.name)}</option>)}</select><select value={status ?? ''} onChange={e => setStatus(e.target.value || undefined)} style={filterStyle}><option value="">All Status</option>{['PENDING', 'CALLING', 'ANSWERED', 'NO_ANSWER', 'BUSY', 'DONE', 'DNC'].map(item => <option key={item} value={item}>{item}</option>)}</select></div>
    <div style={{ display: 'grid', gap: 12 }}>{loading && contacts.length > 0 ? <div className="glass" style={{ padding: 40, color: 'var(--text-3)', textAlign: 'center' }}>Loading contacts…</div> : groupedContacts.length === 0 ? <div className="glass" style={{ padding: 40, color: 'var(--text-3)', textAlign: 'center' }}>No contacts found</div> : groupedContacts.map((group, groupIndex) => { const isOpen = expandedGroups[group.key] ?? groupIndex === 0; const pending = group.contacts.filter(c => c.status === 'PENDING').length; const answered = group.contacts.filter(c => ['ANSWERED', 'DONE'].includes(String(c.status))).length; return <div key={group.key} className="glass" style={{ overflow: 'hidden', padding: 0 }}><CustomerAccordionHeader isOpen={isOpen} onClick={() => toggleGroup(group.key)} name={group.name} meta={`Customer Code: ${group.code} · Status: ${group.status}`} badges={[{ label: `${group.contacts.length} Contacts` }, { label: `${pending} Pending`, color: COL_GOLD, bg: 'rgba(240,185,11,.12)', border: '1px solid rgba(240,185,11,.28)' }, { label: `${answered} Answered`, color: COL_GREEN, bg: 'rgba(0,167,71,.10)', border: '1px solid rgba(0,167,71,.28)' }]} />{isOpen && <div style={{ ...customerAccordionBodyStyle, overflow: 'auto' }}><table className="ptdt-table" style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr style={{ background: 'var(--bg-glass)' }}>{['#', 'Name', 'Phone', 'Campaign', 'Status', 'Action'].map(header => <th key={header} style={{ padding: '13px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--border)' }}>{header}</th>)}</tr></thead><tbody>{group.contacts.map(renderContactRow)}</tbody></table></div>}</div> })}</div>
    {addOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 10050, background: 'rgba(3,2,8,0.58)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }} onMouseDown={e => { if (e.target === e.currentTarget) setAddOpen(false) }}><div className="glass-hi" style={{ width: 'min(520px, 96vw)', padding: 24, borderRadius: 28 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}><div><div className="eyebrow purple" style={{ marginBottom: 10 }}><BookUser size={12} /> Individual Contact</div><h2 className="display" style={{ fontSize: 22 }}>Add Contact</h2></div><button type="button" className="ptdt-action-icon-btn" onClick={() => setAddOpen(false)}><X size={15} /></button></div><div style={{ display: 'grid', gap: 12 }}><select className="ptdt-input" value={contactCampaignId} onChange={e => setContactCampaignId(e.target.value ? Number(e.target.value) : '')} required><option value="">Select campaign *</option>{visibleCampaigns.map(c => <option key={Number(c.id)} value={Number(c.id)}>{String(c.name)}</option>)}</select><input className="ptdt-input" value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} placeholder="Name / label" /><input className="ptdt-input mono" value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })} placeholder="Phone number *" /><input className="ptdt-input" value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })} placeholder="Email optional" /><textarea className="ptdt-textarea" value={newContact.notes} onChange={e => setNewContact({ ...newContact, notes: e.target.value })} placeholder="Notes optional" rows={3} />{!contactCampaignId && <div style={{ color: 'var(--warning)', fontSize: 12 }}>Campaign is required because contacts are stored inside a campaign.</div>}<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button className="ptdt-action-btn" type="button" onClick={() => setAddOpen(false)}>Cancel</button><button className="btn-brand" type="button" disabled={creating || !newContact.phone.trim() || !contactCampaignId} onClick={() => void handleCreateContact()} style={{ minHeight: 38, fontSize: 12 }}>{creating ? 'Adding...' : 'Add Contact'}</button></div></div></div></div>}
  </div>
}
