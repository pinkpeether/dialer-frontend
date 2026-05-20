import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  push: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))

    const duration = toast.duration ?? 3800
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }))
    }, duration)
  },

  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }))
  },
}))

export function useToast() {
  const push = useToastStore((state) => state.push)

  return {
    success: (message: string, duration?: number) => push({ type: 'success', message, duration }),
    error: (message: string, duration?: number) => push({ type: 'error', message, duration }),
    info: (message: string, duration?: number) => push({ type: 'info', message, duration }),
    warning: (message: string, duration?: number) => push({ type: 'warning', message, duration }),
  }
}
