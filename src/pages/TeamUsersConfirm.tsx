import { lazy, Suspense } from 'react'

const Page = lazy(() => import('./TeamUsersV3'))

export default function TeamUsersConfirm() {
  return (
    <Suspense fallback={<div className="ptdt-page">Loading team users...</div>}>
      <Page />
    </Suspense>
  )
}
