import type { SipAccountConfig, SipCallState, SipIncomingCall, SipRuntimeStatus } from '../../types/sip'

type SipModule = typeof import('sip.js')

type SipSession = {
  id?: string
  state?: unknown
  stateChange?: { addListener: (listener: (state: unknown) => void) => void }
  bye?: (...args: unknown[]) => Promise<unknown>
  cancel?: (...args: unknown[]) => Promise<unknown>
  reject?: (...args: unknown[]) => Promise<unknown>
  accept?: (...args: unknown[]) => Promise<unknown>
  invite?: (...args: unknown[]) => Promise<unknown>
  dtmf?: (digits: string) => Promise<unknown> | unknown
  sessionDescriptionHandler?: {
    peerConnection?: RTCPeerConnection
  }
  remoteIdentity?: {
    uri?: { user?: string; host?: string; toString?: () => string }
    displayName?: string
  }
}

type SipRegisterer = {
  register: (...args: unknown[]) => Promise<unknown>
  unregister: (...args: unknown[]) => Promise<unknown>
}

type StoppableUserAgent = {
  stop?: () => Promise<void>
}

type SipHandlers = {
  onStatusChange?: (status: SipRuntimeStatus) => void
  onError?: (message: string) => void
  onIncomingCall?: (call: SipIncomingCall) => void
  onCallStarted?: (call: SipCallState) => void
  onCallEnded?: () => void
}

class SipClient {
  private sip: SipModule | null = null
  private userAgent: unknown = null
  private registerer: SipRegisterer | null = null
  private currentSession: SipSession | null = null
  private config: SipAccountConfig | null = null
  private handlers: SipHandlers = {}

  isRegistered() {
    return Boolean(this.userAgent && this.registerer)
  }

  async register(config: SipAccountConfig, handlers: SipHandlers = {}) {
    this.handlers = handlers
    this.config = config

    if (!config.enabled) {
      throw new Error('SIP account is disabled')
    }

    if (!config.username || !config.password || !config.domain || !config.webSocketServer) {
      throw new Error('SIP username, password, domain, and WebSocket server are required')
    }

    this.handlers.onStatusChange?.('registering')

    try {
      await this.unregister()
      this.sip = await import('sip.js')

      const uri = this.sip.UserAgent.makeURI(`sip:${config.username}@${config.domain}`)
      if (!uri) throw new Error('Invalid SIP URI')

      const iceServers = config.stunServer
        ? [{ urls: config.stunServer.startsWith('stun:') ? config.stunServer : `stun:${config.stunServer}` }]
        : [{ urls: 'stun:stun.l.google.com:19302' }]

      const userAgent = new this.sip.UserAgent({
        uri,
        authorizationUsername: config.username,
        authorizationPassword: config.password,
        displayName: config.displayName || config.callerId || config.username,
        transportOptions: {
          server: config.webSocketServer,
        },
        sessionDescriptionHandlerFactoryOptions: {
          peerConnectionConfiguration: {
            iceServers,
          },
        },
      })

      userAgent.delegate = {
        onInvite: (invitation) => {
          const session = invitation as unknown as SipSession
          this.currentSession = session
          this.attachSessionListeners(session)

          const from = session.remoteIdentity?.uri?.toString?.() || 'Unknown SIP caller'
          this.handlers.onStatusChange?.('incoming')
          this.handlers.onIncomingCall?.({
            id: session.id || `incoming-${Date.now()}`,
            from,
            displayName: session.remoteIdentity?.displayName,
          })
        },
      }

      const registerer = new this.sip.Registerer(userAgent) as unknown as SipRegisterer
      await userAgent.start()
      await registerer.register()

      this.userAgent = userAgent
      this.registerer = registerer
      this.handlers.onStatusChange?.('registered')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'SIP registration failed'
      this.handlers.onStatusChange?.('registration_failed')
      this.handlers.onError?.(message)
      throw err
    }
  }

