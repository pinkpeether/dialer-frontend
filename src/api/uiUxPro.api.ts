import api from './axios'

export type ThemeMode = 'light' | 'dark' | 'neon';
export type DensityMode = 'comfortable' | 'compact';

export interface UiUxPreferenceState {
  themeMode: ThemeMode;
  densityMode: DensityMode;
  miniCallBarEnabled: boolean;
  keyboardShortcutsEnabled: boolean;
  confettiEnabled: boolean;
  leaderboardCelebrationsEnabled: boolean;
  updatedAt: string;
}

export interface KeyboardShortcutConfig {
  action: 'mute' | 'hold' | 'resume' | 'hangup' | 'openDialer' | 'saveDisposition' | 'toggleMiniCallBar';
  label: string;
  shortcut: string;
  enabled: boolean;
  scope: 'global' | 'call' | 'agent';
}

export interface MiniCallBarState {
  enabled: boolean;
  activeCallId: number | null;
  phoneNumber: string | null;
  contactName: string | null;
  callStatus: 'IDLE' | 'RINGING' | 'CONNECTED' | 'ON_HOLD' | 'ENDED';
  startedAt: string | null;
  durationSeconds: number;
  muted: boolean;
  onHold: boolean;
}

export interface CelebrationEvent {
  id: string;
  type: 'SALE' | 'CONVERSION' | 'CALL_CONNECTED' | 'CAMPAIGN_GOAL';
  title: string;
  message: string;
  createdAt: string;
  triggeredBy?: string;
}

export interface UiUxOverview {
  preferences: UiUxPreferenceState;
  shortcuts: KeyboardShortcutConfig[];
  miniCallBar: MiniCallBarState;
  celebrations: CelebrationEvent[];
  availableThemes: Array<{ id: ThemeMode; name: string; description: string }>;
  featureReadiness: Record<string, boolean>;
}

export const uiUxProApi = {
  getOverview: async () => {
    const res = await api.get('/ui-ux-pro/overview')
    return res.data.data as UiUxOverview
  },

  updatePreferences: async (payload: Partial<UiUxPreferenceState>) => {
    const res = await api.patch('/ui-ux-pro/preferences', payload)
    return res.data.data as UiUxPreferenceState
  },

  getShortcuts: async () => {
    const res = await api.get('/ui-ux-pro/shortcuts')
    return res.data.data as KeyboardShortcutConfig[]
  },

  updateShortcuts: async (shortcuts: KeyboardShortcutConfig[]) => {
    const res = await api.put('/ui-ux-pro/shortcuts', { shortcuts })
    return res.data.data as KeyboardShortcutConfig[]
  },

  getMiniCallBar: async () => {
    const res = await api.get('/ui-ux-pro/mini-call-bar')
    return res.data.data as MiniCallBarState
  },

  updateMiniCallBar: async (payload: Partial<MiniCallBarState>) => {
    const res = await api.patch('/ui-ux-pro/mini-call-bar', payload)
    return res.data.data as MiniCallBarState
  },

  triggerCelebration: async (payload: Partial<CelebrationEvent>) => {
    const res = await api.post('/ui-ux-pro/celebrations', payload)
    return res.data.data as CelebrationEvent
  },

  clearCelebrations: async () => {
    const res = await api.delete('/ui-ux-pro/celebrations')
    return res.data.data as { cleared: boolean; clearedAt: string }
  },
}
