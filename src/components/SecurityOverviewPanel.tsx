import { CheckCircle2, AlertTriangle, Shield, Users, ClipboardList } from 'lucide-react'
import type { SecurityChecklistItem } from '../api/securityAdminPro.api'

type Overview = {
  securityScore?: number
  counts?: {
    activeUsers?: number
    totalUsers?: number
    adminUsers?: number
    auditLast24h?: number
    failedAuditLast24h?: number
  }
}

type Props = {
  overview: Overview | null
  checklist: SecurityChecklistItem[]
}

const badgeTone = (status: string) => {
  if (status === 'PASS') return { bg: 'rgba(0,167,71,0.12)', border: 'rgba(0,167,71,0.28)', color: 'var(--green-2)' }
  if (status === 'FAIL') return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.24)', color: '#ef4444' }
  if (status === 'WARN') return { bg: 'rgba(240,185,11,0.14)', border: 'rgba(240,185,11,0.26)', color: '#f0b90b' }
  return { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.24)', color: '#818cf8' }
}

export default function SecurityOverviewPanel({ overview, checklist }: Props) {
  const score = Math.max(0, Math.min(100, Number(overview?.securityScore || 0)))

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <MetricCard
          icon={<Shield size={16} />}
          label="Security Score"
          value={`${score}/100`}
          detail="Current pilot hardening score"
        >
          <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-glass)', overflow: 'hidden', marginTop: 10 }}>
            <div style={{ width: `${score}%`, height: '100%', background: 'linear-gradient(90deg, #00a747, #00d17a)' }} />
          </div>
        </MetricCard>
        <MetricCard
          icon={<Users size={16} />}
          label="Users"
          value={overview?.counts?.activeUsers ?? 0}
          detail={`Active / ${overview?.counts?.totalUsers ?? 0} total`}
        />
        <MetricCard
          icon={<Shield size={16} />}
          label="Admin Users"
          value={overview?.counts?.adminUsers ?? 0}
          detail="High privilege accounts"
        />
        <MetricCard
          icon={<ClipboardList size={16} />}
          label="Audit Events 24h"
          value={overview?.counts?.auditLast24h ?? 0}
          detail={`Warnings: ${overview?.counts?.failedAuditLast24h ?? 0}`}
        />
      </div>

      <div className="glass" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.15 }}>Security Hardening Checklist</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--text-3)', lineHeight: 1.6 }}>
              Helmet, rate limits, CORS, IP whitelist, session policy, and backup guardrails.
            </p>
          </div>
          <span className="ptdt-chip">{checklist.length} checks</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {checklist.map(item => {
            const tone = badgeTone(item.status)
            return (
              <div key={item.key} style={{ border: '1px solid var(--border)', borderRadius: 16, background: 'var(--bg-glass)', padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 800 }}>{item.title}</div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: tone.bg,
                      border: `1px solid ${tone.border}`,
                      color: tone.color,
                      fontWeight: 900,
                      fontSize: 11,
                    }}
                  >
                    {item.status === 'PASS' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                    {item.status}
                  </span>
                </div>
                <p style={{ margin: '10px 0 0', color: 'var(--text-3)', lineHeight: 1.6 }}>{item.detail}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  children,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  detail: string
  children?: React.ReactNode
}) {
  return (
    <div className="glass" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 12, marginBottom: 8 }}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="mono" style={{ fontSize: 26, fontWeight: 950, color: 'var(--text)' }}>{value}</div>
      <div style={{ color: 'var(--text-3)', marginTop: 4 }}>{detail}</div>
      {children}
    </div>
  )
}
