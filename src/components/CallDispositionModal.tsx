import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PhoneCall, X } from 'lucide-react'
import DispositionPanel, { type DispositionSubmitPayload, type DispositionValue } from './DispositionPanel'
import { callsAPI } from '../api/calls.api'
import { useToast } from '../hooks/useToast'

interface CallDispositionModalProps {
  open: boolean
  callId: number | string | null
  contactId?: number | null      // 12B — contact to update
  contactName?: string | null
  contactNumber?: string | null
  defaultDisposition?: DispositionValue | null
  defaultNotes?: string | null
  defaultCallbackAt?: string | null
  saveMode?: 'backend' | 'preview'
  helperText?: string | null
  onClose: () => void
  onSaved?: () => void
}

export default function CallDispositionModal({
  open,
  callId,
  contactName,
  contactNumber,
  defaultDisposition,
  defaultNotes,
  defaultCallbackAt,
  saveMode = 'backend',
  helperText,
  onClose,
  onSaved,
}: CallDispositionModalProps) {
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => setError(null), 0)
    return () => window.clearTimeout(timer)
  }, [open, callId, saveMode])

  useEffect(() => {
    if (!open) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) return
      event.preventDefault()
      onClose()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open || saveMode === 'preview' || callId === null || callId === undefined || callId === '') return null

  const handleSubmit = async (payload: DispositionSubmitPayload) => {
    setError(null)

    try {
      // Backend owns contact status updates and callback scheduling for CALLBACK dispositions.
      await callsAPI.updateDisposition(callId, {
        disposition: payload.disposition,
        notes: payload.notes,
        callbackAt: payload.callbackAt,
      })

      toast.success(
        payload.disposition === 'CALLBACK' && payload.callbackAt
          ? `Disposition saved and callback scheduled for ${new Date(payload.callbackAt).toLocaleString()}`
          : 'Disposition saved'
      )
      onSaved?.()
      onClose()
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : 'Failed to save call disposition. Please try again.'
      setError(msg)
      toast.error(msg)
    }
  }

  const title = contactName || contactNumber || `Call #${callId}`
  const subtitle = contactName && contactNumber ? contactNumber : ''

  return (
    <AnimatePresence>
      <motion.div
        key="ptdt-call-disposition-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 10030,
          background: 'rgba(3,2,8,0.62)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 18,
        }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        <motion.div
          initial={{ y: 32, scale: 0.94, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 24, scale: 0.96, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 32 }}
          style={{
            width: 'min(520px, 96vw)',
            maxHeight: 'min(780px, 94vh)',
            borderRadius: 30,
            background: `
              radial-gradient(circle at 16% 0%,rgba(251,11,140,0.24),transparent 36%),
              radial-gradient(circle at 88% 8%,rgba(0,245,160,0.18),transparent 34%),
              linear-gradient(150deg,rgba(8,5,18,0.98),rgba(16,10,30,0.97))
            `,
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 34px 90px rgba(0,0,0,0.62),0 0 70px rgba(251,11,140,0.18)',
            overflow: 'hidden',
            color: '#f9f7ff',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 14,
                background: 'linear-gradient(145deg,rgba(251,11,140,0.25),rgba(0,245,160,0.12))',
                border: '1px solid rgba(255,255,255,0.11)',
                display: 'grid', placeItems: 'center',
                boxShadow: '0 0 20px rgba(251,11,140,0.20)',
                flexShrink: 0,
              }}>
                <PhoneCall size={18} color="#fff" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 0.2, color: '#fff' }}>
                  Disposition for call
                </div>
                <div style={{
                  fontSize: 12, color: 'rgba(249,247,255,0.68)', marginTop: 2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {title}{subtitle ? ` - ${subtitle}` : ''}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff', cursor: 'pointer',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div style={{
            padding: 16,
            maxHeight: 'calc(min(780px,94vh) - 64px)',
            overflowY: 'auto',
          }}>
            {helperText && (
              <div style={{
                marginBottom: 12, padding: '10px 12px', borderRadius: 16,
                border: '1px solid rgba(34,211,238,0.34)',
                background: 'rgba(34,211,238,0.09)',
                color: '#d8fbff', fontSize: 11.5, fontWeight: 750, lineHeight: 1.45,
              }}>
                {helperText}
              </div>
            )}

            <DispositionPanel
              defaultDisposition={defaultDisposition}
              defaultNotes={defaultNotes}
              defaultCallbackAt={defaultCallbackAt}
              onSubmit={handleSubmit}
            />

            {error && (
              <div style={{
                marginTop: 10, padding: '9px 10px', borderRadius: 14,
                border: '1px solid rgba(255,59,95,0.44)',
                background: 'rgba(255,59,95,0.10)',
                color: '#ff9caf', fontSize: 11, fontWeight: 800, lineHeight: 1.45,
              }}>
                {error}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
