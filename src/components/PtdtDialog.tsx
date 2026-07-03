import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ShieldCheck } from 'lucide-react'

export type PtdtDialogState = {
  tone: 'error' | 'confirm' | 'success'
  title: string
  message: string
  confirmLabel?: string
  onConfirm?: () => void | Promise<void>
}

const colorForTone = (tone: PtdtDialogState['tone']) => {
  if (tone === 'error') return '#ef4444'
  if (tone === 'success') return '#00a747'
  return '#fb0b8c'
}

export default function PtdtDialog({ dialog, onClose }: { dialog: PtdtDialogState | null; onClose: () => void }) {
  useEffect(() => {
    if (!dialog) return undefined

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) return
      event.preventDefault()
      onClose()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [dialog, onClose])

  if (!dialog) return null
  const accent = colorForTone(dialog.tone)

  return (
    <AnimatePresence>
      <motion.div
        data-ptdt-dialog-open="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(9,10,18,.58)',
          backdropFilter: 'blur(10px)',
          display: 'grid',
          placeItems: 'center',
          padding: 18,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          className="glass"
          style={{
            width: 'min(520px, 100%)',
            borderRadius: 24,
            padding: 24,
            border: `1px solid ${accent}55`,
            boxShadow: `0 24px 80px ${accent}22`,
          }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: `${accent}18`,
              border: `1px solid ${accent}44`,
              display: 'grid',
              placeItems: 'center',
              color: accent,
            }}>
              {dialog.tone === 'success' ? <ShieldCheck size={21} /> : <AlertTriangle size={21} />}
            </div>
            <div style={{ flex: 1 }}>
              <div className="eyebrow pink" style={{ marginBottom: 8 }}>PTDT-Dialer Notice</div>
              <h3 style={{ margin: 0, fontSize: 21, fontWeight: 950, color: 'var(--text)', letterSpacing: '-.03em' }}>{dialog.title}</h3>
              <p style={{ margin: '10px 0 0', color: 'var(--text-2)', fontSize: 14.5, lineHeight: 1.55 }}>{dialog.message}</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
            {dialog.onConfirm && (
              <button type="button" onClick={onClose} style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 18px',
                color: 'var(--text-2)',
                fontWeight: 850,
                cursor: 'pointer',
              }}>
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (dialog.onConfirm) void dialog.onConfirm()
                else onClose()
              }}
              className="btn-brand"
              style={{ borderRadius: 'var(--radius-md)', padding: '10px 22px', minWidth: 108, color: '#fff' }}
            >
              {dialog.confirmLabel || 'OK'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
