import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '40px 24px',
      textAlign: 'center',
      fontFamily: 'var(--font-body)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(251,11,140,0.12) 0%, transparent 70%)',
      }}/>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <div className="mono" style={{
          fontSize: 'clamp(80px, 14vw, 140px)',
          fontWeight: 900,
          lineHeight: 1,
          background: 'linear-gradient(135deg, #fb0b8c, #8057d7)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
          marginBottom: 8,
          letterSpacing: '-0.06em',
        }}>
          404
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(22px, 3vw, 34px)',
          fontWeight: 900,
          color: 'var(--text)',
          letterSpacing: '-0.04em',
          marginBottom: 12,
        }}>
          Page Not Found
        </h1>

        <p style={{ fontSize: 14.5, color: 'var(--text-3)', maxWidth: 380, margin: '0 auto 32px' }}>
          The route you&apos;re looking for doesn&apos;t exist in the PTDT-Dialer.
          Head back to the dashboard.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/dashboard')}
            className="btn-brand"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Home size={15}/> Go to Dashboard
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(-1)}
            style={{
              minHeight: 44, padding: '0 22px',
              borderRadius: 999,
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-3)',
              fontWeight: 700, fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--pink)'; e.currentTarget.style.color = 'var(--pink)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' }}
          >
            <ArrowLeft size={14}/> Go Back
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
