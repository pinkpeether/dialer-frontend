import { useEffect, useMemo, useState } from 'react'
import { Download, RefreshCw, UploadCloud } from 'lucide-react'

type UpdaterStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'disabled'

type UpdaterPayload = {
  status: Exclude<UpdaterStatus, 'idle' | 'disabled'>
  message?: string
  progress?: { percent?: number }
}

export default function DesktopUpdateControl() {
  const [status, setStatus] = useState<UpdaterStatus>('idle')
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState(0)
  const desktop = typeof window !== 'undefined' ? window.ptdtDesktop : undefined

  useEffect(() => {
    if (!desktop?.onUpdaterStatus) return undefined

    return desktop.onUpdaterStatus((payload: UpdaterPayload) => {
      setStatus(payload.status)
      setMessage(payload.message || '')
      setProgress(Math.round(payload.progress?.percent || 0))
    })
  }, [desktop])

  const label = useMemo(() => {
    if (status === 'checking') return 'Checking updates'
    if (status === 'available') return 'Update available'
    if (status === 'downloading') return `Downloading ${progress}%`
    if (status === 'downloaded') return 'Update ready'
    if (status === 'not-available') return 'App is up to date'
    if (status === 'error') return message || 'Update check failed'
    if (status === 'disabled') return message || 'Updates unavailable'
    return 'Check for updates'
  }, [message, progress, status])

  if (!desktop?.checkForUpdates) return null

  const isBusy = status === 'checking' || status === 'downloading'
  const canDownload = status === 'available'
  const canInstall = status === 'downloaded'

  const check = () => {
    setStatus('checking')
    setMessage('')
    void desktop.checkForUpdates().then(result => {
      if (result?.status === 'disabled') {
        setStatus('disabled')
        setMessage(result.reason || 'Updates unavailable')
      }
    }).catch(err => {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Update check failed')
    })
  }

  const download = () => {
    setStatus('downloading')
    setMessage('')
    void desktop.downloadUpdate().catch(err => {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Update download failed')
    })
  }

  const install = () => {
    void desktop.installUpdate().catch(err => {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Update install failed')
    })
  }

  return (
    <div
      style={{
        margin: '0 4px 10px',
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'rgba(255,255,255,0.36)',
        padding: '8px 9px',
        display: 'grid',
        gap: 7,
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 9.5,
          color: status === 'error' ? 'var(--danger)' : 'var(--text-3)',
          fontWeight: 850,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={label}
      >
        {label}
      </div>

      <button
        type="button"
        onClick={canInstall ? install : canDownload ? download : check}
        disabled={isBusy}
        style={{
          minHeight: 30,
          borderRadius: 999,
          border: canInstall
            ? '1px solid rgba(0,167,71,0.35)'
            : canDownload
              ? '1px solid rgba(34,211,238,0.35)'
              : '1px solid var(--border)',
          background: canInstall
            ? 'rgba(0,167,71,0.10)'
            : canDownload
              ? 'rgba(34,211,238,0.10)'
              : 'rgba(255,255,255,0.40)',
          color: canInstall ? 'var(--green-2)' : canDownload ? 'var(--cyan)' : 'var(--text-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          fontSize: 10,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          cursor: isBusy ? 'default' : 'pointer',
          opacity: isBusy ? 0.7 : 1,
        }}
      >
        {canInstall ? <UploadCloud size={13} /> : canDownload ? <Download size={13} /> : <RefreshCw size={13} />}
        {canInstall ? 'Install' : canDownload ? 'Download' : 'Check'}
      </button>
    </div>
  )
}
