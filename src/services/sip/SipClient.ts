import type { SipAccountConfig, SipCallState, SipIncomingCall, SipRuntimeStatus } from '../../types/sip'

type SipModule = typeof import('sip.js')

type SipSession = {
  id?: string
  state?: unknown
  stateChange?: { addListener: (listener: (state: unknown) => void) => void }
  bye?: (...args: unknown[]) => Promise<unknown>
  cancel?: (...args: unknown[]) => Promise<unknown>
  reject?: (...args: unknown[]) => Promise<unknown>
  accept?: (options?: {
    sessionDescriptionHandlerOptions?: SipMediaOptions
  }) => Promise<unknown>
  invite?: (options?: unknown) => Promise<unknown>
  dtmf?: (digits: string) => Promise<unknown> | unknown
  refer?: (target: unknown, options?: unknown) => Promise<unknown> | unknown
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
  stop?: () => Promise<unknown>
}

type SipHandlers = {
  onStatusChange?: (status: SipRuntimeStatus) => void
  onError?: (message: string) => void
  onIncomingCall?: (call: SipIncomingCall) => void
  onCallStarted?: (call: SipCallState) => void
  onCallEnded?: (endedAt?: number) => void
}

type SipMediaOptions = {
  constraints: {
    audio: boolean | MediaTrackConstraints
    video: boolean
  }
  peerConnectionConfiguration: RTCConfiguration
}

declare global {
  interface Window {
    __ptdtSipPeerConnection?: RTCPeerConnection
    __ptdtSipSession?: SipSession
    webkitAudioContext?: typeof AudioContext
  }
}

type HoldMusicState = {
  context: AudioContext
  track: MediaStreamTrack
  oscillators: OscillatorNode[]
  intervalId: number
}

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

const SIP_DEBUG = import.meta.env.VITE_SIP_DEBUG === 'true'

function sipDebugInfo(...args: unknown[]) {
  if (SIP_DEBUG) console.info(...args)
}

function friendlySipError(err: unknown, fallback: string) {
  const message = getErrorMessage(err, fallback)
  const lower = message.toLowerCase()

  if (lower.includes('overconstrained') || lower.includes('constraint')) {
    return 'Selected microphone is unavailable. Switch microphone input to Default and try again.'
  }

  if (lower.includes('notfound') || lower.includes('requested device not found')) {
    return 'Selected microphone was not found. Switched to Default microphone; try the call again.'
  }

  if (lower.includes('permission') || lower.includes('notallowed') || lower.includes('not allowed')) {
    return 'Microphone permission was blocked. Allow microphone access and try again.'
  }

  if (lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('401') || lower.includes('403')) {
    return 'SIP registration was rejected. Check the username, password, extension, and PBX permissions.'
  }

  if (
    lower.includes('websocket') ||
    lower.includes('transport') ||
    lower.includes('network') ||
    lower.includes('connection') ||
    lower.includes('closed') ||
    lower.includes('timeout')
  ) {
    return 'Could not reach the SIP WebSocket server. Confirm FreePBX is running, WSS is reachable, and the server URL is correct.'
  }

  if (lower.includes('not registered')) {
    return 'SIP is not registered yet. Open SIP Settings and register before placing a call.'
  }

  if (lower.includes('abort')) {
    return 'The SIP call attempt was aborted before it connected. Please try again.'
  }

  return message
}

class SipClient {
  private sip: SipModule | null = null
  private userAgent: unknown = null
  private registerer: SipRegisterer | null = null
  private currentSession: SipSession | null = null
  private config: SipAccountConfig | null = null
  private handlers: SipHandlers = {}
  private audioOutputDeviceId = 'default'
  private audioInputDeviceId = 'default'
  private iceServers: RTCIceServer[] = []
  private localAudioStream: MediaStream | null = null
  private remoteTrackListener: ((event: RTCTrackEvent) => void) | null = null
  private heldAudioSenderTracks = new Map<RTCRtpSender, MediaStreamTrack | null>()
  private holdMusicState: HoldMusicState | null = null

