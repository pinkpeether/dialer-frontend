export function cleanDisplayText(value: unknown, fallback = '—') {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  if (!text) return fallback
  return text
    .replace(/illyvoip/gi, 'PTDT')
    .replace(/_/g, ' ')
}

type CommercialAccountDisplay = {
  id?: number | string | null
  name?: string | null
  code?: string | null
}

const normalizeComparable = (value: unknown) => cleanDisplayText(value, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '')

export function commercialAccountLabel(account?: CommercialAccountDisplay | null, fallback = 'Commercial account') {
  if (!account) return fallback

  const name = cleanDisplayText(account.name, '').trim()
  const code = cleanDisplayText(account.code, '').trim()
  const primary = name || code || (account.id ? `#${account.id}` : fallback)

  if (!code || code === '—' || normalizeComparable(name) === normalizeComparable(code)) {
    return primary
  }

  return `${primary} (${code})`
}
