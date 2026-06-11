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
  const text = label + ' ' + dots

  return <div className="glass" style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.56)', fontWeight: 900 }}>{text}</div>
}
