import { useEffect, useState } from 'react'
import { commercialControlApi, type CommercialAccount } from '../api/commercialControl.api'

export type MasterCustomerAccount = {
  id: number | null
  name: string
  code: string
  status: string
}

export const normalizeMasterCustomerAccount = (account: Partial<CommercialAccount | MasterCustomerAccount>): MasterCustomerAccount => ({
  id: account.id ? Number(account.id) : null,
  name: String(account.name || 'PTDT Super Admin'),
  code: String(account.code || '—'),
  status: String(account.status || '—'),
})

export function useMasterCustomerAccounts() {
  const [accounts, setAccounts] = useState<MasterCustomerAccount[]>([])

  useEffect(() => {
    let cancelled = false
    commercialControlApi
      .listAccounts({ silent: true })
      .then(items => {
        if (cancelled) return
        setAccounts(items.map(normalizeMasterCustomerAccount))
      })
      .catch(() => {
        if (!cancelled) setAccounts([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  return accounts
}

export function mergeMasterCustomerGroups<T extends { key: string; id: number | null; name: string; code: string; status: string }, K extends string>(
  masterAccounts: MasterCustomerAccount[],
  derivedGroups: T[],
  rowKey: K,
): T[] {
  const derivedByKey = new Map(derivedGroups.map(group => [group.key, group]))
  const result: T[] = []

  masterAccounts.forEach(account => {
    if (!account.id) return
    const key = `account-${account.id}`
    const existing = derivedByKey.get(key)
    if (existing) {
      result.push({ ...existing, name: account.name, code: account.code, status: account.status })
      derivedByKey.delete(key)
    } else {
      result.push({ ...account, key, [rowKey]: [] } as unknown as T)
    }
  })

  derivedByKey.forEach(group => {
    const rows = ((group as unknown) as Record<string, unknown[]>)[rowKey]
    if (group.key === 'account-unassigned' && (!Array.isArray(rows) || rows.length === 0)) return
    result.push(group)
  })

  return result
}
