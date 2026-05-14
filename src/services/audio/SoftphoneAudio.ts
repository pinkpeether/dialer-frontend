type ToneWave = 'sine' | 'square' | 'sawtooth' | 'triangle'

type ToneOptions = {
  durationMs?: number
  volume?: number
  type?: ToneWave
  outputDeviceId?: string
}

const DTMF_FREQUENCIES: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
}

class SoftphoneAudio {
  private audioContext: AudioContext | null = null
  private activeToneElements = new Set<HTMLAudioElement>()

  private getContext() {
    const Ctx = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext
    }).webkitAudioContext

    if (!Ctx) throw new Error('Web Audio API is not supported in this runtime.')

    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new Ctx()
    }

    return this.audioContext
  }

  private async resumeContext(ctx: AudioContext) {
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
  }

  private async setElementSink(audio: HTMLAudioElement, outputDeviceId?: string) {
    const normalized = outputDeviceId && outputDeviceId !== 'default' ? outputDeviceId : ''
    const audioWithSink = audio as HTMLAudioElement & {
      setSinkId?: (sinkId: string) => Promise<void>
    }

    if (normalized && typeof audioWithSink.setSinkId !== 'function') {
      throw new Error('Audio output routing is not supported in this Electron/Chromium runtime.')
    }

    if (typeof audioWithSink.setSinkId === 'function') {
      await audioWithSink.setSinkId(normalized)
    }
  }

  async playTone(
    frequencies: number | number[],
    options: ToneOptions = {},
  ) {
    if (typeof window === 'undefined') return

    const ctx = this.getContext()
    await this.resumeContext(ctx)

    const durationMs = Math.max(40, options.durationMs ?? 140)
    const volume = Math.min(Math.max(options.volume ?? 0.08, 0), 0.45)
    const type = options.type ?? 'sine'
    const freqs = Array.isArray(frequencies) ? frequencies : [frequencies]

    const destination = ctx.createMediaStreamDestination()
    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.0001, ctx.currentTime)
    masterGain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.015)
    masterGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000)
    masterGain.connect(destination)

    const oscillators = freqs.map((frequency) => {
      const oscillator = ctx.createOscillator()
      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
      oscillator.connect(masterGain)
      oscillator.start()
      oscillator.stop(ctx.currentTime + durationMs / 1000 + 0.02)
      return oscillator
    })

    const audio = document.createElement('audio')
    audio.autoplay = true
    audio.volume = 1
    audio.style.display = 'none'
    ;(audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true
    audio.srcObject = destination.stream

    document.body.appendChild(audio)
    this.activeToneElements.add(audio)

    try {
      await this.setElementSink(audio, options.outputDeviceId)
      await audio.play()
    } catch {
      // Keep tone failures non-blocking; call control should not fail because UI audio failed.
    }

    window.setTimeout(() => {
      oscillators.forEach((oscillator) => {
        try { oscillator.disconnect() } catch { /* noop */ }
      })
      try { masterGain.disconnect() } catch { /* noop */ }
      try { audio.pause() } catch { /* noop */ }
      audio.srcObject = null
      audio.remove()
      this.activeToneElements.delete(audio)
    }, durationMs + 160)
  }

  async playDtmf(digit: string, outputDeviceId?: string) {
    const frequencies = DTMF_FREQUENCIES[digit]
    if (!frequencies) return
    await this.playTone(frequencies, {
      durationMs: 105,
      volume: 0.075,
      type: 'sine',
      outputDeviceId,
    })
  }

  async playConnected(outputDeviceId?: string) {
    await this.playTone([880, 1320], {
      durationMs: 115,
      volume: 0.075,
      outputDeviceId,
    })
  }

  async playFailed(outputDeviceId?: string) {
    await this.playTone(220, { durationMs: 110, volume: 0.08, outputDeviceId })
    window.setTimeout(() => { void this.playTone(180, { durationMs: 120, volume: 0.08, outputDeviceId }) }, 135)
  }

  async playHangup(outputDeviceId?: string) {
    await this.playTone(420, { durationMs: 80, volume: 0.07, outputDeviceId })
    window.setTimeout(() => { void this.playTone(260, { durationMs: 95, volume: 0.07, outputDeviceId }) }, 95)
  }

  async playTestTone(outputDeviceId?: string) {
    await this.playTone([660, 990], {
      durationMs: 260,
      volume: 0.12,
      outputDeviceId,
    })
  }

  startRingback(outputDeviceId?: string) {
    let stopped = false
    let intervalId: ReturnType<typeof window.setInterval> | null = null

    const pulse = () => {
      if (stopped) return
      void this.playTone([440, 480], {
        durationMs: 950,
        volume: 0.055,
        outputDeviceId,
      })
    }

    pulse()
    intervalId = window.setInterval(pulse, 3000)

    return () => {
      stopped = true
      if (intervalId) window.clearInterval(intervalId)
    }
  }
}

export const softphoneAudio = new SoftphoneAudio()
