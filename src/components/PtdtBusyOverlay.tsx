import { useEffect, useState } from 'react'

export default function PtdtBusyOverlay({ active, label = 'Applying changes' }: { active: boolean; label?: string }) {
  const [step, setStep] = useState(1)

  useEffect(() => {
    if (!active) return undefined
    const timer = window.setInterval(() => setStep(current => current >= 3 ? 1 : current + 1), 450)
    return () => window.clearInterval(timer)
  }, [active])

  if (!active) return null
  const dots = step === 1 ? '.' : step === 2 ? '..' : '...'
  const text = label.endsWith('.') ? label : `${label}${dots}`

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9998,
      background: 'rgba(255,255,255,.56)',
      backdropFilter: 'blur(6px)',
      display: 'grid',
      placeItems: 'center',
    }}>
      <div className="glass" style={{
        padding: '22px 26px',
        borderRadius: 24,
        border: '1px solid rgba(251,11,140,.30)',
        boxShadow: '0 24px 70px rgba(251,11,140,.18)',
        color: 'var(--text)',
        fontWeight: 900,
        minWidth: 260,
        textAlign: 'center',
      }}>
        <div className="eyebrow pink" style={{ marginBottom: 6 }}>PTDT-Dialer</div>
        <div>{text}</div>
      </div>
    </div>
  )
}
