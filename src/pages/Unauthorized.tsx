import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { defaultRouteForRole } from '../utils/roleRoutes'

export default function Unauthorized() {
  const navigate = useNavigate()
  const role = useAuthStore(s => s.user?.role)

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 40px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        style={{
          width: 'min(560px, 100%)',
          borderRadius: 28,
          border: '1px solid rgba(255,59,95,0.22)',
          background: `
            radial-gradient(circle at 18% 0%,rgba(255,59,95,0.12),transparent 42%),
            linear-gradient(145deg,rgba(255,255,255,0.78),rgba(255,255,255,0.50))
          `,
          boxShadow: '0 22px 70px rgba(15,12,30,0.12)',
          padding: 28,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 62,
            height: 62,
            borderRadius: 22,
            margin: '0 auto 18px',
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(255,59,95,0.10)',
            border: '1px solid rgba(255,59,95,0.24)',
            color: 'var(--danger)',
          }}
        >
          <ShieldAlert size={28} />
        </div>

        <div className="mono" style={{ color: 'var(--danger)', fontWeight: 900, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
          Unauthorized
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1, fontWeight: 950, marginBottom: 12, color: 'var(--text)' }}>
          This console area is restricted.
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: 14, lineHeight: 1.65, margin: '0 auto 22px', maxWidth: 420 }}>
          Your current role does not have access to this page. Return to your assigned PTDT-Dialer workspace.
        </p>

        <button
          type="button"
          onClick={() => navigate(defaultRouteForRole(role), { replace: true })}
          className="btn-brand"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <ArrowLeft size={15} />
          Back to Workspace
        </button>
      </motion.div>
    </div>
  )
}
