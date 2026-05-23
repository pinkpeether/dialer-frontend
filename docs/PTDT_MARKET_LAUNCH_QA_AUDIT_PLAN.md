# PTDT-Dialer Market Launch QA Audit Plan

Date: May 23, 2026  
Scope: `dialer-frontend`, `dialer-backend`, backend API contracts, SIP/FreePBX/Twilio call flow, deployment readiness, and market-launch risk review.

## Purpose

This document converts the deep QA audit request into an executable market-readiness audit plan. It should be used as the master checklist before PTDT-Dialer is launched to real agents or customers.

The audit is not only a Q&A exercise. It is a phased verification process covering code quality, API contracts, user workflows, SIP/telephony edge cases, deployment configuration, and final go/no-go criteria.

## Repositories

| Area | Repository |
|---|---|
| Frontend | `pinkpeether/dialer-frontend` |
| Backend | `pinkpeether/dialer-backend` |

## Audit Evidence Requirements

Every issue or pass/fail result should include evidence where possible:

- Commit hash tested
- Environment tested
- Exact file and line reference
- Screenshot or screen recording for UI behavior
- API request/response payload for backend/contract tests
- Browser/Electron console output for frontend crashes
- Backend logs for server/API failures
- Asterisk/FreePBX logs for SIP/PSTN issues
- Railway build/deploy status where relevant

## Commit Lock

Before starting the audit, record exact commits:

| Repo | Branch | Commit SHA | Build Status | Notes |
|---|---|---:|---|---|
| `dialer-frontend` | `main` | `TBD` | `TBD` | Fill before audit |
| `dialer-backend` | `main` | `TBD` | `TBD` | Fill before audit |

No result should be treated as final unless the commit SHAs are recorded.

## Environment Matrix

| Environment | Required? | Purpose | Pass Criteria |
|---|---:|---|---|
| Local browser dev | Yes | Fast frontend workflow testing | App loads, routes work, no blocking console crashes |
| Electron dev | Yes | Real PTDT-Dialer runtime | SIP settings, mic/speaker access, call controls work |
| Railway frontend | Yes | Deployed frontend verification | Build/deploy succeeds and app loads deployed API config |
| Railway backend | Yes | Deployed API verification | Health endpoint and authenticated APIs work |
| Local backend/PM2 | Recommended | Debug/reproduce backend issues | PM2 process online and `/api/health` returns success |
| FreePBX VM | Yes | SIP registration and trunk routing | SIP extension registers and routes outbound calls |
| Twilio Elastic SIP Trunk | Yes | PSTN outbound verification | Verified number receives a real call |
| PostgreSQL/Supabase | Yes | Persistence verification | Calls, callbacks, contacts, reports persist and reload |

## Role Matrix

| Role | Must Verify |
|---|---|
| Admin | Full access, agent management, DNC, reports, campaigns, callbacks, calls |
| Supervisor | Team/campaign visibility, reports, call history, callback visibility |
| Agent | Own calls/callbacks only, dialer, disposition, profile update, no privilege escalation |

## Severity Definitions

| Severity | Meaning | Launch Impact |
|---|---|---|
| Critical | Data loss, broken calling, auth bypass, security risk, app crash during core flow | No-go |
| High | Major workflow broken, silent wrong data, stuck call/disposition state, production deploy failure | No-go until fixed or explicitly accepted |
| Medium | Important UX/API issue with workaround | Can launch only with documented workaround |
| Low | Polish, copy, minor visual inconsistency, non-blocking edge case | Can launch after tracking |

## Phase 1 — Static Repo Audit

Goal: Inspect source code and configuration before runtime testing.

### Frontend Static Checks

