Please perform a deep quality-assurance audit of both PTDT-Dialer repositories before market launch.

Repositories:
- Frontend: dialer-frontend
- Backend: dialer-backend

Goal:
Deeply inspect both codebases to find any missing pieces, bugs, weak assumptions, broken flows, UX problems, crash risks, unstable call handling, backend/frontend contract mismatches, deployment issues, security gaps, and performance concerns.

Please audit the following areas:

1. Frontend UX and Stability
- React + TypeScript implementation quality
- Embedded dialer behavior
- SIP registration and reconnect handling
- Outgoing/incoming call flows
- Active call controls: mute, hold, transfer, DTMF, hangup
- Disposition modal behavior after calls
- Disposition modal prefill behavior when an existing disposition already exists
- Call history accuracy and filtering
- Callback/disposition/contact workflows
- Callback datetime collection and validation behavior in the disposition UI
- Dashboard, reports, campaigns, contacts, sidebar, notifications
- Electron-specific behavior
- Responsive layout and visual polish
- Toasts, modals, loading states, and error states
- Any UI state that can become stuck or inconsistent

2. Backend Reliability
- Node.js/Express route correctness
- Auth and role authorization
- JWT/session security
- Prisma schema and migrations
- PostgreSQL/Supabase connection assumptions
- Calls, campaigns, contacts, callbacks, DNC, reports, agents
- Data consistency between calls/dispositions/callbacks/contacts
- Disposition transaction safety: call update, contact update, and callback create/update should complete atomically
- Callback transition cleanup: changing a call from CALLBACK to a non-callback disposition should cancel pending/rescheduled callbacks and clear contact callbackAt
- Callback duplicate prevention: same callId should update existing pending/rescheduled callback instead of creating duplicates
- Agent fallback handling for old/manual calls where call.agentId is null
- Error handling and validation
- API validation: CALLBACK disposition should require callbackAt
- Logging quality
- Build/start/deploy reliability
- Environment variable assumptions

3. Frontend/Backend Contract
- Check every frontend Axios/API call against backend route behavior
- Verify request/response shapes
- Confirm pagination/filtering/search/date range behavior
- Confirm disposition and callback data persists and reloads correctly
- Confirm saved dispositions display in Call History and re-open prefilled in the modal
- Confirm non-callback disposition clears any existing callback schedule
- Confirm callback changes are persisted by PATCH /api/calls/:id/disposition, not by a separate frontend-only callback write
- Identify any silent failures or fallback behavior that hides real problems

4. SIP/Telephony Readiness
- SIP.js/WebRTC lifecycle
- SIP account registration and unregister flows
- WebRTC media handling
- FreePBX integration assumptions
- provider/PSTN outbound flow assumptions
- Call logging accuracy
- Hangup/disconnect edge cases
- Trial/verified-number limitations
- Behavior during network drop, backend down, SIP unregistered, or FreePBX unavailable

5. Market-Readiness Risks
- Anything that could crash during live calling
- Anything that could confuse users
- Any missing confirmation dialogs
- Any dangerous silent failure
- Any UX friction for agents
- Any issue that could create wrong call records or missed dispositions
- Any issue that could leave stale callbacks active after a disposition is changed
- Any deployment/config issue that could break production

Please provide:
- Critical issues first
- High/medium/low severity findings
- Exact file references and line numbers where possible
- Recommended fixes
- Suggested test cases
- A final go/no-go market-readiness assessment
