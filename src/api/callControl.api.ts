import api from './axios'

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
  twilioCallSid?: string
  targetNumber?: string
  supervisorPhone?: string
  room?: string
  message?: string
  audioUrl?: string
  digits?: string
  conferenceSid?: string
  participantCallSid?: string
}

export const callControlAPI = {
  capabilities: async () => {
    const res = await api.get('/call-controls/capabilities')
    return res.data.data
  },

  activeCalls: async () => {
    const res = await api.get('/call-controls/active-calls')
    return res.data.data
  },

  runAction: async (action: CallControlAction, payload: CallControlPayload) => {
    const res = await api.post(`/call-controls/actions/${action}`, payload)
    return res.data.data
  },
}
