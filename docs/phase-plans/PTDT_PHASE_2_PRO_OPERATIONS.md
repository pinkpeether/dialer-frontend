# PTDT-Dialer Phase 2 — Professional Call Center Operations

Date: May 24, 2026  
Goal: Convert the stable v1 dialer into a professional call center operations platform.

## Phase 2 Objective

Phase 2 begins only after Phase 1 has passed a controlled pilot.

Phase 2 focuses on operational efficiency, compliance, reporting, and admin control.

The goal is not AI yet. The goal is to make the dialer more powerful for real outbound teams.

## Phase 2 Priority Areas

1. True dialing modes
2. Retry scheduler
3. Campaign scheduling and timezone enforcement
4. Recording module
5. Advanced reports and exports
6. Audit/activity logs
7. System settings
8. Operational notifications

## Workstream A — True Dialing Modes

### Features

| Feature | Description | Priority | Status |
|---|---|---:|---|
| Manual mode | Agent manually dials selected contact/number | High | TODO |
| Preview mode | Agent sees contact details before approving call | High | TODO |
| Progressive mode | System dials next contact when agent is ready | High | TODO |
| Predictive mode | System dials multiple numbers based on available agents and ratio | Medium | TODO |
| Mode per campaign | Campaign stores selected dialing mode | High | TODO |
| Dial ratio guardrails | Prevent dangerous over-dialing | High | TODO |

### Recommended Backend Model Additions

Campaign should eventually support:

```prisma
mode          CampaignDialMode @default(PREVIEW)
dialingRatio  Int              @default(1)
maxRetries    Int              @default(3)
retryDelay    Int              @default(3600)
```

Potential enum:

```prisma
enum CampaignDialMode {
  MANUAL
  PREVIEW
  PROGRESSIVE
  PREDICTIVE
}
```

### Acceptance Criteria

- Admin can choose mode per campaign.
- Agent UI behaves differently based on mode.
- Progressive mode does not dial when no agent is READY.
- Predictive mode has conservative pacing limits.
- Call records remain accurate across all modes.

## Workstream B — Retry Scheduler

### Features

| Feature | Description | Priority | Status |
|---|---|---:|---|
| Retry failed/no-answer contacts | Requeue eligible contacts | High | TODO |
| Configurable retry delay | 30 min, 1 hr, 2 hr, custom | High | TODO |
| Max retries | Per contact/campaign max attempts | High | TODO |
| Retry status visibility | Show retry count and next retry time | Medium | TODO |
| Retry exclusion | Do not retry DNC, wrong number, completed contacts | High | TODO |

### Suggested Data Additions

Contact may need:

```prisma
nextRetryAt DateTime?
```

### Acceptance Criteria

- Failed/no-answer contacts are not retried immediately.
- Retries respect maxRetries.
- Retry scheduler survives backend restart if DB-backed.
- DNC/wrong-number/done contacts are never retried.

## Workstream C — Campaign Scheduling and Timezone Enforcement

### Features

| Feature | Description | Priority | Status |
|---|---|---:|---|
| Start/end time enforcement | Campaign only dials inside allowed time | High | TODO |
| Campaign schedule auto-start | Campaign starts automatically at scheduled time | Medium | TODO |
| Campaign schedule auto-stop | Campaign stops automatically at end time | Medium | TODO |
| Timezone safe dialing | Respect campaign/contact local time | High | TODO |
| Quiet hours | Block calls outside legal/business windows | High | TODO |

### Acceptance Criteria

- Scheduler checks campaign timezone before dialing.
- Campaign does not dial outside configured window.
- Admin sees why a campaign is waiting.
- Timezone defaults are clear.

## Workstream D — Recording Module

### Features

| Feature | Description | Priority | Status |
|---|---|---:|---|
| Recording list page | All recordings searchable | High | TODO |
| Playback player | Play recording inside app | High | TODO |
| Download recording | Download individual recording | High | TODO |
| Recording search | Search by agent/date/number/duration | Medium | TODO |
| Cloudflare R2 storage | Move recordings to controlled storage | Medium | TODO |
| Retention policy | Auto-delete after configured days | Medium | TODO |
| Recording on/off setting | System/campaign-level control | Medium | TODO |

### Current Starting Point

