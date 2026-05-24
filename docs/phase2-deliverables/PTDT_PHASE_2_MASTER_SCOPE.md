# PTDT-Dialer Phase 2 Master Scope

Date: May 24, 2026
Goal: Professional Call Center Operations

## Positioning

Phase 1 proved the launch-critical SIP CRM dialer flow. Phase 2 should make the product mature for real outbound operations.

Phase 2 focuses on operational reliability, admin control, reporting, follow-up discipline, and safer campaign automation.

AI, transcription, sentiment, whisper/barge, mobile, billing, and enterprise extras should stay in Phase 3 unless urgently required by a real customer.

## Goals

1. Add audit/activity logs.
2. Add system settings.
3. Add retry scheduler for failed/no-answer contacts.
4. Add campaign schedule and timezone enforcement.
5. Add explicit campaign dialing modes.
6. Add recording list, playback, search, and download.
7. Add exports for calls, contacts, and campaign reports.
8. Add callback and campaign operational notifications.

## Workstreams

| Workstream | Priority | Purpose |
|---|---:|---|
| Audit logs | High | Accountability and debugging |
| System settings | High | Runtime control and safe defaults |
| Retry scheduler | High | Prevent lost leads |
| Campaign schedule/timezone | High | Avoid bad calling windows |
| Dialing modes | High | Safer campaign workflows |
| Recording module | High | QA/compliance/review |
| Reports and exports | High | Admin/client reporting |
| Notifications | Medium/High | Callback and campaign visibility |
| Conservative predictive mode | Medium | Efficiency after usage data |

## Non-goals

- AI sentiment
- Real-time transcription
- AI call summaries
- Whisper/barge
- Mobile app
- Billing dashboard
- IP whitelist
- Single-session login
- Electron auto-updater

## Phase 1 Regression Guard

Every Phase 2 change must keep these working:

- SIP register
- outgoing call
- remote answer
- hangup
- call history completed state
- duration and endedAt
- disposition save
- notes prefill
- CALLBACK scheduling
- CALLBACK to non-CALLBACK cleanup
- callback page behavior

## Recommended Release Slices

| Release | Scope |
|---|---|
| v1.1 | Audit logs + system settings |
| v1.2 | Retry scheduler + campaign schedule/timezone |
| v1.3 | Preview and progressive dialing |
| v1.4 | Recordings + exports |
| v1.5 | Notifications + conservative predictive beta |

## Completion Criteria

Phase 2 is complete when:

- Critical actions are audit logged.
- Admin settings persist and affect runtime behavior.
- Retry scheduler safely handles retryable contacts.
- Campaigns respect schedule and timezone rules.
- Preview and Progressive modes are selectable per campaign.
- Recordings can be listed, played, searched, and downloaded.
- Calls/contacts/campaign data can be exported.
- Callback due and overdue reminders work.
- Phase 1 smoke test still passes.

## Recommendation

Start with audit logs and system settings first. They are low-risk and create a stronger foundation for the rest of Phase 2.
