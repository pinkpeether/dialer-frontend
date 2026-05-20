import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      position: 'relative',
      background: 'var(--bg)',
    }}>
      {/* PTDT aurora — pink / purple / green orbs */}
      <div className="aurora-bg">
        <div className="aurora-orb-3" />
      </div>
      {/* Grid overlay (visible only in dark = PTDT tokenomics vibe) */}
      <div className="grid-overlay" />

      <Sidebar />

      <main style={{
        flex: 1,
        marginLeft: 'var(--sidebar-width)',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>

        {/* Footer copyright — always visible */}
        <footer style={{
          padding: '20px 32px',
          borderTop: '1px solid var(--border)',
          marginTop: 'auto',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          fontSize: 11.5,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          flexWrap: 'wrap',
          textAlign: 'center',
          lineHeight: 1.7,
        }}>
          <span>
            Copyrights © <span style={{ color: 'var(--text-2)', fontWeight: 700 }}>PTDT-Dialer</span>
            {' · '}Pink Taxi Group Ltd · United Kingdom. All rights reserved.
            {' · '}
            Trust the <span style={{ color: 'var(--pink)', fontWeight: 700 }}>{'{ Code }'}</span>,{' '}
            <span style={{ color: 'var(--green-2)', fontWeight: 700 }}>// Not the Cult!</span>
          </span>
        </footer>
      </main>
    </div>
  )
}
