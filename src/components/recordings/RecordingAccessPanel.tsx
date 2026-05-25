import { useState } from 'react'
import { recordingsAPI } from '../../api/recordings.api'

type Props = {
  callId: number | string
  title?: string
}

export default function RecordingAccessPanel({ callId, title }: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const open = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await recordingsAPI.getAccess(callId)
      if (!data?.recordingUrl) throw new Error('Recording URL is unavailable.')
      setUrl(data.recordingUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access recording')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass" style={{ padding: 16, display: 'grid', gap: 10 }}>
      <div style={{ fontWeight: 900 }}>{title || `Recording #${callId}`}</div>
      {error && <div style={{ color: '#ef4444' }}>{error}</div>}
      {url ? <audio src={url} controls style={{ width: '100%' }} /> : (
        <button disabled={loading} onClick={() => void open()}>
          {loading ? 'Opening...' : 'Open Recording'}
        </button>
      )}
    </div>
  )
}
