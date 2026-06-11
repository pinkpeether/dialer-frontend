import { lazy, Suspense } from 'react'

const Page = lazy(() => import('./PlatformAdministrationV2'))

export default function PlatformAdministration() {
  return (
    <Suspense fallback={<div className="ptdt-page">Loading administration...</div>}>
      <Page />
    </Suspense>
  )
}
