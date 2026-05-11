export type SipTransport = 'WSS' | 'WS' | 'TLS' | 'TCP' | 'UDP'

export type SipRuntimeStatus =
  | 'idle'
  | 'configured'
  | 'registering'
  | 'registered'
  | 'registration_failed'
  | 'incoming'
  | 'calling'
  | 'in_call'
  | 'ended'
  | 'error'

export interface SipAccountConfig {
  enabled: boolean
  username: string
  password: string
  domain: string
  webSocketServer: string
  port?: string
  transport: SipTransport
  displayName?: string
  callerId?: string
  outboundProxy?: string
  stunServer?: string
}

export interface SipIncomingCall {
  id: string
  from: string
  displayName?: string
}

export interface SipCallState {
  id: string
  remoteIdentity: string
  startedAt: number
}
