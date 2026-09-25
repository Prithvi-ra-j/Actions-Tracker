# Actions-Tracker Guide Completion Audit

Date: 2026-09-25
Repository: Prithvi-ra-j/Actions-Tracker
Audited ref: main at `e4b295e46d7ac19a95d448bd211fe3c46a715452`
Basis: `references/actions-tracker-redesign-guide.md` + `references/actions-tracker-build-plan.md` + current repository contents.

## Verdict

The redesign is **not yet 100% implemented**. The domain/persistence foundation is strong and the P0/P1/P2 work covers a large portion of the requested architecture, but several guide requirements remain partial or missing. One concrete integration defect was found and fixed on this audit branch: `ACTION_TYPES` was consumed by `capabilityRegistry.js` but was not exported by `actionSchemas.js`.

Production verification is also incomplete: the audited main commit currently reports a failing Vercel status and no GitHub Actions workflow run was available for that commit. Therefore this audit does not mark CI/build as green.

## Status legend

- **DONE**: implementation and repository evidence support the guide requirement.
- **PARTIAL**: meaningful implementation exists, but one or more required behaviors/states/visual rules are incomplete.
- **MISSING**: the guide requirement is not implemented or cannot be evidenced from the repository.
- **BLOCKED**: cannot be marked done until runtime/device/CI verification is available.

## Step-by-step matrix

| Step | Requirement | Status | Evidence / gap |
|---|---|---|---|
| 0 | Repo audit, surface/file map, feasibility register, 360/390/432 baseline, flag strategy, green baseline tests | PARTIAL | Repository-side baseline is now implemented in `references/step-0-engineering-baseline-2026-09-25.md`, including surface/state/test/CI inventory, feasibility register, responsive QA contract and centralized feature flags. Runtime screenshots/device evidence and green CI remain verification gates. |
| 1 | Tokens, self-hosted Geist, Phosphor icons, safe area, 100dvh, reduced motion | PARTIAL | CSS tokens, safe-area, 100dvh and reduced-motion exist; Geist dependency exists; icon package is used. Self-host/offline font verification and elimination of all one-off styling are not proven. |
| 2 | Complete shared primitive set + hidden dev state route + accessibility | PARTIAL | Dev primitive page and most primitives exist. UndoToast is not a dedicated primitive; several pages still use inline implementations; full screen-reader verification is not proven. |
| 3 | 5-tab shell, docked Jarvis, Settings, preserved drafts/scroll/context, Android back/safe areas | PARTIAL | 5-tab shell, docked Jarvis, Settings and back-handler infrastructure exist. Draft/scroll preservation across every tab and keyboard/sheet overlap require runtime verification. |
| 4 | Global loading/empty/error/success/undo + lifecycle banners | PARTIAL | States and global banners exist. A complete single toast/undo queue and all lifecycle notices wired across every relevant flow are not evidenced. |
| 5 | Today complete/uncomplete, evidence, details, overload, empty/no-history, create/edit | PARTIAL | Evidence composer, contextual Jarvis, detail/reason sheets and overload/empty states exist. Full create/edit quest/habit flow and verified optimistic rollback are incomplete/not evidenced. |
| 6 | Stats radar, six axis sheets, trends/contribution/evidence, text alternative, no overall score | PARTIAL | Radar, six-axis list/sheet, trends/contributions/evidence and Why→Jarvis exist. The chart accessibility/text-equivalent contract is not fully evidenced. |
| 7 | Goals lifecycle and complete detail model | PARTIAL | Goal cards/detail, milestones, evidence, Jarvis and destructive confirmation exist. Create/edit/pause/revise-target and supporting-object/blocker lifecycle is incomplete. |
| 8 | Typed JarvisEntryContext + all page entry points + context chip | DONE/PARTIAL | Canonical context object and Today/Stats/Goals/Learn/Audits entry points exist; Jarvis displays a context-attached UI. Runtime correctness of every context payload still needs tests. |
| 9 | Proposal UI, impact, real swipe, edit, destructive hold, receipt/undo, plan, full lifecycle | PARTIAL | Proposal/impact/edit UI, pointer swipe, executor and receipt/undo exist. Edit sheet is placeholder-like; a dedicated UndoToast primitive is absent; lifecycle coverage and idempotency need end-to-end tests. |
| 10 | Nine Jarvis screens, mode sheet, history, slash palette, keyboard/error/offline, contract | PARTIAL | History, chat, mode selection, slash registry, context, provenance, proposals and error handling exist. Home masonry, review stories, plan board, keyboard-specific behavior and some state fidelity are incomplete. |
| 11 | Learn creation/resources/practice/evidence/review/convert-to-quest | PARTIAL | Five-step loop and evidence logging exist. Create-topic, resource management, retention/review flow and convert-objective-to-quest are not complete. |
| 12 | Audits filters/finding/progress/resolved/ignore + proposal-only fix | PARTIAL | Filters/resolved/ignore/Review-fix/Jarvis paths exist. Run-audit progress and full evidence/correction workflow require completion/verification. |
| 13 | Settings AI/data/memory/integrations/appearance/diagnostics/version | PARTIAL | Most sections exist, but AI menu currently routes through the Integrations section key; backup/storage status contains hardcoded UI state; AI key masking lifecycle can leave a masked value in state. |
| 14 | Conversational onboarding + stored setupState + no invented habits + update-safe | PARTIAL | Existing onboarding architecture and `jarvis_design_pending` are present; full 7-stage UX and update/restart verification are not complete. |
| 15 | Provenance across Stats/Goals/Audits/Jarvis | PARTIAL | Evidence/provenance infrastructure exists and Jarvis has a Based-on sheet. Equivalent inspection coverage across every required surface is incomplete. |
| 16 | Accessibility pass incl. 130%, reduced motion, chart alternatives, TalkBack | PARTIAL | Focus trapping, focus restoration, reduced motion and labels exist. Full 130%/TalkBack/device smoke pass is not verified. |
| 17 | Ten critical interaction journeys | PARTIAL | Existing UI journey tests plus domain tests exist, but the complete guide-required journey set is not represented as end-to-end tests. |
| 18 | 360/390/432 + A52 keyboard/back/safe area/font/performance | BLOCKED | No current automated/device evidence proving the complete matrix. |
| 19 | IndexedDB/migrations/signing identity + real-data in-place update + release notes | PARTIAL/BLOCKED | Migration/backup foundations exist and onboarding state is data-backed. Real-data in-place upgrade and signing identity verification are not evidenced. |