  isRegistered() {
    return Boolean(this.userAgent && this.registerer)
  }

  getAudioInputDeviceId() {
    return this.audioInputDeviceId || 'default'
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

      const stunServer = config.stunServer?.trim()
      this.iceServers = stunServer
        ? [{ urls: stunServer.startsWith('stun:') || stunServer.startsWith('turn:') ? stunServer : `stun:${stunServer}` }]
        : []

      sipDebugInfo('[SIP] ICE servers:', this.iceServers)

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
            iceServers: [],
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
          },
          iceGatheringTimeout: 2000
        },
      })

      userAgent.delegate = {
        onInvite: (invitation) => {
          const session = invitation as unknown as SipSession
          this.currentSession = session
          this.exposeSession(session)
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
      const message = friendlySipError(err, 'SIP registration failed')
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
    } catch {
      // ignore cleanup errors
    } finally {
      this.stopLocalAudioStream()
      this.stopHoldMusic()
      this.heldAudioSenderTracks.clear()
      this.userAgent = null
      this.registerer = null
      this.currentSession = null
      this.iceServers = []
      this.remoteTrackListener = null
      window.__ptdtSipPeerConnection = undefined
      window.__ptdtSipSession = undefined
      this.handlers.onStatusChange?.(this.config?.enabled ? 'configured' : 'idle')
    }
  }

  // ---------------------------------------------------------------------------
  // OUTGOING CALL
  // Key fix: mic track ko invite() ke baad seedha nahi lagana kyunki
  // sessionDescriptionHandler us waqt ready nahi hota.
  // Sahi jagah hai SessionState.Established — tab PC fully ready hoti hai.
  // ---------------------------------------------------------------------------
  async call(destination: string) {
    if (!this.sip || !this.userAgent || !this.config) {
      throw new Error('SIP account is not registered')
    }

    if (this.currentSession) {
      await this.endCurrentSessionForNewCall()
    }

    const cleanDestination = destination.trim()
    const target = cleanDestination.includes('@')
      ? cleanDestination.replace(/^sip:/, '')
      : `${cleanDestination}@${this.config.domain}`

    const targetUri = this.sip.UserAgent.makeURI(`sip:${target}`)
    if (!targetUri) throw new Error('Invalid destination SIP URI')

    // Pre-acquire mic stream before invite — ensures track is ready
    const localStream = await this.getOrCreateLocalAudioStream(false)

    const inviterOptions: Record<string, unknown> = {
      sessionDescriptionHandlerOptions: this.createAudioMediaOptions(),
    }

    const outboundCallerId = (this.config.callerId || '').replace(/\s/g, '')

    if (/^\+[1-9][0-9]{1,14}$/.test(outboundCallerId)) {
      const extraHeaders: string[] = []

      extraHeaders.push(`X-PTDT-Caller-ID: ${outboundCallerId}`)
      extraHeaders.push(`P-Preferred-Identity: <sip:${outboundCallerId}@${this.config.domain}>`)

      inviterOptions.extraHeaders = extraHeaders
    }

    const inviter = new this.sip.Inviter(
      this.userAgent as never,
      targetUri,
      inviterOptions,
    ) as unknown as SipSession

    this.currentSession = inviter
    this.exposeSession(inviter)

    // Attach state listener BEFORE invite() — catches Established event
    this.attachSessionListeners(inviter, localStream)

    this.handlers.onStatusChange?.('calling')

    try {
      await inviter.invite?.(inviterOptions)

      window.setTimeout(() => {
        this.exposeSession(inviter)
        this.logPeerConnectionState(inviter, 'outgoing-after-invite')
      }, 500)
    } catch (err) {
      const message = friendlySipError(err, 'SIP call failed')
      this.cleanupCurrentCallState()
      this.handlers.onStatusChange?.(this.registerer ? 'registered' : 'configured')
      this.handlers.onCallEnded?.()
      this.handlers.onError?.(message)
      throw new Error(message, { cause: err })
    }
  }

  async answer() {
    const session = this.currentSession
    const accept = session?.accept

    if (!session || typeof accept !== 'function') return

    this.exposeSession(session)

    try {
      await this.getOrCreateLocalAudioStream(false)

      await accept.call(session, {
        sessionDescriptionHandlerOptions: this.createAudioMediaOptions(),
      })

      window.setTimeout(() => {
        this.exposeSession(session)
        this.logPeerConnectionState(session, 'incoming-after-accept')
      }, 500)
    } catch (err) {
      const message = friendlySipError(err, 'SIP answer failed')
      this.cleanupCurrentCallState()
      this.handlers.onStatusChange?.(this.registerer ? 'registered' : 'configured')
      this.handlers.onCallEnded?.()
      this.handlers.onError?.(message)
      throw new Error(message, { cause: err })
    }
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
    const endedAt = Date.now()

    try {
      await this.terminateSession(session)
    } catch (err) {
      console.warn('[SIP] Hangup signaling failed; clearing local call state:', err)
    } finally {
      this.cleanupCurrentCallState()
    }

    this.handlers.onCallEnded?.(endedAt)
    this.handlers.onStatusChange?.(this.registerer ? 'registered' : 'configured')
  }

  async sendDTMF(digits: string) {
    if (!this.currentSession) return
    await this.currentSession.dtmf?.(digits)
  }

  async transfer(destination: string) {
    const session = this.currentSession
    if (!session) {
      throw new Error('No active SIP call to transfer')
    }

    if (!this.sip || !this.config) {
      throw new Error('SIP configuration not available for transfer')
    }

    const referFn = session.refer
    if (typeof referFn !== 'function') {
      throw new Error('SIP transfer is not supported for this session')
    }

    const cleanDestination = destination.trim()
    if (!cleanDestination) {
      throw new Error('Transfer destination is required')
    }

    const targetUserAtHost = cleanDestination.includes('@')
      ? cleanDestination.replace(/^sip:/i, '')
      : `${cleanDestination}@${this.config.domain}`

    const targetUri = this.sip.UserAgent.makeURI(`sip:${targetUserAtHost}`)
    if (!targetUri) {
      throw new Error('Invalid transfer destination SIP URI')
    }

    try {
      sipDebugInfo('[SIP] Sending blind transfer REFER to', targetUri.toString())
      await referFn.call(session, targetUri)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'SIP transfer failed'
      this.handlers.onError?.(message)
      throw err
    }
  }

  mute(muted: boolean) {
    const pc = this.currentSession?.sessionDescriptionHandler?.peerConnection
    if (!pc) return

    pc.getSenders().forEach(sender => {
      if (sender.track?.kind === 'audio') sender.track.enabled = !muted
    })
  }

  async hold() {
    const session = this.currentSession
    const pc = session?.sessionDescriptionHandler?.peerConnection
    if (!pc) return

    const holdMusicTrack = await this.getOrCreateHoldMusicTrack()
    const audioSenders = pc.getSenders().filter(sender => sender.track?.kind === 'audio')

    await Promise.all(audioSenders.map(async (sender) => {
      if (!this.heldAudioSenderTracks.has(sender)) {
        this.heldAudioSenderTracks.set(sender, sender.track)
      }

      try {
        await sender.replaceTrack(holdMusicTrack)
      } catch (err) {
        console.warn('[SIP] Hold music replaceTrack failed:', err)
        if (sender.track?.kind === 'audio') sender.track.enabled = false
      }
    }))

    pc.getSenders().forEach(sender => {
      if (sender.track?.kind === 'audio') {
        sender.track.enabled = true
      }
    })

    pc.getReceivers().forEach(receiver => {
      if (receiver.track?.kind === 'audio') {
        receiver.track.enabled = false
      }
    })

    const audio = document.getElementById('ptdt-sip-remote-audio') as HTMLAudioElement | null
    if (audio) {
      audio.muted = true
      try {
        audio.pause()
      } catch {
        // ignore
      }
    }

    sipDebugInfo('[SIP] Call locally held (remote media paused, hold music active)')
  }

  async resume() {
    const session = this.currentSession
    const pc = session?.sessionDescriptionHandler?.peerConnection
    if (!pc) return

    await Promise.all(Array.from(this.heldAudioSenderTracks.entries()).map(async ([sender, originalTrack]) => {
      try {
        await sender.replaceTrack(originalTrack)
        if (originalTrack?.kind === 'audio') originalTrack.enabled = true
      } catch (err) {
        console.warn('[SIP] Hold music restore failed:', err)
      }
    }))

    this.heldAudioSenderTracks.clear()
    this.stopHoldMusic()

    pc.getReceivers().forEach(receiver => {
      if (receiver.track?.kind === 'audio') {
        receiver.track.enabled = true
      }
    })

    const audio = document.getElementById('ptdt-sip-remote-audio') as HTMLAudioElement | null
    if (audio) {
      audio.muted = false
      try {
        void audio.play()
      } catch {
        // autoplay recovery already handled in attachRemoteMedia
      }
    }

    sipDebugInfo('[SIP] Call resumed (media unpaused)')
  }

  async setAudioOutputDevice(deviceId: string) {
    this.audioOutputDeviceId = deviceId || 'default'
    const audio = document.getElementById('ptdt-sip-remote-audio') as HTMLAudioElement | null
    if (!audio) return

    await this.applyAudioOutputDevice(audio)
  }

  async setAudioInputDevice(deviceId: string) {
    this.audioInputDeviceId = deviceId || 'default'

    const pc = this.currentSession?.sessionDescriptionHandler?.peerConnection
    if (!pc) return this.audioInputDeviceId

    const audioSender = pc.getSenders().find(sender => sender.track?.kind === 'audio')
    if (!audioSender) return this.audioInputDeviceId

    const stream = await this.getOrCreateLocalAudioStream(true)
    const [newTrack] = stream.getAudioTracks()

    if (!newTrack) {
      throw new Error('Selected microphone did not provide an audio track.')
    }

    const oldTrack = audioSender.track
    await audioSender.replaceTrack(newTrack)
    if (oldTrack && oldTrack !== newTrack) oldTrack.stop()

    return this.audioInputDeviceId
  }

  private createAudioMediaOptions(): SipMediaOptions {
    return {
      constraints: {
        audio: this.getAudioConstraints(),
        video: false,
      },
      peerConnectionConfiguration: {
        iceServers: this.iceServers,
      },
    }
  }

  private getAudioConstraints(): boolean | MediaTrackConstraints {
    if (!this.audioInputDeviceId || this.audioInputDeviceId === 'default') return true

    return {
      deviceId: { exact: this.audioInputDeviceId },
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    }
  }

  private async getOrCreateLocalAudioStream(forceNew = false) {
    if (!forceNew && this.localAudioStream) {
      const [track] = this.localAudioStream.getAudioTracks()
      if (track && track.readyState === 'live') return this.localAudioStream
    }

    this.stopLocalAudioStream()

    try {
      this.localAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: this.getAudioConstraints(),
        video: false,
      })
    } catch (err) {
      if (!this.shouldFallbackToDefaultAudioInput(err)) throw err

      console.warn('[SIP] Selected microphone unavailable, falling back to default input:', err)
      this.audioInputDeviceId = 'default'
      this.localAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      })
    }

    const [track] = this.localAudioStream.getAudioTracks()
    if (!track) {
      this.stopLocalAudioStream()
      throw new Error('Microphone did not provide an audio track.')
    }

    track.enabled = true
    sipDebugInfo('[SIP] Local microphone track ready:', {
      label: track.label,
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
    })

    return this.localAudioStream
  }

  private shouldFallbackToDefaultAudioInput(err: unknown) {
    if (!this.audioInputDeviceId || this.audioInputDeviceId === 'default') return false
    const error = err as { name?: string; message?: string; constraint?: string }
    const name = error.name?.toLowerCase() || ''
    const message = error.message?.toLowerCase() || ''
    return (
      name.includes('overconstrained') ||
      name.includes('notfound') ||
      name.includes('notreadable') ||
      message.includes('overconstrained') ||
      message.includes('constraint') ||
      message.includes('requested device not found') ||
      message.includes('device')
    )
  }

  private stopLocalAudioStream() {
    this.localAudioStream?.getTracks().forEach(track => track.stop())
    this.localAudioStream = null
  }

  private cleanupCurrentCallState() {
    this.currentSession = null
    this.stopLocalAudioStream()
    this.stopHoldMusic()
    this.heldAudioSenderTracks.clear()
    this.remoteTrackListener = null
    window.__ptdtSipPeerConnection = undefined
    window.__ptdtSipSession = undefined
  }

  private isSessionEstablished(session: SipSession) {
    return String(session.state || '').includes('Established')
  }

  private async terminateSession(session: SipSession) {
    if (this.isSessionEstablished(session) && session.bye) {
      await session.bye()
      return
    }

    if (session.cancel) {
      await session.cancel()
      return
    }

    if (session.reject) {
      await session.reject()
      return
    }

    if (session.bye) {
      await session.bye()
    }
  }

  private async endCurrentSessionForNewCall() {
    const session = this.currentSession
    if (!session) return

    try {
      await this.terminateSession(session)
    } catch (err) {
      console.warn('[SIP] Previous session cleanup before new call failed:', err)
    } finally {
      this.cleanupCurrentCallState()
      this.handlers.onStatusChange?.(this.registerer ? 'registered' : 'configured')
    }
  }

  private async getOrCreateHoldMusicTrack() {
    if (this.holdMusicState?.track.readyState === 'live') return this.holdMusicState.track

    this.stopHoldMusic()

    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext
    if (!AudioContextConstructor) {
      throw new Error('Hold music is not supported in this browser runtime.')
    }

    const context = new AudioContextConstructor()
    if (context.state === 'suspended') {
      await context.resume()
    }
    const destination = context.createMediaStreamDestination()
    const masterGain = context.createGain()
    const leadGain = context.createGain()
    const padGain = context.createGain()
    const lead = context.createOscillator()
    const pad = context.createOscillator()

    masterGain.gain.value = 0.08
    leadGain.gain.value = 0.72
    padGain.gain.value = 0.28

    lead.type = 'sine'
    pad.type = 'triangle'

    lead.connect(leadGain)
    pad.connect(padGain)
    leadGain.connect(masterGain)
    padGain.connect(masterGain)
    masterGain.connect(destination)

    const melody = [392, 440, 494, 523, 494, 440, 392, 330]
    let step = 0
    const applyStep = () => {
      const now = context.currentTime
      const note = melody[step % melody.length]
      lead.frequency.setTargetAtTime(note, now, 0.03)
      pad.frequency.setTargetAtTime(note / 2, now, 0.05)
      step += 1
    }

    applyStep()
    lead.start()
    pad.start()

    const intervalId = window.setInterval(applyStep, 850)
    const [track] = destination.stream.getAudioTracks()
    if (!track) {
      window.clearInterval(intervalId)
      lead.stop()
      pad.stop()
      void context.close()
      throw new Error('Could not create hold music audio track.')
    }

    track.enabled = true
    this.holdMusicState = {
      context,
      track,
      oscillators: [lead, pad],
      intervalId,
    }

    return track
  }

  private stopHoldMusic() {
    const state = this.holdMusicState
    if (!state) return

    window.clearInterval(state.intervalId)
    state.oscillators.forEach((oscillator) => {
      try {
        oscillator.stop()
      } catch {
        // already stopped
      }
    })
    state.track.stop()
    void state.context.close().catch(() => undefined)
    this.holdMusicState = null
  }

  // ---------------------------------------------------------------------------
  // attachSessionListeners — outgoing calls ko localStream bhi pass hoti hai
  // taake Established state mein mic track force-inject ki ja sake.
  // ---------------------------------------------------------------------------
  private attachSessionListeners(session: SipSession, localStream?: MediaStream | null) {
    session.stateChange?.addListener((state: unknown) => {
      const stateName = String(state)
      sipDebugInfo('[SIP] Session state:', stateName)

      this.exposeSession(session)

      if (stateName.includes('Established')) {
        // Remote audio attach karo
        this.attachRemoteMedia(session)

        // Outgoing call ke liye mic track force-inject karo
        // Ye wahi jagah hai jahan PeerConnection 100% ready hoti hai
        if (localStream) {
          this.forceAttachMicTrack(session, localStream)
        }

        window.setTimeout(() => {
          this.logPeerConnectionState(session, 'established')
        }, 1000)

        this.handlers.onStatusChange?.('in_call')
        this.handlers.onCallStarted?.({
          id: session.id || `sip-${Date.now()}`,
          remoteIdentity: session.remoteIdentity?.uri?.toString?.() || 'SIP call',
          startedAt: Date.now(),
          direction: localStream ? 'outgoing' : 'incoming',
        })
      }

      if (stateName.includes('Terminated')) {
        const endedAt = Date.now()
        this.cleanupCurrentCallState()
        this.handlers.onCallEnded?.(endedAt)
        this.handlers.onStatusChange?.(this.registerer ? 'registered' : 'configured')
      }
    })
  }

  // ---------------------------------------------------------------------------
  // forceAttachMicTrack
  // Outgoing call direction mein SIP.js Inviter ka PeerConnection mic track
  // reliably attach nahi karta. Ye function Established state mein call hota
  // hai jab PC ready hoti hai aur sender ya tou replace ya add kiya jata hai.
  // ---------------------------------------------------------------------------
  private forceAttachMicTrack(session: SipSession, localStream: MediaStream) {
    const pc = session.sessionDescriptionHandler?.peerConnection
    if (!pc) {
      console.warn('[SIP] forceAttachMicTrack: no PeerConnection available')
      return
    }

    const audioTrack = localStream.getAudioTracks()[0]
    if (!audioTrack) {
      console.warn('[SIP] forceAttachMicTrack: no audio track in localStream')
      return
    }

    audioTrack.enabled = true

    const senders = pc.getSenders()
    const audioSender = senders.find(s => s.track?.kind === 'audio' || s.track === null)

    if (audioSender) {
      // Existing sender ko replace karo
      audioSender.replaceTrack(audioTrack).then(() => {
        sipDebugInfo('[SIP] forceAttachMicTrack: replaceTrack done', {
          label: audioTrack.label,
          enabled: audioTrack.enabled,
          readyState: audioTrack.readyState,
        })
      }).catch(err => {
        console.warn('[SIP] forceAttachMicTrack: replaceTrack failed:', err)
      })
    } else {
      // Koi sender nahi — naya add karo
      try {
        pc.addTrack(audioTrack, localStream)
        sipDebugInfo('[SIP] forceAttachMicTrack: addTrack done', {
          label: audioTrack.label,
          enabled: audioTrack.enabled,
          readyState: audioTrack.readyState,
        })
      } catch (err) {
        console.warn('[SIP] forceAttachMicTrack: addTrack failed:', err)
      }
    }
  }

  private exposeSession(session: SipSession) {
    window.__ptdtSipSession = session
    const pc = session.sessionDescriptionHandler?.peerConnection
    if (!pc) return
    window.__ptdtSipPeerConnection = pc
  }

  private logPeerConnectionState(session: SipSession, reason: string) {
    const pc = session.sessionDescriptionHandler?.peerConnection
    if (!pc) {
      console.warn('[SIP] logPeerConnectionState: no PC yet for', reason)
      return
    }

    window.__ptdtSipPeerConnection = pc

    sipDebugInfo('[SIP] PeerConnection state [' + reason + ']:', {
      connectionState: pc.connectionState,
      iceConnectionState: pc.iceConnectionState,
      iceGatheringState: pc.iceGatheringState,
      signalingState: pc.signalingState,
      senders: pc.getSenders().map(sender => ({
        kind: sender.track?.kind,
        label: sender.track?.label,
        enabled: sender.track?.enabled,
        muted: sender.track?.muted,
        readyState: sender.track?.readyState,
      })),
      receivers: pc.getReceivers().map(receiver => ({
        kind: receiver.track?.kind,
        muted: receiver.track?.muted,
        readyState: receiver.track?.readyState,
      })),
    })
  }

  // ---------------------------------------------------------------------------
  // attachRemoteMedia — incoming audio ko play karo.
  // audio.muted = true + play() + unmute trick:
  // Chromium autoplay policy ko bypass karta hai even if commandLine switch
  // kisi wajah se kaam na kare. Double safety.
  // ---------------------------------------------------------------------------
  private attachRemoteMedia(session: SipSession) {
    const pc = session.sessionDescriptionHandler?.peerConnection
    if (!pc) return

    window.__ptdtSipPeerConnection = pc

    const audio = this.ensureRemoteAudioElement()

    if (this.remoteTrackListener) {
      pc.removeEventListener('track', this.remoteTrackListener as EventListener)
    }

    const applyStream = () => {
      const stream = new MediaStream()

      pc.getReceivers().forEach(receiver => {
        if (receiver.track?.kind === 'audio') {
          stream.addTrack(receiver.track)
        }
      })

      if (stream.getAudioTracks().length === 0) {
        sipDebugInfo('[SIP] attachRemoteMedia: no audio tracks yet')
        return
      }

      sipDebugInfo('[SIP] attachRemoteMedia: attaching', stream.getAudioTracks().length, 'audio track(s)')

      audio.srcObject = stream
      audio.volume = 1

      // Autoplay bypass: muted se start karo, play() ke baad unmute karo.
      // Ye trick Chromium policy ko fool karti hai even without commandLine flag.
      audio.muted = true
      void audio.play().then(() => {
        audio.muted = false
        sipDebugInfo('[SIP] attachRemoteMedia: audio playing (unmuted)')
      }).catch((err) => {
        console.warn('[SIP] audio.play() failed:', err)
        // Last resort: user gesture ke baad try karo
        const resume = () => {
          void audio.play().then(() => { audio.muted = false })
          document.removeEventListener('click', resume)
          document.removeEventListener('keydown', resume)
        }
        document.addEventListener('click', resume, { once: true })
        document.addEventListener('keydown', resume, { once: true })
      })

      void this.applyAudioOutputDevice(audio).catch((err) => {
        const message = err instanceof Error ? err.message : 'Audio output switch failed'
        this.handlers.onError?.(message)
      })
    }

    this.remoteTrackListener = (event: RTCTrackEvent) => {
      sipDebugInfo('[SIP] track event received:', event.track?.kind)
      applyStream()
    }

    pc.addEventListener('track', this.remoteTrackListener as EventListener)

    applyStream()
    window.setTimeout(() => applyStream(), 1000)
  }

  private ensureRemoteAudioElement() {
    let audio = document.getElementById('ptdt-sip-remote-audio') as HTMLAudioElement | null
    if (!audio) {
      audio = document.createElement('audio')
      audio.id = 'ptdt-sip-remote-audio'
      audio.autoplay = true
      audio.controls = false
      audio.muted = false
      audio.volume = 1
      ;(audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true
      audio.style.display = 'none'
      document.body.appendChild(audio)
    }

    return audio
  }

  private async applyAudioOutputDevice(audio: HTMLAudioElement) {
    const audioWithSink = audio as HTMLAudioElement & {
      setSinkId?: (sinkId: string) => Promise<void>
    }

    if (typeof audioWithSink.setSinkId !== 'function') {
      if (this.audioOutputDeviceId !== 'default') {
        throw new Error('Speaker selection is not supported in this Electron/Chromium runtime.')
      }
      return
    }

    const sinkId = this.audioOutputDeviceId === 'default' ? '' : this.audioOutputDeviceId
    await audioWithSink.setSinkId(sinkId)
  }
}

export const sipClient = new SipClient()
