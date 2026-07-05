import { useEffect, useState, type CSSProperties } from 'react'
import { TIMEZONE_GROUPS } from '../utils/timezones'

const inputStyle: CSSProperties = {
  padding: '11px 14px',
  background: 'var(--bg-glass-hi)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
}

export default function TimezonePicker({
  value,
  onChange,
  globalTimezones,
}: {
  value: string
  onChange: (value: string) => void
  globalTimezones: string[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return undefined

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) return
      event.preventDefault()
      setQuery('')
      setOpen(false)
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open])

  const allCuratedZones = TIMEZONE_GROUPS.flatMap(group => group.zones)
  const selectedLabel = allCuratedZones.find(zone => zone.value === value)?.label || value || 'Select timezone'
  const normalizedQuery = query.trim().toLowerCase()
  const matches = (zone: { value: string; label: string }) => !normalizedQuery || `${zone.label} ${zone.value}`.toLowerCase().includes(normalizedQuery)
  const curatedGroups = TIMEZONE_GROUPS.map(group => ({ label: group.label, zones: group.zones.filter(matches) })).filter(group => group.zones.length > 0)
  const curatedValues = new Set(allCuratedZones.map(zone => zone.value))
  const globalMatches = globalTimezones.filter(zone => !curatedValues.has(zone)).filter(zone => !normalizedQuery || zone.toLowerCase().includes(normalizedQuery))

  const selectZone = (zone: string) => {
    onChange(zone)
    setQuery('')
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setOpen(previous => !previous)}
        style={{ ...inputStyle, minHeight: 43, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <span>{selectedLabel}</span>
        <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ position: 'absolute', zIndex: 50, top: 'calc(100% + 8px)', left: 0, right: 0, minWidth: 360, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--bg-glass-hi)', boxShadow: '0 18px 45px rgba(0,0,0,0.22)', padding: 10 }}>
          <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search timezone..." style={{ ...inputStyle, marginBottom: 10 }} />

          <div style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
            {curatedGroups.map(group => (
              <div key={group.label} style={{ marginBottom: 10 }}>
                <div className="mono" style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-3)', letterSpacing: 1, textTransform: 'uppercase', margin: '6px 6px' }}>
                  {group.label}
                </div>
                {group.zones.map(zone => (
                  <button
                    key={`${group.label}-${zone.value}`}
                    type="button"
                    onClick={() => selectZone(zone.value)}
                    style={{ width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 12, border: zone.value === value ? '1px solid rgba(251,11,140,0.38)' : '1px solid transparent', background: zone.value === value ? 'rgba(251,11,140,0.10)' : 'transparent', color: zone.value === value ? 'var(--pink)' : 'var(--text)', cursor: 'pointer', fontSize: 12.5, fontWeight: 750 }}
                  >
                    {zone.label}
                  </button>
                ))}
              </div>
            ))}

            {globalMatches.length > 0 && (
              <div>
                <div className="mono" style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-3)', letterSpacing: 1, textTransform: 'uppercase', margin: '6px 6px' }}>
                  All Global Timezones
                </div>
                {globalMatches.map(zone => (
                  <button
                    key={`global-${zone}`}
                    type="button"
                    onClick={() => selectZone(zone)}
                    style={{ width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 12, border: zone === value ? '1px solid rgba(251,11,140,0.38)' : '1px solid transparent', background: zone === value ? 'rgba(251,11,140,0.10)' : 'transparent', color: zone === value ? 'var(--pink)' : 'var(--text)', cursor: 'pointer', fontSize: 12.5, fontWeight: 750 }}
                  >
                    {zone}
                  </button>
                ))}
              </div>
            )}

            {curatedGroups.length === 0 && globalMatches.length === 0 && (
              <div style={{ padding: 14, color: 'var(--text-3)', fontSize: 12.5 }}>No timezone found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
