import type { ElementType } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { useToastStore, type Toast } from '../hooks/useToast'

const typeConfig: Record<
  Toast['type'],
  { color: string; bg: string; border: string; Icon: ElementType }
> = {
  success: {
    color: '#00f5a0',
    bg: 'rgba(0,245,160,0.10)',
    border: 'rgba(0,245,160,0.30)',
    Icon: CheckCircle2,
  },
  error: {
    color: '#ff3b5f',
    bg: 'rgba(255,59,95,0.12)',
    border: 'rgba(255,59,95,0.34)',
    Icon: AlertCircle,
  },
  warning: {
    color: '#f0b90b',
    bg: 'rgba(240,185,11,0.10)',
    border: 'rgba(240,185,11,0.30)',
    Icon: AlertTriangle,
  },
  info: {
    color: '#22d3ee',
    bg: 'rgba(34,211,238,0.10)',
    border: 'rgba(34,211,238,0.28)',
    Icon: Info,
  },
}

export default function ToastProvider() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const config = typeConfig[toast.type]
          const Icon = config.Icon

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                pointerEvents: 'all',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 14px 11px 12px',
                borderRadius: 999,
                background: 'linear-gradient(145deg,rgba(8,5,18,0.97),rgba(16,10,30,0.96))',
                border: `1px solid ${config.border}`,
                boxShadow: `0 14px 42px rgba(0,0,0,0.50), 0 0 32px ${config.bg}`,
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                color: '#f9f7ff',
                fontSize: 13,
                fontWeight: 700,
                minWidth: 240,
                maxWidth: 'min(480px, 90vw)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <Icon size={18} color={config.color} style={{ flexShrink: 0 }} />

              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: '#f9f7ff',
                }}
              >
                {toast.message}
              </span>

              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'rgba(249,247,255,0.45)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  flexShrink: 0,
                }}
              >
                <X size={15} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