| Check | Expected Result | Status | Evidence |
|---|---|---|---|
| `npm run build` | Passes cleanly | TBD | Build log |
| TypeScript errors | None blocking | TBD | Build/typecheck output |
| Route registration | All sidebar/routes render valid pages | TBD | `src/App.tsx` |
| Global error boundary | Present and catches route crashes | TBD | File reference |
| Toast provider | Mounted globally and usable across flows | TBD | File reference |
| SIP store actions | register, unregister, call, answer, reject, hangup, mute, hold, resume, transfer, DTMF exposed | TBD | File reference |
| Dialer embedded mode | Floating dialer does not conflict with embedded Dialer page | TBD | File reference |
| Fallback/preview modes | No fake success in market-critical flows | TBD | File reference |
| Environment variables | API URL and runtime assumptions clear | TBD | `.env*`, axios config |
| Electron behavior | Main process and renderer config aligned | TBD | `electron/*`, package scripts |

### Backend Static Checks

| Check | Expected Result | Status | Evidence |
|---|---|---|---|
| `npm run build` | Passes cleanly | TBD | Build log |
| `prisma generate` | Passes cleanly | TBD | Build log |
| `npm start` command | Runs migrations then compiled server | TBD | `package.json` |
| Route mount table | All expected `/api/*` routes mounted | TBD | `src/app.ts` |
| Auth middleware | Protected routes require valid auth | TBD | File reference |
| Role checks | Admin/supervisor/agent boundaries enforced | TBD | File reference |
| Validation | Joi or equivalent validation on write endpoints | TBD | File reference |
| Prisma schema | Models and relations match app workflows | TBD | `prisma/schema.prisma` |
| Migrations | Safe for production DB | TBD | `prisma/migrations` |
| Logging | Useful errors without leaking secrets | TBD | File reference |
| Env assumptions | Required env vars documented and fail clearly | TBD | `.env.example`, config files |

## Phase 2 — Backend API Contract QA

Goal: Verify backend behavior independently before frontend testing.

### Required API Contract Matrix

| API | Scenario | Expected Result | Status | Evidence |
|---|---|---|---|---|
| `GET /api/health` | Backend online | Success response | TBD | curl/API response |
| Auth login | Valid credentials | JWT/session returned | TBD | API response |
| Auth login | Invalid credentials | 401/validation error | TBD | API response |
| `PATCH /api/agents/me` | Agent updates name/phone/extension | Allowed fields update | TBD | API response + DB check |
| `PATCH /api/agents/me` | Agent attempts role/isActive update | Protected fields ignored/rejected | TBD | API response + DB check |
| `GET /api/calls` | Admin/supervisor | Paged calls returned | TBD | API response |
| `GET /api/calls` | Agent | Only own calls returned | TBD | API response |
| `POST /api/calls` | SIP call log | Call persisted with contact/campaign relation | TBD | API response + DB check |
| `PATCH /api/calls/:id/disposition` | `ANSWERED` | Call completed, contact `CONTACTED`, callbackAt cleared | TBD | API response + DB check |
| `PATCH /api/calls/:id/disposition` | `NO_ANSWER` | Contact `NO_ANSWER`, callbackAt cleared | TBD | API response + DB check |
| `PATCH /api/calls/:id/disposition` | `VOICEMAIL` | Contact `VOICEMAIL`, callbackAt cleared | TBD | API response + DB check |
| `PATCH /api/calls/:id/disposition` | `WRONG_NUMBER` | Contact `WRONG_NUMBER`, callbackAt cleared | TBD | API response + DB check |
| `PATCH /api/calls/:id/disposition` | `DO_NOT_CALL` | Contact `DNC`, callbackAt cleared | TBD | API response + DB check |
| `PATCH /api/calls/:id/disposition` | `CALLBACK` with callbackAt | Contact `CALLBACK`, callback created/updated | TBD | API response + DB check |
| `PATCH /api/calls/:id/disposition` | `CALLBACK` without callbackAt | 400 validation error | TBD | API response |
| `PATCH /api/calls/:id/disposition` | CALLBACK saved twice | Existing pending/rescheduled callback updated, no duplicate | TBD | DB check |
| `PATCH /api/calls/:id/disposition` | CALLBACK changed to non-CALLBACK | Pending/rescheduled callback becomes `CANCELLED`, contact callbackAt cleared | TBD | DB check |
| `GET /api/callbacks` | Agent role | Own callbacks only | TBD | API response |
| `GET /api/callbacks` | Admin/supervisor | Broader callback visibility | TBD | API response |
| `PATCH /api/callbacks/:id` | Complete callback | Status `COMPLETED` | TBD | API response + DB check |
| `PATCH /api/callbacks/:id` | Reschedule callback | Status/date updated | TBD | API response + DB check |
| `GET /api/dnc` | Search/pagination | Correct DNC entries returned | TBD | API response |
| `POST /api/dnc` | Add duplicate | 409 or controlled duplicate error | TBD | API response |
| `GET /api/reports/summary` | With date filters | Correct KPI response | TBD | API response |
| `GET /api/reports/campaigns` | With date filters | Campaign breakdown returned | TBD | API response |
| `GET /api/reports/agents` | With date filters | Agent breakdown returned | TBD | API response |

