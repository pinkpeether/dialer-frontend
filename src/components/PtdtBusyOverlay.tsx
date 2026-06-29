import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function PtdtBusyOverlay({ active, label = 'Loading data' }: { active: boolean; label?: string }) {
  const [step, setStep] = useState(1)
  const silentRefresh = label === 'Refreshing commercial control data' || label === 'Refreshing administration data'

  useEffect(() => {
    if (!active) return undefined
    const timer = window.setInterval(() => setStep(current => current >= 3 ? 1 : current + 1), 450)
    return () => window.clearInterval(timer)
  }, [active])

  if (!active || silentRefresh) return null

  const dots = step === 1 ? '.' : step === 2 ? '..' : '...'
  const displayLabel = label.toLowerCase().includes('loading') ? label : 'Loading data'

  return (
    <div
      data-ptdt-modal-open="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10050,
        display: 'grid',
        placeItems: 'center',
        padding: 18,
        background: 'rgba(3, 2, 8, 0.42)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <style>{`
        @keyframes ptdtBusySpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ptdtBusyPulse {
          0%, 100% { transform: scale(.94); opacity: .7; }
          50% { transform: scale(1.08); opacity: 1; }
        }
      `}</style>
      <div
        className="glass-hi"
        style={{
          width: 'min(430px, calc(100vw - 32px))',
          minHeight: 270,
          borderRadius: 30,
          padding: '34px 26px',
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          border: '1px solid rgba(0,167,71,.34)',
          boxShadow: '0 28px 90px rgba(15,23,42,.26)',
        }}
      >
        <div>
          <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 18px' }}>
            <div style={{
              position: 'absolute',
              inset: 8,
              borderRadius: '50%',
              border: '5px solid rgba(251,11,140,.18)',
              borderTopColor: 'var(--green-2)',
              animation: 'ptdtBusySpin 1s linear infinite',
            }} />
            <div style={{
              position: 'absolute',
              inset: 30,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(255,255,255,.74)',
              boxShadow: '0 10px 28px rgba(15,23,42,.12)',
              animation: 'ptdtBusyPulse 1.25s ease-in-out infinite',
            }}>
              <RefreshCw size={22} color="var(--green-2)" />
            </div>
          </div>

          <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 32, fontWeight: 950, letterSpacing: '-.04em' }}>
            {displayLabel}{dots}
          </h2>
          <p style={{ margin: '12px auto 0', color: 'var(--text-2)', fontSize: 15.5, lineHeight: 1.5, maxWidth: 330 }}>
            Please wait while PTDT completes this request.
          </p>
        </div>
      </div>
    </div>
  )
}
