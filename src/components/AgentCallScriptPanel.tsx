import { BookOpenText, ClipboardCheck } from 'lucide-react'

type Props = {
  activeCall?: object | null
  campaignName?: string
  campaignScript?: string
}

const readValue = (value: object | null | undefined, key: string) => {
  if (!value || !(key in value)) return ''
  const next = (value as Record<string, unknown>)[key]
  return typeof next === 'string' || typeof next === 'number' ? String(next) : ''
}

export default function AgentCallScriptPanel({ activeCall, campaignName, campaignScript }: Props) {
  const customer = readValue(activeCall, 'name') || 'the customer'
  const phone = readValue(activeCall, 'phone') || readValue(activeCall, 'remoteIdentity') || 'selected number'
  const isLive = Boolean(activeCall)
  const cleanCampaignScript = String(campaignScript || '').trim()
  const scriptBlocks = cleanCampaignScript
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean)

  return (
    <section className="ptdt-agent-script-card">
      <div className="ptdt-agent-script-head">
        <div className="ptdt-agent-script-icon"><BookOpenText size={15} /></div>
        <div>
          <div className="mono">SCRIPT FOR AGENT</div>
          <strong>{isLive ? 'Live call script' : 'Ready script'}</strong>
        </div>
      </div>
      <div className="ptdt-agent-script-body">
        {scriptBlocks.length > 0 ? scriptBlocks.map((block, index) => (
          <p key={`${campaignName || 'campaign'}-${index}`}>{block}</p>
        )) : (
          <>
            <p><b>Open:</b> Hello, this is your PTDT representative speaking with {customer} on {phone}.</p>
            <p><b>Verify:</b> Confirm name, best callback number, and consent before discussing account details.</p>
            <p><b>Purpose:</b> Keep the conversation short, professional, and aligned with {campaignName || 'the selected campaign'}.</p>
            <p><b>Close:</b> Summarize outcome, schedule callback if needed, then select the correct disposition.</p>
          </>
        )}
      </div>
      <div className="ptdt-agent-script-footer">
        <ClipboardCheck size={13} />
        {scriptBlocks.length > 0 ? 'Loaded from the selected campaign.' : 'Use during inbound/outbound calls.'}
      </div>
    </section>
  )
}
