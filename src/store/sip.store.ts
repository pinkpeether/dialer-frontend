import { create } from 'zustand'
import { sipClient } from '../services/sip/SipClient'
import { softphoneAudio } from '../services/audio/SoftphoneAudio'
import type { SipAccountConfig, SipCallState, SipIncomingCall, SipRuntimeStatus } from '../types/sip'

const STORAGE_KEY = 'ptdt_sip_account_v1'
const AUDIO_OUTPUT_STORAGE_KEY = 'ptdt_sip_audio_output_v1'
const AUDIO_INPUT_STORAGE_KEY = 'ptdt_sip_audio_input_v1'

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

function loadAudioOutputDeviceId() {
  try {
    return localStorage.getItem(AUDIO_OUTPUT_STORAGE_KEY) || 'default'
  } catch {
    return 'default'
  }
}

function loadAudioInputDeviceId() {
  try {
    return localStorage.getItem(AUDIO_INPUT_STORAGE_KEY) || 'default'
  } catch {
    return 'default'
  }
}

interface SipStore {
  config: SipAccountConfig
  status: SipRuntimeStatus
  error: string | null
  incomingCall: SipIncomingCall | null
  activeCall: SipCallState | null
  muted: boolean
  onHold: boolean
  audioOutputDeviceId: string
  audioOutputError: string | null
  audioInputDeviceId: string
  audioInputError: string | null
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
  hold: () => Promise<void>
  resume: () => Promise<void>
  setMuted: (muted: boolean) => void
  setAudioOutputDevice: (deviceId: string) => Promise<void>
  testAudioOutputDevice: () => Promise<void>
  setAudioInputDevice: (deviceId: string) => Promise<void>
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
  onHold: false,
  audioOutputDeviceId: loadAudioOutputDeviceId(),
  audioOutputError: null,
  audioInputDeviceId: loadAudioInputDeviceId(),
  audioInputError: null,
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
      onHold: false,
      audioOutputDeviceId: 'default',
      audioOutputError: null,
      audioInputDeviceId: 'default',
      audioInputError: null,
      isConfigured: false,
    })
  },

  register: async () => {
    const config = get().config
    try {
      await sipClient.setAudioInputDevice(get().audioInputDeviceId)
      await sipClient.setAudioOutputDevice(get().audioOutputDeviceId)
      await sipClient.register(config, {
        onStatusChange: (status) => set({ status }),
        onError: (error) => set({ error }),
        onIncomingCall: (incomingCall) => set({ incomingCall, status: 'incoming' }),
        onCallStarted: (activeCall) => set({ activeCall, incomingCall: null, status: 'in_call', onHold: false }),
        onCallEnded: () => set({ activeCall: null, incomingCall: null, muted: false, onHold: false }),
      })
    } catch (err) {
      const error = err instanceof Error ? err.message : 'SIP registration failed'
      set({ error, status: 'registration_failed' })
      throw err
    }
  },

  unregister: async () => {
    await sipClient.unregister()
    set({
      status: get().isConfigured ? 'configured' : 'idle',
      activeCall: null,
      incomingCall: null,
      muted: false,
      onHold: false,
    })
  },

  call: async (destination) => {
    try {
      await sipClient.setAudioInputDevice(get().audioInputDeviceId)
      await sipClient.setAudioOutputDevice(get().audioOutputDeviceId)
      await sipClient.call(destination)
      set({ error: null })
    } catch (err) {
      const error = err instanceof Error ? err.message : 'SIP call failed'
      set({ error, status: 'error' })
      throw err
    }
  },

  answer: async () => {
  const incomingCall = get().incomingCall
  await sipClient.answer()

  // Fail-safe UI state: some WebRTC/SIP sessions establish media before
  // SIP.js stateChange emits Established. Keep the call visible immediately.
  if (incomingCall) {
    set({
      activeCall: {
        id: incomingCall.id,
        remoteIdentity: incomingCall.displayName || incomingCall.from || 'Incoming SIP Call',
        startedAt: Date.now(),
      },
      incomingCall: null,
      status: 'in_call',
      onHold: false,
      error: null,
    })
  }
},

  reject: async () => {
    await sipClient.reject()
    set({ incomingCall: null, onHold: false, status: get().isConfigured ? 'registered' : 'idle' })
  },

  hangup: async () => {
    await sipClient.hangup()
    set({
      activeCall: null,
      incomingCall: null,
      muted: false,
      onHold: false,
      status: get().isConfigured ? 'registered' : 'idle',
    })
  },

  sendDTMF: async (digits) => {
    await sipClient.sendDTMF(digits)
  },

  hold: async () => {
    await sipClient.hold()
    set({ onHold: true })
  },

  resume: async () => {
    await sipClient.resume()
    if (get().muted) sipClient.mute(true)
    set({ onHold: false })
  },

  setMuted: (muted) => {
    if (get().onHold) {
      set({ muted })
      return
    }

    sipClient.mute(muted)
    set({ muted })
  },

  setAudioOutputDevice: async (deviceId) => {
    const normalized = deviceId || 'default'
    localStorage.setItem(AUDIO_OUTPUT_STORAGE_KEY, normalized)
    set({ audioOutputDeviceId: normalized, audioOutputError: null })

    try {
      await sipClient.setAudioOutputDevice(normalized)
    } catch (err) {
      const audioOutputError = err instanceof Error
        ? err.message
        : 'Could not switch speaker/audio output.'
      set({ audioOutputError })
      throw err
    }
  },

  setAudioInputDevice: async (deviceId) => {
    const normalized = deviceId || 'default'
    localStorage.setItem(AUDIO_INPUT_STORAGE_KEY, normalized)
    set({ audioInputDeviceId: normalized, audioInputError: null })

    try {
      await sipClient.setAudioInputDevice(normalized)
    } catch (err) {
      const audioInputError = err instanceof Error
        ? err.message
        : 'Could not switch microphone/input device.'
      set({ audioInputError })
      throw err
    }
  },

  testAudioOutputDevice: async () => {
    const deviceId = get().audioOutputDeviceId
    try {
      await softphoneAudio.playTestTone(deviceId)
      set({ audioOutputError: null })
    } catch (err) {
      const audioOutputError = err instanceof Error
        ? err.message
        : 'Could not play test speaker tone.'
      set({ audioOutputError })
      throw err
    }
  },

  clearError: () => set({ error: null, audioOutputError: null, audioInputError: null }),
}))
