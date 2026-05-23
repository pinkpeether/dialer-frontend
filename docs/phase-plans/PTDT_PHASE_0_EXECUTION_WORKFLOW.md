# PTDT-Dialer Phase 0 — Execution Workflow

Date: May 24, 2026  
Scope: How PTDT-Dialer phase-wise implementation should be executed safely across `dialer-frontend` and `dialer-backend`.

## Recommendation

Do not implement major changes by dropping one large ZIP into the repos.

Use a controlled GitHub workflow:

1. Create one small branch per feature or fix.
2. Keep frontend and backend changes separated where possible.
3. Build locally after each small change.
4. Push to GitHub.
5. Let Railway/GitHub status verify build/deploy.
6. Test the exact workflow.
7. Merge only after the feature passes its checklist.

This prevents large unknown changes from creating many TypeScript squiggles, broken contracts, or deployment failures at once.

## Preferred Workflow

### Step 1 — Planning Files

Maintain phase plan documents under:

```text
docs/phase-plans/
```

Recommended files:

```text
PTDT_PHASE_0_EXECUTION_WORKFLOW.md
PTDT_PHASE_1_LAUNCH_CRITICAL.md
PTDT_PHASE_2_PRO_OPERATIONS.md
PTDT_PHASE_3_AI_ENTERPRISE.md
```

### Step 2 — Feature Branches

Use one branch per feature:

```text
phase1/sip-failure-hardening
phase1/disposition-regression-tests
phase2/retry-scheduler
phase2/recordings-module
phase3/transcription-ai-summary
```

Avoid pushing experimental code directly to `main` unless the change is documentation-only or extremely small.

### Step 3 — Implementation Size Rule

Each PR should ideally contain:

- 1 feature or 1 bug fix
- 1 clear test checklist
- frontend-only or backend-only if possible
- if full-stack, backend contract first, frontend second

### Step 4 — Build Rule

Before pushing any code change:

Frontend:

```bash
npm run build
```

Backend:

```bash
npm run build
```

For backend schema changes:

```bash
npx prisma generate
npm run build
```

### Step 5 — Contract Rule

For any frontend/backend feature:

1. Define API contract first.
2. Add backend route/service/schema if needed.
3. Confirm API response shape.
4. Add frontend API wrapper.
5. Add UI.
6. Test reload/persistence.

### Step 6 — Regression Rule

Every launch-critical feature must be checked against:

- login/session
- agent role access
- admin role access
- call logging
- call history reload
- disposition workflow
- callback workflow
- SIP registration
- build/deploy status

## Why Not One ZIP?

A single ZIP is useful for documentation exports, but risky for source-code implementation because:

- it can overwrite existing working files
- it can create many TypeScript errors at once
- it makes bugs hard to isolate
- it makes rollback harder
- it can break frontend/backend contracts silently
- it can trigger deployment failure without knowing which change caused it

Use ZIP only for:

- downloadable docs
- generated checklists
- planning bundles
- handoff material

Use branches/PRs for code.

## Recommended Launch Path

### Phase 1 First

Do not add Phase 2 or Phase 3 features until Phase 1 is stable.

Phase 1 goal:

```text
Stable SIP CRM Dialer
```

Minimum requirement:

- Stable calling
- Stable call logging
- Stable disposition/callback workflow
- Stable campaign/contact/DNC basics
- Stable roles/auth
- Stable deployment
- No fake success states

### Phase 2 After Pilot

Phase 2 should start after a controlled real-use pilot.

Phase 2 goal:

```text
Professional Call Center Operations
```

Focus:

- retry scheduler
- campaign scheduling
- timezone enforcement
- recording playback/download/storage
- exports/reports
- audit logs
- system settings

### Phase 3 After Real Feedback

Phase 3 should start after real users confirm the core workflow.

Phase 3 goal:

```text
AI + Supervisor + Enterprise Platform
```

Focus:

- transcription
- AI summaries
- sentiment
- whisper/barge
- live monitoring
- leaderboard
- auto-updater
- enterprise settings

## Suggested Work Cycle

For each item:

1. Create issue or checklist item.
2. Implement small code change.
3. Build.
4. Test manually.
5. Push.
6. Check deploy status.
7. Fix errors.
8. Mark item complete.

## Final Rule

Do not chase 100+ features before launch.

First launch a trustworthy v1.0, then expand.
