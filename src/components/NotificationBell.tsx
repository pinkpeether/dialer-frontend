import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Calendar, CheckCircle2, Info, PhoneMissed, ShieldOff, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNotificationsStore, type AppNotification, type NotificationType } from '../store/notifications.store'
import { useSocket } from '../hooks/useSocket'

const TYPE_META: Record<NotificationType, { icon: typeof Bell; color: string }> = {
  callback_due:       { icon: Calendar,     color: '#f0b90b' },
  missed_call:        { icon: PhoneMissed,  color: '#ef4444' },
  dnc_flag:           { icon: ShieldOff,    color: '#8057d7' },
  campaign_complete:  { icon: CheckCircle2, color: '#00a747' },
  info:               { icon: Info,         color: 'var(--text-3)' },
}

const timeAgo = (ts: number) => {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { notifications, unreadCount, add, markRead, markAllRead, dismiss } = useNotificationsStore()
  const { on, off } = useSocket()

  // Subscribe to socket notification events
  useEffect(() => {
    const handlers: Array<{ event: string; fn: (...args: unknown[]) => void }> = [
      {
        event: 'callback:due',
        fn: (data: unknown) => {
          const d = data as Record<string, unknown>
          add({
            type: 'callback_due',
            title: 'Callback Due',
            body: `${String(d.contactName || 'A contact')} is due for a callback now.`,
            link: '/callbacks',
          })
        },
      },
      {
        event: 'call:missed',
        fn: (data: unknown) => {
          const d = data as Record<string, unknown>
          add({
            type: 'missed_call',
            title: 'Missed Call',
            body: `Missed call from ${String(d.from || d.remoteNumber || 'Unknown')}`,
            link: '/calls',
          })
        },
      },
      {
        event: 'contact:dnc',
        fn: (data: unknown) => {
          const d = data as Record<string, unknown>
          add({
            type: 'dnc_flag',
            title: 'DNC Flagged',
            body: `${String(d.name || d.phone || 'A contact')} was added to DNC.`,
            link: '/contacts',
          })
        },
      },
      {
        event: 'campaign:completed',
        fn: (data: unknown) => {
          const d = data as Record<string, unknown>
          add({
            type: 'campaign_complete',
            title: 'Campaign Completed',
            body: `Campaign "${String(d.name || 'Unknown')}" has completed.`,
            link: '/campaigns',
          })
        },
      },
    ]

    const cleanups = handlers.map(h => {
      const cleanup = on(h.event, h.fn)
      return () => { cleanup?.(); off(h.event, h.fn) }
    })

    return () => cleanups.forEach(c => c())
  }, [on, off, add])

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleClick = (n: AppNotification) => {
    markRead(n.id)
    if (n.link) navigate(n.link)
    setOpen(false)
  }

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        style={{
          position: 'relative',
          width: 38, height: 38,
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: open ? 'rgba(251,11,140,0.10)' : 'var(--bg-glass)',
          color: open ? 'var(--pink)' : 'var(--text-3)',
          display: 'grid', placeItems: 'center',
          cursor: 'pointer',
          transition: 'all 0.18s',
        }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -4, right: -4,
            minWidth: 18, height: 18,
            borderRadius: 999,
            background: 'var(--pink)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
            boxShadow: '0 0 12px rgba(251,11,140,0.50)',
            border: '2px solid var(--surface)',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 10px)',
              width: 'min(360px, calc(100vw - 32px))',
              maxHeight: 'min(420px, calc(100vh - 150px))',
              overflowY: 'auto',
              borderRadius: 22,
              background: 'var(--bg-glass-hi)',
              border: '1px solid var(--border)',
              boxShadow: '0 24px 60px rgba(15,23,42,0.18), 0 0 24px rgba(251,11,140,0.10)',
              zIndex: 10050,
            }}
          >
            {/* Header */}
            <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-glass-hi)', backdropFilter: 'blur(8px)', zIndex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)' }}>Notifications</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {unreadCount > 0 && (
                  <button type="button" onClick={markAllRead} style={{ fontSize: 10.5, color: 'var(--pink)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800 }}>
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Items */}
            {notifications.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                No notifications yet
              </div>
            ) : notifications.map(n => {
              const meta = TYPE_META[n.type] || TYPE_META.info
              const Icon = meta.icon
              return (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    padding: '12px 14px',
                    cursor: n.link ? 'pointer' : 'default',
                    borderBottom: '1px solid var(--border-soft)',
                    background: n.read ? 'transparent' : 'rgba(251,11,140,0.05)',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: `${meta.color}22`, border: `1px solid ${meta.color}44`, display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 2 }}>
                    <Icon size={14} color={meta.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ fontSize: 12.5, fontWeight: n.read ? 600 : 900, color: 'var(--text)' }}>{n.title}</div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); dismiss(n.id) }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0, flexShrink: 0, display: 'grid', placeItems: 'center' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{timeAgo(n.timestamp)}</div>
                  </div>
                  {!n.read && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--pink)', flexShrink: 0, marginTop: 6, boxShadow: '0 0 8px rgba(251,11,140,0.60)' }} />
                  )}
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
