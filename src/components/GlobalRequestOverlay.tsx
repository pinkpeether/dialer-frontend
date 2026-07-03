import { useSyncExternalStore } from 'react'
import {
  getGlobalRequestOverlaySnapshot,
  subscribeGlobalRequestOverlay,
} from '../services/globalRequestOverlay'
import PtdtOrbitLoader from './PtdtOrbitLoader'

export default function GlobalRequestOverlay() {
  const overlay = useSyncExternalStore(
    subscribeGlobalRequestOverlay,
    getGlobalRequestOverlaySnapshot,
    getGlobalRequestOverlaySnapshot,
  )

  if (!overlay.visible) return null

  const isSuccess = overlay.phase === 'success'

  return (
    <div
      className={`ptdt-global-progress-overlay ${isSuccess ? 'is-success' : ''}`}
      data-ptdt-modal-open="true"
      aria-live="polite"
      aria-busy={overlay.phase === 'working'}
    >
      <div className="ptdt-global-progress-panel">
        {isSuccess ? (
          <div className="ptdt-global-success-mark">✓</div>
        ) : (
          <div style={{ width: 96, height: 96, margin: '0 auto 18px', display: 'grid', placeItems: 'center' }}>
            <PtdtOrbitLoader size={96} label={overlay.message || 'Loading'} />
          </div>
        )}

        <div className="ptdt-global-progress-title">
          {overlay.message}
        </div>
        <div className="ptdt-global-progress-copy">
          {overlay.detail}
        </div>
      </div>
    </div>
  )
}
