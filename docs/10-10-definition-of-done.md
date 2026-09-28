# Actions-Tracker 10/10 — Definition of Done

## Product gate

A new user can install Actions-Tracker, explain intent, approve an initial operating system, act, generate evidence, receive calibrated measurements, ask grounded questions, approve bounded actions, learn from interventions, connect external data, recover from failures/upgrades, and complete critical journeys reliably on supported web and Android environments.

## Engineering gates

- [ ] Unit/property/scenario suite green
- [ ] Production build green
- [ ] Version contract green
- [ ] Persistence round-trip green
- [ ] Today → action → evidence closed
- [ ] Goal → plan → action → evidence → progress → adaptation closed
- [ ] Calibration is deterministic and longitudinal
- [ ] Intervention outcomes influence future recommendations
- [ ] Proactive signals have evidence and deterministic reasons
- [ ] No critical unresolved architectural debt

## Security gates

- [ ] Model output never directly mutates durable state
- [ ] Authorization enforced outside the model
- [ ] High-impact actions require explicit approval
- [ ] Prompt injection tests pass
- [ ] Untrusted-content/context-poisoning tests pass
- [ ] Structured-output validation rejects malformed actions
- [ ] Sensitive-data disclosure tests pass
- [ ] Excessive-agency tests pass
- [ ] Secrets are never written to browser localStorage or telemetry

## Persistence gates

- [ ] Fresh install
- [ ] Existing-install upgrade
- [ ] Backup/restore
- [ ] Corrupt/checksum-invalid backup
- [ ] Interrupted restore
- [ ] Browser refresh
- [ ] PWA update
- [ ] Android update
- [ ] Kill/reopen
- [ ] Semantic data snapshot remains intact

## Device gates

- [ ] 360/393/412/432px responsive audit
- [ ] Android install/first boot
- [ ] Keyboard/back button
- [ ] Background/foreground/kill/reopen
- [ ] Permissions/revocation
- [ ] Offline/online
- [ ] Text scaling
- [ ] Reduced motion
- [ ] TalkBack critical journeys

## Integration gates

- [ ] Health Connect real permission lifecycle
- [ ] Health Connect initial/incremental/replay/revocation
- [ ] NutriLift real initial/incremental/replay/retraction/reconnect
- [ ] Provider provenance preserved
- [ ] Duplicate provider facts rejected

## E2E gates

- [ ] New-user journey
- [ ] Jarvis action/approval/undo
- [ ] Calibration day 1/3/7/14/30 fixtures
- [ ] Intervention learning journey
- [ ] Upgrade journey
- [ ] Failure/recovery journey

## Release gates

- [ ] Release certificate records commit and CI run
- [ ] Test evidence retained
- [ ] Android artifact retained
- [ ] Device/accessibility evidence retained
- [ ] Integration evidence retained
- [ ] Known limitations documented
- [ ] Final release approval recorded

## Architecture freeze rule

No new major subsystem should be introduced unless it is required to satisfy an existing gate or repair a demonstrated correctness/security defect.
