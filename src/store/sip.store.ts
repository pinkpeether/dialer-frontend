import { create } from 'zustand'
import { sipClient } from '../services/sip/SipClient'
import { softphoneAudio } from '../services/audio/SoftphoneAudio'
import api from '../api/axios'
import { callsAPI } from '../api/calls.api'
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
  try { return localStorage.getItem(AUDIO_OUTPUT_STORAGE_KEY) || 'default' } catch { return 'default' }
}

function loadAudioInputDeviceId() {
  try { return localStorage.getItem(AUDIO_INPUT_STORAGE_KEY) || 'default' } catch { return 'default' }
}

// Create a backend call log for a SIP call — best-effort, non-blocking
async function logSipCallToBackend(callState: SipCallState): Promise<number | null> {
  try {
    const res = await api.post('/calls', {
      direction: callState.direction,
      remoteNumber: callState.remoteIdentity,
      source: 'sip',
      startedAt: new Date(callState.startedAt).toISOString(),
    })
    const id = res.data?.data?.id ?? res.data?.id ?? null
    return typeof id === 'number' ? id : null
  } catch {
    return null
  }
}

async function endSipCallInBackend(callId: number, endedAt: Date): Promise<void> {
  await callsAPI.end(callId, { endedAt: endedAt.toISOString() })
}

export type SipDispositionContext = {
  callId: number | string
  saveMode: 'backend' | 'preview'
  remoteIdentity: string
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

  // 12A — SIP backend call ID and disposition trigger
  sipCallId: number | null
  sipCallLogPromise: Promise<number | null> | null
  showSipDisposition: boolean
  pendingSipDisposition: SipDispositionContext | null

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
  transfer: (destination: string) => Promise<void>
  setMuted: (muted: boolean) => void
  setAudioOutputDevice: (deviceId: string) => Promise<void>
  testAudioOutputDevice: () => Promise<void>
  setAudioInputDevice: (deviceId: string) => Promise<void>
  clearError: () => void
  dismissSipDisposition: () => void
  resetCallState: () => void
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

  // 12A
  sipCallId: null,
  sipCallLogPromise: null,
  showSipDisposition: false,
  pendingSipDisposition: null,

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
      sipCallId: null,
      sipCallLogPromise: null,
      showSipDisposition: false,
      pendingSipDisposition: null,
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

        onCallStarted: (activeCall) => {
          set({ activeCall, incomingCall: null, status: 'in_call', onHold: false })

          // 12A — log call to backend async, store the returned callId
          const sipCallLogPromise = logSipCallToBackend(activeCall)
          set({ sipCallLogPromise })
          void sipCallLogPromise.then((backendCallId) => {
            set({ sipCallId: backendCallId })
          })
        },

        onCallEnded: (endedAtMs) => {
          const endedAt = new Date(endedAtMs ?? Date.now())
          const { activeCall, sipCallId, sipCallLogPromise } = get()

          // 12A — open disposition modal with real callId if available
          if (activeCall) {
            void (async () => {
              const loggedCallId = sipCallLogPromise ? await sipCallLogPromise : null
              const fallbackCallId = sipCallId ?? loggedCallId
              const backendCallId = fallbackCallId ?? await logSipCallToBackend(activeCall)
              const hasRealId = backendCallId !== null
              if (hasRealId) {
                await endSipCallInBackend(backendCallId, endedAt).catch(() => undefined)
              }
              set({
                pendingSipDisposition: {
                  callId: hasRealId ? backendCallId : `sip-${Date.now()}`,
                  saveMode: hasRealId ? 'backend' : 'preview',
                  remoteIdentity: activeCall.remoteIdentity,
                },
                showSipDisposition: true,
                sipCallId: null,
                sipCallLogPromise: null,
              })
            })()
          }

          set({
            activeCall: null,
            incomingCall: null,
            muted: false,
            onHold: false,
          })
        },
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
      sipCallId: null,
      sipCallLogPromise: null,
    })
  },

  call: async (destination) => {
    try {
      set({ error: null })
      await sipClient.setAudioInputDevice(get().audioInputDeviceId)
      await sipClient.setAudioOutputDevice(get().audioOutputDeviceId)
      await sipClient.call(destination)
      set({ error: null })
    } catch (err) {
      const error = err instanceof Error ? err.message : 'SIP call failed'
      set({
        error,
        status: sipClient.isRegistered()
          ? 'registered'
          : get().isConfigured
            ? 'configured'
            : 'idle',
        activeCall: null,
        incomingCall: null,
        muted: false,
        onHold: false,
      })
      throw err
    }
  },

  answer: async () => {
    const incomingCall = get().incomingCall
    await sipClient.answer()
    if (incomingCall) {
      set({
        activeCall: {
          id: incomingCall.id,
          remoteIdentity: incomingCall.displayName || incomingCall.from || 'Incoming SIP Call',
          startedAt: Date.now(),
          direction: 'incoming',
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
      sipCallLogPromise: null,
      status: get().isConfigured ? 'registered' : 'idle',
    })
  },

  sendDTMF: async (digits) => {
    await sipClient.sendDTMF(digits)
  },

  transfer: async (destination) => {
    const dest = destination.trim()
    if (!dest) return
    try {
      await sipClient.transfer(dest)
      set({ error: null })
    } catch (err) {
      const error = err instanceof Error ? err.message : 'SIP transfer failed'
      set({ error })
      throw err
    }
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
    if (get().onHold) { set({ muted }); return }
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
      const audioOutputError = err instanceof Error ? err.message : 'Could not switch speaker/audio output.'
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
      const audioInputError = err instanceof Error ? err.message : 'Could not switch microphone/input device.'
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
      const audioOutputError = err instanceof Error ? err.message : 'Could not play test speaker tone.'
      set({ audioOutputError })
      throw err
    }
  },

  clearError: () => set({ error: null, audioOutputError: null, audioInputError: null }),

  dismissSipDisposition: () => set({ showSipDisposition: false, pendingSipDisposition: null }),

  resetCallState: () => {
    void sipClient.hangup().catch(() => undefined)
    set({
      activeCall: null,
      incomingCall: null,
      muted: false,
      onHold: false,
      sipCallId: null,
      sipCallLogPromise: null,
      status: get().isConfigured ? 'registered' : 'idle',
      error: null,
    })
  },
}))
