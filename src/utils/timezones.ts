const timezoneValue = (value: string, label?: string) => ({ value, label: label || value })

export const TIMEZONE_GROUPS = [
  { label: 'Recommended', zones: [timezoneValue('UTC', 'UTC')] },
  {
    label: 'US & Canada',
    zones: [
      timezoneValue('America/New_York', 'USA Eastern — America/New_York'),
      timezoneValue('America/Chicago', 'USA Central — America/Chicago'),
      timezoneValue('America/Denver', 'USA Mountain — America/Denver'),
      timezoneValue('America/Los_Angeles', 'USA Pacific — America/Los_Angeles'),
      timezoneValue('America/Toronto', 'Canada Eastern — America/Toronto'),
      timezoneValue('America/Vancouver', 'Canada Pacific — America/Vancouver'),
    ],
  },
  { label: 'Australia & Pacific', zones: [timezoneValue('Australia/Sydney'), timezoneValue('Australia/Melbourne'), timezoneValue('Pacific/Auckland')] },
  {
    label: 'Europe',
    zones: [
      timezoneValue('Europe/London'),
      timezoneValue('Europe/Paris'),
      timezoneValue('Europe/Berlin'),
      timezoneValue('Europe/Madrid'),
      timezoneValue('Europe/Rome'),
      timezoneValue('Europe/Amsterdam'),
      timezoneValue('Europe/Istanbul'),
    ],
  },
  {
    label: 'Middle East & Asia',
    zones: [
      timezoneValue('Asia/Dubai'),
      timezoneValue('Asia/Riyadh'),
      timezoneValue('Asia/Qatar'),
      timezoneValue('Asia/Karachi'),
      timezoneValue('Asia/Kolkata'),
      timezoneValue('Asia/Dhaka'),
      timezoneValue('Asia/Singapore'),
      timezoneValue('Asia/Hong_Kong'),
      timezoneValue('Asia/Tokyo'),
      timezoneValue('Asia/Shanghai'),
    ],
  },
] as const

export const getGlobalTimezones = () => {
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') || []
  const curated = new Set(TIMEZONE_GROUPS.flatMap(group => group.zones.map(zone => zone.value)))
  return supported.filter(zone => !curated.has(zone)).sort((a, b) => a.localeCompare(b))
}