### Backend Data Consistency Tests

| Test | Steps | Expected Result | Status |
|---|---|---|---|
| Atomic disposition transaction | Force callback write failure in test/staging | Call/contact do not partially update | TBD |
| Agent fallback | Create call with null `agentId`, then save CALLBACK as logged-in user | Callback uses current user ID | TBD |
| Duplicate callback prevention | Save CALLBACK twice with different times | One active pending callback updated | TBD |
| Callback cleanup | Save CALLBACK, then ANSWERED | Callback cancelled, contact callbackAt null | TBD |
| Notes persistence | Save notes with disposition | Call/contact notes persist and reload | TBD |

## Phase 3 — Frontend Workflow QA

Goal: Test the app exactly as a real agent/admin would use it.

### Login and Navigation

| Scenario | Expected Result | Status | Evidence |
|---|---|---|---|
| Valid login | User lands on dashboard | TBD | Screenshot |
| Invalid login | Clear error message | TBD | Screenshot |
| Sidebar route clicks | All pages load without crash | TBD | Screenshots |
| Refresh on route | Route survives reload in Electron/browser | TBD | Screenshot |
| Role-based access | Agent cannot access admin-only actions | TBD | Screenshot/API response |

### Dialer Page / Embedded Voice Desk

| Scenario | Expected Result | Status | Evidence |
|---|---|---|---|
| Open Dialer page | Embedded Voice Desk visible | TBD | Screenshot |
| Hide Desk | Desk collapses without losing state | TBD | Screenshot |
| Reopen Desk | Previous dialer state preserved | TBD | Screenshot |
| Start campaign while offline | Clear warning / disabled action | TBD | Screenshot |
| Change campaign during call/campaign | Blocked with clear modal/message | TBD | Screenshot |
| Manual dial `+` number | `+` accepted by keyboard and long-press zero | TBD | Screen recording |
| Invalid number | Clear validation error | TBD | Screenshot |

### SIP Settings and Registration

| Scenario | Expected Result | Status | Evidence |
|---|---|---|---|
| Save SIP settings | Settings persist in local storage | TBD | Screenshot/local state |
| Register valid SIP account | Status becomes registered | TBD | Screenshot/Asterisk log |
| Wrong SIP password | Clear registration error | TBD | Screenshot/log |
| FreePBX unavailable | Clear error, UI not stuck | TBD | Screenshot/log |
| Unregister | Status resets and active call state clears safely | TBD | Screenshot |
| Re-register | Works without duplicate sessions | TBD | Screenshot/log |

### Outgoing Call Flow

