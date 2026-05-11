import { create } from 'zustand'
import { sipClient } from '../services/sip/SipClient'
import type { SipAccountConfig, SipCallState, SipIncomingCall, SipRuntimeStatus } from '../types/sip'

const STORAGE_KEY = 'ptdt_sip_account_v1'

const defaultConfig: SipAccountConfig = {
  enabled: false,
  username: '',
  password: '',
  domain: '',
  webSocketServer: '',
  port: '',
  transport: 'WSS',
  displayName: '',
  callerId: '',
  outboundProxy: '',
  stunServer: 'stun.l.google.com:19302',
}

function loadConfig(): SipAccountConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaultConfig, ...JSON.parse(raw) } : defaultConfig
  } catch {
    return defaultConfig
  }
}

function isConfigReady(config: SipAccountConfig) {
  return Boolean(config.enabled && config.username && config.password && config.domain && config.webSocketServer)
}

interface SipStore {
  config: SipAccountConfig
  status: SipRuntimeStatus
  error: string | null
  incomingCall: SipIncomingCall | null
  activeCall: SipCallState | null
  muted: boolean
  isConfigured: boolean
  saveConfig: (config: SipAccountConfig) => void
  clearConfig: () => void
  register: () => Promise<void>
  unregister: () => Promise<void>
  call: (destination: string) => Promise<void>
  answer: () => Promise<void>
  reject: () => Promise<void>
  hangup: () => Promise<void>
  sendDTMF: (digits: string) => Promise<void>
  setMuted: (muted: boolean) => void
  clearError: () => void
}

const initialConfig = loadConfig()

export const useSipStore = create<SipStore>((set, get) => ({
  config: initialConfig,
  status: isConfigReady(initialConfig) ? 'configured' : 'idle',
  error: null,
  incomingCall: null,
  activeCall: null,
  muted: false,
  isConfigured: isConfigReady(initialConfig),

  saveConfig: (config) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    set({
      config,
      isConfigured: isConfigReady(config),
      status: isConfigReady(config) ? 'configured' : 'idle',
      error: null,
    })
  },

  clearConfig: () => {
    localStorage.removeItem(STORAGE_KEY)
    void sipClient.unregister().catch(() => undefined)
    set({
      config: defaultConfig,
      status: 'idle',
      error: null,
      incomingCall: null,
      activeCall: null,
      muted: false,
      isConfigured: false,
    })
  },

  register: async () => {
    const config = get().config
    try {
      await sipClient.register(config, {
        onStatusChange: (status) => set({ status }),
        onError: (error) => set({ error }),
        onIncomingCall: (incomingCall) => set({ incomingCall, status: 'incoming' }),
        onCallStarted: (activeCall) => set({ activeCall, incomingCall: null, status: 'in_call' }),
        onCallEnded: () => set({ activeCall: null, incomingCall: null, muted: false }),
      })
    } catch (err) {
      const error = err instanceof Error ? err.message : 'SIP registration failed'
      set({ error, status: 'registration_failed' })
      throw err
    }
  },

  unregister: async () => {
    await sipClient.unregister()
    set({ status: get().isConfigured ? 'configured' : 'idle', activeCall: null, incomingCall: null, muted: false })
  },

  call: async (destination) => {
    try {
      await sipClient.call(destination)
      set({ error: null })
    } catch (err) {
      const error = err instanceof Error ? err.message : 'SIP call failed'
      set({ error, status: 'error' })
      throw err
    }
  },

  answer: async () => {
    await sipClient.answer()
  },

  reject: async () => {
    await sipClient.reject()
    set({ incomingCall: null, status: get().isConfigured ? 'registered' : 'idle' })
  },

  hangup: async () => {
    await sipClient.hangup()
    set({ activeCall: null, incomingCall: null, muted: false, status: get().isConfigured ? 'registered' : 'idle' })
  },

  sendDTMF: async (digits) => {
    await sipClient.sendDTMF(digits)
  },

  setMuted: (muted) => {
    sipClient.mute(muted)
    set({ muted })
  },

  clearError: () => set({ error: null }),
}))
