export function cleanDisplayText(value: unknown, fallback = '—') {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  if (!text) return fallback
  return text
    .replace(/illyvoip/gi, 'PTDT')
    .replace(/_/g, ' ')
}
