import { useRef, useState, type MouseEvent } from 'react'
import TeamUsersV3 from './TeamUsersV3'

export default function TeamUsersGuarded() {
  const [showFinal, setShowFinal] = useState(false)
  const [armed, setArmed] = useState(false)
  const targetRef = useRef<HTMLButtonElement | null>(null)

  const handleCapture = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    const button = target?.closest('button') as HTMLButtonElement | null
    if (!button) return
    if (button.textContent?.trim() !== 'Confirm cleanup') return
    if (armed) {
      setArmed(false)
      return
    }
    event.preventDefault()
    event.stopPropagation()
    targetRef.current = button
    setShowFinal(true)
  }

  const confirmFinal = () => {
    setShowFinal(false)
    setArmed(true)
    window.setTimeout(() => targetRef.current?.click(), 30)
  }

  return (
    <div onClickCapture={handleCapture}>
      {showFinal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(10,10,15,.55)', display: 'grid', placeItems: 'center', padding: 18 }}>
          <div className="glass" style={{ width: 'min(520px, 100%)', padding: 24, borderColor: 'rgba(239,68,68,.38)' }}>
            <div className="eyebrow pink">Final Confirmation</div>
            <h3 style={{ margin: '10px 0', color: 'var(--danger)' }}>Please confirm one more time</h3>
            <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>This is the last confirmation before the selected test/orphan user is cleared.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button type="button" className="ptdt-action-btn" onClick={() => setShowFinal(false)}>Cancel</button>
              <button type="button" className="ptdt-action-btn danger" onClick={confirmFinal}>Yes, continue</button>
            </div>
          </div>
        </div>
      )}
      <TeamUsersV3 />
    </div>
  )
}
