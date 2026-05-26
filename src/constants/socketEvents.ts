export const SOCKET_EVENTS = {
  AGENT_STATUS: 'agent:status',
  AGENT_STATUS_CHANGED: 'agent:statusChanged',
  AGENT_STATUS_BROADCAST: 'agent:status:broadcast',
  CALL_INCOMING: 'call:incoming',
  CALL_STARTED: 'call:started',
  CALL_ENDED: 'call:ended',
  CALL_HANGUP: 'call:hangup',
} as const

export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS]

export const AGENT_STATUS_EVENTS = [
  SOCKET_EVENTS.AGENT_STATUS_CHANGED,
  SOCKET_EVENTS.AGENT_STATUS_BROADCAST,
] as const
