import { HardDriveDownload } from 'lucide-react'
import StorageOverviewPanel from '../components/StorageOverviewPanel'
import RecordingSearchPanel from '../components/RecordingSearchPanel'
import RetentionPolicyPanel from '../components/RetentionPolicyPanel'

export default function RecordingStoragePro() {
  return (
    <div className="ptdt-page ptdt-pro-page">
      <div className="ptdt-page-header ptdt-pro-hero">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}>
            <HardDriveDownload size={12} /> Recording Operations
          </div>
          <h1 className="ptdt-page-title">
            Recording <span className="gradient-brand-text">Storage Management</span>
          </h1>
          <p className="ptdt-page-desc">
            Recording search, download, storage overview, retention policy, and controlled purge workflow for production operations.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <StorageOverviewPanel />
        <RecordingSearchPanel />
        <RetentionPolicyPanel />

        <section className="ptdt-card ptdt-pro-callout" style={{ padding: 14, color: 'var(--warning)', borderColor: 'rgba(245,158,11,0.28)' }}>
          Hard object deletion from managed storage should remain policy driven. This module focuses on search, access, visibility, and safe metadata retention control.
        </section>
      </div>
    </div>
  )
}