The backend already has call fields for `recordingUrl` and `recordingSid`, and webhook logic can save provider recording metadata.

Phase 2 should turn this into a real module.

### Acceptance Criteria

- Admin can open recording page.
- Recordings can be played and downloaded.
- Recordings are associated with calls/agents/contacts.
- Missing/expired recording URL is handled clearly.

## Workstream E — Advanced Reports and Exports

### Features

| Feature | Description | Priority | Status |
|---|---|---:|---|
| Campaign PDF export | End-of-campaign summary | High | TODO |
| Calls CSV export | Export filtered call history | High | TODO |
| Contacts CSV export | Export filtered contacts | High | TODO |
| Agent daily/weekly/monthly report | Agent performance over periods | Medium | TODO |
| Hourly performance chart | Calls/answered by hour | Medium | TODO |
| Missed call report | Repeated no-answer numbers | Medium | TODO |
| Conversion report | If conversion disposition exists | Medium | TODO |
| Daily summary email | Automatic admin email | Low/Medium | TODO |

### Acceptance Criteria

- Exports match current filters.
- Large exports do not freeze UI.
- Reports do not show fake fallback values in production.

## Workstream F — Audit and Activity Logs

### Features

| Feature | Description | Priority | Status |
|---|---|---:|---|
| Login/logout logs | Track user sessions | High | TODO |
| Campaign changes | Track create/update/status changes | High | TODO |
| Disposition changes | Track who changed call outcome | High | TODO |
| Callback changes | Track create/update/cancel/complete | High | TODO |
| DNC changes | Track add/remove | High | TODO |
| Admin actions | Track agent/user changes | Medium | TODO |
| Activity log UI | Search/filter activity | Medium | TODO |

### Suggested Model

```prisma
model AuditLog {
  id        Int      @id @default(autoincrement())
  actorId   Int?
  action    String
  entity    String
  entityId  String?
  metadata  Json?
  ipAddress String?
  createdAt DateTime @default(now())
}
```

### Acceptance Criteria

- Important actions produce audit logs.
- Logs do not leak secrets.
- Admin can review logs.

## Workstream G — System Settings

### Features

| Feature | Description | Priority | Status |
|---|---|---:|---|
| Default dial ratio | Admin configurable | Medium | TODO |
| Default timezone | Admin configurable | Medium | TODO |
| Recording on/off | Admin configurable | High | TODO |
| Max agents / limits | Admin configurable | Low/Medium | TODO |
| Retry defaults | Admin configurable | High | TODO |
| Call timeout defaults | Admin configurable | Medium | TODO |
| SIP/FreePBX health status | Admin visibility | Medium | TODO |

### Acceptance Criteria

- Settings persist in backend.
- Settings affect runtime behavior.
- Invalid settings are rejected.

## Workstream H — Operational Notifications

### Features

| Feature | Description | Priority | Status |
|---|---|---:|---|
| Callback due reminder | Notify agent before callback time | High | TODO |
| Missed callback alert | Notify if callback overdue | High | TODO |
| Campaign complete alert | Notify admin/supervisor | Medium | TODO |
| Low contact warning | Warn when pending contacts are low | Medium | TODO |
| Configurable sound alerts | Admin/user control | Low/Medium | TODO |

### Acceptance Criteria

- Alerts are useful and not spammy.
- Overdue callbacks are visible.
- Notifications persist or are recoverable.

## Phase 2 Non-goals

Do not include in Phase 2 unless a customer requires it:

- AI sentiment
- real-time transcription
- call whisper/barge
- mobile app
- billing module
- enterprise SSO

## Phase 2 Completion Criteria

Phase 2 is complete when:

- A campaign can run in at least Manual, Preview, and Progressive modes.
- Retry scheduler works safely.
- Campaign schedule/timezone rules are enforced.
- Recordings are playable/downloadable.
- Exports are available for calls/contacts/campaigns.
- Audit logs exist for critical actions.
- Callback reminders work.

## Recommended Implementation Order

1. Audit logs foundation
2. Retry scheduler
3. Campaign scheduling/timezone enforcement
4. Preview/progressive dialing modes
5. Recording module
6. Reports/exports
7. System settings
8. Notifications/reminders

## Final Note

Phase 2 should make the product operationally mature, not overloaded.

Only implement features that make agents/admins more reliable and productive.
