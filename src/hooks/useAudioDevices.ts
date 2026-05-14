import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface AudioOutputDevice {
  deviceId: string
  label: string
  kind: 'audiooutput'
}

export interface AudioInputDevice {
  deviceId: string
  label: string
  kind: 'audioinput'
}

const DEFAULT_OUTPUT: AudioOutputDevice = {
  deviceId: 'default',
  label: 'Default System Output',
  kind: 'audiooutput',
}

const DEFAULT_INPUT: AudioInputDevice = {
  deviceId: 'default',
  label: 'Default Microphone',
  kind: 'audioinput',
}

export function canSelectAudioOutput() {
  if (typeof HTMLMediaElement === 'undefined') return false
  return 'setSinkId' in HTMLMediaElement.prototype
}

export function useAudioDevices(enabled = true) {
  const [audioOutputs, setAudioOutputs] = useState<AudioOutputDevice[]>([DEFAULT_OUTPUT])
  const [audioInputs, setAudioInputs] = useState<AudioInputDevice[]>([DEFAULT_INPUT])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionGranted, setPermissionGranted] = useState(false)

  const supported = useMemo(() => {
    return Boolean(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.enumerateDevices === 'function'
    )
  }, [])

  const refresh = useCallback(async () => {
    if (!supported) {
      setAudioOutputs([DEFAULT_OUTPUT])
      setAudioInputs([DEFAULT_INPUT])
      setError('Audio device listing is not supported in this runtime.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()

      const outputs = devices
        .filter((device): device is MediaDeviceInfo => device.kind === 'audiooutput')
        .map((device, index) => ({
          deviceId: device.deviceId || `output-${index}`,
          label: device.label || `Audio Output ${index + 1}`,
          kind: 'audiooutput' as const,
        }))

      const inputs = devices
        .filter((device): device is MediaDeviceInfo => device.kind === 'audioinput')
        .map((device, index) => ({
          deviceId: device.deviceId || `input-${index}`,
          label: device.label || `Microphone ${index + 1}`,
          kind: 'audioinput' as const,
        }))

      const hasDefaultOutput = outputs.some(device => device.deviceId === 'default')
      const hasDefaultInput = inputs.some(device => device.deviceId === 'default')

      setAudioOutputs(hasDefaultOutput ? outputs : [DEFAULT_OUTPUT, ...outputs])
      setAudioInputs(hasDefaultInput ? inputs : [DEFAULT_INPUT, ...inputs])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load audio devices.'
      setAudioOutputs([DEFAULT_OUTPUT])
      setAudioInputs([DEFAULT_INPUT])
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [supported])

  const requestAudioPermission = useCallback(async () => {
    if (!supported || typeof navigator.mediaDevices.getUserMedia !== 'function') return false

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      stream.getTracks().forEach(track => track.stop())
      setPermissionGranted(true)
      await refresh()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Microphone permission was denied.'
      setPermissionGranted(false)
      setError(message)
      return false
    }
  }, [refresh, supported])

  useEffect(() => {
    if (!enabled) return
    void refresh()
  }, [enabled, refresh])

  useEffect(() => {
    if (!enabled || !supported) return

    navigator.mediaDevices.addEventListener?.('devicechange', refresh)
    return () => {
      navigator.mediaDevices.removeEventListener?.('devicechange', refresh)
    }
  }, [enabled, supported, refresh])

  return {
    audioOutputs,
    audioInputs,
    loading,
    error,
    refresh,
    requestAudioPermission,
    permissionGranted,
    supported,
    canSelectOutput: canSelectAudioOutput(),
  }
}

export function useMicrophoneMeter(deviceId: string, enabled = false) {
  const [level, setLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const animationRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const contextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    let cancelled = false

    const stop = () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
      if (contextRef.current && contextRef.current.state !== 'closed') {
        void contextRef.current.close().catch(() => undefined)
      }
      contextRef.current = null
      setLevel(0)
    }

    const start = async () => {
      if (!enabled || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setLevel(0)
        return
      }

      try {
        setError(null)
        const audio: boolean | MediaTrackConstraints = deviceId && deviceId !== 'default'
          ? { deviceId: { exact: deviceId } }
          : true

        const stream = await navigator.mediaDevices.getUserMedia({ audio, video: false })
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop())
          return
        }

        streamRef.current = stream
        const Ctx = window.AudioContext || (window as typeof window & {
          webkitAudioContext?: typeof AudioContext
        }).webkitAudioContext

        if (!Ctx) throw new Error('AudioContext is not supported.')

        const context = new Ctx()
        contextRef.current = context
        const source = context.createMediaStreamSource(stream)
        const analyser = context.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)

        const data = new Uint8Array(analyser.frequencyBinCount)
        const tick = () => {
          analyser.getByteTimeDomainData(data)
          let sum = 0
          for (const sample of data) {
            const normalized = (sample - 128) / 128
            sum += normalized * normalized
          }
          const rms = Math.sqrt(sum / data.length)
          setLevel(Math.min(1, rms * 5.5))
          animationRef.current = requestAnimationFrame(tick)
        }

        tick()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not start microphone meter.'
        setError(message)
        setLevel(0)
      }
    }

    void start()

    return () => {
      cancelled = true
      stop()
    }
  }, [deviceId, enabled])

  return { level, error }
}
