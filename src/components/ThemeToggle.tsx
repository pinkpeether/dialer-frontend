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
        width: compact ? 38 : 64,
        height: compact ? 38 : 32,
        padding: compact ? 0 : 3,
        justifyContent: compact ? 'center' : 'flex-start',
        borderRadius: 999,
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-strong)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        color: 'var(--text-3)',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      {compact ? (
        isDark ? <Sun size={16} color="#ffd356" /> : <Moon size={16} color="#8057d7" />
      ) : (
        <motion.div
          animate={{ x: isDark ? 0 : 32 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            width: 26, height: 26, borderRadius: '50%',
            background: isDark
              ? 'linear-gradient(135deg, #fb0b8c 0%, #c2148a 50%, #6b21a8 100%)'
              : 'linear-gradient(135deg, #fde68a, #f0b90b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isDark ? '#fff' : '#7c2d12',
            boxShadow: isDark
              ? '0 4px 14px rgba(251,11,140,0.45)'
              : '0 4px 14px rgba(240,185,11,0.45)',
          }}
        >
          {isDark ? <Moon size={14} /> : <Sun size={14} />}
        </motion.div>
      )}
    </motion.button>
  )
}