import React, { useEffect, useMemo, useState } from 'react';
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

export default function UiUxPro() {
  const [overview, setOverview] = useState<UiUxOverview>(fallbackOverview);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeCelebration, setActiveCelebration] = useState<CelebrationEvent | null>(null);

  const theme = overview.preferences.themeMode;

  const shellStyle = useMemo<React.CSSProperties>(() => {
    if (theme === 'neon') {
      return {
        minHeight: '100vh',
        padding: 20,
        background:
          'radial-gradient(circle at top left, rgba(251,10,139,.22), transparent 32%), radial-gradient(circle at top right, rgba(0,229,160,.16), transparent 30%), #020617',
        color: '#f8fafc',
      };
    }

    if (theme === 'dark') {
      return {
        minHeight: '100vh',
        padding: 20,
        background: '#020617',
        color: '#f8fafc',
      };
    }

    return {
      minHeight: '100vh',
      padding: 20,
      background: '#f8fafc',
      color: '#0f172a',
    };
  }, [theme]);

  const loadOverview = async () => {
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
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!overview.preferences.keyboardShortcutsEnabled) return;

      const combo = [
        event.ctrlKey ? 'Ctrl' : '',
        event.shiftKey ? 'Shift' : '',
        event.altKey ? 'Alt' : '',
        event.key.length === 1 ? event.key.toUpperCase() : event.key,
      ]
        .filter(Boolean)
        .join('+');

      const shortcut = overview.shortcuts.find((item) => item.enabled && item.shortcut.toLowerCase() === combo.toLowerCase());

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
  }, [overview]);

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
        shortcut.action === action ? { ...shortcut, enabled: !shortcut.enabled } : shortcut,
      );
      const saved = await uiUxProApi.updateShortcuts(shortcuts);
      setOverview((current) => ({ ...current, shortcuts: saved }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shortcut');
    }
  };

  const updateMiniCallBar = async (next: Partial<MiniCallBarState>) => {
    try {
      const miniCallBar = await uiUxProApi.updateMiniCallBar(next);
      setOverview((current) => ({ ...current, miniCallBar }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update mini call bar');
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

  return (
    <main style={shellStyle}>
      <ConfettiCelebration event={activeCelebration} enabled={overview.preferences.confettiEnabled} />
      <MiniCallBar state={overview.miniCallBar} onAction={onMiniCallAction} />

      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 14,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ color: theme === 'light' ? '#fb0a8b' : '#f472b6', fontWeight: 900, letterSpacing: '.08em' }}>
            NUMBER 11
          </div>
          <h1 style={{ margin: '6px 0', fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.05 }}>
            UI/UX Pro Controls
          </h1>
          <p style={{ margin: 0, maxWidth: 760, color: theme === 'light' ? '#475569' : '#cbd5e1' }}>
            Neon/cyberpunk theme, mini floating call bar, keyboard shortcuts, confetti celebrations, and compact call-floor UX.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={loadOverview} style={primaryButton}>
            Refresh
          </button>
          <button type="button" onClick={triggerDemoCelebration} style={accentButton}>
            Test Confetti
          </button>
          <button type="button" onClick={callBarDemo} style={primaryButton}>
            {overview.miniCallBar.callStatus === 'CONNECTED' ? 'Stop Call Demo' : 'Start Call Demo'}
          </button>
        </div>
      </header>

      {error && (
        <div
          style={{
            marginBottom: 16,
            border: '1px solid rgba(239,68,68,.35)',
            background: 'rgba(239,68,68,.12)',
            color: theme === 'light' ? '#991b1b' : '#fecaca',
            borderRadius: 14,
            padding: 12,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ ...panelStyle, color: '#cbd5e1' }}>Loading UI/UX Pro controls…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 16 }}>
          <ThemeModePanel preferences={overview.preferences} onChange={updatePreferences} saving={saving} />

          <section style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Feature Toggles</h2>
            <ToggleRow
              label="Mini floating call bar"
              checked={overview.preferences.miniCallBarEnabled}
              onChange={() => updatePreferences({ miniCallBarEnabled: !overview.preferences.miniCallBarEnabled })}
            />
            <ToggleRow
              label="Keyboard shortcuts"
              checked={overview.preferences.keyboardShortcutsEnabled}
              onChange={() => updatePreferences({ keyboardShortcutsEnabled: !overview.preferences.keyboardShortcutsEnabled })}
            />
            <ToggleRow
              label="Confetti on sale/conversion"
              checked={overview.preferences.confettiEnabled}
              onChange={() => updatePreferences({ confettiEnabled: !overview.preferences.confettiEnabled })}
            />
            <ToggleRow
              label="Leaderboard celebrations"
              checked={overview.preferences.leaderboardCelebrationsEnabled}
              onChange={() =>
                updatePreferences({
                  leaderboardCelebrationsEnabled: !overview.preferences.leaderboardCelebrationsEnabled,
                })
              }
            />
          </section>

          <KeyboardShortcutsPanel
            shortcuts={overview.shortcuts}
            enabled={overview.preferences.keyboardShortcutsEnabled}
            onToggleShortcut={toggleShortcut}
          />

          <section style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Celebration History</h2>
            {overview.celebrations.length === 0 ? (
              <p style={{ color: '#cbd5e1' }}>No celebrations yet. Use “Test Confetti” above.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {overview.celebrations.slice(0, 6).map((event) => (
                  <div key={event.id} style={{ border: '1px solid rgba(148,163,184,.18)', borderRadius: 12, padding: 12 }}>
                    <strong>{event.title}</strong>
                    <div style={{ color: '#cbd5e1', marginTop: 4 }}>{event.message}</div>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>{new Date(event.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
        padding: '12px 0',
        borderTop: '1px solid rgba(148,163,184,.14)',
        cursor: 'pointer',
      }}
    >
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ width: 22, height: 22 }} />
    </label>
  );
}

const panelStyle: React.CSSProperties = {
  border: '1px solid rgba(148, 163, 184, 0.25)',
  borderRadius: 18,
  padding: 16,
  background: 'rgba(15, 23, 42, 0.88)',
  color: '#f8fafc',
};

const primaryButton: React.CSSProperties = {
  border: '1px solid rgba(148,163,184,.28)',
  background: 'rgba(15,23,42,.9)',
  color: '#f8fafc',
  borderRadius: 12,
  padding: '11px 14px',
  cursor: 'pointer',
  fontWeight: 800,
};

const accentButton: React.CSSProperties = {
  ...primaryButton,
  border: '1px solid rgba(251,10,139,.55)',
  background: 'linear-gradient(135deg, #fb0a8b, #7c3aed)',
};
