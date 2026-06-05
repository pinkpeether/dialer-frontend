type BillingData = {
  provider?: string
  sipTrunk?: { provider?: string; balanceUsd?: string | null; lowBalanceThresholdUsd?: string | null }
  twilio?: { configured?: boolean; estimatedBalanceUsd?: string | null; fromNumberConfigured?: boolean }
  ai?: { openRouterConfigured?: boolean; openAiConfigured?: boolean }
  railway?: { plan?: string | null; service?: string | null }
  supabase?: { storageBucket?: string | null }
}

export default function BillingAdminPanel({ billing }: { billing: BillingData | null }) {
  return (
    <div className="glass" style={{ padding: 18 }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Billing / Provider Overview</h2>
        <p style={{ margin: '6px 0 0', color: 'var(--text-3)', lineHeight: 1.6 }}>
          SIP trunk, Twilio, AI, Railway and Supabase readiness in one admin view.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <Panel label="Call Provider" lines={[billing?.provider || 'not-set', `SIP trunk: ${billing?.sipTrunk?.provider || 'not-set'}`]} />
        <Panel label="Twilio" lines={[
          billing?.twilio?.configured ? 'Configured' : 'Missing',
          `Balance: ${billing?.twilio?.estimatedBalanceUsd || 'not provided'}`,
          `Caller ID: ${billing?.twilio?.fromNumberConfigured ? 'Yes' : 'No'}`,
        ]} />
        <Panel label="AI Billing" lines={[
          `OpenRouter: ${billing?.ai?.openRouterConfigured ? 'Ready' : 'Missing'}`,
          `OpenAI: ${billing?.ai?.openAiConfigured ? 'Ready' : 'Missing'}`,
        ]} />
        <Panel label="Railway" lines={[
          `Plan: ${billing?.railway?.plan || 'not provided'}`,
          `Service: ${billing?.railway?.service || 'not provided'}`,
        ]} />
        <Panel label="Supabase" lines={[`Bucket: ${billing?.supabase?.storageBucket || 'not provided'}`]} />
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
