import React from 'react';
import type { DensityMode, ThemeMode, UiUxPreferenceState } from '../api/uiUxPro.api';

interface Props {
  preferences: UiUxPreferenceState;
  onChange: (next: Partial<UiUxPreferenceState>) => void;
  saving?: boolean;
}

const themeOptions: Array<{ id: ThemeMode; title: string; description: string }> = [
  { id: 'light', title: 'Light', description: 'Clean production look for normal office use.' },
  { id: 'dark', title: 'Dark', description: 'Low-light dashboard for long calling sessions.' },
  { id: 'neon', title: 'Neon / Cyberpunk', description: 'PTDT demo mode with high-energy visual contrast.' },
];

const densityOptions: Array<{ id: DensityMode; title: string }> = [
  { id: 'comfortable', title: 'Comfortable' },
  { id: 'compact', title: 'Compact' },
];

const cardStyle: React.CSSProperties = {
  border: '1px solid rgba(148, 163, 184, 0.25)',
  borderRadius: 18,
  padding: 16,
  background: 'rgba(15, 23, 42, 0.88)',
  color: '#f8fafc',
};

export default function ThemeModePanel({ preferences, onChange, saving = false }: Props) {
  return (
    <section style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Theme & Layout Modes</h2>
          <p style={{ margin: '6px 0 0', color: '#cbd5e1' }}>
            Light, dark, and PTDT neon/cyberpunk presentation mode.
          </p>
        </div>
        {saving && <span style={{ color: '#fbbf24', fontWeight: 700 }}>Saving…</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {themeOptions.map((theme) => {
          const active = preferences.themeMode === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChange({ themeMode: theme.id })}
              style={{
                textAlign: 'left',
                border: active ? '2px solid #fb0a8b' : '1px solid rgba(148, 163, 184, 0.3)',
                background:
                  theme.id === 'neon'
                    ? 'linear-gradient(135deg, rgba(251,10,139,.25), rgba(0,229,160,.18))'
                    : active
                      ? 'rgba(251, 10, 139, 0.14)'
                      : 'rgba(30, 41, 59, 0.72)',
                color: '#f8fafc',
                borderRadius: 14,
                padding: 14,
                cursor: 'pointer',
              }}
            >
              <strong>{theme.title}</strong>
              <div style={{ marginTop: 6, color: '#cbd5e1', fontSize: 13 }}>{theme.description}</div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 18 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Density</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {densityOptions.map((density) => (
            <button
              key={density.id}
              type="button"
              onClick={() => onChange({ densityMode: density.id })}
              style={{
                border: preferences.densityMode === density.id ? '2px solid #00e5a0' : '1px solid rgba(148, 163, 184, 0.3)',
                borderRadius: 999,
                padding: '10px 14px',
                background: preferences.densityMode === density.id ? 'rgba(0,229,160,.14)' : 'rgba(30,41,59,.72)',
                color: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              {density.title}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
