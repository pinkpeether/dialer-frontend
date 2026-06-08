type BillingData = {
  sipTrunk?: {
    provider?: string
    accountId?: { configured?: boolean; preview?: string | null }
    balanceUsd?: string | null
    lowBalanceThresholdUsd?: string | null
  }
  provider?: {
    configured?: boolean
    accountSid?: { configured?: boolean; preview?: string | null }
    fromNumberConfigured?: boolean
    estimatedBalanceUsd?: string | null
  }
  ai?: { openRouterConfigured?: boolean; openAiConfigured?: boolean }
  railway?: { plan?: string | null; service?: string | null }
  supabase?: {
    projectRef?: { configured?: boolean; preview?: string | null }
    storageBucket?: string | null
  }
  generatedAt?: string
}

export default function BillingAdminPanel({ billing }: { billing: BillingData | null }) {
  const providerStatus = billing?.provider?.configured ? 'Configured' : 'Missing'
  const providerAccountPreview = billing?.provider?.accountSid?.preview || 'not provided'
  const providerBalance = billing?.provider?.estimatedBalanceUsd || 'not provided'
  const providerCallerId = billing?.provider?.fromNumberConfigured ? 'Yes' : 'No'

  return (
    <div className="glass" style={{ padding: 18 }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Billing / Provider Overview</h2>
        <p style={{ margin: '6px 0 0', color: 'var(--text-3)', lineHeight: 1.6 }}>
          SIP trunk, provider adapter, AI, Railway and Supabase readiness in one admin view.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <Panel label="Call Provider" lines={[
          `Status: ${providerStatus}`,
          `Provider: ${billing?.sipTrunk?.provider || 'not-set'}`,
          `Account: ${providerAccountPreview}`,
        ]} />
        <Panel label="Provider Adapter" lines={[
          providerStatus,
          `Balance: ${providerBalance}`,
          `Caller ID: ${providerCallerId}`,
        ]} />
        <Panel label="AI Billing" lines={[
          `OpenRouter: ${billing?.ai?.openRouterConfigured ? 'Ready' : 'Missing'}`,
          `OpenAI: ${billing?.ai?.openAiConfigured ? 'Ready' : 'Missing'}`,
        ]} />
        <Panel label="Railway" lines={[
          `Plan: ${billing?.railway?.plan || 'not provided'}`,
          `Service: ${billing?.railway?.service || 'not provided'}`,
        ]} />
        <Panel label="Supabase" lines={[
          `Project: ${billing?.supabase?.projectRef?.preview || 'not provided'}`,
          `Bucket: ${billing?.supabase?.storageBucket || 'not provided'}`,
        ]} />
        <Panel label="SIP Trunk Credit" lines={[
          `Balance: ${billing?.sipTrunk?.balanceUsd || 'not provided'}`,
          `Low threshold: ${billing?.sipTrunk?.lowBalanceThresholdUsd || '10'}`,
        ]} />
      </div>
    </div>
  )
}

function Panel({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 16, background: 'var(--bg-glass)', padding: 14 }}>
      <div style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'grid', gap: 5 }}>
        {lines.map(line => (
          <div key={line} style={{ color: 'var(--text)', lineHeight: 1.5 }}>{line}</div>
        ))}
      </div>
    </div>
  )
}
