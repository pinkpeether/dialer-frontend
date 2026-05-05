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
        gap: 8,
        width: compact ? 38 : 64,
        height: compact ? 38 : 32,
        padding: compact ? 0 : 3,
        justifyContent: compact ? 'center' : 'flex-start',
        borderRadius: 999,
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-strong)',
        backdropFilter: 'blur(10px)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      {compact ? (
        isDark ? <Sun size={16} /> : <Moon size={16} />
      ) : (
        <motion.div
          animate={{ x: isDark ? 0 : 32 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            width: 26, height: 26, borderRadius: '50%',
            background: isDark
              ? 'linear-gradient(135deg, #1e293b, #0f172a)'
              : 'linear-gradient(135deg, #fde68a, #f59e0b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isDark ? '#c4b5fd' : '#7c2d12',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {isDark ? <Moon size={14} /> : <Sun size={14} />}
        </motion.div>
      )}
    </motion.button>
  )
}
