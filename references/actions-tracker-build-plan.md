# Actions-Tracker Redesign: Step-by-Step Build Plan

Pair this file with `actions-tracker-redesign-guide.md`. The guide holds the design system, page specs and all mockup source (Appendices A to D) and the original spec (Appendix C). This plan says **what to build, in what order, and how to prove each step is done**. If you only received this file, ask for the guide before writing code.

## 0. How to work (for the AI implementer)
1. Do **one step per session**. Do not start the next step until the current one meets its "Done when".
2. Each step follows the loop: **inspect the repo, propose a file list, implement, verify, report**. Wait for approval of the file list on steps that touch more than 10 files.
3. Never change domain logic, repositories, IndexedDB name, schema versions or migrations, backup/restore, action schemas, the executor or the Jarvis response contract `{message, proposal, claims}`. If a step seems to need that, stop and report.
4. If a mockup shows data the app does not have, use the **Data Feasibility Register (section 3)**: omit the element or show a neutral version. Never fabricate numbers.
5. If the guide and the code disagree, or two parts of the guide disagree, stop and ask.
6. Report format after every step: (a) files changed, (b) what now works, (c) verification results at 360/390/432px, (d) tests added/run, (e) deviations from the guide, (f) open questions.

**Prompt template for each session**
> Read `actions-tracker-redesign-guide.md` and `actions-tracker-build-plan.md`. Implement **Step N only**. First list every file you will touch and any register items (section 3) that apply. Then implement, verify, and report in the format in section 0. Do not touch domain logic. Ask before deviating.

## 1. Open decisions (defaults apply if unanswered)
| # | Question | Default |
|---|---|---|
| D1 | The spec lists Jarvis as a sixth primary destination; the design uses 5 tabs + a docked "Ask Jarvis" pill. Keep the pill? | Keep the pill. It opens full-screen Jarvis; the header has a back control and a conversation-history entry. |
| D2 | XP and Level appear in the Today mockup but not in the spec. | Drop them unless a domain source exists (see register). |
| D3 | Light theme? Only dark is designed. | Dark only for now. Tokens are variables, so light can be added later. |
| D4 | App icon, splash and Android status/navigation bar colors are not designed. | Use `--bg` for bars; keep the current icon until designed. |

## 2. Gaps: what the design does not cover yet
Build these from the guide's rules and the shared primitives. Flag each for design review; do not invent new visual patterns.

**Today:** habit detail sheet, quest detail sheet, evidence composer sheet, "Now" item behavior, progress summary, overloaded-day strip, empty and no-history states, habit/quest create and edit.
**Stats:** loading, empty and "not enough evidence yet" states; axis sheet for every axis (only Social drawn).
**Learn:** create-topic flow, roadmap view, resources list, evidence of understanding, review/retention, empty state, "convert objective to quest".
**Goals:** create, edit, pause, revise target, attach execution objects, completion and revision states.
**Jarvis:** conversation history and new chat; visible "context attached" chip when entered from a page; edit-proposal sheet; impact detail sheet; evidence/provenance sheet; correction flow; experiment and result cards; plan detail; keyboard-open state; provider-error and offline states; long-conversation scroll behavior.
**Audits:** run-audit progress, resolved list, ignore flow.
**Settings:** Data screen (export, restore, backup status, storage), Memory and privacy (view, edit, delete), Integrations (Health Connect, NutriLift or others that exist), Appearance, Diagnostics, Version/update.
**Onboarding:** welcome screen (what Jarvis can and cannot do, user stays in control), resume, and the startup check-in state.
**Global:** startup and data lifecycle notices (backup restored, migration running), AI-unavailable banner, offline state, toast/undo standard, proactive-suggestion and notification controls, motion specs for sheets and screen transitions, tab icon set, app icon and splash, tablet/large widths (verify 432px).

## 3. Data Feasibility Register
Check each row against the repo in Step 0. Record the result (exists / partial / missing) in the report.
| UI element | Where | Needs | If missing |
|---|---|---|---|
| XP, Level, "+40 xp" | Today header, rows | An xp/level domain | Omit; show date only |
| "Main quest / Side quest" | Goals cards | A priority or type field | Show axis only |
| "Next: ..." line | Goal and topic cards | Next milestone or action selector | Hide the line |
| Weekly capacity %, projected change | Proposals, audits, home pin | Impact-engine capacity calculation | Show "Affects routine" chip, no numbers |
| Axis value, monthly delta, 4-week trend | Stats, axis sheet | Stat snapshots history | Show latest value only |
| Contribution percentages | Axis sheet | Per-axis contribution breakdown | Show evidence list only |
| Topic loop-step tag | Learn cards, sheet | Learning-item state | Omit tag |
| Streak text ("12-day run") | Today rows | Occurrence history selector | Omit |
| Provenance ("Based on 12 logs, 2 habits") | Jarvis | Claims carrying evidence references | Show only when references exist |
| Auto-detected mode | Jarvis header | Engine intent detection | Show the selected mode |
| Undo | Receipts | Reversible metadata from the executor | Hide Undo when not reversible |
| "Verified" and latency | Settings, AI | A real verify call result | Show only after verifying |
| "Backup: automatic, today" | Settings, Data | backupService last-run info | Hide the row |

