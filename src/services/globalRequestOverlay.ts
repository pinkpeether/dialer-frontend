export type GlobalRequestOverlayPhase = 'idle' | 'working' | 'success'

export type GlobalRequestOverlaySnapshot = {
  visible: boolean
  phase: GlobalRequestOverlayPhase
  message: string
  detail: string
}

type OverlayOptions = {
  message?: string
  followupMessage?: string
  successMessage?: string
  detail?: string
  delayMs?: number
}

type ActiveRequest = Required<Pick<OverlayOptions, 'message' | 'followupMessage' | 'successMessage' | 'detail'>>

const listeners = new Set<() => void>()
const requests = new Map<number, ActiveRequest>()

let nextId = 1
let showTimer: number | null = null
let followupTimer: number | null = null
let successTimer: number | null = null

let snapshot: GlobalRequestOverlaySnapshot = {
  visible: false,
  phase: 'idle',
  message: '',
  detail: '',
}

const defaultOptions: ActiveRequest = {
  message: 'Loading data...',
  followupMessage: 'Almost done...',
  successMessage: 'Success',
  detail: 'Please wait while PTDT completes this backend request.',
}

const emit = () => listeners.forEach(listener => listener())

const setSnapshot = (next: GlobalRequestOverlaySnapshot) => {
  snapshot = next
  emit()
}

const clearTimer = (timer: number | null) => {
  if (timer) window.clearTimeout(timer)
}

const latestRequest = () => Array.from(requests.values()).at(-1) || defaultOptions

const showWorking = () => {
  const request = latestRequest()
  setSnapshot({
    visible: true,
    phase: 'working',
    message: request.message,
    detail: request.detail,
  })
  followupTimer = window.setTimeout(() => {
    const current = latestRequest()
    if (!requests.size || snapshot.phase !== 'working') return
    setSnapshot({
      visible: true,
      phase: 'working',
      message: current.followupMessage,
      detail: current.detail,
    })
  }, 900)
}

export const beginGlobalRequestOverlay = (options: OverlayOptions = {}) => {
  const id = nextId++
  const request = { ...defaultOptions, ...options }

  clearTimer(successTimer)
  successTimer = null
  requests.set(id, request)

  if (snapshot.visible && snapshot.phase === 'working') {
    setSnapshot({
      visible: true,
      phase: 'working',
      message: request.message,
      detail: request.detail,
    })
  } else if (!showTimer) {
    showTimer = window.setTimeout(() => {
      showTimer = null
      if (requests.size) showWorking()
    }, options.delayMs ?? 420)
  }

  return id
}

export const endGlobalRequestOverlay = (id?: number | null, successful = true) => {
  if (!id || !requests.has(id)) return

  const request = requests.get(id) || defaultOptions
  requests.delete(id)

  if (requests.size) {
    const current = latestRequest()
    if (snapshot.visible && snapshot.phase === 'working') {
      setSnapshot({
        visible: true,
        phase: 'working',
        message: current.message,
        detail: current.detail,
      })
    }
    return
  }

  clearTimer(showTimer)
  clearTimer(followupTimer)
  showTimer = null
  followupTimer = null

  if (!snapshot.visible) {
    setSnapshot({ visible: false, phase: 'idle', message: '', detail: '' })
    return
  }

  if (!successful) {
    setSnapshot({ visible: false, phase: 'idle', message: '', detail: '' })
    return
  }

  setSnapshot({
    visible: true,
    phase: 'success',
    message: request.successMessage,
    detail: 'The request completed successfully.',
  })
  successTimer = window.setTimeout(() => {
    setSnapshot({ visible: false, phase: 'idle', message: '', detail: '' })
    successTimer = null
  }, 560)
}

export const getGlobalRequestOverlaySnapshot = () => snapshot

export const subscribeGlobalRequestOverlay = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
