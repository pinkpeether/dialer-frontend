import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, ChevronRight, Keyboard, MonitorSmartphone, Phone, RefreshCw, Sparkles, Star, Trophy, Zap } from 'lucide-react'
import { uiUxProApi } from '../api/uiUxPro.api'
import type { CelebrationEvent, KeyboardShortcutConfig, MiniCallBarState, UiUxOverview, UiUxPreferenceState } from '../api/uiUxPro.api'
import ThemeModePanel from '../components/ThemeModePanel'
import KeyboardShortcutsPanel from '../components/KeyboardShortcutsPanel'
import MiniCallBar from '../components/MiniCallBar'
import ConfettiCelebration from '../components/ConfettiCelebration'

const responsiveCss = `
  .ptdt-uiux-page{padding:32px 36px;max-width:1400px;margin:0 auto}.ptdt-uiux-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  @media(max-width:900px){.ptdt-uiux-page{padding:20px 14px}.ptdt-uiux-grid{grid-template-columns:1fr}}
  .ptdt-toggle-track{position:relative;width:44px;height:24px;border-radius:999px;transition:background .22s ease;flex-shrink:0;cursor:pointer;border:none;outline:none}
  .ptdt-toggle-track.on{background:linear-gradient(135deg,var(--pink),var(--purple));box-shadow:0 0 14px rgba(251,11,140,.35)}.ptdt-toggle-track.off{background:var(--bg-glass);border:1px solid var(--border)}
  .ptdt-toggle-thumb{position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.22);transition:left .22s cubic-bezier(.34,1.56,.64,1)}
  .ptdt-toggle-track.on .ptdt-toggle-thumb{left:23px}.ptdt-toggle-track.off .ptdt-toggle-thumb{left:3px}
  .ptdt-uiux-action-btn{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:0 18px;min-height:42px;font-weight:800;font-size:13.5px;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease;border:1px solid var(--border);background:var(--bg-glass-hi);color:var(--text-2)}
  .ptdt-uiux-action-btn:hover{transform:translateY(-2px)}.ptdt-uiux-action-btn.accent{background:linear-gradient(135deg,var(--pink),var(--pink-bright));border-color:transparent;color:#fff;box-shadow:0 12px 28px rgba(251,11,140,.32)}
  .ptdt-uiux-action-btn.call{border-color:rgba(0,167,71,.38);background:rgba(0,167,71,.10);color:var(--green-2)}.ptdt-uiux-action-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
`

const fallbackOverview: UiUxOverview = {
  preferences: { themeMode: 'light', densityMode: 'comfortable', miniCallBarEnabled: true, keyboardShortcutsEnabled: true, confettiEnabled: true, leaderboardCelebrationsEnabled: true, updatedAt: new Date().toISOString() },
  shortcuts: [
    { action: 'mute', label: 'Mute / Unmute current call', shortcut: 'Ctrl+M', enabled: true, scope: 'call' },
    { action: 'hold', label: 'Hold current call', shortcut: 'Ctrl+H', enabled: true, scope: 'call' },
    { action: 'resume', label: 'Resume held call', shortcut: 'Ctrl+R', enabled: true, scope: 'call' },
    { action: 'hangup', label: 'Hang up current call', shortcut: 'Ctrl+Shift+H', enabled: true, scope: 'call' },
    { action: 'openDialer', label: 'Open Dialer', shortcut: 'Ctrl+D', enabled: true, scope: 'global' },
    { action: 'saveDisposition', label: 'Save disposition', shortcut: 'Ctrl+Enter', enabled: true, scope: 'agent' },
    { action: 'toggleMiniCallBar', label: 'Toggle mini call bar', shortcut: 'Ctrl+B', enabled: true, scope: 'global' },
  ],
  miniCallBar: { enabled: true, activeCallId: null, phoneNumber: null, contactName: null, callStatus: 'IDLE', startedAt: null, durationSeconds: 0, muted: false, onHold: false },
  celebrations: [],
  availableThemes: [],
  featureReadiness: { neonTheme: true, miniCallBar: true, keyboardShortcuts: true, confettiCelebrations: true, leaderboardCelebrations: true },
}