  async unregister() {
    try {
      if (this.currentSession) await this.hangup()
      if (this.registerer) await this.registerer.unregister()

      const userAgent = this.userAgent as StoppableUserAgent | null
      if (typeof userAgent?.stop === 'function') {
        await userAgent.stop()
      }
    } finally {
      this.userAgent = null
      this.registerer = null
      this.currentSession = null
      this.handlers.onStatusChange?.(this.config?.enabled ? 'configured' : 'idle')
    }
  }

  async call(destination: string) {
    if (!this.sip || !this.userAgent || !this.config) {
      throw new Error('SIP account is not registered')
    }

    const cleanDestination = destination.trim()
    const target = cleanDestination.includes('@')
      ? cleanDestination.replace(/^sip:/, '')
      : `${cleanDestination}@${this.config.domain}`

    const targetUri = this.sip.UserAgent.makeURI(`sip:${target}`)
    if (!targetUri) throw new Error('Invalid destination SIP URI')

    const inviter = new this.sip.Inviter(this.userAgent as never, targetUri, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false },
      },
      extraHeaders: this.config.callerId
        ? [`P-Preferred-Identity: <sip:${this.config.callerId}@${this.config.domain}>`]
        : [],
    }) as unknown as SipSession

    this.currentSession = inviter
    this.attachSessionListeners(inviter)
    this.handlers.onStatusChange?.('calling')
    await inviter.invite?.()
  }

  async answer() {
    if (!this.currentSession?.accept) return
    await this.currentSession.accept()
  }

  async reject() {
    if (!this.currentSession?.reject) return
    await this.currentSession.reject()
    this.currentSession = null
    this.handlers.onStatusChange?.('registered')
  }

  async hangup() {
    const session = this.currentSession
    if (!session) return

    if (session.bye) await session.bye()
    else if (session.cancel) await session.cancel()
    else if (session.reject) await session.reject()

    this.currentSession = null
    this.handlers.onCallEnded?.()
    this.handlers.onStatusChange?.(this.registerer ? 'registered' : 'configured')
  }

  async sendDTMF(digits: string) {
    if (!this.currentSession) return
    await this.currentSession.dtmf?.(digits)
  }

  mute(muted: boolean) {
    const pc = this.currentSession?.sessionDescriptionHandler?.peerConnection
    if (!pc) return

    pc.getSenders().forEach(sender => {
      if (sender.track?.kind === 'audio') sender.track.enabled = !muted
    })
  }

  private attachSessionListeners(session: SipSession) {
    session.stateChange?.addListener((state: unknown) => {
      const stateName = String(state)

      if (stateName.includes('Established')) {
        this.attachRemoteMedia(session)
        this.handlers.onStatusChange?.('in_call')
        this.handlers.onCallStarted?.({
          id: session.id || `sip-${Date.now()}`,
          remoteIdentity: session.remoteIdentity?.uri?.toString?.() || 'SIP call',
          startedAt: Date.now(),
        })
      }

      if (stateName.includes('Terminated')) {
        this.currentSession = null
        this.handlers.onCallEnded?.()
        this.handlers.onStatusChange?.(this.registerer ? 'registered' : 'configured')
      }
    })
  }

  private attachRemoteMedia(session: SipSession) {
    const pc = session.sessionDescriptionHandler?.peerConnection
    if (!pc) return

    let audio = document.getElementById('ptdt-sip-remote-audio') as HTMLAudioElement | null
    if (!audio) {
      audio = document.createElement('audio')
      audio.id = 'ptdt-sip-remote-audio'
      audio.autoplay = true
      ;(audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true
      audio.style.display = 'none'
      document.body.appendChild(audio)
    }

    const stream = new MediaStream()
    pc.getReceivers().forEach(receiver => {
      if (receiver.track?.kind === 'audio') stream.addTrack(receiver.track)
    })

    audio.srcObject = stream
    void audio.play().catch(() => undefined)
  }
}

export const sipClient = new SipClient()
