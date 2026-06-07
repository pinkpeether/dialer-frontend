import { useEffect, useState } from 'react'
import { RefreshCw, ServerCog } from 'lucide-react'
import deploymentPlatformProAPI from '../api/deploymentPlatformPro.api'
import PlatformReadinessPanel from '../components/PlatformReadinessPanel'
import PbxVpsChecklistPanel from '../components/PbxVpsChecklistPanel'
import DesktopReleasePanel from '../components/DesktopReleasePanel'
import AutoUpdateReadinessPanel from '../components/AutoUpdateReadinessPanel'

type TabKey = 'overview' | 'checklist' | 'commands' | 'release'

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Readiness' },
  { key: 'checklist', label: 'Checklist' },
  { key: 'commands', label: 'Smoke Commands' },
  { key: 'release', label: 'Release Notes' },
]

export default function DeploymentPlatformPro() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null)
  const [checklist, setChecklist] = useState<Record<string, unknown> | null>(null)
  const [commands, setCommands] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const [overviewResult, checklistResult, commandsResult] = await Promise.all([
        deploymentPlatformProAPI.getOverview(),
        deploymentPlatformProAPI.getChecklist(),
        deploymentPlatformProAPI.getSmokeCommands(),
      ])
      setOverview(overviewResult)
      setChecklist(checklistResult)
      setCommands(commandsResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deployment platform data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="ptdt-page ptdt-pro-page">
      <div className="ptdt-page-header ptdt-pro-hero">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}>
            <ServerCog size={12} /> Deployment Readiness
          </div>
          <h1 className="ptdt-page-title">
            Deployment / <span className="gradient-brand-text">Platform Pro</span>
          </h1>
          <p className="ptdt-page-desc">
            Production deployment readiness, public PBX/VPS requirements, SIP trunk readiness, DMG/EXE release checks, and WSS tracking.
          </p>
        </div>
        <button type="button" className="ptdt-action-btn" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} /> {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="ptdt-card" style={{ padding: 14, marginBottom: 16, color: '#ef4444', borderColor: 'rgba(239,68,68,0.24)' }}>
          {error}
        </div>
      )}

      <div className="glass" style={{ padding: 8, marginBottom: 16, overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={activeTab === tab.key ? 'btn-brand' : 'ptdt-action-btn'}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && <PlatformReadinessPanel overview={overview as never} />}
      {activeTab === 'checklist' && <PbxVpsChecklistPanel checklist={checklist as never} />}
      {activeTab === 'commands' && <DesktopReleasePanel commands={commands as never} />}
      {activeTab === 'release' && <AutoUpdateReadinessPanel />}
    </div>
  )
}
