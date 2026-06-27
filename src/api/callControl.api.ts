import api from './axios'
import { clearSwrByPrefix, silentOverlayConfig, swr, swrKey } from './swrCache'

export type CallControlAction =
  | 'hangup'
  | 'hold'
  | 'resume'
  | 'transfer'
  | 'conference'
  | 'whisper'
  | 'barge'
  | 'voicemailDrop'
  | 'mute'
  | 'unmute'
  | 'dtmf'
  | 'noiseCancellation'

export type CallControlPayload = {
  callId?: number | string
  providerCallId?: string
  target?: string
  transferTo?: string
  destination?: string
  toNumber?: string
  targetNumber?: string
  agentExtension?: string
  supervisorPhone?: string
  room?: string
  message?: string
  audioUrl?: string
  digits?: string
  conferenceSid?: string
  participantCallSid?: string
}

const callControlGetConfig = (silent: boolean) => silent ? silentOverlayConfig() : undefined
type CallControlSwrOptions = { silent?: boolean }

export const callControlAPI = {
  capabilities: async (options?: CallControlSwrOptions) => swr(
    swrKey('call-controls', { type: 'capabilities' }),
    async ({ silent }) => {
      const res = await api.get('/call-controls/capabilities', callControlGetConfig(silent))
      return res.data.data
    },
    options,
  ),

  activeCalls: async (options?: CallControlSwrOptions) => swr(
    swrKey('call-controls', { type: 'active-calls' }),
    async ({ silent }) => {
      const res = await api.get('/call-controls/active-calls', callControlGetConfig(silent))
      return res.data.data
    },
    options,
  ),

  runAction: async (action: CallControlAction, payload: CallControlPayload) => {
    const res = await api.post(`/call-controls/actions/${action}`, payload)
    clearSwrByPrefix('call-controls')
    return res.data.data
  },
}
