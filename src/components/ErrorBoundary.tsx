import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PTDT ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.hash = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          padding: '40px 24px',
          textAlign: 'center',
          fontFamily: 'var(--font-body)',
        }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>&#x26A0;&#xFE0F;</div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            fontWeight: 900,
            color: 'var(--text)',
            letterSpacing: '-0.04em',
            marginBottom: 10,
          }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-3)', maxWidth: 420, marginBottom: 8 }}>
            An unexpected error occurred in the PTDT-Dialer.
            The error has been logged.
          </p>
          {this.state.error && (
            <pre style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--danger)',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.22)',
              borderRadius: 10,
              padding: '10px 14px',
              maxWidth: 500,
              overflow: 'auto',
              marginBottom: 24,
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            style={{
              minHeight: 44,
              padding: '0 24px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #fb0b8c, #ff4bad)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              border: 0,
              cursor: 'pointer',
              boxShadow: '0 12px 26px rgba(251,11,140,0.28)',
            }}
          >
            Return to Dashboard
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
