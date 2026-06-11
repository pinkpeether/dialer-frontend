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

  return (
    <div className="ptdt-loader-screen">
      <div className="glass ptdt-loader-box">
        <div className="eyebrow pink">PTDT-Dialer</div>
        <div>{label}<span className="ptdt-loader-dots">{dots}</span></div>
      </div>
    </div>
  )
}
