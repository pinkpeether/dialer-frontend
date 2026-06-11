import { useEffect, useState } from 'react'
import PtdtDialog from './PtdtDialog'

export default function PtdtBusyOverlay({ active, label = 'Applying changes' }: { active: boolean; label?: string }) {
  const [step, setStep] = useState(1)
  const silentRefresh = label === 'Refreshing commercial control data' || label === 'Refreshing administration data'

  useEffect(() => {
    if (!active) return undefined
    const timer = window.setInterval(() => setStep(current => current >= 3 ? 1 : current + 1), 450)
    return () => window.clearInterval(timer)
  }, [active])

  if (!active || silentRefresh) return null
  const dots = step === 1 ? '.' : step === 2 ? '..' : '...'
  return <PtdtDialog dialog={{ tone: 'success', title: 'Processing', message: `${label}${dots}` }} onClose={() => undefined} />
}
