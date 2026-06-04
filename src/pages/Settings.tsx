import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, KeyRound, Save, Settings2, UserRound } from 'lucide-react'
import { profileAPI } from '../api/profile.api'
import { useAuthStore } from '../store/auth.store'
import { useToast } from '../hooks/useToast'

const PTDT_MOBILE_PAGE_CSS = `
@media (max-width: 900px) {
  .ptdt-mobile-page {
    width: 100% !important;
    max-width: 100vw !important;
    margin: 0 !important;
    padding: 72px 12px 28px !important;
    overflow-x: hidden !important;
    box-sizing: border-box !important;
  }

  .ptdt-mobile-page *,
  .ptdt-mobile-page *::before,
  .ptdt-mobile-page *::after {
    box-sizing: border-box;
    min-width: 0;
  }

  .ptdt-mobile-page .eyebrow {
    max-width: 100% !important;
    white-space: normal !important;
    line-height: 1.35 !important;
  }

  .ptdt-mobile-page h1 {
    font-size: clamp(1.8rem, 8vw, 2.4rem) !important;
    line-height: 1.04 !important;
    overflow-wrap: anywhere !important;
  }

  .ptdt-mobile-page h2,
  .ptdt-mobile-page h3 {
    overflow-wrap: anywhere !important;
  }

  .ptdt-mobile-page p,
  .ptdt-mobile-page span,
  .ptdt-mobile-page div {
    max-width: 100%;
  }

  .ptdt-mobile-page .mono {
    overflow-wrap: anywhere !important;
    word-break: normal !important;
  }

  .ptdt-mobile-page [style*="display: grid"],
  .ptdt-mobile-page [style*="display:grid"] {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .ptdt-mobile-page [style*="grid-template-columns"],
  .ptdt-mobile-page [style*="gridTemplateColumns"] {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .ptdt-mobile-page [style*="grid-column"],
  .ptdt-mobile-page [style*="gridColumn"] {
    grid-column: auto !important;
  }

  .ptdt-mobile-page [style*="display: flex"],
  .ptdt-mobile-page [style*="display:flex"] {
    flex-wrap: wrap !important;
    min-width: 0 !important;
  }

  .ptdt-mobile-page [style*="justify-content: space-between"],
  .ptdt-mobile-page [style*="justifyContent: space-between"] {
    justify-content: flex-start !important;
  }

  .ptdt-mobile-page .glass,
  .ptdt-mobile-page .glass-hi,
  .ptdt-mobile-page .ptdt-card,
  .ptdt-mobile-page .lift {
    width: 100% !important;
    max-width: 100% !important;
    border-radius: 18px !important;
  }

  .ptdt-mobile-page .glass,
  .ptdt-mobile-page .glass-hi {
    padding: 14px !important;
  }

  .ptdt-mobile-page .glass:has(table),
  .ptdt-mobile-page .glass-hi:has(table),
  .ptdt-mobile-page .ptdt-card:has(table),
  .ptdt-mobile-page [style*="overflow-x"],
  .ptdt-mobile-page [style*="overflowX"] {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
  }

  .ptdt-mobile-page table {
    min-width: 640px !important;
    width: max-content !important;
    table-layout: auto !important;
    border-collapse: collapse !important;
  }

  .ptdt-mobile-page th,
  .ptdt-mobile-page td {
    white-space: nowrap !important;
    word-break: normal !important;
    overflow-wrap: normal !important;
    padding: 10px 12px !important;
    vertical-align: middle !important;
  }

  .ptdt-mobile-page input,
  .ptdt-mobile-page textarea,
  .ptdt-mobile-page select,
  .ptdt-mobile-page .ptdt-input,
  .ptdt-mobile-page .ptdt-select,
  .ptdt-mobile-page .ptdt-textarea {
    width: 100% !important;
    max-width: 100% !important;
  }

  .ptdt-mobile-page input[type="number"] {
    min-width: 82px !important;
    width: 100% !important;
  }

  .ptdt-mobile-page button,
  .ptdt-mobile-page .btn-brand,
  .ptdt-mobile-page .ptdt-action-btn,
  .ptdt-mobile-page .ptdt-action-icon-btn {
    max-width: 100% !important;
    white-space: normal !important;
  }

  .ptdt-mobile-page .btn-brand {
    min-height: 42px !important;
  }

  .ptdt-mobile-page .ptdt-action-icon-btn {
    width: 40px !important;
    min-width: 40px !important;
    flex: 0 0 auto !important;
  }

  .ptdt-mobile-page .ptdt-toolbar {
    width: 100% !important;
    justify-content: flex-start !important;
    overflow-x: auto !important;
    flex-wrap: nowrap !important;
    padding-bottom: 6px !important;
  }

  .ptdt-mobile-page .ptdt-toolbar > * {
    flex: 0 0 auto !important;
  }

  .ptdt-mobile-page svg,
  .ptdt-mobile-page canvas {
    max-width: 100% !important;
  }

  .ptdt-mobile-page .recharts-wrapper,
  .ptdt-mobile-page .recharts-surface,
  .ptdt-mobile-page .recharts-responsive-container {
    max-width: 100% !important;
  }

  .ptdt-mobile-page .recharts-legend-wrapper {
    max-width: 100% !important;
  }

  .ptdt-mobile-page audio,
  .ptdt-mobile-page video {
    max-width: 100% !important;
  }
}

@media (max-width: 560px) {
  .ptdt-mobile-page {
    padding: 66px 10px 24px !important;
  }

  .ptdt-mobile-page .glass,
  .ptdt-mobile-page .glass-hi {
    padding: 12px !important;
    border-radius: 16px !important;
  }

  .ptdt-mobile-page h1 {
    font-size: clamp(1.65rem, 9vw, 2.1rem) !important;
  }

  .ptdt-mobile-page table {
    min-width: 600px !important;
  }

  .ptdt-mobile-page th,
  .ptdt-mobile-page td {
    padding: 9px 10px !important;
    font-size: 12px !important;
  }
}
`


