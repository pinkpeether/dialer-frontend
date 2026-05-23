# PTDT-Dialer Phase 1 — Launch-Critical Plan

Date: May 24, 2026  
Goal: Stable SIP CRM Dialer ready for controlled pilot launch.

## Phase 1 Objective

Phase 1 is not about adding every feature from the original 100+ feature vision.

Phase 1 is about making the current product safe, reliable, and trustworthy for real calling.

The launch-critical product should prove:

- Agents can log in.
- SIP can register reliably.
- Agents can place/receive calls.
- Active call controls do not get stuck.
- Calls are logged correctly.
- Dispositions save correctly.
- Callback transitions are correct.
- Campaign/contact/DNC basics work.
- Role permissions are safe.
- Deployment is stable.

## Launch-Critical Definition

PTDT-Dialer is launch-ready only when the following areas pass QA:

1. Authentication and roles
2. SIP registration and PSTN calling
3. Active call controls
4. Call logging
5. Disposition and callback workflow
6. Contacts, campaigns, CSV upload, DNC
7. Basic dashboard/reports
8. Deployment and environment configuration
9. No silent/fake success states

## Workstream A — SIP and Call Stability

### Required Checks

| Item | Expected Result | Status |
|---|---|---|
| SIP valid registration | Status becomes registered | TODO |
| SIP wrong credentials | Clear error shown | TODO |
| FreePBX unavailable | UI does not hang | TODO |
| Outgoing SIP extension call | Call connects and ends cleanly | TODO |
| PSTN call through FreePBX/Twilio | Verified number rings | TODO |
| Hangup before answer | UI resets cleanly | TODO |
| Remote party hangup | UI detects end | TODO |
| Active call overlay | No stuck call controls | TODO |
| Backend down during SIP call | SIP controls remain safe, persistence error visible | TODO |

### Recommended Fixes Before Pilot

- Add clearer user-facing SIP error messages.
- Add a visible reconnect/register retry path.
- Ensure hangup always clears call UI state.
- Ensure failed call logging does not show fake success.
- Add a manual “Reset Call State” safety button if call state becomes stuck.

## Workstream B — Disposition and Callback Integrity

### Required Checks

| Scenario | Expected Result | Status |
|---|---|---|
| Save ANSWERED | Call completed, contact contacted, callbackAt cleared | TODO |
| Save NO_ANSWER | Contact no-answer, callbackAt cleared | TODO |
| Save VOICEMAIL | Contact voicemail, callbackAt cleared | TODO |
| Save WRONG_NUMBER | Contact wrong-number, callbackAt cleared | TODO |
| Save DO_NOT_CALL | Contact DNC, callbackAt cleared | TODO |
| Save CALLBACK | Callback created or existing pending/rescheduled callback updated | TODO |
| CALLBACK without callbackAt | Backend validation rejects | TODO |
| CALLBACK saved twice | No duplicate pending callback | TODO |
| CALLBACK changed to non-CALLBACK | Pending/rescheduled callback cancelled | TODO |
| Existing disposition reopened | Modal prefilled correctly | TODO |

### Current Expected Architecture

Frontend should only send:

```json
{
  "disposition": "CALLBACK",
  "notes": "...",
  "callbackAt": "2026-05-24T10:00:00.000Z"
}
```

Backend owns:

- call disposition save
- contact status update
- contact callbackAt update/clear
- callback create/update
- callback cancellation on non-callback transition
- transaction safety

## Workstream C — Campaign, Contacts, CSV, DNC

### Required Checks

| Item | Expected Result | Status |
|---|---|---|
| Create campaign | Campaign appears and reloads | TODO |
| Pause/resume campaign | Status persists | TODO |
| Clone campaign | New campaign appears | TODO |
| Delete campaign | Controlled delete or safe confirmation | TODO |
| Upload CSV | Contacts import | TODO |
| Duplicate numbers | Skipped or rejected safely | TODO |
| DNC numbers | Skipped during upload | TODO |
| Add DNC manually | Number added and searchable | TODO |
| Contact detail | Timeline/calls visible | TODO |
| Manual dial | Number can be called | TODO |

### Phase 1 Non-goals

These are not required for Phase 1 launch:

- true predictive dialing
- advanced retry scheduler
- campaign time-window scheduling
- AI best time predictor
- contact export
- recording playback

## Workstream D — Agents, Roles, and Admin Safety

### Required Checks

| Item | Expected Result | Status |
|---|---|---|
| Admin creates agent | Agent can login | TODO |
| Admin deletes/deactivates agent | Agent cannot login | TODO |
| Agent self-profile update | Only allowed fields update | TODO |
| Agent cannot self-promote role | Blocked server-side | TODO |
| Agent sees own callbacks/calls | Scoped correctly | TODO |
| Supervisor/admin broader views | Work as intended | TODO |

### Recommended Fixes Before Pilot

- Confirm every protected action is enforced server-side.
- Remove or clearly label any demo fallback data in production screens.
- Confirm deleted agents are soft-deactivated, not hard-deleted.

## Workstream E — Basic Reports and Dashboard

### Required Checks

| Item | Expected Result | Status |
|---|---|---|
| Dashboard loads | No crash | TODO |
| Summary report | Calls/dispositions/talk time load | TODO |
| Campaign report | Campaign breakdown loads | TODO |
| Agent report | Agent breakdown loads | TODO |
| Date filters | Correct data range | TODO |
| Empty state | Clear UI, no fake values | TODO |

## Workstream F — Deployment and Environment

### Required Checks

| Item | Expected Result | Status |
|---|---|---|
| Frontend build | Passes | TODO |
| Backend build | Passes | TODO |
| Prisma generate | Passes | TODO |
| Backend migration deploy | Safe | TODO |
| Railway frontend deploy | Success | TODO |
| Railway backend deploy | Success | TODO |
| Health endpoint | Responds | TODO |
| CORS | Production origin allowed | TODO |
| Secrets | Not committed | TODO |
| FreePBX gateway/DNS | Stable | TODO |
| Twilio trunk | Resolves and completes call | TODO |

## Phase 1 Acceptance Criteria

Phase 1 is complete only when:

- All critical call flows pass.
- No active call state gets stuck during normal tests.
- Disposition/callback workflow passes every transition test.
- Backend and frontend builds pass.
- Deployed frontend/backend both pass smoke test.
- Real PSTN test call succeeds.
- No critical/high security issue remains open.

## Phase 1 Output

Deliverables:

- Completed QA checklist
- Bug fix commits
- Deployment verification
- Pilot launch notes
- Known limitations list

## Pilot Launch Recommendation

After Phase 1 passes, launch to a limited group first:

- 1 admin
- 1 supervisor
- 1 to 3 agents
- controlled contact list
- verified PSTN destination first
- 2 to 3 days of observation

Only after stable pilot usage should Phase 2 begin.