| Scenario | Expected Result | Status | Evidence |
|---|---|---|---|
| Dial SIP extension | Call rings/establishes | TBD | Screen recording/Asterisk log |
| Dial PSTN verified number | PSTN phone rings | TBD | Screen recording/Asterisk/Twilio log |
| Hang up before answer | Call state resets, no stuck overlay | TBD | Screen recording |
| Remote party hangs up | UI detects end and disposition opens | TBD | Screen recording |
| Backend down during call | SIP call may continue, persistence error is clear | TBD | Screen recording/log |
| SIP not registered | Call blocked with clear message | TBD | Screenshot |

### Incoming Call Flow

| Scenario | Expected Result | Status | Evidence |
|---|---|---|---|
| Incoming SIP call | Incoming modal appears | TBD | Screenshot/log |
| Answer call | Active call overlay appears | TBD | Screen recording |
| Reject call | State returns to registered | TBD | Screen recording |
| Remote caller hangs up | UI clears and disposition behavior is correct | TBD | Screen recording |

### Active Call Controls

| Control | Scenario | Expected Result | Status |
|---|---|---|---|
| Mute | Toggle during active call | Mic disabled/enabled, toast appears | TBD |
| Hold | Toggle hold | Local media paused, hold toast appears | TBD |
| Resume | Toggle resume | Media resumes cleanly | TBD |
| DTMF | Send digits `123#*` | DTMF sent, log updates | TBD |
| Transfer | Transfer to extension | REFER succeeds or error shown | TBD |
| Transfer invalid target | No crash, clear error | TBD |
| Hangup | End call | UI resets and disposition opens when applicable | TBD |
| Repeated controls | Rapid mute/hold/resume/hangup | No stuck state or crash | TBD |

### Disposition Modal

| Scenario | Expected Result | Status | Evidence |
|---|---|---|---|
| Modal after call end | Opens with correct call/contact | TBD | Screenshot |
| Save ANSWERED | Disposition saves and call history reloads | TBD | API + screenshot |
| Save CALLBACK | Date required, callback scheduled by backend | TBD | API + DB + screenshot |
| CALLBACK without date | UI blocks; API also rejects if forced | TBD | Screenshot/API response |
| Reopen existing disposition | Modal prefilled with existing disposition/notes/date | TBD | Screenshot |
| Change CALLBACK to ANSWERED | Pending callback cancelled, callbackAt cleared | TBD | DB + screenshot |
| Preview mode | Clearly labeled as preview and does not fake backend save | TBD | Screenshot |

### Call History

| Scenario | Expected Result | Status | Evidence |
|---|---|---|---|
| Load call history | Backend-backed records display | TBD | Screenshot/API response |
| Direction filter | Incoming/outgoing filter works | TBD | Screenshot |
| Status filter | Status filter maps correctly to backend | TBD | Screenshot/API response |
| Date range GO | Correct date-filtered records | TBD | Screenshot/API response |
| Search | Name/number/campaign/agent search works | TBD | Screenshot |
| Pagination | Prev/next works and totals are correct | TBD | Screenshot |
| Expand row | Details drawer shows correct data | TBD | Screenshot |
| Disposition display | Saved disposition visible | TBD | Screenshot |
| Edit disposition | Modal opens prefilled | TBD | Screenshot |

### Callback Page

| Scenario | Expected Result | Status | Evidence |
|---|---|---|---|
| Load pending callbacks | Backend callbacks display | TBD | Screenshot/API response |
| Complete callback | Status updates and list refreshes | TBD | Screenshot/API response |
| Cancel callback | Status updates and list refreshes | TBD | Screenshot/API response |
| Reschedule callback | New date persists and list refreshes | TBD | Screenshot/API response |
| Agent visibility | Agent sees own callbacks only | TBD | Screenshot/API response |

### Dashboard / Reports / Campaigns / Contacts / DNC

| Area | Scenario | Expected Result | Status |
|---|---|---|---|
| Dashboard | Load metrics/cards/charts | No crash, values reasonable | TBD |
| Reports | Date filters/charts | Data loads, no Recharts crash | TBD |
| Campaigns | List/detail pages | Load and navigate correctly | TBD |
| Contacts | List/detail/update | Data persists and UI refreshes | TBD |
| DNC | Add/search/remove | Backend-backed and duplicate-safe | TBD |
| Notifications | Bell/popover | Does not overlap or crash | TBD |

