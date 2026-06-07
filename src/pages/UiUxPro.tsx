import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  uiUxProApi,
} from '../api/uiUxPro.api';
import type {
  CelebrationEvent,
  KeyboardShortcutConfig,
  MiniCallBarState,
  UiUxOverview,
  UiUxPreferenceState,
} from '../api/uiUxPro.api';
import ThemeModePanel from '../components/ThemeModePanel';
import KeyboardShortcutsPanel from '../components/KeyboardShortcutsPanel';
import MiniCallBar from '../components/MiniCallBar';
import ConfettiCelebration from '../components/ConfettiCelebration';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Sparkles,
  Zap,
  MonitorSmartphone,
  Keyboard,
  Star,
  Trophy,
  Phone,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Responsive CSS
// ─────────────────────────────────────────────────────────────────────────────
const responsiveCss = `
  .ptdt-uiux-page {
    padding: 32px 36px;
    max-width: 1400px;
    margin: 0 auto;
  }
  .ptdt-uiux-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }
  @media (max-width: 900px) {
    .ptdt-uiux-page {
      padding: 20px 14px;
    }
    .ptdt-uiux-grid {
      grid-template-columns: 1fr;
    }
  }
  .ptdt-toggle-track {
    position: relative;
    width: 44px;
    height: 24px;
    border-radius: 999px;
    transition: background 0.22s ease;
    flex-shrink: 0;
    cursor: pointer;
    border: none;
    outline: none;
  }
  .ptdt-toggle-track.on  { background: linear-gradient(135deg, var(--pink), var(--purple)); box-shadow: 0 0 14px rgba(251,11,140,0.35); }
  .ptdt-toggle-track.off { background: var(--bg-glass); border: 1px solid var(--border); }
  .ptdt-toggle-thumb {
    position: absolute;
    top: 3px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.22);
    transition: left 0.22s cubic-bezier(0.34,1.56,0.64,1);
  }
  .ptdt-toggle-track.on  .ptdt-toggle-thumb { left: 23px; }
  .ptdt-toggle-track.off .ptdt-toggle-thumb { left: 3px; }

  .ptdt-uiux-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 999px;
    padding: 0 18px;
    min-height: 42px;
    font-weight: 800;
    font-size: 13.5px;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
    border: 1px solid var(--border);
    background: var(--bg-glass-hi);
    color: var(--text-2);
  }
  .ptdt-uiux-action-btn:hover { transform: translateY(-2px); }
  .ptdt-uiux-action-btn.accent {
    background: linear-gradient(135deg, var(--pink), var(--pink-bright));
    border-color: transparent;
    color: #fff;
    box-shadow: 0 12px 28px rgba(251,11,140,0.32);
  }
  .ptdt-uiux-action-btn.accent:hover { box-shadow: 0 18px 38px rgba(251,11,140,0.42); }
  .ptdt-uiux-action-btn.call {
    border-color: rgba(0,167,71,0.38);
    background: rgba(0,167,71,0.10);
    color: var(--green-2);
  }
  .ptdt-uiux-action-btn.call:hover { box-shadow: 0 8px 24px rgba(0,167,71,0.22); }
  .ptdt-uiux-action-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Fallback data (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const fallbackOverview: UiUxOverview = {
  preferences: {
    themeMode: 'light',
    densityMode: 'comfortable',
    miniCallBarEnabled: true,
    keyboardShortcutsEnabled: true,
    confettiEnabled: true,
    leaderboardCelebrationsEnabled: true,
    updatedAt: new Date().toISOString(),
  },
  shortcuts: [
    { action: 'mute', label: 'Mute / Unmute current call', shortcut: 'Ctrl+M', enabled: true, scope: 'call' },
    { action: 'hold', label: 'Hold current call', shortcut: 'Ctrl+H', enabled: true, scope: 'call' },
    { action: 'resume', label: 'Resume held call', shortcut: 'Ctrl+R', enabled: true, scope: 'call' },
    { action: 'hangup', label: 'Hang up current call', shortcut: 'Ctrl+Shift+H', enabled: true, scope: 'call' },
    { action: 'openDialer', label: 'Open Dialer', shortcut: 'Ctrl+D', enabled: true, scope: 'global' },
    { action: 'saveDisposition', label: 'Save disposition', shortcut: 'Ctrl+Enter', enabled: true, scope: 'agent' },
    { action: 'toggleMiniCallBar', label: 'Toggle mini call bar', shortcut: 'Ctrl+B', enabled: true, scope: 'global' },
  ],
  miniCallBar: {
    enabled: true,
    activeCallId: null,
    phoneNumber: null,
    contactName: null,
    callStatus: 'IDLE',
    startedAt: null,
    durationSeconds: 0,
    muted: false,
    onHold: false,
  },
  celebrations: [],
  availableThemes: [],
  featureReadiness: {
    neonTheme: true,
    miniCallBar: true,
    keyboardShortcuts: true,
    confettiCelebrations: true,
    leaderboardCelebrations: true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function UiUxPro() {
  const [overview, setOverview] = useState<UiUxOverview>(fallbackOverview);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeCelebration, setActiveCelebration] = useState<CelebrationEvent | null>(null);

  const theme = overview.preferences.themeMode;

  const shellStyle = useMemo<React.CSSProperties>(() => {
    if (theme === 'neon') return { minHeight: '100%', color: 'var(--text)' };
    if (theme === 'dark') return { minHeight: '100%', color: 'var(--text)' };
    return { minHeight: '100%', color: 'var(--text)' };
  }, [theme]);

  const loadOverview = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const data = await uiUxProApi.getOverview();
      setOverview(data);
      if (data.celebrations[0]) setActiveCelebration(data.celebrations[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load UI/UX settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMiniCallBar = useCallback(async (next: Partial<MiniCallBarState>) => {
    try {
      const miniCallBar = await uiUxProApi.updateMiniCallBar(next);
      setOverview((current) => ({ ...current, miniCallBar }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update mini call bar');
    }
  }, []);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!overview.preferences.keyboardShortcutsEnabled) return;
      const combo = [
        event.ctrlKey ? 'Ctrl' : '',
        event.shiftKey ? 'Shift' : '',
        event.altKey ? 'Alt' : '',
        event.key.length === 1 ? event.key.toUpperCase() : event.key,
      ].filter(Boolean).join('+');
      const shortcut = overview.shortcuts.find(
        (item) => item.enabled && item.shortcut.toLowerCase() === combo.toLowerCase()
      );
      if (!shortcut) return;
      event.preventDefault();
      if (shortcut.action === 'toggleMiniCallBar') {
        updateMiniCallBar({ enabled: !overview.miniCallBar.enabled });
      }
      if (shortcut.action === 'openDialer') {
        window.dispatchEvent(new CustomEvent('ptdt-open-dialer'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [overview, updateMiniCallBar]);

  const updatePreferences = async (next: Partial<UiUxPreferenceState>) => {
    try {
      setSaving(true);
      const preferences = await uiUxProApi.updatePreferences(next);
      setOverview((current) => ({ ...current, preferences }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleShortcut = async (action: KeyboardShortcutConfig['action']) => {
    try {
      const shortcuts = overview.shortcuts.map((shortcut) =>
        shortcut.action === action ? { ...shortcut, enabled: !shortcut.enabled } : shortcut
      );
      const saved = await uiUxProApi.updateShortcuts(shortcuts);
      setOverview((current) => ({ ...current, shortcuts: saved }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shortcut');
    }
  };

  const triggerDemoCelebration = async () => {
    try {
      const event = await uiUxProApi.triggerCelebration({
        type: 'CONVERSION',
        title: 'PTDT Conversion Captured!',
        message: 'Confetti and leaderboard celebration are ready for agent wins.',
        triggeredBy: 'UI/UX Pro',
      });
      setActiveCelebration(event);
      setOverview((current) => ({ ...current, celebrations: [event, ...current.celebrations] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger celebration');
    }
  };

  const callBarDemo = () => {
    updateMiniCallBar({
      enabled: true,
      activeCallId: 1001,
      contactName: 'Demo Passenger',
      phoneNumber: '+92 300 0000000',
      callStatus: overview.miniCallBar.callStatus === 'CONNECTED' ? 'IDLE' : 'CONNECTED',
      startedAt: overview.miniCallBar.callStatus === 'CONNECTED' ? null : new Date().toISOString(),
    });
  };

  const onMiniCallAction = (action: 'mute' | 'hold' | 'resume' | 'hangup') => {
    if (action === 'mute') updateMiniCallBar({ muted: !overview.miniCallBar.muted });
    if (action === 'hold') updateMiniCallBar({ onHold: true, callStatus: 'ON_HOLD' });
    if (action === 'resume') updateMiniCallBar({ onHold: false, callStatus: 'CONNECTED' });
    if (action === 'hangup') updateMiniCallBar({ callStatus: 'ENDED' });
  };

  const isCallActive = overview.miniCallBar.callStatus === 'CONNECTED';

  return (
    <main style={shellStyle}>
      <style>{responsiveCss}</style>

      <ConfettiCelebration event={activeCelebration} enabled={overview.preferences.confettiEnabled} />
      <MiniCallBar state={overview.miniCallBar} onAction={onMiniCallAction} />

      <div className="ptdt-uiux-page">

        {/* ── Hero Header ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 18,
            flexWrap: 'wrap',
            marginBottom: 30,
          }}
        >
          <div>
            <div className="eyebrow pink" style={{ marginBottom: 14 }}>
              <Sparkles size={11} /> UI/UX Pro Controls
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3.2vw, 42px)',
              fontWeight: 900,
              lineHeight: 1.05,
              color: 'var(--text)',
              letterSpacing: '-0.04em',
              marginBottom: 10,
            }}>
              Interface <span className="gradient-brand-text">Experience</span>
            </h1>
            <p style={{
              fontSize: 14.5,
              color: 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}>
              <span className="pulse-dot pink" />
              Neon theme, floating call bar, keyboard shortcuts, confetti &amp; compact call-floor UX.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <motion.button
              type="button"
              onClick={loadOverview}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="ptdt-uiux-action-btn"
            >
              <RefreshCw size={15} /> Refresh
            </motion.button>

            <motion.button
              type="button"
              onClick={triggerDemoCelebration}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="ptdt-uiux-action-btn accent"
            >
              <Star size={15} /> Test Confetti
            </motion.button>

            <motion.button
              type="button"
              onClick={callBarDemo}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className={`ptdt-uiux-action-btn${isCallActive ? '' : ' call'}`}
              style={isCallActive ? {
                borderColor: 'rgba(239,68,68,0.38)',
                background: 'rgba(239,68,68,0.10)',
                color: 'var(--danger)',
              } : {}}
            >
              <Phone size={15} />
              {isCallActive ? 'Stop Call Demo' : 'Start Call Demo'}
            </motion.button>
          </div>
        </motion.div>

        {/* ── Error / Saving notices ───────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                marginBottom: 18,
                padding: '12px 16px',
                borderRadius: 16,
                border: '1px solid rgba(239,68,68,0.36)',
                background: 'rgba(239,68,68,0.10)',
                color: 'var(--danger)',
                fontSize: 12.5,
                fontWeight: 800,
              }}
            >
              {error}
            </motion.div>
          )}
          {saving && (
            <motion.div
              key="saving"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                marginBottom: 18,
                padding: '12px 16px',
                borderRadius: 16,
                border: '1px solid rgba(251,11,140,0.28)',
                background: 'rgba(251,11,140,0.07)',
                color: 'var(--pink)',
                fontSize: 12.5,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span className="pulse-dot pink" />
              Saving preferences…
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Loading skeleton ─────────────────────────────────────── */}
        {loading ? (
          <div
            className="glass"
            style={{
              minHeight: 320,
              display: 'grid',
              placeItems: 'center',
              color: 'var(--text-3)',
              borderRadius: 20,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <span className="pulse-dot pink" style={{ width: 12, height: 12 }} />
              <span style={{ fontSize: 13 }}>Loading UI/UX Pro controls…</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 18 }}>

            {/* ── Row 1: Theme Panel + Feature Toggles ────────────── */}
            <div className="ptdt-uiux-grid">

              {/* ThemeModePanel — external, untouched */}
              <ThemeModePanel
                preferences={overview.preferences}
                onChange={updatePreferences}
                saving={saving}
              />

              {/* Feature Toggles */}
              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="glass"
                style={{ padding: 22, borderRadius: 20 }}
              >
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 14,
                    background: 'rgba(251,11,140,0.10)',
                    border: '1px solid rgba(251,11,140,0.28)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--pink)', flexShrink: 0,
                  }}>
                    <Zap size={17} />
                  </div>
                  <div>
                    <h2 style={{
                      margin: 0,
                      fontFamily: 'var(--font-display)',
                      fontSize: 17, fontWeight: 900,
                      color: 'var(--text)', letterSpacing: '-0.02em',
                    }}>
                      Feature Toggles
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                      Enable or disable platform-wide UX features.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 4 }}>
                  <ToggleRow
                    label="Mini floating call bar"
                    desc="Compact persistent bar while on a call"
                    icon={<MonitorSmartphone size={14} />}
                    checked={overview.preferences.miniCallBarEnabled}
                    onChange={() => updatePreferences({ miniCallBarEnabled: !overview.preferences.miniCallBarEnabled })}
                  />
                  <ToggleRow
                    label="Keyboard shortcuts"
                    desc="Global hotkeys for call actions"
                    icon={<Keyboard size={14} />}
                    checked={overview.preferences.keyboardShortcutsEnabled}
                    onChange={() => updatePreferences({ keyboardShortcutsEnabled: !overview.preferences.keyboardShortcutsEnabled })}
                  />
                  <ToggleRow
                    label="Confetti on sale / conversion"
                    desc="Celebration animation on agent wins"
                    icon={<Star size={14} />}
                    checked={overview.preferences.confettiEnabled}
                    onChange={() => updatePreferences({ confettiEnabled: !overview.preferences.confettiEnabled })}
                  />
                  <ToggleRow
                    label="Leaderboard celebrations"
                    desc="Animate top-agent ranking updates"
                    icon={<Trophy size={14} />}
                    checked={overview.preferences.leaderboardCelebrationsEnabled}
                    onChange={() =>
                      updatePreferences({ leaderboardCelebrationsEnabled: !overview.preferences.leaderboardCelebrationsEnabled })
                    }
                  />
                </div>

                {/* Feature readiness pills */}
                <div style={{
                  marginTop: 18,
                  paddingTop: 16,
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                }}>
                  {Object.entries(overview.featureReadiness).map(([key, ready]) => (
                    <div
                      key={key}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: 0.3,
                        background: ready ? 'rgba(0,167,71,0.10)' : 'rgba(239,68,68,0.10)',
                        border: `1px solid ${ready ? 'rgba(0,167,71,0.28)' : 'rgba(239,68,68,0.28)'}`,
                        color: ready ? 'var(--green-2)' : 'var(--danger)',
                      }}
                    >
                      <CheckCircle2 size={10} />
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                  ))}
                </div>
              </motion.section>
            </div>

            {/* ── Row 2: Keyboard Shortcuts + Celebration History ── */}
            <div className="ptdt-uiux-grid">

              {/* KeyboardShortcutsPanel — external, untouched */}
              <KeyboardShortcutsPanel
                shortcuts={overview.shortcuts}
                enabled={overview.preferences.keyboardShortcutsEnabled}
                onToggleShortcut={toggleShortcut}
              />

              {/* Celebration History */}
              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="glass"
                style={{ padding: 22, borderRadius: 20 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 14,
                    background: 'rgba(128,87,215,0.12)',
                    border: '1px solid rgba(128,87,215,0.28)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--purple)', flexShrink: 0,
                  }}>
                    <Trophy size={17} />
                  </div>
                  <div>
                    <h2 style={{
                      margin: 0,
                      fontFamily: 'var(--font-display)',
                      fontSize: 17, fontWeight: 900,
                      color: 'var(--text)', letterSpacing: '-0.02em',
                    }}>
                      Celebration History
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                      Recent agent wins &amp; conversion events.
                    </p>
                  </div>
                </div>

                {overview.celebrations.length === 0 ? (
                  <div style={{
                    padding: '32px 0',
                    textAlign: 'center',
                    color: 'var(--text-3)',
                    fontSize: 13,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    <Star size={28} style={{ opacity: 0.28 }} />
                    No celebrations yet.
                    <span style={{ fontSize: 12 }}>
                      Press{' '}
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-glass)',
                        fontSize: 11,
                        fontWeight: 800,
                        color: 'var(--pink)',
                      }}>
                        Test Confetti
                      </span>{' '}
                      above to generate one.
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {overview.celebrations.slice(0, 6).map((event, i) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        style={{
                          padding: '13px 14px',
                          borderRadius: 14,
                          border: '1px solid var(--border)',
                          background: 'rgba(128,87,215,0.06)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                        }}
                      >
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: 'var(--purple)',
                          boxShadow: '0 0 10px var(--purple)',
                          marginTop: 5, flexShrink: 0,
                        }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 850, color: 'var(--text)', marginBottom: 3 }}>
                            {event.title}
                          </div>
                          <div style={{ color: 'var(--text-3)', fontSize: 12, lineHeight: 1.45 }}>
                            {event.message}
                          </div>
                          <div className="mono" style={{ color: 'var(--text-3)', fontSize: 10.5, marginTop: 6 }}>
                            {new Date(event.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <ChevronRight size={14} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 3 }} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.section>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ToggleRow — beautified, logic identical
// ─────────────────────────────────────────────────────────────────────────────
function ToggleRow({
  label,
  desc,
  icon,
  checked,
  onChange,
}: {
  label: string;
  desc?: string;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 14,
        cursor: 'pointer',
        border: `1px solid ${checked ? 'rgba(251,11,140,0.18)' : 'transparent'}`,
        background: checked ? 'rgba(251,11,140,0.05)' : 'transparent',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {icon && (
          <div style={{
            width: 30, height: 30, borderRadius: 10, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: checked ? 'rgba(251,11,140,0.12)' : 'var(--bg-glass)',
            border: `1px solid ${checked ? 'rgba(251,11,140,0.28)' : 'var(--border)'}`,
            color: checked ? 'var(--pink)' : 'var(--text-3)',
            transition: 'all 0.2s ease',
          }}>
            {icon}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{label}</div>
          {desc && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{desc}</div>
          )}
        </div>
      </div>

      {/* Custom toggle switch */}
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`ptdt-toggle-track ${checked ? 'on' : 'off'}`}
      >
        <div className="ptdt-toggle-thumb" />
      </button>
    </label>
  );
}