## Data Feasibility Register

| Element | Result | Treatment |
|---|---|---|
| XP/Level | Partial | Existing app has level/stat infrastructure, but Today does not use the guide's mock XP values as fake data. |
| Main/side quest | Partial | Quest priority/type exists in parts of the domain; UI usage is not fully aligned with guide. |
| Next line | Partial | Not consistently supported; should remain omitted where no real next action exists. |
| Capacity/projected change | Exists/partial | Impact engine provides capacity data; UI wiring needs consistency checks. |
| Axis value/trend | Exists | Snapshot/stat infrastructure and Stats UI exist. |
| Contribution | Exists/partial | Axis details expose components; presentation is not fully equivalent to mock. |
| Learning loop step | Exists | Learning mastery is used for five-step UI. |
| Streak | Exists | Occurrence enrichment exposes streak; should be retained only when backed by history. |
| Provenance | Partial | Claims/context references exist; every surface does not yet expose inspectable provenance. |
| Auto mode | Partial | Mode UI exists, but auto-detection/override semantics need end-to-end verification. |
| Undo | Exists/partial | Executor returns action fact IDs and Jarvis exposes Undo; reusable UndoToast is missing. |
| Verified/latency | Exists | `verifyLLMConnection` exists and Settings renders real result data. |
| Backup status | Partial | `backupService` persists last backup date, but Settings currently initializes a hardcoded status instead of reading it. |

## Concrete blockers found

### B1 — Fixed on audit branch
`src/core/ai/actionSchemas.js` declared `ACTION_TYPES` without exporting it, while `src/core/ai/capabilityRegistry.js` imports it. The audit branch now exports it.

### B2 — Settings AI navigation
The main Settings menu currently routes the AI row through `setActiveSection('integrations')` even though a separate `ai` section exists. This is a wiring defect and should be corrected.

