import PtdtOrbitLoader from './PtdtOrbitLoader'

export default function PtdtBusyOverlay({ active, label = 'Loading data' }: { active: boolean; label?: string }) {
  const silentRefresh = label === 'Refreshing commercial control data' || label === 'Refreshing administration data'

  if (!active || silentRefresh) return null

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
          <div style={{ width: 96, height: 96, margin: '0 auto 18px', display: 'grid', placeItems: 'center' }}>
            <PtdtOrbitLoader size={96} label={displayLabel} />
          </div>

          <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 32, fontWeight: 950, letterSpacing: '-.04em' }}>
            {displayLabel}
          </h2>
          <p style={{ margin: '12px auto 0', color: 'var(--text-2)', fontSize: 15.5, lineHeight: 1.5, maxWidth: 330 }}>
            Please wait while PTDT completes this request.
          </p>
        </div>
      </div>
    </div>
  )
}
