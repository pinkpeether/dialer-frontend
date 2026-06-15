import { create } from 'zustand'
import { sipClient } from '../services/sip/SipClient'
import { softphoneAudio } from '../services/audio/SoftphoneAudio'
import api from '../api/axios'
import { callsAPI } from '../api/calls.api'
import { dynamicCallerIdApi } from '../api/dynamicCallerId.api'
import type { SipAccountConfig, SipCallState, SipIncomingCall, SipRuntimeStatus } from '../types/sip'

const STORAGE_KEY = 'ptdt_sip_account_v1'
const AUDIO_OUTPUT_STORAGE_KEY = 'ptdt_sip_audio_output_v1'
const AUDIO_INPUT_STORAGE_KEY = 'ptdt_sip_audio_input_v1'
const DYNAMIC_CALLER_ID_SELECTION_KEY = 'ptdt-dialer:selected-dynamic-caller-id'

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

function selectedDynamicCallerId() {
  try { return localStorage.getItem(DYNAMIC_CALLER_ID_SELECTION_KEY) || '' } catch { return '' }
}

async function validateDynamicCallerIdBeforeSipCall(callerIdId: string) {
  await dynamicCallerIdApi.validateCall(callerIdId)
}

async function initiateBackendDynamicCallerIdCall(destination: string, config: SipAccountConfig): Promise<BackendOriginatedCallRef | null> {
  const callerIdId = selectedDynamicCallerId()
  if (!callerIdId) return null

  const agentExtension = (config.username || '').trim()
  if (!agentExtension) {
    throw new Error('SIP username/extension is required for backend-originated Dynamic Caller ID calls.')
  }

  await validateDynamicCallerIdBeforeSipCall(callerIdId)
  const res = await api.post('/dialer/call/backend-adhoc', {
    phone: destination.trim(),
    callerIdId,
    agentExtension,
    note: 'Dynamic Caller ID backend originated call',
  })

  const data = res.data?.data ?? res.data ?? {}
  return {
    callId: data.callId ?? data.callRecord?.id ?? null,
    providerCallId: data.providerCallId ?? data.callSid ?? data.providerCall?.id ?? null,
    phone: destination.trim(),
    agentExtension,
  }
}

