import { useEffect, useRef, useState } from 'react'
import PtdtDialog from './PtdtDialog'

type BusyOverlayProps = {
  active: boolean
  label?: string
  detail?: string
  successLabel?: string
}

const steps = [
  'Connecting to server',
  'Validating request',
  'Applying changes',
  'Almost done',
]

export default function PtdtBusyOverlay({
  active,
  label = 'Applying changes',
  detail = 'Please wait while we contact the server.',
  successLabel,
}: BusyOverlayProps) {
  const [step, setStep] = useState(0)
  const [success, setSuccess] = useState('')
  const latestSuccess = useRef(successLabel)
  const wasActive = useRef(active)
  const silentRefresh = label === 'Refreshing commercial control data' || label === 'Refreshing administration data'

  useEffect(() => { latestSuccess.current = successLabel }, [successLabel])

  useEffect(() => {
    if (!active) return undefined
    setSuccess('')
    wasActive.current = true
    const timer = window.setInterval(() => setStep(current => current >= steps.length - 1 ? 0 : current + 1), 650)
    return () => window.clearInterval(timer)
  }, [active])

  useEffect(() => {
    if (active || !wasActive.current) return undefined
    wasActive.current = false
    if (!latestSuccess.current) return undefined
    setSuccess(latestSuccess.current)
    const timer = window.setTimeout(() => setSuccess(''), 720)
    return () => window.clearTimeout(timer)
  }, [active])

  if ((!active || silentRefresh) && !success) return null

  if (success) {
    return <PtdtDialog dialog={{ tone: 'success', title: success, message: 'Completed successfully.' }} onClose={() => setSuccess('')} />
  }

  const dots = '.'.repeat((step % 3) + 1)
  return <PtdtDialog dialog={{ tone: 'success', title: label, message: `${detail}\n${steps[step]}${dots}` }} onClose={() => undefined} />
}
