import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      position: 'relative',
      background: 'var(--bg-page)',
    }}>
      {/* Animated aurora background */}
      <div className="aurora-bg">
        <div className="aurora-orb-3" />
      </div>
      <div className="grid-overlay" />

      <Sidebar />

      <main style={{
        flex: 1,
        marginLeft: 'var(--sidebar-width)',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1,
      }}>
        <Outlet />
      </main>
    </div>
  )
}