async function hangupBackendDynamicCallerIdCall(ref: BackendOriginatedCallRef): Promise<void> {
  await api.post('/dialer/call/backend-hangup', ref)
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

type BackendOriginatedCallRef = {
  callId: number | string | null
  providerCallId: string | null
  phone: string
  agentExtension: string
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
  backendOriginatedCall: BackendOriginatedCallRef | null

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
  setAudioInputDevice: (deviceId: string) => Promise<string>
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
  backendOriginatedCall: null,

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
      backendOriginatedCall: null,
    })
  },

  register: async () => {
    const currentStatus = get().status
    if (['registering', 'registered', 'in_call', 'calling', 'incoming'].includes(currentStatus)) {
      return
    }

    const config = get().config
    try {
      const resolvedInputDeviceId = await sipClient.setAudioInputDevice(get().audioInputDeviceId)
      if (resolvedInputDeviceId !== get().audioInputDeviceId) {
        localStorage.setItem(AUDIO_INPUT_STORAGE_KEY, resolvedInputDeviceId)
        set({ audioInputDeviceId: resolvedInputDeviceId, audioInputError: null })
      }
      await sipClient.setAudioOutputDevice(get().audioOutputDeviceId)
      await sipClient.register(config, {
        onStatusChange: (status) => set({ status }),
        onError: (error) => set({ error }),
        onIncomingCall: (incomingCall) => set({ incomingCall, status: 'incoming' }),

        onCallStarted: (activeCall) => {
          const backendOriginatedCall = get().backendOriginatedCall
          set({ activeCall, incomingCall: null, status: 'in_call', onHold: false })

          /*
            Dynamic Caller ID backend-originated calls create a real OUT call record
            through /dialer/call/backend-adhoc. The SIP invite received by the browser
            is only the internal agent leg, so it must not be logged as a second IN call.
          */
          if (backendOriginatedCall) {
            set({
              sipCallId: null,
              sipCallLogPromise: null,
              showSipDisposition: false,
              pendingSipDisposition: null,
            })
            return
          }

          // 12A — log call to backend async, store the returned callId
          const sipCallLogPromise = logSipCallToBackend(activeCall)
          set({ sipCallLogPromise })
          void sipCallLogPromise.then((backendCallId) => {
            set({ sipCallId: backendCallId })
          })
        },

        onCallEnded: (endedAtMs) => {
          const endedAt = new Date(endedAtMs ?? Date.now())
          const { activeCall, sipCallId, sipCallLogPromise, backendOriginatedCall } = get()

          /*
            For Dynamic Caller ID backend-originated calls, this SIP session is the
            internal agent leg. Do not create/update a separate SIP call record and
            do not show disposition for this duplicate leg.
          */
          if (backendOriginatedCall) {
            set({
              activeCall: null,
              incomingCall: null,
              muted: false,
              onHold: false,
              sipCallId: null,
              sipCallLogPromise: null,
              showSipDisposition: false,
              pendingSipDisposition: null,
              backendOriginatedCall: null,
            })
            return
          }

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
      backendOriginatedCall: null,
    })
  },

  call: async (destination) => {
    try {
      set({ error: null })
      const config = get().config
      const backendOriginated = await initiateBackendDynamicCallerIdCall(destination, config)
      if (backendOriginated) {
        set({
          status: sipClient.isRegistered() ? 'registered' : get().status,
          error: null,
          backendOriginatedCall: backendOriginated,
        })
        return
      }

      const resolvedInputDeviceId = await sipClient.setAudioInputDevice(get().audioInputDeviceId)
      if (resolvedInputDeviceId !== get().audioInputDeviceId) {
        localStorage.setItem(AUDIO_INPUT_STORAGE_KEY, resolvedInputDeviceId)
        set({ audioInputDeviceId: resolvedInputDeviceId, audioInputError: null })
      }
      await sipClient.setAudioOutputDevice(get().audioOutputDeviceId)
      await sipClient.call(destination)
      const activeInputDeviceId = sipClient.getAudioInputDeviceId()
      if (activeInputDeviceId !== get().audioInputDeviceId) {
        localStorage.setItem(AUDIO_INPUT_STORAGE_KEY, activeInputDeviceId)
        set({ audioInputDeviceId: activeInputDeviceId, audioInputError: null })
      }
      set({ error: null })
    } catch (err) {
      const error = err instanceof Error ? err.message : 'SIP call failed'
      const lower = error.toLowerCase()
      const shouldResetInput = lower.includes('microphone') ||
        lower.includes('device not found') ||
        lower.includes('requested device not found') ||
        lower.includes('notfound') ||
        lower.includes('constraint')
      if (shouldResetInput) {
        localStorage.setItem(AUDIO_INPUT_STORAGE_KEY, 'default')
      }
      set({
        error,
        audioInputDeviceId: shouldResetInput ? 'default' : get().audioInputDeviceId,
        audioInputError: shouldResetInput ? error : get().audioInputError,
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
    const backendRef = get().backendOriginatedCall

    /*
      Backend-originated Dynamic Caller ID calls must cancel the Asterisk/PSTN
      leg before clearing the browser SIP leg. Otherwise the customer-side
      provider leg can remain alive until trunk timeout.
    */
    if (backendRef) {
      await hangupBackendDynamicCallerIdCall(backendRef).catch(() => undefined)
    }

    await sipClient.reject().catch(() => undefined)
    set({ incomingCall: null, onHold: false, backendOriginatedCall: null, status: get().isConfigured ? 'registered' : 'idle' })
  },

  hangup: async () => {
    const backendRef = get().backendOriginatedCall

    /*
      Hard-stop backend/PSTN first while Asterisk bridge channels still exist,
      then clear the browser SIP leg.
    */
    if (backendRef) {
      await hangupBackendDynamicCallerIdCall(backendRef).catch(() => undefined)
    }

    await sipClient.hangup().catch(() => undefined)
    set({
      activeCall: null,
      incomingCall: null,
      muted: false,
      onHold: false,
      sipCallLogPromise: null,
      backendOriginatedCall: null,
      status: get().isConfigured ? 'registered' : 'idle',
    })
  },

  sendDTMF: async (digits) => {
    await sipClient.sendDTMF(digits)
  },

  transfer: async (destination) => {
    const dest = destination.trim()
    if (!dest) return
    await sipClient.transfer(dest)
  },

  hold: async () => {
    await sipClient.hold()
    set({ onHold: true })
  },

  resume: async () => {
    await sipClient.resume()
    set({ onHold: false })
  },

  setMuted: (muted) => {
    sipClient.mute(muted)
    set({ muted })
  },

  setAudioOutputDevice: async (deviceId) => {
    await sipClient.setAudioOutputDevice(deviceId)
    localStorage.setItem(AUDIO_OUTPUT_STORAGE_KEY, deviceId)
    set({ audioOutputDeviceId: deviceId, audioOutputError: null })
  },

  testAudioOutputDevice: async () => {
    await softphoneAudio.playTestTone(get().audioOutputDeviceId)
  },

  setAudioInputDevice: async (deviceId) => {
    const resolvedDeviceId = await sipClient.setAudioInputDevice(deviceId)
    localStorage.setItem(AUDIO_INPUT_STORAGE_KEY, resolvedDeviceId)
    set({ audioInputDeviceId: resolvedDeviceId, audioInputError: null })
    return resolvedDeviceId
  },

  clearError: () => set({ error: null, audioOutputError: null, audioInputError: null }),

  dismissSipDisposition: () => set({ showSipDisposition: false, pendingSipDisposition: null }),

  resetCallState: () => set({ activeCall: null, incomingCall: null, muted: false, onHold: false, sipCallId: null, sipCallLogPromise: null, showSipDisposition: false, pendingSipDisposition: null, backendOriginatedCall: null }),
}))