export default function UiUxPro() {
  const [overview, setOverview] = useState<UiUxOverview>(fallbackOverview)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [activeCelebration, setActiveCelebration] = useState<CelebrationEvent | null>(null)
  const theme = overview.preferences.themeMode
  const shellStyle = useMemo<React.CSSProperties>(() => ({ minHeight: '100%', color: 'var(--text)' }), [theme])

  const loadOverview = useCallback(async () => {
    try {
      setError('')
      setLoading(true)
      const data = await uiUxProApi.getOverview()
      setOverview(data)
      if (data.celebrations[0]) setActiveCelebration(data.celebrations[0])
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load appearance settings') }
    finally { setLoading(false) }
  }, [])

  const updateMiniCallBar = useCallback(async (next: Partial<MiniCallBarState>) => {
    try {
      const miniCallBar = await uiUxProApi.updateMiniCallBar(next)
      setOverview(current => ({ ...current, miniCallBar }))
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update mini call bar') }
  }, [])

  useEffect(() => { void loadOverview() }, [loadOverview])
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!overview.preferences.keyboardShortcutsEnabled) return
      const combo = [event.ctrlKey ? 'Ctrl' : '', event.shiftKey ? 'Shift' : '', event.altKey ? 'Alt' : '', event.key.length === 1 ? event.key.toUpperCase() : event.key].filter(Boolean).join('+')
      const shortcut = overview.shortcuts.find(item => item.enabled && item.shortcut.toLowerCase() === combo.toLowerCase())
      if (!shortcut) return
      event.preventDefault()
      if (shortcut.action === 'toggleMiniCallBar') void updateMiniCallBar({ enabled: !overview.miniCallBar.enabled })
      if (shortcut.action === 'openDialer') window.dispatchEvent(new CustomEvent('ptdt-open-dialer'))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [overview, updateMiniCallBar])

  const updatePreferences = async (next: Partial<UiUxPreferenceState>) => {
    try {
      setSaving(true)
      const preferences = await uiUxProApi.updatePreferences(next)
      setOverview(current => ({ ...current, preferences }))
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update appearance preferences') }
    finally { setSaving(false) }
  }

  const toggleShortcut = async (action: KeyboardShortcutConfig['action']) => {
    try {
      const shortcuts = overview.shortcuts.map(shortcut => shortcut.action === action ? { ...shortcut, enabled: !shortcut.enabled } : shortcut)
      const saved = await uiUxProApi.updateShortcuts(shortcuts)
      setOverview(current => ({ ...current, shortcuts: saved }))
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update shortcut') }
  }

  const triggerDemoCelebration = async () => {
    try {
      const event = await uiUxProApi.triggerCelebration({ type: 'CONVERSION', title: 'PTDT Conversion Captured!', message: 'Celebration feedback is ready for agent wins.', triggeredBy: 'Appearance & Shortcuts' })
      setActiveCelebration(event)
      setOverview(current => ({ ...current, celebrations: [event, ...current.celebrations] }))
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to trigger celebration') }
  }

  const callBarDemo = () => void updateMiniCallBar({ enabled: true, activeCallId: 1001, contactName: 'Demo Contact', phoneNumber: '+1 555 010 1001', callStatus: overview.miniCallBar.callStatus === 'CONNECTED' ? 'IDLE' : 'CONNECTED', startedAt: overview.miniCallBar.callStatus === 'CONNECTED' ? null : new Date().toISOString() })
  const onMiniCallAction = (action: 'mute' | 'hold' | 'resume' | 'hangup') => {
    if (action === 'mute') void updateMiniCallBar({ muted: !overview.miniCallBar.muted })
    if (action === 'hold') void updateMiniCallBar({ onHold: true, callStatus: 'ON_HOLD' })
    if (action === 'resume') void updateMiniCallBar({ onHold: false, callStatus: 'CONNECTED' })
    if (action === 'hangup') void updateMiniCallBar({ callStatus: 'ENDED' })
  }

  return <main style={shellStyle}>
    <style>{responsiveCss}</style>
    <ConfettiCelebration event={activeCelebration} enabled={overview.preferences.confettiEnabled} />
    <MiniCallBar state={overview.miniCallBar} onAction={onMiniCallAction} />
    <div className="ptdt-uiux-page">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap', marginBottom: 30 }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 14 }}><Sparkles size={11} /> Appearance &amp; Shortcuts</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, lineHeight: 1.05, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 10 }}>Appearance <span className="gradient-brand-text">&amp; Shortcuts</span></h1>
          <p style={{ fontSize: 14.5, color: 'var(--text-3)', maxWidth: 760, lineHeight: 1.65 }}>Choose the visual mode, density, keyboard shortcuts, mini call bar, and optional celebration feedback for your workspace.</p>
        </div>
        <button type="button" className="ptdt-uiux-action-btn" onClick={() => void loadOverview()} disabled={loading}><RefreshCw size={15} /> {loading ? 'Refreshing...' : 'Refresh'}</button>
      </motion.div>

      {error && <div className="ptdt-card" style={{ padding: 14, marginBottom: 18, color: 'var(--danger)', borderColor: 'rgba(239,68,68,.28)' }}>{error}</div>}

      <div className="ptdt-uiux-grid">
        <ThemeModePanel preferences={overview.preferences} saving={saving} onChange={patch => void updatePreferences(patch)} />
        <KeyboardShortcutsPanel shortcuts={overview.shortcuts} enabled={overview.preferences.keyboardShortcutsEnabled} saving={saving} onToggleEnabled={enabled => void updatePreferences({ keyboardShortcutsEnabled: enabled })} onToggleShortcut={action => void toggleShortcut(action)} />
      </div>

      <div style={{ display: 'grid', gap: 18, marginTop: 18 }}>
        <section className="ptdt-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div><div className="eyebrow green" style={{ marginBottom: 10 }}><MonitorSmartphone size={12} /> Mini Call Bar</div><h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 24 }}>Persistent Call Controls</h2><p style={{ color: 'var(--text-3)', marginTop: 8, maxWidth: 700 }}>Keep mute, hold, resume, and hang-up controls available while moving between pages.</p></div>
            <button type="button" className="ptdt-uiux-action-btn call" onClick={callBarDemo}><Phone size={15} /> Toggle Demo</button>
          </div>
        </section>

        <section className="ptdt-card" style={{ padding: 20 }}>
          <div className="eyebrow pink" style={{ marginBottom: 10 }}><Trophy size={12} /> Feedback &amp; Celebrations</div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 24 }}>Optional Agent Recognition</h2>
          <p style={{ color: 'var(--text-3)', marginTop: 8 }}>Enable lightweight celebrations for conversions and campaign goals without interrupting the calling workflow.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
            <button type="button" className="ptdt-uiux-action-btn" onClick={() => void updatePreferences({ confettiEnabled: !overview.preferences.confettiEnabled })}><Star size={15} /> Confetti {overview.preferences.confettiEnabled ? 'On' : 'Off'}</button>
            <button type="button" className="ptdt-uiux-action-btn" onClick={() => void updatePreferences({ leaderboardCelebrationsEnabled: !overview.preferences.leaderboardCelebrationsEnabled })}><Zap size={15} /> Recognition {overview.preferences.leaderboardCelebrationsEnabled ? 'On' : 'Off'}</button>
            <button type="button" className="ptdt-uiux-action-btn accent" onClick={() => void triggerDemoCelebration()}><CheckCircle2 size={15} /> Preview Celebration <ChevronRight size={15} /></button>
          </div>
        </section>

        <section className="ptdt-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-2)' }}><Keyboard size={17} color="var(--purple)" /><strong>Keyboard shortcuts remain optional and can be disabled globally from this page.</strong></div>
        </section>
      </div>
    </div>
  </main>
}