### B3 — Settings backup status is not truthful
Settings initializes the backup status to a hardcoded timestamp. The guide explicitly requires backup state to match `backupService`. The service already stores `lastAutoBackupDate`; Settings should read it.

### B4 — Settings API-key editing lifecycle
Settings masks the API key by putting bullet characters into the same state used by the password input after save. A later Verify operation can therefore attempt to verify the mask rather than the stored key. The UI needs separate configured-state and editable-input state.

### B5 — Proposal edit UI is not a complete editor
`EditProposalSheet` currently renders the proposal name as a non-editable representation and its comment explicitly describes it as a placeholder. This does not meet the guide's edit-proposal requirement.

### B6 — Proposal icon rule
`ProposalUI.jsx` still contains hand-authored inline SVG icons. The guide explicitly requires Phosphor icons rather than hand-drawn SVG UI icons.

### B7 — Impact segmented bar API mismatch
`ImpactDetailSheet` passes `fill`/ `total` to `SegmentedBar`, while the current primitive accepts `value`/ `projected`/ `segments`. This means the impact visualization is not wired according to the primitive contract.

### B8 — Dedicated UndoToast primitive
The guide names Receipt + UndoToast as a shared primitive. Current Jarvis has a local receipt implementation instead. This should be extracted and reused.

### B9 — Learn completion gaps
The five-step learning loop and evidence capture are implemented, but creation, resource management, retention/review and objective-to-quest conversion are not fully implemented.

### B10 — Device/visual verification
No evidence currently proves the complete 360/390/432 + A52 keyboard/back/safe-area/font-scale/performance matrix.

## Step 0 update

The repository-side Step 0 baseline has now been implemented. Added:
- `references/step-0-engineering-baseline-2026-09-25.md`
- `src/core/featureFlags.js`
- `tests/unit/featureFlags.test.js`

The feature flag registry is the single source for controlled rollout flags. The 360/390/432 and A52 requirements are recorded as explicit QA contracts rather than represented as completed runtime evidence.

## Step 1 update

Implemented on the audit branch:
- semantic color, spacing, radius and typography token foundation in `src/index.css`;
- JS token bridge aligned in `src/theme.js`;
- Geist + Geist Mono loaded from the installed `geist` package in `src/main.jsx`;
- safe-area, `100dvh`, text-size adjustment and reduced-motion foundations;
- token development page updated to exercise the canonical token names;
- checkbox keyboard semantics and shared loading spinner utility improved.

Step 1 repository implementation is complete. Runtime visual/device verification remains an evidence gate for the overall release, not a reason to leave the token foundation unfinished.

## Step 1 completion update

The shared foundation has now been extended into the common primitives: control heights, pill radius, motion tokens, state/overlay spacing, and proposal chip geometry. Geist is loaded from the installed package and Jarvis uses the shared typography foundation. No new icon system was introduced; the existing Phosphor dependency remains the canonical icon library.

**Step 1 status: IMPLEMENTED.**

## Recommended completion order

1. Fix B2-B8 and add targeted tests.
2. Complete Goals lifecycle.
3. Complete Learn lifecycle.
4. Complete Audits run/proposal workflow.
5. Finish Jarvis missing screens/states.
6. Normalize shared primitives and remove remaining hand-drawn/one-off UI.
7. Add the guide-required interaction journeys.
8. Run 360/390/432 visual QA and A52 device QA.
9. Run production build/CI and resolve Vercel failure.
10. Perform real-data upgrade/restore test and write release notes.
11. Re-run this audit; only then mark the project complete.

## Verification limitation

This audit was performed against repository source and GitHub metadata. A local `npm test`/Vite build could not be independently run in the current environment because repository cloning/network DNS was unavailable. GitHub currently reports a failing Vercel status for the audited main commit and no associated GitHub Actions workflow run was returned.

## Completion gate

Do **not** label the redesign "complete" until:
- every row above is DONE,
- all critical journeys pass,
- 360/390/432 screenshots are reviewed,
- A52-class Android smoke test passes,
- CI/build is green,
- real-data upgrade preserves IndexedDB data and onboarding state,
- no guide deviations remain undocumented.
