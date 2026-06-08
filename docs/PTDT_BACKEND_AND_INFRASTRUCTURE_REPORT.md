# PTDT-Dialer Backend and Infrastructure Implementation Report

Date: May 23, 2026  
Repositories: `dialer-backend`, `dialer-frontend` integration points  
Scope: Backend API sync, Prisma/schema work, call persistence, callbacks, reports, DNC, disposition plumbing, Railway build setup, PM2 local backend, FreePBX, Asterisk, SIP trunking, and SIP trunking.

## Executive Summary

The backend and infrastructure work converted PTDT-Dialer from a mostly frontend/SIP-console workflow into a backend-synced CRM dialer stack. The backend gained endpoints and schema support for DNC management, callbacks, reports, self-profile updates, call logging, SIP disposition handoff, and frontend contract alignment.

The infrastructure work culminated in a successful outbound PSTN call from the PTDT-Dialer through FreePBX and SIP trunking to a verified US number. The final blocker was not frontend code or provider credentials; it was FreePBX VM network routing. The VM had its default gateway incorrectly set to its own IP address. Once the gateway and DNS were corrected, the provider SIP trunk domain resolved and the first PSTN call succeeded.

## Starting Point

The backend already existed with authentication and base dialer functionality, but several frontend phases required backend contract support.

Missing or incomplete areas included:

- Backend-backed DNC management.
- Backend callbacks.
- Reports endpoints.
- `PATCH /api/agents/me`.
- SIP call logging endpoint support.
- Disposition persistence alignment.
- Callback creation from disposition.
- Calls endpoint contract consistency.
- Railway build/start command certainty.
- Local backend PM2 process clarity.
- FreePBX outbound PSTN route/trunk configuration.

## Backend Feature Work

### 1. DNC Manager

Implemented backend support for `/api/dnc`.

Added:

- DNC service.
- DNC controller.
- DNC route.
- Phone normalization.
- Pagination/search.
- `addedByUserId` tracking.

Purpose:

- Allow the frontend to manage blocked/do-not-call numbers through real backend data.

### 2. Callback API

Implemented backend support for `/api/callbacks`.

Added:

- Callback service.
- Callback controller.
- Callback route.
- Callback status enum/model in Prisma.
- Agent-specific visibility.
- Admin/supervisor broader visibility.
- Create/list/update/reschedule support.

Purpose:

- Allow disposition workflow to schedule callbacks and make the Callbacks page backend-backed.

### 3. Reports API

Implemented backend support for `/api/reports`.

Added endpoints:

- `/summary`
- `/calls`
- `/campaigns`
- `/agents`

Purpose:

- Provide KPI, time-series, campaign, and agent performance data to frontend reporting/dashboard pages.

### 4. Agent Self-Profile Update

Added `PATCH /api/agents/me`.

Supported fields:

- `name`
- `phone`
- `extension`

Protected fields:

- `role`
- `isActive`

Purpose:

- Allow profile updates without allowing self-escalation.

### 5. Call Contract Sync

The frontend required reliable call persistence and disposition updates.

Backend contract work included:

- Ensuring `POST /api/calls` exists for SIP/manual call logging.
- Ensuring call history response fields match frontend needs.
- Supporting disposition update flow.
- Supporting backend-owned callback creation/update from the disposition workflow when `disposition=CALLBACK` and `callbackAt` are supplied.
- Running call disposition update, contact status update, and callback create/update inside a single Prisma transaction.
- Falling back to the authenticated user when old/manual call records do not have `agentId`.
- Preventing duplicate callbacks by updating the existing pending/rescheduled callback for the same call before creating a new one.
- Cancelling pending/rescheduled callbacks and clearing contact `callbackAt` when a call is changed from `CALLBACK` to a non-callback disposition.
- Requiring `callbackAt` at API validation level when disposition is `CALLBACK`.

This was part of the contract-sync cleanup that aligned frontend expectations with backend API behavior.

### 6. Disposition and Callback Consistency Hardening

The disposition workflow was hardened after QA review to avoid stale or partial CRM state.

Implemented behavior:

- `PATCH /api/calls/:id/disposition` is the single backend-owned write path for call disposition, contact status, and callback scheduling.
- The backend updates the call, updates the related contact, and creates/updates/cancels callbacks inside `prisma.$transaction`.
- If a call has no `agentId`, callback ownership falls back to the authenticated user.
- If disposition is `CALLBACK` and callback datetime is supplied, the backend updates the latest pending/rescheduled callback for that call or creates a new one.
- If disposition changes away from `CALLBACK`, pending/rescheduled callbacks for that call are marked `CANCELLED`.
- The related contact's `callbackAt` is set for `CALLBACK` and cleared for non-callback dispositions.
- API validation now requires `callbackAt` when disposition is `CALLBACK`.

Why this matters:

