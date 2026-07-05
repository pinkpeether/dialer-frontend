import { Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../hooks/useTheme'

interface Props { compact?: boolean }

export default function ThemeToggle({ compact = false }: Props) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <motion.button
      onClick={toggle}
      whileTap={{ scale: 0.92 }}
      aria-label="Toggle theme"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center',
        width: compact ? 38 : 112,
        height: compact ? 38 : 46,
        padding: compact ? 0 : 4,
        justifyContent: compact ? 'center' : 'flex-start',
        borderRadius: 999,
        background: compact
          ? 'var(--bg-glass)'
          : 'linear-gradient(145deg, #f2f3f5 0%, #ffffff 52%, #edf0f3 100%)',
        border: compact ? '1px solid var(--border-strong)' : '1px solid rgba(148,163,184,.38)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: 'var(--text-3)',
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: compact
          ? undefined
          : 'inset 0 2px 5px rgba(15,23,42,.08), inset 0 -1px 2px rgba(255,255,255,.92), 0 12px 24px rgba(15,23,42,.12)',
      }}
    >
      {compact ? (
        isDark ? <Sun size={16} color="#ffd356" /> : <Moon size={16} color="#8057d7" />
      ) : (
        <>
          <Moon size={25} color="#8b8f96" style={{ position: 'absolute', left: 18 }} strokeWidth={1.8} />
          <motion.div
            animate={{ x: isDark ? 0 : 62 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: isDark
                ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)'
                : 'linear-gradient(135deg, #ffc857 0%, #f59e0b 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isDark ? '#e5e7eb' : '#fff7d6',
              boxShadow: isDark
                ? '0 5px 14px rgba(15,23,42,.34), inset 0 1px 0 rgba(255,255,255,.18)'
                : '0 7px 18px rgba(245,158,11,.42), inset 0 1px 0 rgba(255,255,255,.52)',
              zIndex: 1,
            }}
          >
            {isDark ? <Moon size={21} /> : <Sun size={24} />}
          </motion.div>
        </>
      )}
    </motion.button>
  )
}
