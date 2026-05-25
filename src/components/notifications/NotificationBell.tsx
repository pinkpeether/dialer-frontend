import { useEffect, useState } from 'react'
import { notificationsAPI } from '../../api/notifications.api'

type NotificationRow = {
  id: number
  type: string
  title: string
  body?: string | null
  readAt?: string | null
  createdAt: string
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationRow[]>([])
  const [unread, setUnread] = useState(0)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const data = await notificationsAPI.getAll({ limit: 10 })
      setItems(data?.notifications || [])
      setUnread(Number(data?.unread || 0))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    }
  }

  useEffect(() => { void load() }, [])

  const markAllRead = async () => {
    await notificationsAPI.markAllRead()
    await load()
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(previous => !previous)} style={{ position: 'relative' }}>
        Notifications
        {unread > 0 && (
          <span style={{ marginLeft: 8, background: '#fb0b8c', color: '#fff', borderRadius: 999, padding: '2px 7px', fontSize: 11, fontWeight: 900 }}>
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="glass" style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: 360, zIndex: 50, padding: 14, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <strong>Notifications</strong>
            <button onClick={() => void markAllRead()}>Mark all read</button>
          </div>

          {error && <div style={{ color: '#ef4444' }}>{error}</div>}

          {items.length === 0 ? (
            <div style={{ color: 'var(--text-3)' }}>No notifications.</div>
          ) : items.map(item => (
            <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 10, opacity: item.readAt ? 0.65 : 1 }}>
              <div style={{ fontWeight: 900 }}>{item.title}</div>
              <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{item.type}</div>
              {item.body && <div style={{ marginTop: 6, fontSize: 13 }}>{item.body}</div>}
              <div style={{ marginTop: 6, color: 'var(--text-3)', fontSize: 11 }}>{new Date(item.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