const inputStyle: React.CSSProperties = {
  padding: '11px 14px',
  background: 'var(--bg-glass-hi)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  fontFamily: 'var(--font-body)',
}

function SectionCard({ title, subtitle, icon, tone = 'pink', children }: {
  title: string; subtitle: string; icon: React.ReactNode; tone?: 'pink' | 'green' | 'purple'; children: React.ReactNode
}) {
  const toneMap = {
    pink: {
      bg: 'rgba(251,11,140,0.10)',
      border: 'rgba(251,11,140,0.24)',
      color: 'var(--pink)',
    },
    green: {
      bg: 'rgba(0,167,71,0.10)',
      border: 'rgba(0,167,71,0.24)',
      color: 'var(--green-2)',
    },
    purple: {
      bg: 'rgba(128,87,215,0.10)',
      border: 'rgba(128,87,215,0.24)',
      color: 'var(--purple)',
    },
  }[tone]

  return (
    <div className="glass" style={{ padding: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 14,
            background: toneMap.bg,
            border: `1px solid ${toneMap.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: toneMap.color,
            flexShrink: 0,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.40)',
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  )
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="mono" style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 7 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function PwInput({ value, onChange, show, onToggle, placeholder }: {
  value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder: string
}) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, paddingRight: 42 }}
      />
      <button type="button" onClick={onToggle} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

function Toggle({ checked, onChange, label }: {
  checked: boolean; onChange: (v: boolean) => void; label: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600 }}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        style={{
          width: 50,
          height: 28,
          borderRadius: 999,
          border: checked ? '1px solid rgba(0,167,71,0.36)' : '1px solid var(--border)',
          background: checked ? 'linear-gradient(135deg, var(--green-2), var(--green-light))' : 'rgba(112,106,125,0.18)',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.22s var(--ease), border-color 0.22s var(--ease), box-shadow 0.22s var(--ease)',
          flexShrink: 0,
          boxShadow: checked ? '0 8px 18px rgba(0,167,71,0.20)' : 'inset 0 1px 2px rgba(16,16,24,0.12)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 25 : 3,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.22s var(--ease)',
            boxShadow: '0 2px 7px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        />
      </button>
    </div>
  )
}

export default function Settings() {
  const user = useAuthStore(state => state.user)
  const updateUser = useAuthStore(state => state.updateUser)
  const toast = useToast()
  const userRecord = user as unknown as Record<string, unknown> | null

  // Profile state
  const [profileName, setProfileName] = useState(user?.name || '')
  const [profilePhone, setProfilePhone] = useState(userRecord?.phone as string || '')
  const [profileExtension, setProfileExtension] = useState(userRecord?.extension as string || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Password state
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  // Preferences
  const [autoOpenDisposition, setAutoOpenDisposition] = useState(
    localStorage.getItem('ptdt_pref_auto_disposition') !== 'false'
  )
  const [notifSound, setNotifSound] = useState(
    localStorage.getItem('ptdt_pref_notif_sound') !== 'false'
  )

  const handleSaveProfile = async () => {
    if (!profileName.trim()) { toast.error('Name cannot be empty'); return }
    setSavingProfile(true)
    try {
      await profileAPI.update({
        name: profileName.trim(),
        phone: profilePhone.trim() || undefined,
        extension: profileExtension.trim() || undefined,
      })
      updateUser({
        name: profileName.trim(),
        phone: profilePhone.trim() || undefined,
        extension: profileExtension.trim() || undefined,
      })
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) { toast.error('Fill in all password fields'); return }
    if (newPw.length < 8) { toast.error('New password must be at least 8 characters'); return }
    if (newPw !== confirmPw) { toast.error('New passwords do not match'); return }
    setSavingPw(true)
    try {
      await profileAPI.changePassword({ currentPassword: currentPw, newPassword: newPw })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      toast.success('Password changed successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setSavingPw(false)
    }
  }

  const handleSavePreferences = () => {
    localStorage.setItem('ptdt_pref_auto_disposition', String(autoOpenDisposition))
    localStorage.setItem('ptdt_pref_notif_sound', String(notifSound))
    toast.success('Preferences saved')
  }

  return (
    <div className="ptdt-mobile-page ptdt-mobile-page-settings" style={{ padding: '32px 36px', maxWidth: 900, margin: '0 auto' }}>
      <style>{PTDT_MOBILE_PAGE_CSS}</style>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <div className="eyebrow pink" style={{ marginBottom: 14 }}>
          <Settings2 size={11} /> PTDT-Dialer Settings
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, lineHeight: 1.05, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 10 }}>
          Account <span className="gradient-brand-text">Settings</span>
        </h1>
        <p style={{ fontSize: 14.5, color: 'var(--text-3)' }}>
          Manage your profile, password, and dialer preferences.
        </p>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Profile section */}
        <SectionCard title="Profile" subtitle="Update your display name and contact info." icon={<UserRound size={17} />} tone="pink">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormRow label="Display Name">
              <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} style={inputStyle} placeholder="Your name" />
            </FormRow>
            <FormRow label="Extension">
              <input type="text" value={profileExtension} onChange={e => setProfileExtension(e.target.value)} style={inputStyle} placeholder="1001" />
            </FormRow>
            <FormRow label="Phone Number">
              <input type="tel" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} style={inputStyle} placeholder="+1 234 567 8900" />
            </FormRow>
            <FormRow label="Agent Code">
              <input type="text" value={userRecord?.agentCode as string || '—'} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
            </FormRow>
          </div>
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => void handleSaveProfile()} disabled={savingProfile} className="btn-brand" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 6, borderRadius: 'var(--radius-full)', padding: '0 22px', minHeight: 42, fontSize: 13.5 }}>
            <Save size={14} /> {savingProfile ? 'Saving…' : 'Save Profile'}
          </motion.button>
        </SectionCard>

        {/* Password section */}
        <SectionCard title="Change Password" subtitle="Use a strong password of at least 8 characters." icon={<KeyRound size={17} />} tone="purple">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 460 }}>
            <FormRow label="Current Password">
              <PwInput value={currentPw} onChange={setCurrentPw} show={showCurrentPw} onToggle={() => setShowCurrentPw(p => !p)} placeholder="Current password" />
            </FormRow>
            <FormRow label="New Password">
              <PwInput value={newPw} onChange={setNewPw} show={showNewPw} onToggle={() => setShowNewPw(p => !p)} placeholder="Min 8 characters" />
            </FormRow>
            <FormRow label="Confirm New Password">
              <PwInput value={confirmPw} onChange={setConfirmPw} show={showNewPw} onToggle={() => setShowNewPw(p => !p)} placeholder="Repeat new password" />
            </FormRow>
          </div>
          {newPw && confirmPw && newPw !== confirmPw && (
            <div style={{ fontSize: 12.5, color: 'var(--danger)', marginTop: 8 }}>⚠ Passwords do not match</div>
          )}
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => void handleChangePassword()} disabled={savingPw || !currentPw || !newPw || newPw !== confirmPw} className="btn-brand" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14, borderRadius: 'var(--radius-full)', padding: '0 22px', minHeight: 42, fontSize: 13.5, opacity: (!currentPw || !newPw || newPw !== confirmPw) ? 0.6 : 1 }}>
            <KeyRound size={14} /> {savingPw ? 'Saving…' : 'Change Password'}
          </motion.button>
        </SectionCard>

        {/* Preferences section */}
        <SectionCard title="Preferences" subtitle="Control dialer behavior and UI preferences." icon={<Settings2 size={17} />} tone="green">
          <Toggle checked={autoOpenDisposition} onChange={setAutoOpenDisposition} label="Auto-open disposition panel after each call" />
          <Toggle checked={notifSound} onChange={setNotifSound} label="Play sound on incoming call notification" />
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSavePreferences}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 16,
              borderRadius: 'var(--radius-full)',
              padding: '0 22px',
              minHeight: 42,
              fontSize: 13.5,
              fontWeight: 900,
              color: '#fff',
              background: 'linear-gradient(135deg, var(--green-2), var(--green-light))',
              boxShadow: '0 12px 26px rgba(0,167,71,0.24)',
              border: 0,
              cursor: 'pointer',
            }}
          >
            <Save size={14} /> Save Preferences
          </motion.button>
        </SectionCard>
      </div>
    </div>
  )
}