- Prevents partial saves where the call disposition changes but the callback/contact state does not.
- Prevents duplicate active callbacks for the same call.
- Prevents stale callbacks remaining active after an agent changes the disposition.
- Keeps frontend/backend responsibility clean: frontend collects the data; backend owns persistence and consistency.

## Prisma and Database Work

Prisma work included:

- Adding `Callback` model.
- Adding `CallbackStatus` enum.
- Adding DNC relation changes.
- Adding user/contact/call back-relations.
- Running Prisma generate.
- Verifying backend build after schema restore.

Important incident:

- `npx prisma db pull` was run and overwrote `schema.prisma`, temporarily removing the custom `CallbackStatus` enum.
- This caused build errors:

```text
@prisma/client has no exported member named 'CallbackStatus'
```

Resolution:

- Restored the intended schema.
- Ran `npx prisma generate`.
- Re-ran backend build successfully.

Lesson:

- Do not commit a db-pulled schema over the designed app schema without review.

## Railway and Deployment Setup

Frontend Railway build command was visible as:

```bash
npm run build
```

Backend Railway initially did not clearly show the same build command, which was risky because backend start script depends on compiled `dist`.

Backend package behavior:

- Build compiles TypeScript and generates Prisma client.
- Start runs the compiled backend from `dist`.

Important deployment requirement:

```bash
npm run build
npm start
```

Railway backend was later configured with:

- Build Command: `npm run build`
- Start Command: `npm start`

This matters because `dist/` should not be depended on as a committed generated artifact unless the platform does not build.

## PM2 Local Backend

Local PM2 initially had no process:

```text
Process or Namespace dialer-backend not found
```

Then backend was started under PM2:

```text
id 0
name dialer-backend
status online
```

Health check verified:

```bash
curl http://localhost:3001/api/health
```

Returned:

```json
{"success":true,"message":"PTDT Dialer API is healthy"}
```

Root route returned expected `Route not found`, which is acceptable because the API health route is the valid check.

## FreePBX / Asterisk / provider PSTN Work

### Architecture

Final call path:

```text
PTDT-Dialer Electron/Browser
  -> SIP over WebSocket
  -> FreePBX extension 1001
  -> FreePBX outbound route
  -> PJSIP trunk ptdt-dialer
  -> SIP trunk provider
  -> PSTN verified US number
```

### Roles Clarified

Extension `1001`:

- Browser/PTDT-Dialer SIP login.
- Used for PTDT-Dialer to register with FreePBX.
- Not the SIP trunk credential.

SIP trunk credential:

- Used by FreePBX to authenticate outbound calls to provider.
- Belongs in FreePBX PJSIP trunk auth fields.

provider outbound DID:

- Trial number/caller ID: `+12405404427`
- Verified destination used during testing included `+15512943079`.

### FreePBX Outbound Route

Route matched correctly:

```text
_ROUTENAME=sip-outbound
DIAL_NUMBER=+15512943079
OUTNUM=+15512943079
TRUNKCIDOVERRIDE=+12405404427
```

This confirmed:

- Dialed 10-digit number was rewritten to E.164.
- Outbound route selected the SIP trunk.
- Caller ID was applied.

### SIP trunk provider

Trunk:

```text
PTDT FreePBX Trunk
```

Termination SIP URI:

```text
<provider-sip-domain>
```

Important distinction:

- `<provider-sip-domain>` is the Elastic SIP Trunk termination URI for FreePBX outbound calls.
- Other SIP domains seen in provider UI may relate to Programmable Voice/SIP Domain and should not be confused with the trunk termination URI.

### FreePBX Trunk Settings

General expected settings:

```text
Authentication: Outbound
Registration: None
SIP Server: <provider-sip-domain>
SIP Server Port: 5060
Transport: 0.0.0.0-udp
Context: from-pstn
Username/Auth Username: provider credential username
Secret: provider credential password
```

Advanced expected settings:

```text
From Domain: <provider-sip-domain>
From User: +12405404427
Client URI: sip:<provider-credential-username>@<provider-sip-domain>
Server URI: sip:<provider-sip-domain>
Rewrite Contact: No
Qualify Frequency: 0
```

Codecs:

```text
ulaw
alaw optional
```

## Major Infrastructure Problems and Solutions

### Problem 1: SIP Failed Because FreePBX Was Not Running

Observed:

```text
WebSocket closed wss://pbx.ptdt.taxi:8089/WS code 1006
```

Resolution:

- FreePBX was launched.
- SIP registration succeeded.

### Problem 2: Provider SIP Calls Did Not Ring

Initial suspicion included:

- provider trial limitation.
- Caller ID.
- Trunk authentication.
- SIP URI.
- FreePBX route.

Investigation showed the route worked inside FreePBX but the trunk did not send traffic outward.

### Problem 3: Trunk Was Unavailable

Asterisk showed:

```text
Endpoint: ptdt-dialer Unavailable
```

