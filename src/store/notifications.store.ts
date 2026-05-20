import { create } from 'zustand'

export type NotificationType = 'callback_due' | 'missed_call' | 'dnc_flag' | 'campaign_complete' | 'info'

export type AppNotification = {
  id: string
  type: NotificationType
  title: string
  body: string
  timestamp: number
  read: boolean
  link?: string   // optional nav target e.g. '/callbacks'
}

interface NotificationsStore {
  notifications: AppNotification[]
  unreadCount: number
  add: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  dismiss: (id: string) => void
  clearAll: () => void
}

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  notifications: [],
  unreadCount: 0,

  add: (n) => {
    const notification: AppNotification = {
      ...n,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      read: false,
    }
    set(state => ({
      notifications: [notification, ...state.notifications].slice(0, 80),
      unreadCount: state.unreadCount + 1,
    }))
  },

  markRead: (id) => {
    set(state => {
      const notifications = state.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      )
      return { notifications, unreadCount: notifications.filter(n => !n.read).length }
    })
  },

  markAllRead: () => {
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },

  dismiss: (id) => {
    set(state => {
      const notifications = state.notifications.filter(n => n.id !== id)
      return { notifications, unreadCount: notifications.filter(n => !n.read).length }
    })
  },

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}))