## Phase 4 — Frontend/Backend Contract QA

Goal: Confirm every frontend API call matches backend routes and response shapes.

| Frontend API | Backend Route | Method | Must Verify | Status |
|---|---|---:|---|---|
| `authAPI` | `/api/auth/*` | Mixed | Token format, error format, refresh/session assumptions | TBD |
| `callsAPI.getAll` | `/api/calls` | GET | Response shape supports `calls`, `pagination`, filters | TBD |
| `callsAPI.updateDisposition` | `/api/calls/:id/disposition` | PATCH | Backend owns callback/contact side effects | TBD |
| `callbacksAPI.getAll` | `/api/callbacks` | GET | Returns array or `{ callbacks }` consistently | TBD |
| `callbacksAPI.create` | `/api/callbacks` | POST | Used directly only where intended | TBD |
| `contactsAPI` | `/api/contacts` | Mixed | Pagination/search/status update shapes | TBD |
| `campaignsAPI` | `/api/campaigns` | Mixed | Campaign list/detail shapes | TBD |
| `dncAPI` | `/api/dnc` | Mixed | Check/add/remove behavior | TBD |
| `reportsAPI` | `/api/reports/*` | GET | Chart payload shapes | TBD |
| `agentsAPI` | `/api/agents/*` | Mixed | Role-safe profile/admin actions | TBD |

### Silent Failure Review

The following must be flagged if found:

- Empty catch blocks hiding real backend failure
- UI showing success when backend failed
- Preview fallback used in market-critical persistence flow
- Local-only call history displayed as if backend-backed
- Disposition modal closing before backend confirms save
- Toast success without API confirmation
- API timeout swallowed without user-facing error

## Phase 5 — SIP / Telephony Torture Testing

Goal: Prove call handling is stable under real failure modes.

| Scenario | Expected Result | Status | Evidence |
|---|---|---|---|
| SIP WebSocket disconnect while idle | Status changes/error shown, reconnect/manual register possible | TBD | Browser/Electron logs |
| SIP WebSocket disconnect during call | UI does not hang forever; user can recover | TBD | Logs/video |
| FreePBX VM offline | Registration/call fails clearly | TBD | Screenshot/log |
| Backend offline but SIP online | Call controls still safe; persistence errors clear | TBD | Screenshot/log |
| Backend online but SIP offline | Call blocked clearly | TBD | Screenshot |
| Mic permission denied | Clear error and no crash | TBD | Screenshot |
| Speaker output unavailable | Clear error and fallback safe | TBD | Screenshot |
| Wrong SIP credentials | Registration failed state | TBD | Screenshot/log |
| Hold/resume repeated 10x | No media leak/stuck state | TBD | Screen recording |
| Transfer failed | Error shown, original call state recoverable | TBD | Screen recording |
| DTMF during hold | Behavior documented and no crash | TBD | Screen recording |
| Remote hangup during transfer | UI clears safely | TBD | Screen recording |
| PSTN verified number call | Call completes through Twilio | TBD | Asterisk/Twilio logs |
| Trial restriction destination | Error surfaced clearly | TBD | Twilio/Asterisk logs |

## Phase 6 — Deployment / Production Readiness

| Check | Expected Result | Status | Evidence |
|---|---|---|---|
| Frontend Railway build | Success | TBD | Railway link/log |
| Backend Railway build | Success | TBD | Railway link/log |
| Backend start command | `npm start` runs migrations and server | TBD | Railway config/log |
| Required env vars | Documented and present | TBD | Env checklist |
| CORS | Frontend origin allowed, no wildcard if not intended | TBD | Config reference |
| Rate limit | Auth/API protected from basic abuse | TBD | Config reference |
| JWT secret | Strong and not committed | TBD | Env check |
| DB migrations | Safe on deploy | TBD | Migration log |
| Health endpoint | Available after deploy | TBD | curl response |
| Logs | Useful for debugging production failures | TBD | Log sample |

