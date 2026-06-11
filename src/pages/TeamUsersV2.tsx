import { lazy, Suspense } from 'react'

const Page = lazy(() => import('./TeamUsersV3'))

export default function TeamUsersV2() {
  return (
    <Suspense fallback={<div className="ptdt-page">Loading team users...</div>}>
      <Page />
    </Suspense>
  )
}
