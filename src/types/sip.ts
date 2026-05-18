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

export type SipCallLifecycleState =
  | 'idle'
  | 'configured'
  | 'registering'
  | 'ready'
  | 'incoming'
  | 'dialing'
  | 'ringing'
  | 'connected'
  | 'remote_ended'
  | 'ended'
  | 'failed'
  | 'reconnecting'

export type SipCallDirection = 'incoming' | 'outgoing' | null

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
  direction?: Exclude<SipCallDirection, null>
}

export interface SipDiagnostics {
  lastUpdated: number
  runtimeStatus: SipRuntimeStatus
  lifecycle: SipCallLifecycleState
  registered: boolean
  webSocketConnected: boolean
  userAgentReady: boolean
  username: string
  domain: string
  webSocketServer: string
  transport: SipTransport | ''
  activeCallId: string | null
  activeRemote: string | null
  callDirection: SipCallDirection
  selectedAudioInputDeviceId: string
  selectedAudioOutputDeviceId: string
  lastSipEvent: string | null
  lastError: string | null
  lastEndReason: string | null
}