## Security Review Checklist

| Check | Expected Result | Status |
|---|---|---|
| No secrets committed | `.env`, SIP passwords, JWT secret absent from repo | TBD |
| JWT secret strong | Production secret is long/random | TBD |
| Passwords hashed | User passwords never stored plaintext | TBD |
| Role enforcement server-side | UI hiding is not the only protection | TBD |
| CORS restricted | Only expected origins allowed | TBD |
| Rate limiting active | Auth/API endpoints protected | TBD |
| Error messages safe | No stack traces/secrets in production responses | TBD |
| DNC/contact PII access | Role-limited where appropriate | TBD |
| Logs do not leak secrets | SIP/Twilio credentials not logged | TBD |

## Performance / Stability Review

| Area | Risk | Expected Result | Status |
|---|---|---|---|
| Call history | Large data volume | Pagination works; no UI freeze | TBD |
| Reports | Large DB scan | Reasonable response time or indexes | TBD |
| Contacts | Large campaigns | Search/pagination stable | TBD |
| SIP media | Long calls | No memory/audio track leaks | TBD |
| Toasts/modals | Repeated actions | No duplicate/stuck overlays | TBD |
| Backend DB | Multiple agents | No race/duplicate callback issues | TBD |

## Final Go / No-Go Criteria

### Automatic No-Go

Market launch should not proceed if any of these are true:

- Outgoing SIP/PSTN calls cannot be completed reliably.
- SIP registration is unstable with no recovery path.
- Call hangup leaves UI stuck or unable to recover.
- Disposition save can silently fail while showing success.
- CALLBACK disposition does not persist callback correctly.
- CALLBACK changed to non-CALLBACK leaves stale active callbacks.
- Agent can access/update unauthorized calls or callbacks.
- Backend deploy/build fails.
- Frontend deploy/build fails.
- Production secrets are committed or exposed.
- Database migrations are unsafe or unverified.

### Conditional Go

Launch can proceed with documented limitations only if:

- All Critical issues are fixed.
- All High issues are fixed or formally accepted with workaround.
- Medium issues have owners and target dates.
- Low issues are tracked.
- Real PSTN call test passes in the launch environment.
- Role-based access has been verified.
- Disposition/callback workflows pass end-to-end tests.

## Issue Register Template

| ID | Severity | Area | Finding | File/Line | Repro Steps | Expected | Actual | Fix Recommendation | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| QA-001 | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | Open |

## Suggested Manual Test Run Order

1. Record frontend/backend commit SHAs.
2. Confirm both builds pass.
3. Confirm backend health and DB connectivity.
4. Run backend API contract tests.
5. Login as Admin, Supervisor, and Agent.
6. Test Dialer page with SIP registered.
7. Complete internal extension call.
8. Complete PSTN call through FreePBX/Twilio.
9. Save every disposition type.
10. Verify call history persistence and prefill.
11. Verify CALLBACK create/update/cancel transitions.
12. Verify callback page status changes.
13. Run failure-mode SIP/FreePBX/backend tests.
14. Verify deployed Railway frontend/backend.
15. Fill issue register.
16. Produce final go/no-go decision.

## Final Audit Sign-Off

| Area | Status | Notes |
|---|---|---|
| Frontend UX/Stability | TBD |  |
| Backend Reliability | TBD |  |
| API Contract | TBD |  |
| SIP/Telephony | TBD |  |
| Deployment | TBD |  |
| Security | TBD |  |
| Performance | TBD |  |
| Final Decision | TBD | GO / NO-GO |

## Notes

This plan should be treated as a living checklist. As issues are discovered, add them to the issue register and retest the relevant phase after each fix.