## 4. The steps

### Step 0: Repo audit and baseline (no UI changes)
**Do:** inventory routes, tabs, shared components, styles, icon usage, state stores and tests. Map each guide surface (Today, Stats, Learn, Goals, Jarvis, Audits, Settings, Onboarding) to current files. Fill the Data Feasibility Register. Capture baseline screenshots at 360, 390 and 432px. Decide the feature-flag or branch strategy (recommended: a `redesign` flag so pages switch one at a time).
**Done when:** a written audit exists with the file map, register results, flag strategy, and a green baseline test run.

### Step 1: Tokens, fonts, icons
**Do:** add the token set from guide section 3 as CSS variables; self-host Geist and Geist Mono (`font-display: swap`); add `@phosphor-icons/react` with one stroke weight; add safe-area and `100dvh` utilities; add `prefers-reduced-motion` handling.
**Done when:** a dev page renders all tokens (colors, type scale, radii 16/12/10/24/8, spacing). No page uses one-off colors or radii in new code. No emoji or hand-drawn icons.
**Verify:** contrast of text and controls meets WCAG AA; fonts load offline.

### Step 2: Shared primitives
**Do:** build the primitives in guide section 4 (AppHeader, SectionHeader, Button variants, IconButton, Chip, Card, Pin, StatCard, EntityRow, SegmentedBar, Checkbox, BottomSheet, ConfirmDialog with hold-to-confirm, EmptyState, LoadingSkeleton, ErrorState, ProgressRing, Toast/Undo). Presentation only.
**Done when:** a hidden dev route shows every primitive in default, pressed, disabled, loading and error states; each has labels and 44 to 48dp targets.
**Verify:** keyboard and screen-reader pass on BottomSheet and ConfirmDialog (focus trapped, focus returns).

### Step 3: App shell
**Do:** bottom bar with 5 tabs and Phosphor icons; docked "Ask Jarvis" pill (accent, 44px, bottom-right above the bar) that opens Jarvis with the current page and entity attached; Settings entry in the header; preserve drafts, scroll and entity context between tabs; Android back-button behavior; safe areas.
**Done when:** switching tabs keeps scroll and drafts; the pill is present on all five pages and hidden while a sheet is open; nothing overlaps the composer or keyboard.

### Step 4: Global states and lifecycle notices
**Do:** standard loading/empty/error/success/undo components wired to a single pattern; banners for AI unavailable, offline, backup restored and migration in progress; toast queue with 8 s undo ring.
**Done when:** each state can be triggered from the dev route, uses the copy in guide section 7, and local features stay usable when AI is unavailable.

### Step 5: Today
**Do:** rebuild on primitives to match Appendix B: header with date, quest-log rows (56px, 24px checkbox, axis label, right value), main-quest card, evidence composer sheet, habit and quest detail sheets, overloaded-day strip, empty and no-history states. Add "Ask Jarvis to adjust today" context.
**Done when:** complete/uncomplete a habit occurrence works optimistically and rolls back on failure; evidence can be logged; register items for XP, streak and "Next" are handled per the register.
**Verify:** screenshots at 360/390/432 match the mockup; one primary CTA per screen.

### Step 6: Stats
**Do:** radar chart component (SVG, text equivalent, list fallback), axis list, axis sheet for all six axes with trend, contribution (if available) and evidence; "Why?" opens Jarvis with axis, trend and evidence attached; empty and not-enough-evidence states. No overall score.
**Done when:** every axis opens a sheet; the chart has an aria label and a readable text alternative; register items for trend and contribution are handled.

### Step 7: Goals
**Do:** goal cards and goal detail per Appendix B and D (outcome first, why it matters, milestones, supporting habits/quests/learning, blockers, evidence); create, edit, pause, revise-target flows using sheets; "Ask about this goal" attaches the goal.
**Done when:** all lifecycle actions work through existing domain services; destructive actions use hold-to-confirm; audits conflicts link back to the goal.

