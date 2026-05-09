import { useState, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileSpreadsheet, Upload, X } from 'lucide-react'

interface CsvImportModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (file: File) => void | Promise<void>
}

export default function CsvImportModal({ open, onClose, onSubmit }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] || null)
  }

  const handleSubmit = async () => {
    if (!file || submitting) return
    setSubmitting(true)
    try {
      await onSubmit(file)
      setFile(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(5,4,11,0.52)',
            backdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            className="glass-hi"
            style={{ width: '100%', maxWidth: 460, padding: 24, position: 'relative' }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 34,
                height: 34,
                borderRadius: '50%',
                border: '1px solid var(--border)',
                background: 'var(--bg-glass)',
                color: 'var(--text-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 15,
                background: 'var(--grad-brand)',
                boxShadow: 'var(--shadow-pink)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <div className="display" style={{ fontSize: 19, fontWeight: 900, color: 'var(--text)' }}>
                  Import Contacts CSV
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 3 }}>
                  PTDT-DIALER CONTACT PIPELINE
                </div>
              </div>
            </div>

            <label
              style={{
                display: 'block',
                padding: 22,
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed rgba(251,11,140,0.42)',
                background: 'linear-gradient(135deg, rgba(251,11,140,0.08), rgba(128,87,215,0.06))',
                color: 'var(--text-3)',
                cursor: 'pointer',
                marginBottom: 18,
                textAlign: 'center',
              }}
            >
              <Upload size={26} color="var(--pink)" style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                {file ? file.name : 'Choose CSV file'}
              </div>
              <div style={{ fontSize: 12.5 }}>
                Supported columns: name, phone, email, company, notes
              </div>
              <input type="file" accept=".csv,text/csv" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  minHeight: 42,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-glass)',
                  color: 'var(--text-3)',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!file || submitting}
                className="btn-brand"
                style={{ flex: 1, minHeight: 42, borderRadius: 'var(--radius-md)', opacity: !file || submitting ? 0.55 : 1 }}
              >
                {submitting ? 'Uploading…' : 'Upload CSV'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
