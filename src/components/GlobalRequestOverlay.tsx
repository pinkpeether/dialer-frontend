import { useSyncExternalStore } from 'react'
import {
  getGlobalRequestOverlaySnapshot,
  subscribeGlobalRequestOverlay,
} from '../services/globalRequestOverlay'

export default function GlobalRequestOverlay() {
  const overlay = useSyncExternalStore(
    subscribeGlobalRequestOverlay,
    getGlobalRequestOverlaySnapshot,
    getGlobalRequestOverlaySnapshot,
  )

  if (!overlay.visible) return null

  return (
    <div className={`ptdt-global-progress-overlay ${overlay.phase === 'success' ? 'is-success' : ''}`} aria-live="polite" aria-busy={overlay.phase === 'working'}>
      <div className="ptdt-global-progress-panel">
        {overlay.phase === 'success' ? (
          <div className="ptdt-global-success-mark">✓</div>
        ) : (
          <div className="ptdt-global-premium-spinner" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <i>⟳</i>
          </div>
        )}
        <div className="ptdt-global-progress-title">{overlay.message}</div>
        <div className="ptdt-global-progress-copy">{overlay.detail}</div>
      </div>
    </div>
  )
}