### Step 8: Contextual Jarvis plumbing
**Do:** define a typed `JarvisEntryContext` (page, entity type, entity id, optional payload like axis or finding id) and one function that opens Jarvis with it; wire entry points from Today, Stats, Goals, Learn and Audits. Show a "context attached" chip in Jarvis.
**Done when:** each page opens Jarvis with the right context in the existing context builder; no engine changes beyond accepting the context object (if that needs an engine change, stop and report).

### Step 9: Action proposal system (UI only)
**Do:** ActionProposalCard, ImpactChips, capacity segments, swipe-to-apply with a real drag gesture (motion values, not `useState`), edit sheet, hold-to-confirm for destructive actions, Receipt and Undo toast, plan card with step toggles. Wire to the existing validation, impact engine and executor.
**Done when:** the lifecycle states draft, proposal, impact, approval, executing, success/failure, undo are all visible; retries do not duplicate actions (idempotency preserved); failures say data is unchanged.

### Step 10: Jarvis screens
**Do:** header (wordmark, mode pill), home feed, chat with trust rails and provenance, composer above the keyboard, slash palette derived from the capability registry (filter, arrows, Enter, Escape), mode sheet, Review stories, audit view, plan board, empty state, loading/error states, conversation history. Keep the `{message, proposal, claims}` contract; validate before render.
**Done when:** the nine screens in Appendix A are reproducible from real data; scroll does not jump when the user reads history; no orbs.
**Verify:** Android keyboard, long threads, provider error, offline.

### Step 11: Learn
**Do:** topic cards, topic sheet with the five-step loop, create-topic flow, resources, practice/evidence logging, "convert to quest", empty state, Ask Jarvis for explanation or plan.
**Done when:** a topic can go from creation to logged practice and evidence; register item for the loop-step tag is handled.

### Step 12: Audits
**Do:** filters, finding cards with severity stripe and text label, finding sheet (evidence, possible correction, "Review fix", "Send to Jarvis"), run-audit progress, resolved list, ignore flow.
**Done when:** no finding mutates data directly; "Review fix" goes through the proposal system.

### Step 13: Settings
**Do:** grouped list per Appendix D; AI screen (base URL, masked key, model, real "Verify connection", "What needs AI"); Data (export, restore where supported, backup status, storage); Memory and privacy; Integrations that already exist; Appearance; Diagnostics; Version.
**Done when:** verify shows a real result; keys are never displayed in full or logged; destructive actions use hold-to-confirm; backup state matches `backupService`.

### Step 14: Onboarding
**Do:** welcome screen, interview flow with chips and composer, resume, completion screen. Completion writes `setupState: "jarvis_design_pending"` through the existing `complete_onboarding` path and creates no habits.
**Done when:** app updates never restart onboarding; onboarding state comes from stored data.

### Step 15: Evidence and provenance
**Do:** "Based on ..." sheets across Stats, Goals, Audits and Jarvis using existing evidence references.
**Done when:** every conclusion that has references can be inspected; conclusions without references show no false provenance.

### Step 16: Accessibility pass
**Do:** labels, roles, focus order after sheets, scalable text to 130%, reduced motion, status never by color alone, chart alternatives, TalkBack smoke test.
**Done when:** the checklist in guide section 8 passes on all pages.

### Step 17: Interaction tests
**Do:** add tests for these journeys: complete a habit; log evidence; Stats "Why?" to Jarvis; propose, approve, execute and undo an action; reject or edit a proposal; slash command selection; hold-to-confirm delete; onboarding to `jarvis_design_pending`; restore backup on an empty database; AI unavailable while local pages still work; Settings verify connection.
**Done when:** all pass in CI and the existing suite stays green.

### Step 18: Visual and device QA
**Do:** review every page at 360, 390 and 432px; test on an Android device (A52 class): keyboard, back button, safe areas, status/navigation bar, font scale, low-end performance.
**Done when:** no overlap, clipping or jumpy scroll; 60fps scrolling in feeds; no layout shift when sheets open.

### Step 19: Release safety
**Do:** confirm IndexedDB name, migrations and signing identity are unchanged; test upgrade from the current release with real data; remove the old styles and the flag only after all pages are switched; write release notes.
**Done when:** an in-place update keeps all data and never re-triggers onboarding.

## 5. Rules that never change
One accent (burnt orange). Axis colors only as dots and chart marks. Radii 16 (containers), 12 (controls), 10 (chips), 24 (sheets), 8 (checkboxes). Geist and Geist Mono. No orbs, gradient washes, glow, glass, emoji, or hand-drawn icons. One primary CTA per screen. No silent destructive changes. Local features never depend on AI.
