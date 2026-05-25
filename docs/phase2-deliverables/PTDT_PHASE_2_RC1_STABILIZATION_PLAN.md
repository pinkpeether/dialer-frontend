# PTDT-Dialer Phase 2 RC-1 Stabilization Plan

Status: Ready to begin RC-1 stabilization

## Purpose

Phase 2 Pilot 1–4 work is complete. The next step is not another feature pack. The next step is a release-candidate stabilization cycle.

RC-1 goal:

- freeze new features
- run full regression
- fix blockers/high issues only
- verify Electron performance
- verify production safety
- prepare release notes
- decide whether Phase 2 is production-pilot ready

## Current latest known commits

| Repo | Commit | Notes |
|---|---|---|
| Frontend | dca8f15 | Lighten dialer rendering effects |
| Backend | ea69754 | Fix reports trend query and agent status persistence |

## Feature freeze rule

During RC-1, do not add new product features unless they fix a blocker.

Allowed changes:

- bug fixes
- performance fixes
- auth/permission fixes
- data correctness fixes
- deployment/config fixes
- critical UI clarity fixes

Not allowed during RC-1:

- new dialing mode features
- new report modules
- new recording provider changes
- new AI/transcription features
- major UI redesign

## RC-1 acceptance

RC-1 can be marked passed when:

- backend and frontend deploy statuses are green
- Phase 1 launch-critical smoke passes
- Campaigns create/detail/delete/status flow passes
- Progressive/Predictive/Preview mode smoke passes
- Reports/Ops/Exports smoke passes
- Notifications smoke passes
- Recordings smoke passes
- Electron lag is acceptable after performance settings
- no open blocker/high issue remains

## Recommended workflow

1. Pull latest main on both repos.
2. Run local builds.
3. Run API smoke commands.
4. Run UI smoke manually.
5. Run one live call/disposition regression.
6. Record bugs using the RC-1 bug triage template.
7. Fix only blocker/high bugs.
8. Re-run impacted smoke tests.
9. Prepare release notes.

## RC-1 verdict options

```text
PASSED
PASSED WITH NOTES
FAILED - BLOCKERS REMAIN
```
