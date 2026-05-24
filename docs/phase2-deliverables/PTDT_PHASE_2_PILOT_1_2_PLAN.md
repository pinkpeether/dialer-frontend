# PTDT-Dialer Phase 2 — Pilot 1 + Pilot 2 Plan

Date: May 24, 2026
Status: Pilot 1 Foundation Passed / Pilot 2 Ready to Start

## Summary

Phase 2 Pilot 1 foundation has passed the required smoke checks.

The backend and frontend Phase 2 foundation is now clean enough to move into Pilot 2, while Phase 1 live calling should continue to be monitored.

## Pilot 1 — Foundation Baseline

### Goal

Pilot 1 introduced the Phase 2 foundation without breaking Phase 1 launch-critical calling.

### Included

- Phase 2 frontend pages
- Audit Logs route/page
- System Settings route/page
- Recordings route/page
- Notifications API foundation
- Backend Phase 2 schema foundation
- AuditLog model
- SystemSetting model
- Notification model
- Campaign mode default
- Retry scheduling fields
- Recording API foundation
- Export API foundation
- Retry scheduling helper
- Campaign schedule helper
- SIP microphone fallback

### Key Commits

| Repo | Commit | Purpose |
|---|---|---|
| Frontend | `4beff43` | Add Phase 2 frontend pages |
| Frontend | `af87a43` | Add SIP microphone fallback |
| Backend | `88566a1` | Add Phase 2 backend foundation |
| Backend | `646ed0a` | Fix Phase 2 retry scheduling defaults |

### Pilot 1 Smoke Result

Passed.

Verified items:

- Frontend deploy/build success
- Backend deploy/build success
- Campaign mode default is `PROGRESSIVE`
- Live DB default is `'PROGRESSIVE'::text`
- QueueManager respects `nextRetryAt`
- Campaign maxRetries has priority over contact maxRetries
- SIP microphone fallback exists
- Phase 1 launch-critical flow remains protected

## Pilot 1 Acceptance

Pilot 1 is accepted as the Phase 2 foundation baseline.

## Pilot 2 — Audit Logs + System Settings Polish

### Goal

Pilot 2 should turn the Phase 2 foundation into a usable admin operations slice.

Pilot 2 focuses on:

1. Audit Logs polish
2. System Settings polish
3. Notifications baseline sanity
4. Recording page smoke stability
5. Phase 1 regression protection

Pilot 2 should not add heavy dialing-mode changes yet.

## Pilot 2 Scope

### Backend

| Area | Required Work |
|---|---|
| Audit logs | Log critical actions, list/search/filter logs |
| Settings | Validate settings, persist settings, audit settings updates |
| Notifications | Confirm own/global notification list and mark-read behavior |
| Recordings | Confirm list/detail/access routes behave safely |
| Exports | Confirm CSV endpoints are protected and downloadable |

### Frontend

| Area | Required Work |
|---|---|
| Audit Logs page | Search/filter/loading/error/empty states |
| System Settings page | Save, validation, success/error messages |
| Recordings page | Empty state, list state, playback/access error state |
| Sidebar | Role-safe links remain correct |
| SIP | Mic fallback does not break register/call |

## Pilot 2 Backend Smoke Checklist

| Test | Expected | Status |
|---|---|---|
| `GET /api/health` | 200 | TODO |
| `GET /api/audit-logs` without token | 401 | TODO |
| `GET /api/audit-logs` as agent | 403 | TODO |
| `GET /api/audit-logs` as admin | 200 | TODO |
| `GET /api/settings` as admin | 200 | TODO |
| `PATCH /api/settings` valid data | 200 and persists | TODO |
| `PATCH /api/settings` invalid key | 400 | TODO |
| `GET /api/notifications` | 200 for logged-in user | TODO |
| `PATCH /api/notifications/read-all` | 200 | TODO |
| `GET /api/recordings` as admin/supervisor | 200 | TODO |
| `GET /api/recordings` as agent | 403 | TODO |
| `GET /api/exports/calls.csv` as admin/supervisor | CSV download | TODO |
| `GET /api/exports/calls.csv` as agent | 403 | TODO |

## Pilot 2 Frontend Smoke Checklist

| Test | Expected | Status |
|---|---|---|
| Admin opens Audit Logs | Page loads | TODO |
| Audit Logs search | Does not crash | TODO |
| Agent cannot see Audit Logs sidebar link | Hidden | TODO |
| Admin opens System Settings | Page loads | TODO |
| Admin saves valid settings | Success message | TODO |
| Invalid setting error | Clear error | TODO |
| Admin/supervisor opens Recordings | Page loads | TODO |
| Empty recordings state | Clear message | TODO |
| Recording playback missing URL | Clear error | TODO |
| SIP register after Phase 2 pages | Still works | TODO |

## Pilot 2 Phase 1 Regression Checklist

Must pass before Pilot 2 sign-off:

| Test | Expected | Status |
|---|---|---|
| SIP register | Registered | TODO |
| Outgoing call | Call placed | TODO |
| Remote answer | Connected | TODO |
| Hangup | Clean end | TODO |
| Call history | COMPLETED + duration + endedAt | TODO |
| ANSWERED with notes | Saved | TODO |
| Reopen disposition | Prefilled | TODO |
| CALLBACK with future time | Pending callback created | TODO |
| Callback page | Pending callback visible | TODO |
| Change CALLBACK to ANSWERED/NO_ANSWER | Callback cancelled and callbackAt cleared | TODO |

## Pilot 2 Non-goals

Do not add these in Pilot 2:

- full predictive dialing
- preview/progressive UI workflow changes
- recording storage migration to R2
- PDF exports
- AI/transcription/sentiment
- whisper/barge
- mobile app

## Pilot 2 Sign-off Criteria

Pilot 2 is complete when:

- Audit Logs page works for admin.
- Audit Logs is blocked for agent.
- Settings page loads and saves valid settings.
- Invalid settings are rejected.
- Notifications endpoints do not crash.
- Recordings page handles empty/list/error states.
- CSV exports are protected and downloadable.
- Full Phase 1 smoke regression passes.

## Recommended Next After Pilot 2

If Pilot 2 passes, move to Pilot 3:

- Retry scheduler runtime QA
- Retry UI visibility
- Campaign schedule/timezone enforcement QA
- Waiting reason display polish

Do not start Pilot 3 until Pilot 2 sign-off is complete.
