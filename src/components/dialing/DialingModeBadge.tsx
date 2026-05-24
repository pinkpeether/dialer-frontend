type Props = {
  mode?: string | null
}

const COLORS: Record<string, string> = {
  MANUAL: 'var(--text-3)',
  PREVIEW: '#8057d7',
  PROGRESSIVE: '#00a747',
  PREDICTIVE: '#f0b90b',
}

export default function DialingModeBadge({ mode }: Props) {
  const label = (mode || 'PREVIEW').toUpperCase()
  const color = COLORS[label] || COLORS.PREVIEW

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      border: `1px solid ${color}`,
      color,
      borderRadius: 999,
      padding: '3px 9px',
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '.04em',
    }}>
      {label}
    </span>
  )
}