And calls failed with:

```text
DIALSTATUS = CHANUNAVAIL
HANGUPCAUSE = 18
```

or:

```text
DIALSTATUS = CONGESTION
HANGUPCAUSE = 34
```

This showed FreePBX was failing before a useful provider response could be captured.

### Problem 4: Asterisk Could Not Resolve provider Hostname

Final useful error:

```text
getaddrinfo("<provider-sip-domain>", "(null)", ...): Name or service not known
Identify 'ptdt-dialer' failed when adding resolution results of '<provider-sip-domain>'
Could not create an object of type 'identify' with id 'ptdt-dialer'
```

This proved the FreePBX machine had DNS/network resolution issues.

### Problem 5: DNS Servers Were Set But Still Unreachable

DNS was set to:

```text
1.1.1.1
8.8.8.8
```

But:

```text
nslookup <provider-sip-domain>
;; connection timed out; no servers could be reached
ping google.com
Name or service not known
```

This showed the problem was not only DNS configuration.

### Problem 6: Gateway Was Wrong

The real root cause:

```text
default via 192.168.0.107 dev eth0
IP4.GATEWAY: 192.168.0.107
```

The FreePBX VM was using itself as the default gateway.

Resolution:

```bash
nmcli con mod eth0 ipv4.method manual
nmcli con mod eth0 ipv4.addresses 192.168.0.107/24
nmcli con mod eth0 ipv4.gateway 192.168.0.1
nmcli con mod eth0 ipv4.dns "1.1.1.1 8.8.8.8"
nmcli con mod eth0 ipv4.ignore-auto-dns yes
nmcli con up eth0
```

Verification:

```text
default via 192.168.0.1 dev eth0
ping 1.1.1.1 OK
nslookup google.com OK
nslookup <provider-sip-domain> OK
```

Provider SIP domain resolved to:

```text
54.172.60.0
54.172.60.1
54.172.60.2
54.172.60.3
```

### Final Result

After fixing gateway and DNS, the first outbound PSTN call went through successfully.

This confirmed:

- PTDT-Dialer SIP registration works.
- FreePBX receives browser SIP calls.
- Outbound route transforms dialed number correctly.
- Trunk selection works.
- Caller ID is applied.
- FreePBX can resolve and reach provider.
- SIP trunk provider can complete the outbound call to the verified US number.

## Commands Worth Keeping

Network verification:

```bash
ip addr show eth0
ip route
cat /etc/resolv.conf
nmcli dev show eth0 | grep -E 'IP4.ADDRESS|IP4.GATEWAY|IP4.DNS'
ping -c 2 192.168.0.1
ping -c 2 1.1.1.1
nslookup google.com
nslookup <provider-sip-domain>
```

FreePBX static network fix:

```bash
nmcli con mod eth0 ipv4.method manual
nmcli con mod eth0 ipv4.addresses 192.168.0.107/24
nmcli con mod eth0 ipv4.gateway 192.168.0.1
nmcli con mod eth0 ipv4.dns "1.1.1.1 8.8.8.8"
nmcli con mod eth0 ipv4.ignore-auto-dns yes
nmcli con up eth0
```

Asterisk diagnostics:

```text
asterisk -rvvvvv
pjsip set logger on
pjsip show endpoint ptdt-dialer
pjsip show aor ptdt-dialer
pjsip show auth ptdt-dialer
```

Backend verification:

```bash
npx prisma generate
npm run build
curl http://localhost:3001/api/health
pm2 list
pm2 logs dialer-backend --lines 80
```

## Final Backend and Infrastructure Status

Backend/API status:

- Build passes.
- Prisma client generates.
- Local PM2 backend runs.
- Health endpoint responds.
- Frontend/backend call-history/disposition/callback contracts are aligned.
- Callback scheduling is owned by `PATCH /api/calls/:id/disposition`; the backend creates or updates a pending callback for the call when a callback disposition is saved.
- Disposition/callback writes are transaction-safe.
- Non-callback disposition changes cancel stale pending/rescheduled callbacks and clear contact callback dates.
- `CALLBACK` disposition requires a callback datetime at API validation level.

FreePBX/SIP trunk status:

- FreePBX static IP configured.
- Gateway corrected.
- DNS corrected.
- SIP trunk domain resolves.
- Outbound PSTN call succeeded to a verified US number.

The stack is now confirmed end-to-end from frontend SIP call initiation through backend-supported CRM workflows and real PSTN outbound calling.

## Report Verification Notes

- FreePBX gateway, DNS, SIP trunk, PM2 runtime, and Railway behavior are operational environment findings. They were verified through live commands/logs and successful call testing, not solely through repository source code.
- Repository source code verifies the API routes, Prisma schema, frontend screens, and client/server contracts. Live telephony success also depends on external FreePBX/SIP trunk/network configuration remaining intact.
