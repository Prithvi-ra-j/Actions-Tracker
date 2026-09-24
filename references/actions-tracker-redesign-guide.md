# Actions-Tracker Frontend Redesign: Implementation Guide

Product: Actions-Tracker (mobile-first React/Vite PWA + Capacitor Android, local-first IndexedDB). Owner: Ranjith.
Direction: **Codex** (dark, burnt-orange accent, rounded cards, mono numbers, XP/level, radar stats).
Date: 24 Sep 2026. Status: every surface is drawn: Jarvis (9 screens), Today, Stats, Goals, Learn, Audits, Settings, Onboarding, plus the goal detail and the Stats axis sheet. Implementation not started.

## 0. Instructions for the AI agent reading this
You are implementing a **frontend redesign**. Follow this order and these rules.

**Sources of truth**
- Visuals: the HTML mockups in Appendix A (Jarvis, 9 screens) Appendix B (Today, Stats, Goals) and Appendix D (Learn, Audits, Settings, Onboarding, goal detail, Stats axis sheet). Open them in a browser at 360px width. Copy tokens, spacing, sizes and copy from them.
- Behavior and architecture: sections 2 to 5 of this guide and the original spec in Appendix C.
- If the guide and the current code disagree, **stop and report the conflict**; do not guess.

**Hard constraints**
1. Do not change domain logic, repositories, IndexedDB database name, schema versions or migrations, backup/restore, action schemas, the action executor, or the Jarvis engine contract (`{message, proposal, claims}`).
2. Presentation components hold no business rules. Flow: React page > feature components/hooks > domain services/selectors > repositories > IndexedDB.
3. Local features must keep working with no AI connection.
4. No silent destructive mutations. Every meaningful Jarvis change is proposal > approval > deterministic execution > result > undo where possible.
5. One accent color (burnt orange). No orbs, no gradient washes, no glow, no glassmorphism, no emoji, no purple AI styling, no hand-drawn SVG icons (use `@phosphor-icons/react`). Chart SVGs are fine.
6. Mobile first: design at 360, verify at 360, 390 and 432px. No hover-only behavior, no desktop layouts.

**Suggested order of work** (one PR per step, run existing tests after each)
1. Design tokens + shared primitives (section 3, 4).
2. App shell: bottom tab bar + docked "Ask Jarvis" pill + Settings entry.
3. Today, then Stats, then Goals.
4. Jarvis (section 6.5) with the shared action-proposal components.
5. Learn, Audits, Settings, Onboarding (sections 6.4, 6.6, 6.7, 6.8).
6. States (loading/empty/error/success/undo) across every page, then accessibility pass, then interaction tests.

**Starter prompt to pair with this file:** "Read the whole guide. Implement step 1 only (tokens and primitives) in the existing repo without changing domain logic. List every file you will touch first, then make the change, then show how to verify at 360/390/432px. Ask before deviating from the guide."

## 1. What the app is
Loop: Intent > Direction > Action > Evidence > Measurement > Review > Audit > Adaptation. One personal system viewed through eight surfaces:

| Surface | Job | Feeling | Avoid |
|---|---|---|---|
| Today | Execute what matters now | Calm momentum | Guilt, overload |
| Stats | Understand change and evidence | Curiosity | Score anxiety |
| Learn | Build knowledge and capability | Intellectual momentum | Content dumping |
| Goals | Define direction and outcomes | Ownership | Generic templates |
| Jarvis | Understand, design, propose, operate | Trust | Black-box automation |
| Audits | Find contradictions and system problems | Constructive clarity | Punishment |
| Settings | Control AI, data, privacy | Confidence | Technical clutter |
| Onboarding | Establish identity, baseline, targets | Being understood | Questionnaire fatigue |

Six axes: Body, Discipline, Knowledge, Social, Creativity, Strategy. Each needs its own evidence (Body is not "exercise count", Social is not "interaction count", Strategy is not "books read").
Reference device: Samsung A52 class, about 360px wide, Android, touch-first. Primary model `openai/gpt-oss-20b` via a configurable gateway. Modes (Ask, Plan, Review, Act, Capture, Audit) are behavior, not model choice.

## 2. Final design decisions
**Stated by the user**
- Wants a cooler, Pinterest-inspired redesign of the whole app, not just Jarvis.
- No orbs anywhere. Liked all 9 Jarvis screens.
- Apply the Taste Skill (anti-slop frontend rules).
- Chose the **Codex** direction over "Board" (masonry, emerald) and "Swatch" (light color blocks).
- Wants Jarvis and the rest of the app to be one system; corners smooth and rounded (no notched corners); the Review stories screen was too big and was reduced.

**Design decisions accepted with the mockups**
- Shell: 5 tabs (Today, Stats, Learn, Goals, Audits) + a docked "Ask Jarvis" pill on every page; Settings behind a header control.
- Jarvis text is unbubbled prose; only user messages get a bubble. Cards only for real objects.
- Mode is auto-detected and shown as a header pill; tap to override.
- Proposals: swipe right apply, tap edit, swipe left dismiss; destructive actions use hold-to-confirm (600 ms).
- Trust rails: solid = observed, dashed = inferred, dotted (accent) = suggested; provenance row ("Based on 12 logs, 2 habits").
- Progress and capacity use 10-segment bars (Codex). Applied changes collapse to a receipt with an 8 s undo.
- Review = story slides; Audit = lint-style list with severity stripe and text label.
- Stats = radar + list, never a single overall score.

## 3. Design tokens
```css
:root{
  --bg:#0c0d0f; --s1:#141518; --s2:#1d1f23;      /* surfaces */
  --tx:#e9e9e4; --mu:#8a8d93;                     /* text, muted */
  --ac:#e0763a; --on-ac:#1a0d04;                  /* the only accent + text on it */
  --danger:#e5484d;
  --body:#4fc1d9; --discipline:#d9c95a; --knowledge:#6f9fe0;
  --social:#dc85ad; --creativity:#a58fdb; --strategy:#3cc48f;  /* axis dots/charts only */
  --hairline:rgba(255,255,255,.08);
  --r-container:16px; --r-control:12px; --r-chip:10px; --r-sheet:24px; --r-check:8px;
}
```
- Axis colors appear only as small dots, chart bars and radar labels. Never as button or card fills.
- Fonts: **Geist** 400/500/600 for text; **Geist Mono** 500 for metadata, numbers, XP. Self-host with `font-display: swap`. Heading tracking -0.02em.
- Sizes: screen title 26px, card title 15 to 18px, body 14.5px, secondary 12.5 to 13px, mono metadata 11.5 to 12px, hero numbers 32 to 34px, story numbers 30px.
- Touch targets 44 to 48dp minimum (buttons 48, rows 56, composer buttons 46, tabs 64 tall).
- Layout: side padding 14 to 18px, gap 10px, safe-area insets on top/bottom, `100dvh`, composer above the keyboard via `visualViewport`.
- Motion: springs 120 to 350 ms, `scale(.98)` on press, respect `prefers-reduced-motion`. Motion only communicates state (apply, expand, confirm).
- Contrast: WCAG AA for text and controls; never rely on color alone for status (severity has a text label, checks have a check mark).

## 4. Shared primitives (build these first)
AppHeader (title + subline + right pill), SectionHeader, Button (primary accent / secondary s2 / destructive danger), IconButton, Chip, Card, Pin, StatCard, EntityRow (56px), SegmentedBar (10 segments; filled = accent, projected = accent at 40%), Checkbox (24px, 8px radius), BottomSheet, ConfirmDialog (hold-to-confirm), ActionProposalCard, ImpactChips, Receipt + UndoToast (8 s countdown), EvidenceCard, ProvenanceRow, TrustRail (observed/inferred/suggested), ModePill, EmptyState, LoadingSkeleton, ErrorState, ProgressRing, ContextualJarvisCTA.

**Shell.** Bottom bar 64px, 5 text+icon tabs, active tab uses accent. "Ask Jarvis" pill: 44px tall, accent fill, docked bottom-right 14px above the bar; it opens Jarvis with the current page/entity attached. Settings opens from a header pill. Navigation preserves drafts, scroll and entity context.

## 5. Cross-page rules
- Every page: one primary CTA, secondary actions (inspect, edit, ask Jarvis, defer), a context-aware Jarvis entry, designed empty/loading/error/success states.
- Context to Jarvis: Today (day's actions, routine, evidence), Stats (axis, trend, evidence, "Why?"), Goals (the goal), Learn (the topic), Audits (the finding + evidence). Any important action creates or links to evidence.
- Bottom sheets for detail/edit/confirm; never desktop dialogs.
- Empty states teach the page's purpose and offer the next action.

## 6. Pages
Status legend: **Drawn** = mockup exists in the appendices. **Rules** = specified here, not drawn yet.

### 6.1 Today (Drawn, Appendix B)
Header: "Today", date subline, right pill "Level 7" (mono). Under it a 10-segment XP bar. Then "Quest log" (mono label) with 56px rows: 24px square checkbox, title 15/500, axis label mono muted, right-aligned "+40 xp" mono accent. Completed rows show a filled accent checkbox. Below: a "Main quest" card (label, title, 10-segment progress). Rules (not drawn): first incomplete row is the "Now" item with a primary "Start" button; a quick "Log evidence" row at the bottom opens the evidence composer sheet; an overloaded day shows a quiet "Review workload" strip that opens Jarvis in Review mode; no actions = empty state explaining planning. XP/level values are placeholders; wire only to real data if the domain already provides them.

### 6.2 Stats (Drawn, Appendix B)
Header "Stats" + "Last 30 days". A hexagon radar (rings at 50% and 100%, polygon accent 20% fill, 2 px stroke, axis labels mono, clockwise from top: Body, Discipline, Knowledge, Social, Creativity, Strategy). Below, a 2-column list: axis name + mono "value +delta". Tap an axis (list row or vertex) opens a bottom sheet: trend chart, contribution breakdown, evidence list, "Why?" (opens Jarvis with axis + trend + evidence). Provide a text equivalent of the radar (aria-label and the list). No overall score.

**Axis sheet (Drawn, Appendix D):** bottom sheet with axis dot and name, value and monthly delta (mono), a 4-week accent trend line (2.5px, hairline gridlines, W1 to W4 labels), "What contributes" rows (label, thin bar, percent), "Recent evidence" rows with dates, and buttons "Why did this drop?" (opens Jarvis with axis, trend and evidence) and "Audit this metric". No overall score is shown.

### 6.3 Goals (Drawn, Appendix B)
Header "Goals" + "3 active" + "New goal" pill. Cards (16px): mono label ("Main quest, Body"), title 18/600, meta line ("6 weeks left. Next: 8 km"), 10-segment progress. Goal detail (Rules): outcome and current state first, why it matters, timeframe and milestones (timeline), attached habits/quests/learning, evidence and blockers, "Ask Jarvis" with the goal attached. Actions: create, edit, pause, revise target, attach execution objects, audit conflicts.

**Goal detail (Drawn, Appendix D):** header is the goal title with axis and quest type; "Outcome" label, large percent (34px) with the outcome sentence, 10-segment bar; a "Why it matters" card; milestones as a grouped list with square checkboxes (done = accent check, next = accent "Next" label); supporting chips (habit, quest); a blocker card with a left severity stripe that links to the audit. The docked pill reads "Ask about this goal" and attaches the goal.

### 6.4 Learn (Drawn, Appendix D)
Header "Learn". List of topic cards (same card style as Goals): axis label, title, one-line objective, 10-segment progress. Topic detail sheet shows the loop as 5 steps (Learn, Practice, Apply, Evidence, Review) with the current step highlighted, resources as rows, a practice prompt, and "Ask Jarvis for an explanation or study plan". "Convert objective to quest" action. Empty state explains the loop.

**Drawn (Appendix D):** cards show axis dot and label, an accent-outlined mono step tag for the current loop step, title, objective, 10-segment progress and a mono "Next:" line. The topic sheet has axis, title, objective, a 5-step loop strip (done = light, current = accent, upcoming = muted), a grouped resources list with progress, a "Today's practice" card, and two buttons: Log practice (primary) and Ask Jarvis.

### 6.5 Jarvis (Drawn, Appendix A: 9 screens)
Header: wordmark "Jarvis" left, mode pill right (small accent dot + mode name). Composer: floating rounded container, 60px: `[+] Tell Jarvis what you want [/] [send]`.
1. **Home feed**: 2-column masonry of pins (Insight, Proposal with accent outline, Experiment, Review ready, Audit, Evidence) with hero numbers and 10-segment bars.
2. **Chat**: user bubble; assistant text with rails (solid observed, dashed inferred, dotted accent suggested); provenance dots; proposal card with diff chips (`~ Routine`, `Body up`, `Discipline up`), capacity segments 62% to 71%, swipe-to-apply track; after apply a receipt plus undo toast with 8 s ring.
3. **Slash palette**: bottom sheet, Recent chips, groups Think (Ask, Review, Audit), Change (Habit, Quest, Goal, Routine, Target), Record (Evidence, Memory, Learn), 46px tiles with a small dot. Derive the list from the capability registry. Filter live after `/`; support Escape and Arrow/Enter.
4. **Mode sheet**: "Jarvis picked Review from your message" + auto toggle; 6 tiles (Ask, Plan, Review, Act, Capture, Audit) with one-word purposes; active tile outlined in accent.
5. **Review stories**: 3 segments on top, tap right half next, left half back. Slide 1 "9 of 12" + weekly bars; slide 2 "4 of 5" evenings missed vs mornings 6 of 6; slide 3 "Test 6:30 am" + Create experiment. Footer: Ask why, Audit routine. Keep type modest (numbers 30px, body 15px).
6. **Audit list**: "3 issues found", rows with severity stripe AND text (High/Medium/Low), expandable detail + Fix, pinned Fix all / Ignore. Audit never mutates silently.
7. **Plan board**: stacked-card cover, title, progress ring, axis dots; timeline of steps with toggles (Goal, Quest, Routine, Weekly benchmark, Review); Apply plan / Edit. Ring updates as steps toggle.
8. **Empty state**: headline "Tell Jarvis what you're working on", subline "It turns your direction into a system you approve.", 4 starter pins (Start setup interview, Review my system, Create a goal, Log something I did).
9. **States**: skeleton + "Reviewing your recent evidence..."; destructive confirm "Delete 4 habits?" with hold-to-delete (600 ms); error "The change wasn't applied. Your existing data is unchanged." with Retry / View details.

Behavior contract: response `{message, proposal, claims}`; validate schema (Zod) before rendering; never say an action succeeded before the executor succeeds; idempotent execution via actionId; distinguish "I found / I think / I suggest / I changed". Do not expose chain-of-thought.

### 6.6 Audits (Drawn, Appendix D)
Header "Audits" + filter chips (Unresolved, Resolved, Domain). List uses the Jarvis audit row style (severity stripe + text label). Finding sheet: finding, evidence, context/severity, explanation, possible correction, buttons Fix and "Send to Jarvis". Categories: goal conflicts, capacity overload, stale targets, weak measurement, missing evidence, routine mismatch, contradictory priorities, unrealistic execution, unresolved experiments, domain-model mismatch. Diagnose the system, never judge the user.

**Drawn (Appendix D):** header pill "Run audit"; filter chips (Unresolved selected with accent tint and outline, Resolved, Domain); cards with a left severity stripe, a one-line explanation, a mono related-object label and the severity text on the right. The finding sheet has a top severity stripe, a mono "High severity" label, title, Evidence as a grouped list, a "Possible correction" card with capacity segments, and buttons "Review fix" (primary) and "Send to Jarvis". Review fix opens the normal proposal flow; nothing is applied from an audit directly.

### 6.7 Settings (Drawn, Appendix D)
Grouped list of 56px rows (label, mono muted value, chevron): AI, Application, Data, Privacy and memory, Integrations, Appearance, Diagnostics, Version. AI group: provider/base URL, API key (masked), model (default `openai/gpt-oss-20b`), a "Verify connection" button, and a plain note on which features need AI. Data: export, restore/import, backup status, storage. Destructive actions use hold-to-confirm.

**Drawn (Appendix D):** grouped lists with small group labels (AI, Data, Privacy, About), 52px rows with mono values and chevrons; the connection row shows an accent dot and "Verified". The AI screen has a label above each input (Base URL, API key masked, Model), a primary "Verify connection" button, a result card with an accent left stripe, and a "What needs AI" card listing which features need AI and which work without it. Keys are never shown in full.

### 6.8 Onboarding (Drawn, Appendix D)
Full-screen conversational interview: wordmark, a 7-segment progress bar (Welcome, Identity, Constraints, Focus, Baseline, Vision, Targets), one question at a time, tap-to-answer chips plus free-text composer. Ends with a plain confirmation and `setupState: "jarvis_design_pending"`. `complete_onboarding` records direction and context only; it must not invent habits or routines. Onboarding state is data, never tied to app version.

**Drawn (Appendix D):** no tab bar or docked pill. Header wordmark plus an "n of 7" pill; a 7-segment progress bar; a mono stage label; one question at a time in unbubbled text with a short helper line; multi-select answer chips (selected = accent tint and accent outline); composer "Or tell Jarvis in your own words". Completion screen: "Your direction is saved", a line saying nothing is created until approval, a summary list (Focus, Baseline, Vision, Targets), primary "Start design interview", secondary "Review my answers".

## 7. States (all pages)
| State | Requirement | Copy example |
|---|---|---|
| Loading | Name the work; skeleton in the shape of the content | Reviewing recent evidence... |
| Empty | Purpose + next action | No active goals yet. Tell Jarvis what you want to change. |
| Ambiguous | Focused clarification | Do you mean today's routine or the weekly routine? |
| Validation | What is missing | A target timeframe is required. |
| Execution error | Data unchanged + retry | The change wasn't applied. Your existing data is unchanged. |
| Provider error | Recovery path | Check Settings, AI, and try again. |
| Success | Exactly what changed | Created the 3-day habit and scheduled occurrences. |
| Undo | Immediate reversal | Habit created. Undo |

## 8. Accessibility and mobile
Semantic buttons and labels, focus order after sheets, scalable text, chart text equivalents, reduced motion, no hover dependence, composer stays above the keyboard, preserve conversation scroll position, status never by color alone.

## 9. Definition of done (per page)
Single clear purpose; hierarchy readable at a glance; empty/loading/error/success/undo states built; contextual Jarvis entry; works without AI; domain logic outside JSX; repository-backed and migration-safe; responsive 360/390/432; tokens and primitives only (no one-off colors or radii); labels and semantics; provenance surfaced where relevant; critical journeys covered by interaction tests.

## 10. Open items
- Not drawn: keyboard-open states, bottom-sheet transitions, plan detail, goal create/edit forms, Settings sub-screens other than AI, the audit "Run audit" flow.
- Mockup numbers, XP, level and copy are placeholders. The tab bar in the mockups is text-only; use Phosphor icons in the build.
- The mockups link Google Fonts for convenience; self-host in the app.
- Swipe-to-apply is a tap in the mockup; implement a real drag gesture with motion values (not `useState`).
- Axis colors were retuned to avoid clashing with the orange accent and red danger; confirm on device.

## Appendix A: Jarvis mockups (9 screens), complete HTML source
Save as `jarvis-mockups.html` and open in a browser. Scroll sideways.

``````html
<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Jarvis UI mockups</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@500&display=swap">
<style>
:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);--pg:#e9e7f0;--pt:#1a1a24;--bg:#0c0d0f;--s1:#141518;--s2:#1d1f23;--tx:#e9e9e4;--mu:#8a8d93;--ac:#e0763a;--body:#4fc1d9;--dis:#d9c95a;--kno:#6f9fe0;--soc:#dc85ad;--cre:#a58fdb;--str:#3cc48f;--bad:#e5484d}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--pg:#050508;--pt:#e8e8f0}}
:root[data-theme="dark"]{--pg:#050508;--pt:#e8e8f0}
html{scroll-padding-top:env(safe-area-inset-top,0px)}
*{box-sizing:border-box;margin:0}
body{background:var(--pg);color:var(--pt);font:15px/1.5 Geist,system-ui,sans-serif;padding:20px 0 32px}
h1{font:600 24px Geist,sans-serif;padding:0 20px}
.lead{padding:4px 20px 18px;opacity:.7;font-size:14px}
.row{display:flex;gap:24px;overflow-x:auto;scroll-snap-type:x mandatory;padding:0 20px 8px}
.fr{flex:none;scroll-snap-align:center;width:360px}
.cap{font:600 14px Geist,sans-serif;padding:12px 4px 0}
.cap span{display:block;font:400 12.5px Geist,sans-serif;opacity:.65;margin-top:2px}
.ph{width:360px;height:720px;background:var(--bg);color:var(--tx);border-radius:36px;position:relative;overflow:hidden;box-shadow:0 0 0 6px #000,0 0 0 7px #2a2a36}
.hd{position:relative;display:flex;align-items:center;gap:10px;padding:20px 18px 10px}
.hd b{font:600 17px Geist,sans-serif}
.md{display:inline-flex;align-items:center;height:36px;padding:0 12px;border-radius:16px;font:500 13px Geist,sans-serif;color:var(--o);background:color-mix(in srgb,var(--o) 20%,transparent)}
.hd.busy::after{content:"";position:absolute;left:18px;right:18px;bottom:0;height:2px;background:linear-gradient(90deg,transparent,var(--o),transparent) no-repeat;background-size:40% 100%;animation:ln 1.4s linear infinite}
@keyframes ln{from{background-position:-40% 0}to{background-position:140% 0}}
.hd small{margin-left:auto;display:flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:99px;background:var(--s2);color:var(--tx);font:500 11.5px 'Geist Mono',monospace}.hd small::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--ac)}
.bd{padding:0 14px}
.cp{position:absolute;left:12px;right:12px;bottom:14px;height:60px;border-radius:30px;background:var(--s2);box-shadow:inset 0 0 0 1px #ffffff14;display:flex;align-items:center;gap:6px;padding:0 7px;color:var(--mu);font-size:14px}
.cp span{flex:1;padding-left:6px}
.cp i{font-style:normal;width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:var(--s1);color:var(--tx);flex:none}
.cp i.go{background:var(--tx);color:var(--bg)}
.mas{columns:2;column-gap:10px}
.pin{--a:var(--kno);break-inside:avoid;margin-bottom:10px;padding:14px;border-radius:16px;background:var(--s1);box-shadow:inset 0 0 0 1px #ffffff10}
.pin.pend{box-shadow:inset 0 0 0 1.5px var(--a)}
.pin em,.k{font:500 11.5px 'Geist Mono',monospace;font-style:normal;color:var(--a,var(--ac))}
.pin h3{font:600 15px/1.25 Geist,sans-serif;margin:6px 0 4px}
.pin p{font-size:12.5px;color:var(--mu);line-height:1.4}
.big{font:600 34px/1 Geist,sans-serif;margin:8px 0 4px}
.big small{font-size:14px;color:var(--mu)}
.bar{display:flex;height:6px;border-radius:3px;background:#ffffff14;margin-top:8px;overflow:hidden}
.bar u{background:var(--a,var(--ac))}
.mini{display:flex;align-items:flex-end;gap:5px;height:44px;margin-top:10px}
.mini i{flex:1;background:var(--a);border-radius:5px 5px 2px 2px}
.btn{display:inline-grid;place-items:center;min-height:48px;padding:0 18px;border-radius:24px;background:var(--s2);color:var(--tx);border:0;font:500 14px Geist,sans-serif}
.btn.p{background:var(--ac);color:#1a0d04}
.u{background:var(--s2);padding:10px 14px;border-radius:16px 16px 4px 16px;margin:6px 0 16px auto;font-size:14.5px;width:fit-content;max-width:82%}
.r{padding-left:12px;margin-bottom:10px;font-size:14.5px;border-left:3px solid var(--tx)}
.r.inf{border-left-style:dashed;border-color:var(--mu)}
.r.sug{border-left-style:dotted;border-color:var(--ac)}
.prov{display:flex;align-items:center;gap:6px;font:500 11.5px 'Geist Mono',monospace;color:var(--mu);margin:2px 0 14px}
.prov s{width:14px;height:14px;border-radius:50%;margin-right:-9px;border:2px solid var(--bg);background:var(--kno)}
.card{border-radius:16px;padding:16px;background:var(--s1);box-shadow:inset 0 0 0 1px #ffffff12}
.card h3{font:600 17px Geist,sans-serif;margin:4px 0}
.card p{font-size:13px;color:var(--mu)}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}
.chips b{--a:var(--mu);font:500 12px Geist,sans-serif;padding:7px 11px;border-radius:99px;background:color-mix(in srgb,var(--a) 22%,transparent);color:var(--a)}
.cw{display:flex;justify-content:space-between;font-size:12px;color:var(--mu)}
.cw span{font-family:'Geist Mono',monospace}
.sw{position:relative;height:52px;border-radius:26px;background:#ffffff10;margin-top:14px;display:grid;place-items:center;font-size:13.5px;color:var(--mu);cursor:pointer}
.kn{position:absolute;left:4px;top:4px;width:44px;height:44px;border-radius:50%;background:var(--ac);color:#1a0d04;display:grid;place-items:center;font-size:20px;transition:transform .35s cubic-bezier(.3,1.3,.5,1)}
.go .kn{transform:translateX(250px)}
.rec{display:none}.done .prop{display:none}.done .rec{display:block}
.tst{display:flex;align-items:center;gap:10px;margin-top:14px;padding:6px 6px 6px 14px;border-radius:16px;background:var(--s2);font-size:13px}
.tst .btn{margin-left:auto;min-height:44px}
.dim{padding:0 18px;opacity:.3;filter:blur(1.5px)}
.sh{position:absolute;left:8px;right:8px;bottom:84px;background:var(--s1);border-radius:24px;padding:8px 14px 14px;box-shadow:0 -10px 40px #000a,inset 0 0 0 1px #ffffff12}
.gr{width:36px;height:4px;border-radius:2px;background:#ffffff26;margin:0 auto 8px}
.lb{font:500 12px Geist,sans-serif;color:var(--mu);margin:10px 0 6px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.t{--a:var(--kno);display:flex;align-items:center;gap:10px;min-height:46px;padding:0 10px;border-radius:16px;background:var(--s2);font:500 14px Geist,sans-serif}
.t i{width:8px;height:8px;border-radius:50%;background:var(--a);flex:none}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.m{--o:var(--kno);text-align:center;padding:14px 4px;border-radius:16px;background:var(--s2);font:500 13.5px Geist,sans-serif}
.m .m small{display:block;font:400 11.5px Geist,sans-serif;color:var(--mu);margin-top:2px}
.m.on{box-shadow:0 0 0 2px var(--ac)}
.auto{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--mu)}
.auto b{margin-left:auto;width:44px;height:26px;border-radius:13px;background:var(--ac);position:relative}
.auto b::after{content:'';position:absolute;right:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#1a0d04}
.stf{background:var(--s1)}
.seg{display:flex;gap:4px;padding:18px 14px 0}
.seg i{flex:1;height:3px;border-radius:2px;background:#ffffff30}.seg i.on{background:#fff}
.sl{display:none;padding:26px 18px}.sl.on{display:block}
.sl h2{font:600 30px/1.1 Geist,sans-serif}
.sl p{font:400 15px/1.5 Geist,sans-serif;margin-top:10px}
.bars{display:flex;align-items:flex-end;gap:12px;height:84px;margin:26px 0 24px}
.bars i{flex:1;background:var(--ac);border-radius:10px 10px 4px 4px;position:relative}
.bars i::after{content:attr(data-w);position:absolute;bottom:-22px;left:0;right:0;text-align:center;font:500 11px 'Geist Mono',monospace;color:var(--mu)}
.ft{position:absolute;left:14px;right:14px;bottom:20px;display:flex;gap:8px}
details{--c:var(--bad);border-radius:16px;background:var(--s1);margin-bottom:8px;box-shadow:inset 4px 0 0 var(--c)}
summary{list-style:none;min-height:56px;padding:12px 14px 12px 18px;display:flex;align-items:center;font:600 14px Geist,sans-serif}
summary::-webkit-details-marker{display:none}
summary::after{content:'⌄';margin-left:auto;color:var(--mu)}
details p{padding:0 14px 8px 18px;font-size:13px;color:var(--mu)}
.fx{padding:0 14px 14px 18px}.fx .btn{min-height:44px}
.pf{position:absolute;left:0;right:0;bottom:0;padding:30px 14px 20px;background:linear-gradient(transparent,var(--bg) 40%);display:flex;gap:8px}
.pf .btn{flex:1}
.stk{position:relative;margin:26px 8px 20px;isolation:isolate}
.stk::before,.stk::after{content:'';position:absolute;border-radius:16px;left:12px;right:12px;top:-8px;bottom:8px;background:var(--s2);z-index:0}
.stk::after{left:24px;right:24px;top:-15px;bottom:15px;background:var(--s1);z-index:-1}
.cv{position:relative;z-index:1;border-radius:16px;padding:18px;display:flex;align-items:center;gap:14px;background:var(--s2)}
.cv h2{font:600 21px/1.15 Geist,sans-serif}
.cv p{font-size:12.5px;color:var(--mu);margin-top:4px}
.dots{display:flex;gap:5px;margin-top:8px}.dots i{width:8px;height:8px;border-radius:50%}
.ring{margin-left:auto;position:relative;width:56px;height:56px;flex:none;font:500 12px 'Geist Mono',monospace;display:grid;place-items:center}
.ring svg{position:absolute;inset:0;transform:rotate(-90deg)}
.stp{display:flex;gap:12px;align-items:flex-start;padding:10px 0;position:relative;min-height:48px}
.stp::before{content:'';position:absolute;left:11px;top:36px;bottom:-8px;width:2px;background:#ffffff14}
.stp:last-child::before{display:none}
.stp input{display:none}
.stp .c{width:24px;height:24px;border-radius:50%;border:2px solid var(--mu);flex:none;display:grid;place-items:center;font-size:13px}
.stp input:checked+.c{background:var(--ac);border-color:var(--ac);color:#1a0d04}
.stp input:checked+.c::after{content:'✓'}
.stp b{display:block;font:500 14.5px Geist,sans-serif}.stp small{color:var(--mu);font-size:12.5px}
.em{text-align:center;padding:44px 24px 0}
.em .em h2{font:600 24px/1.2 Geist,sans-serif}
.em p{color:var(--mu);font-size:14px;margin:10px 0 26px}
.g4{display:grid;grid-template-columns:1fr 1fr;gap:10px;text-align:left;padding:0 14px}
.g4 .pin{margin:0;min-height:104px}.g4 .pin i{display:block;width:8px;height:8px;border-radius:50%;background:var(--a);margin-bottom:22px}
.sk{height:104px;border-radius:16px;background:linear-gradient(90deg,var(--s1),var(--s2),var(--s1));background-size:200% 100%;animation:sh 1.4s linear infinite}
@keyframes sh{to{background-position:-200% 0}}
@keyframes cd{to{stroke-dashoffset:56.5}}
.box{border-radius:16px;padding:16px;background:var(--s1);margin-top:14px;box-shadow:inset 0 0 0 1px #ffffff12}
.box h3{font:600 16px Geist,sans-serif}.box p{font-size:13px;color:var(--mu);margin:4px 0 12px}
.hold{position:relative;overflow:hidden;width:100%;height:52px;border:0;border-radius:26px;background:var(--s2);color:var(--bad);font:500 14px Geist,sans-serif;user-select:none;-webkit-user-select:none;touch-action:none}
.hold .fill{position:absolute;inset:0 auto 0 0;width:0;background:color-mix(in srgb,var(--bad) 35%,transparent);transition:width .15s}
.hold.h .fill{width:100%;transition:width .6s linear}.hold.ok .fill{width:100%}
.hold span{position:relative}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
.d{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--a);margin-right:6px;vertical-align:middle}h1,h2,h3,.big,.hd b,.sl h2,.cv h2{letter-spacing:-.02em}.btn,.t,.m,.pin{transition:transform .12s}.btn:active,.t:active,.m:active,.pin:active{transform:scale(.98)}.em{padding:120px 24px 0}.em h2{font-size:30px;line-height:1.1}.sgm{display:flex;gap:3px;margin-top:8px}.sgm i{flex:1;height:8px;background:var(--ln)}.sgm i.f{background:var(--ac)}.sgm i.n{background:var(--ac);opacity:.4}
.pin,.card,.box,.sk,.t,.m,.tst,details,.stk::before,.stk::after,.cv,.cp,.hold,.sw,.btn,.u,.sh,.chips b,.hd small,.hold .fill,.kn,.cp i,.stp .c,.auto b{border-radius:4px}
.auto b::after{border-radius:2px}
.pin,.card,.cv,.box{clip-path:none}
.cp i.go{background:var(--ac);color:var(--bg)}
.sv{margin-left:auto;font-weight:500}summary::after{margin-left:10px}.pin,.card,.box,.sk,.cv,.cp,.stk::before,.stk::after{border-radius:16px}
details,.tst{border-radius:14px}.sh{border-radius:24px}
.t,.m,.btn,.hold,.chips b,.hd small,.cp i,.kn{border-radius:12px}.chips b{border-radius:10px}
.sw{border-radius:16px}.stp .c{border-radius:8px}.u{border-radius:16px 16px 6px 16px}
.auto b{border-radius:13px}.auto b::after{border-radius:50%}</style></head><body>
<h1>Jarvis in Codex</h1>
<p class="lead">Nine screens at 360px in the Codex language: orange accent, 4px notched cards, square controls. Scroll sideways. Tap the swipe bar on screen 2, tap the story on screen 5, tick steps on screen 7, press and hold the delete button on screen 9.</p>
<div class="row">

<div class="fr"><div class="ph">
<div class="hd" style="--o:var(--kno)"><b>✦ Jarvis</b><span class="md">Ask ▾</span><small>ready</small></div>
<div class="bd"><div class="mas">
<div class="pin" style="--a:var(--body)"><em><i class="d"></i>Insight</em><div class="big">1<small>/3</small></div><p>gym sessions this week, down from 3 last week</p></div>
<div class="pin pend" style="--a:var(--ac)"><em><i class="d"></i>Proposal</em><h3>Move gym to 6:30 am</h3><p>Evenings were missed 4 of 5 days.</p><div class="sgm"><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i><i class="n"></i><i></i><i></i><i></i></div></div>
<div class="pin" style="--a:var(--str)"><em><i class="d"></i>Experiment</em><h3>Wake at 6 for two weeks</h3><div class="big">6<small>/14 days</small></div><div class="sgm"><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
<div class="pin" style="--a:var(--kno)"><em><i class="d"></i>Review ready</em><h3>Week 38</h3><div class="mini"><i style="height:100%"></i><i style="height:66%"></i><i style="height:100%"></i><i style="height:33%"></i></div></div>
<div class="pin" style="--a:var(--bad)"><em><i class="d"></i>Audit</em><h3>3 issues in your system</h3><p>Evenings hold 2.5 h of commitments.</p></div>
<div class="pin" style="--a:var(--soc)"><em><i class="d"></i>Evidence</em><h3>An honest talk with your brother</h3><p>Logged yesterday</p></div>
</div></div>
<div class="cp"><i>+</i><span>Tell Jarvis what you want</span><i>/</i><i class="go">↑</i></div>
</div><div class="cap">1. Home feed<span>Pins replace the blank chat. Axis dot and hero number per card.</span></div></div>

<div class="fr"><div class="ph">
<div class="hd busy" style="--o:var(--ac)"><b>✦ Jarvis</b><span class="md">Review ▾</span><small>reviewing</small></div>
<div class="bd">
<div class="u">Why is my gym streak dying?</div>
<p class="r">You trained 1 of 3 planned days this week. Last week it was 3.</p>
<p class="r inf">Misses cluster on weekday evenings, so the 7 pm slot may be the cause.</p>
<p class="r sug">Try moving training to 6:30 am for two weeks.</p>
<div class="prov"><s></s><s style="background:var(--body)"></s><s style="background:var(--dis)"></s><span style="margin-left:10px">Based on 12 logs, 2 habits</span></div>
<div class="card" id="pc">
<div class="prop"><span class="k">Proposed change</span><h3>Move gym to 6:30 am</h3><p>Mon, Wed, Sat. Currently 7:00 pm.</p>
<div class="chips"><b>~ Routine</b><b style="--a:var(--body)">Body ↑</b><b style="--a:var(--dis)">Discipline ↑</b></div>
<div class="cw">Weekly capacity<span>62% → 71%</span></div><div class="sgm"><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i><i class="n"></i><i></i><i></i><i></i></div>
<div class="sw" id="sw"><div class="kn">›</div>Swipe to apply</div></div>
<div class="rec"><span class="k" style="color:var(--ac)">Applied</span><h3>Gym moved to 6:30 am</h3><p>Scheduled for Mon, Wed and Sat.</p>
<div class="tst"><svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="none" stroke="var(--ac)" stroke-width="2.5" stroke-dasharray="56.5" style="animation:cd 8s linear forwards;transform:rotate(-90deg);transform-origin:center"/></svg>Undo available for 8 s<button class="btn" id="un">Undo</button></div></div>
</div></div>
<div class="cp"><i>+</i><span>Reply to Jarvis</span><i>/</i><i class="go">↑</i></div>
</div><div class="cap">2. Chat, rails, proposal<span>Solid rail = observed, dashed = inferred, dotted = suggested.</span></div></div>

<div class="fr"><div class="ph">
<div class="hd" style="--o:var(--kno)"><b>✦ Jarvis</b><span class="md">Ask ▾</span></div>
<div class="dim"><div class="u">Why is my gym streak dying?</div><p class="r">You trained 1 of 3 planned days this week.</p></div>
<div class="sh"><div class="gr"></div>
<div class="lb">Recent</div><div class="chips" style="margin:0"><b style="--a:var(--ac)">Review</b><b style="--a:var(--body)">Habit</b><b style="--a:var(--soc)">Evidence</b></div>
<div class="lb">Think</div><div class="g2"><div class="t" style="--a:var(--kno)"><i></i>Ask</div><div class="t" style="--a:var(--ac)"><i></i>Review</div><div class="t" style="--a:var(--bad)"><i></i>Audit</div></div>
<div class="lb">Change</div><div class="g2"><div class="t" style="--a:var(--body)"><i></i>Habit</div><div class="t" style="--a:var(--dis)"><i></i>Quest</div><div class="t" style="--a:var(--cre)"><i></i>Goal</div><div class="t" style="--a:var(--kno)"><i></i>Routine</div><div class="t" style="--a:var(--ac)"><i></i>Target</div></div>
<div class="lb">Record</div><div class="g2"><div class="t" style="--a:var(--soc)"><i></i>Evidence</div><div class="t" style="--a:var(--cre)"><i></i>Memory</div><div class="t" style="--a:var(--kno)"><i></i>Learn</div></div></div>
<div class="cp"><i>+</i><span style="color:var(--tx)">/</span><i class="go">↑</i></div>
</div><div class="cap">3. Slash palette<span>Recents first, grouped by Think, Change, Record. 46px tiles.</span></div></div>

<div class="fr"><div class="ph">
<div class="hd" style="--o:var(--ac)"><b>✦ Jarvis</b><span class="md">Review ▾</span></div>
<div class="dim"><div class="u">How am I doing this month?</div><p class="r">Here is the September picture.</p></div>
<div class="sh"><div class="gr"></div>
<div class="auto">Jarvis picked Review from your message<b></b></div>
<div class="g3">
<div class="m" style="--o:var(--kno)"><i>?</i>Ask<small>Understand</small></div>
<div class="m" style="--o:var(--cre)"><i>▱</i>Plan<small>Design</small></div>
<div class="m on" style="--o:var(--ac)"><i>◌</i>Review<small>Inspect</small></div>
<div class="m" style="--o:var(--dis)"><i>◇</i>Act<small>Change</small></div>
<div class="m" style="--o:var(--soc)"><i>✓</i>Capture<small>Record</small></div>
<div class="m" style="--o:var(--bad)"><i>⌁</i>Audit<small>Find flaws</small></div></div></div>
<div class="cp"><i>+</i><span>Tell Jarvis what you want</span><i>/</i><i class="go">↑</i></div>
</div><div class="cap">4. Modes<span>A tinted pill in the header. Auto-picked, one tap to override.</span></div></div>

<div class="fr"><div class="ph stf" id="stf">
<div class="seg"><i class="on"></i><i></i><i></i></div>
<div class="sl on"><h2>9 of 12</h2><p>training sessions done in September. Weekends held. Weekday evenings took the hit.</p><div class="bars"><i style="height:100%" data-w="W1 3"></i><i style="height:100%" data-w="W2 3"></i><i style="height:66%" data-w="W3 2"></i><i style="height:33%" data-w="W4 1"></i></div></div>
<div class="sl"><h2>4 of 5</h2><p>planned weekday evening sessions were missed. Morning sessions: 6 of 6 done.</p><div class="bar" style="--a:var(--bad);margin-top:20px"><u style="width:20%"></u></div><div class="cw" style="margin-top:6px">Evenings<span>20%</span></div><div class="bar" style="--a:var(--tx)"><u style="width:100%"></u></div><div class="cw" style="margin-top:6px">Mornings<span>100%</span></div></div>
<div class="sl"><h2>Test 6:30 am</h2><p>Three sessions a week for two weeks. Jarvis logs it as an experiment and checks in on day 14.</p><button class="btn p" style="margin-top:18px">Create experiment</button></div>
<div class="ft"><button class="btn">Ask why</button><button class="btn">Audit routine</button></div>
</div><div class="cap">5. Review as stories<span>Tap the right half to advance, left half to go back.</span></div></div>

<div class="fr"><div class="ph">
<div class="hd" style="--o:var(--bad)"><b>✦ Jarvis</b><span class="md">Audit ▾</span><small>1 high, 2 lower</small></div>
<div class="bd"><h3 style="font:600 22px Geist,sans-serif;margin:6px 0 14px">3 issues found</h3>
<details open style="--c:var(--bad)"><summary>Capacity conflict<span class="k sv">High</span></summary><p>Your evening routine holds 2.5 h of commitments against 1.5 h free.</p><div class="fx"><button class="btn p">Fix</button></div></details>
<details style="--c:var(--dis)"><summary>Measurement mismatch<span class="k sv">Medium</span></summary><p>Social is measured by activity count, but your target is relationship depth.</p><div class="fx"><button class="btn p">Fix</button></div></details>
<details style="--c:var(--mu)"><summary>Stale target<span class="k sv">Low</span></summary><p>Your Strategy target predates your latest stated direction.</p><div class="fx"><button class="btn p">Fix</button></div></details></div>
<div class="pf"><button class="btn p">Fix all</button><button class="btn">Ignore</button></div>
</div><div class="cap">6. Audit as a lint report<span>Severity stripe, collapsible rows, Fix all pinned.</span></div></div>

<div class="fr"><div class="ph">
<div class="hd" style="--o:var(--cre)"><b>✦ Jarvis</b><span class="md">Plan ▾</span><small>draft</small></div>
<div class="bd"><div class="stk"><div class="cv"><div><h2>10K in 6 weeks</h2><p>5 changes, 2 axes</p><div class="dots"><i style="background:var(--body)"></i><i style="background:var(--dis)"></i></div></div>
<div class="ring"><svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="22" fill="none" stroke="#ffffff18" stroke-width="5"/><circle id="rg" cx="28" cy="28" r="22" fill="none" stroke="var(--ac)" stroke-width="5" stroke-linecap="round" stroke-dasharray="138.2" stroke-dashoffset="83"/></svg><span id="rt">2/5</span></div></div></div>
<label class="stp"><input type="checkbox" checked><span class="c"></span><div><b>Goal</b><small>Run a 10K</small></div></label>
<label class="stp"><input type="checkbox" checked><span class="c"></span><div><b>Quest</b><small>10 km without stopping</small></div></label>
<label class="stp"><input type="checkbox"><span class="c"></span><div><b>Routine</b><small>Run Tue, Thu, Sun at 6:30 am</small></div></label>
<label class="stp"><input type="checkbox"><span class="c"></span><div><b>Weekly benchmark</b><small>Sunday long run</small></div></label>
<label class="stp"><input type="checkbox"><span class="c"></span><div><b>Review</b><small>Every Sunday evening</small></div></label></div>
<div class="pf"><button class="btn p">Apply plan</button><button class="btn">Edit</button></div>
</div><div class="cap">7. Plan board<span>Stacked cover, progress ring, step timeline with toggles.</span></div></div>

<div class="fr"><div class="ph">
<div class="em"><div class="lg">✦</div><h2>Tell Jarvis what you're working on</h2><p>It turns your direction into a system you approve.</p></div>
<div class="g4">
<div class="pin" style="--a:var(--cre)"><i></i><h3>Start setup interview</h3></div>
<div class="pin" style="--a:var(--ac)"><i></i><h3>Review my system</h3></div>
<div class="pin" style="--a:var(--body)"><i></i><h3>Create a goal</h3></div>
<div class="pin" style="--a:var(--soc)"><i></i><h3>Log something I did</h3></div></div>
<div class="cp"><i>+</i><span>Tell Jarvis what you want</span><i>/</i><i class="go">↑</i></div>
</div><div class="cap">8. Empty state<span>Four starter pins teach what Jarvis can do.</span></div></div>

<div class="fr"><div class="ph">
<div class="hd busy" style="--o:var(--ac)"><b>✦ Jarvis</b><span class="md">Review ▾</span><small>working</small></div>
<div class="bd"><p style="font-size:14px;color:var(--mu);margin:2px 0 10px">Reviewing your recent evidence…</p><div class="sk"></div>
<div class="box"><h3>Delete 4 habits?</h3><p>Morning run, Stretching, and 2 more will be removed.</p><button class="hold" id="hold" ontouchstart=""><div class="fill"></div><span>Hold to delete</span></button></div>
<div class="box" style="box-shadow:inset 4px 0 0 var(--bad)"><h3>The change wasn't applied</h3><p>Your existing data is unchanged.</p><div style="display:flex;gap:8px"><button class="btn p">Retry</button><button class="btn">View details</button></div></div></div>
</div><div class="cap">9. States<span>Loading skeleton, hold-to-confirm delete, and a plain error.</span></div></div>

</div>
<script>
const $=id=>document.getElementById(id),pc=$('pc');
$('sw').onclick=()=>{pc.classList.add('go');setTimeout(()=>pc.classList.add('done'),350)};
$('un').onclick=()=>pc.classList.remove('go','done');
const f=$('stf'),sl=[...f.querySelectorAll('.sl')],sg=[...f.querySelectorAll('.seg i')];let n=0;
f.onclick=e=>{if(e.target.closest('button'))return;const r=f.getBoundingClientRect();n=Math.max(0,Math.min(2,n+(e.clientX-r.left>r.width/2?1:-1)));sl.forEach((s,i)=>s.classList.toggle('on',i==n));sg.forEach((s,i)=>s.classList.toggle('on',i<=n))};
const cb=[...document.querySelectorAll('.stp input')];
cb.forEach(c=>c.onchange=()=>{const k=cb.filter(x=>x.checked).length;$('rt').textContent=k+'/5';$('rg').style.strokeDashoffset=138.2*(1-k/5)});
const hb=$('hold');let t;
hb.onpointerdown=()=>{hb.classList.add('h');t=setTimeout(()=>{hb.classList.add('ok');hb.querySelector('span').textContent='Deleted 4 habits'},600)};
['pointerup','pointerleave','pointercancel'].forEach(e=>hb.addEventListener(e,()=>{clearTimeout(t);hb.classList.remove('h')}));
hb.oncontextmenu=e=>e.preventDefault();
</script></body></html>

``````

## Appendix B: Codex pages (Today, Stats, Goals), complete HTML source
This is the final direction only. Save as `codex-pages.html`. Unused leftover CSS classes from rejected alternatives can be ignored.

``````html
<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Actions-Tracker: Codex pages (final direction)</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@500&family=Outfit:wght@500;600&display=swap">
<style>
:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);--pg:#e9e9ee;--pt:#16161b}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--pg:#050506;--pt:#e8e8ee}}
:root[data-theme="dark"]{--pg:#050506;--pt:#e8e8ee}
html{scroll-padding-top:env(safe-area-inset-top,0px)}
*{box-sizing:border-box;margin:0}
body{background:var(--pg);color:var(--pt);font:15px/1.5 Geist,system-ui,sans-serif;padding:20px 0 40px}
h1{font:600 24px Geist,sans-serif;padding:0 20px;letter-spacing:-.02em}
.lead{padding:4px 20px 0;font-size:14px;opacity:.7;max-width:62ch}
.dh{padding:28px 20px 6px}.dh h2{font:600 19px Geist,sans-serif;letter-spacing:-.01em}.dh p{font-size:13.5px;opacity:.7;max-width:62ch;margin-top:2px}
.row{display:flex;gap:24px;overflow-x:auto;scroll-snap-type:x mandatory;padding:10px 20px}
.fr{flex:none;scroll-snap-align:center;width:360px}
.cap{font:500 13px Geist,sans-serif;padding:10px 4px 0;opacity:.85}
.ph{width:360px;height:640px;border-radius:32px;position:relative;overflow:hidden;background:var(--bg);color:var(--tx);font-family:var(--f);box-shadow:0 0 0 6px #000,0 0 0 7px #2a2a33}
.C{--bg:#0c0d0f;--s1:#141518;--s2:#1d1f23;--tx:#e9e9e4;--mu:#8a8d93;--ac:#e0763a;--on:#1a0d04;--f:Geist,sans-serif;--r:16px;--ln:#ffffff1f;--nvbg:#141518;--nvt:#8a8d93;--nvon:#e0763a;--ab:78px}
.hd{display:flex;align-items:flex-end;padding:26px 18px 12px}
.hd h2{font:600 26px/1.1 var(--f);letter-spacing:-.02em}.hd p{font-size:13px;color:var(--mu)}
.hd small{margin-left:auto;font:500 11.5px 'Geist Mono',monospace;color:var(--mu);padding:9px 12px;border-radius:99px;box-shadow:inset 0 0 0 1px var(--ln)}
.C .hd small{border-radius:12px}
.bd{padding:0 14px}
.k{font:500 11.5px 'Geist Mono',monospace;color:var(--mu)}
.b{font:600 32px/1 var(--f);letter-spacing:-.02em;margin-top:6px}.b small{font-size:14px;color:var(--mu);font-weight:500}
.d{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--c,var(--ac));margin-right:6px}
.bar{height:6px;border-radius:3px;background:var(--ln);overflow:hidden;margin-top:10px}.bar u{display:block;height:100%;width:var(--p);background:var(--ac)}
.ck{width:28px;height:28px;border-radius:50%;box-shadow:inset 0 0 0 2px var(--mu);display:grid;place-items:center;flex:none}
.ck.on{background:var(--ac);box-shadow:none;color:var(--on)}.ck.on::after{content:'✓';font-size:14px}
.sp{display:flex;align-items:flex-end;gap:4px;height:34px;margin-top:10px}.sp i{flex:1;background:var(--c);opacity:.85;border-radius:3px 3px 1px 1px}
.btn{display:inline-grid;place-items:center;min-height:48px;padding:0 22px;border-radius:24px;background:var(--ac);color:var(--on);font:600 14px var(--f);margin-top:12px}
.mas{columns:2;column-gap:10px}
.pin{break-inside:avoid;margin-bottom:10px;padding:14px;border-radius:var(--r);background:var(--s1);box-shadow:inset 0 0 0 1px var(--ln)}
.pin h3{font:600 15px/1.25 var(--f);margin:6px 0 2px}.pin p{font-size:12.5px;color:var(--mu);line-height:1.4}
.pin.dash{background:transparent;box-shadow:none;border:1.5px dashed var(--mu)}
.now{margin-bottom:10px;padding:16px;border-radius:var(--r);background:var(--s1);box-shadow:inset 0 0 0 1.5px var(--ac)}
.now h3{font:600 22px/1.15 var(--f);letter-spacing:-.02em;margin-top:4px}.now p{font-size:13px;color:var(--mu)}
.nv{position:absolute;left:0;right:0;bottom:0;height:64px;display:flex;background:var(--nvbg);box-shadow:0 -1px 0 var(--ln)}
.nv b{flex:1;display:grid;place-items:center;font:500 11.5px var(--f);color:var(--nvt)}
.nv b.on{color:var(--nvon);font-weight:600}
.ask{position:absolute;right:14px;bottom:var(--ab);height:44px;padding:0 18px;display:grid;place-items:center;border-radius:22px;background:var(--ac);color:var(--on);font:600 13.5px var(--f)}
.C .ask{border-radius:12px}
.dt{font:600 76px/.82 var(--f);letter-spacing:-.05em}
.dtl{padding:0 18px;display:flex;align-items:flex-end;gap:12px;margin:22px 0 4px}.dtl p{font-size:14px;color:var(--mu);line-height:1.3;padding-bottom:4px}
.bnow{border-radius:var(--r);background:var(--ac);color:var(--on);padding:18px;margin:14px 0 12px}
.bnow h3{font:600 27px/1.05 var(--f);letter-spacing:-.02em;margin-top:4px}.bnow p{opacity:.9;font-size:13px;margin-top:4px}.bnow .k{color:var(--on);opacity:.85}
.bnow .btn{background:#fff;color:#14161a}
.strip{display:flex;align-items:center;gap:12px;height:56px;padding:0 18px 0 14px;border-radius:28px;background:var(--s1);margin-bottom:8px;font:500 15px var(--f)}
.strip .k{margin-left:auto}
.blk{break-inside:avoid;margin-bottom:10px;padding:16px;border-radius:var(--r);background:var(--c);color:#14161a}
.blk .b{font-size:64px;margin:8px 0 4px}.blk .k{color:#14161acc}
.gl{position:relative;overflow:hidden;background:var(--s1);border-radius:var(--r);padding:16px 18px;margin-bottom:10px;min-height:104px}
.gl::before{content:'';position:absolute;inset:0 auto 0 0;width:var(--p);background:var(--c);opacity:.55}
.gl>*{position:relative}.gl h3{font:600 22px/1.1 var(--f);letter-spacing:-.02em}.gl .b{position:absolute;right:18px;top:14px;font-size:38px}
.gl p{font-size:13px;margin-top:22px;color:var(--tx)}
.cd{background:var(--s1);padding:14px 16px;margin-bottom:10px;border-radius:16px}
.cd h3{font:600 18px/1.2 var(--f);margin:6px 0 2px}.cd p{font-size:12.5px;color:var(--mu)}
.seg{display:flex;gap:3px;margin-top:10px}.seg i{flex:1;height:8px;background:var(--ln)}.seg i.f{background:var(--ac)}
.q{display:flex;align-items:center;gap:12px;min-height:56px;border-bottom:1px solid var(--ln)}
.sq{width:24px;height:24px;border-radius:8px;box-shadow:inset 0 0 0 2px var(--mu);flex:none;display:grid;place-items:center}
.sq.on{background:var(--ac);box-shadow:none;color:var(--on)}.sq.on::after{content:'✓';font-size:14px}
.q b{font:500 15px var(--f);display:block}.xp{margin-left:auto;font:500 12px 'Geist Mono',monospace;color:var(--ac)}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:0 16px;margin-top:6px}
.g2 div{display:flex;justify-content:space-between;align-items:center;min-height:40px;border-bottom:1px solid var(--ln);font:500 13.5px var(--f)}
.g2 span{font:500 12px 'Geist Mono',monospace;color:var(--mu)}
svg text{font:500 10px 'Geist Mono',monospace;fill:var(--mu)}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style></head><body>
<h1>Codex pages: Today, Stats, Goals</h1>
<p class="lead">Final direction. Today, Stats and Goals with the shared shell: 5 tabs plus a docked Ask Jarvis pill. Scroll sideways.</p>

<div class="dh"><h2>C. Codex</h2><p>From collectible-card and character-sheet pins. Dark, burnt-orange accent, notched cards, mono numbers, XP and level, a radar for Stats. Leans into your RPG roots.</p></div>
<div class="row">
<div class="fr"><div class="ph C" data-t="Today"><div class="hd"><div><h2>Today</h2><p>Thursday 24 September</p></div><small>Level 7</small></div>
<div class="bd"><div class="seg" style="margin:0 0 16px"><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i><i></i><i></i><i></i><i></i></div>
<span class="k">Quest log</span>
<div class="q"><div class="sq"></div><div><b>Gym, 6:30 am</b><span class="k">Body</span></div><span class="xp">+40 xp</span></div>
<div class="q"><div class="sq on"></div><div><b>Read 20 pages</b><span class="k">Knowledge</span></div><span class="xp">+15 xp</span></div>
<div class="q"><div class="sq"></div><div><b>Stretch 10 min</b><span class="k">Body</span></div><span class="xp">+10 xp</span></div>
<div class="q"><div class="sq"></div><div><b>10 km run</b><span class="k">6/10 km</span></div><span class="xp">+60 xp</span></div>
<div class="cd" style="margin-top:16px"><span class="k">Main quest</span><h3>Run a 10K</h3><div class="seg"><i class="f"></i><i class="f"></i><i class="f"></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div></div><div class="cap">C1 Today</div></div>
<div class="fr"><div class="ph C" data-t="Stats"><div class="hd"><div><h2>Stats</h2><p>Last 30 days</p></div><small>Level 7</small></div><div class="bd">
<svg viewBox="-120 -110 240 220" width="100%" role="img" aria-label="Radar chart of six axes"><g fill="none" stroke="#ffffff1f"><polygon points="0,-90 77.9,-45 77.9,45 0,90 -77.9,45 -77.9,-45"/><polygon points="0,-45 39,-22.5 39,22.5 0,45 -39,22.5 -39,-22.5"/><path d="M0 -90V90M-77.9 -45L77.9 45M-77.9 45L77.9 -45"/></g>
<polygon points="0,-57.6 45.2,-26.1 55.3,32 0,38.7 -40.5,23.4 -46.8,-27" fill="#e0763a33" stroke="#e0763a" stroke-width="2"/>
<text x="0" y="-97" text-anchor="middle">Body</text><text x="88" y="-46" text-anchor="middle">Discipline</text><text x="88" y="54" text-anchor="middle">Knowledge</text><text x="0" y="108" text-anchor="middle">Social</text><text x="-88" y="54" text-anchor="middle">Creativity</text><text x="-88" y="-46" text-anchor="middle">Strategy</text></svg>
<div class="g2" id="sC"></div></div></div><div class="cap">C2 Stats</div></div>
<div class="fr"><div class="ph C" data-t="Goals"><div class="hd"><div><h2>Goals</h2><p>3 active</p></div><small>New goal</small></div><div class="bd" id="gC"></div></div><div class="cap">C3 Goals</div></div>
</div>

<script>
const S=[['Body',64,'+4','#e4826f',[50,58,54,66,70]],['Discipline',58,'+1','#d9a94e',[60,52,56,55,58]],['Knowledge',71,'+6','#6f9fe0',[48,55,60,66,74]],['Social',43,'-5','#dc85ad',[66,60,52,46,40]],['Creativity',52,'+2','#a58fdb',[44,50,46,52,55]],['Strategy',60,'+3','#3cc48f',[50,54,58,57,62]]];
const P=['#f0b3a5','#efd28f','#a9c6ee','#efb5cf','#cdbdf0','#a5e0c8'];
const G=[['Run a 10K','Body',34,'6 weeks left. Next: 8 km'],['German B2','Knowledge',55,'By March. Next: mock exam'],['Ship Life OS v2','Strategy',20,'No date set']];
const $=id=>document.getElementById(id),seg=n=>'<div class="seg">'+Array.from({length:10},(_,i)=>'<i'+(i<n?' class="f"':'')+'></i>').join('')+'</div>';
$('sC').innerHTML=S.map(s=>`<div>${s[0]}<span>${s[1]}  ${s[2]}</span></div>`).join('');
$('gC').innerHTML=G.map((g,i)=>`<div class="cd"><span class="k">${i?'Side quest':'Main quest'}, ${g[1]}</span><h3>${g[0]}</h3><p>${g[3]}</p>${seg(Math.round(g[2]/10))}</div>`).join('');
document.querySelectorAll('.ph').forEach(p=>p.insertAdjacentHTML('beforeend','<div class="ask">Ask Jarvis</div><div class="nv">'+['Today','Stats','Learn','Goals','Audits'].map(t=>'<b'+(t==p.dataset.t?' class="on"':'')+'>'+t+'</b>').join('')+'</div>'));
</script></body></html>

``````

## Appendix C: Original product specification (verbatim extract)
Behavior, domain and data contracts. If it conflicts with the visuals above, visuals win for look and this appendix wins for behavior and data.

``````markdown
**ACTIONS-TRACKER**
Complete Product, UI/UX & Engineering Specification

*Page-by-page experience, interaction flows, frontend architecture, domain logic and data/backend contracts*

Purpose: Apply the same depth used for the Jarvis specification to every major Actions-Tracker screen and user-facing surface. This document defines each page's purpose, emotional design, information architecture, interactions, frontend responsibilities, supporting domain/backend capabilities, cross-page flows and engineering definition of done.

Platform: mobile-first React/Vite PWA wrapped with Capacitor Android. Design for approximately 360–432px phone widths; do not depend on desktop-only interactions.

Core loop: Intent → Direction → Action → Evidence → Measurement → Review → Audit → Adaptation.

# 1. PRODUCT EXPERIENCE ARCHITECTURE

## 1.1 The page ecosystem

| Surface | Primary job | Desired feeling |
| --- | --- | --- |
| Today | Execute what matters now | Calm momentum |
| Stats | Understand change and evidence | Curiosity / insight |
| Learn | Build knowledge and capability | Intellectual momentum |
| Goals | Define direction and outcomes | Ownership / intention |
| Jarvis | Understand, design, propose and operate | Trust / capability |
| Audits | Find contradictions and system problems | Constructive clarity |
| Settings | Control configuration, data, AI and privacy | Confidence / control |
| Onboarding | Establish identity, context, baseline and targets | Being understood |

These are not independent screens. They are views over the same personal system and should share the same interaction grammar, visual language, data model and contextual Jarvis entry points.

## 1.2 Shared interaction grammar

Primary CTA: one obvious forward action per surface.

Secondary actions: inspect, edit, ask Jarvis, defer or dismiss.

Bottom sheets: mobile detail/edit/confirmation without losing context.

Action cards: proposal → impact → approval → execution → result.

Evidence cards: show what supports a conclusion.

Contextual Jarvis CTA: opens Jarvis with page/entity context already attached.

Undo: immediate recovery after reversible mutations.

Progressive disclosure: advanced controls appear only when relevant.

Empty states teach the purpose of the screen instead of merely saying there is no data.

## 1.3 Shared visual system

Screen titles around 24px; body generally 14–15px; metadata compact but readable.

Keep touch targets around 44–48dp even when typography is compact.

Use consistent spacing, radii, icon sizing, button hierarchy and card density.

Use motion to communicate state transitions rather than decoration.

Respect Android safe areas and keyboard/viewport behavior.

Do not rely on color alone for status.

Maintain accessible labels and scalable text.

Do not expose hidden model chain-of-thought; expose concise rationale, evidence, impact and result.

# 2. GLOBAL APP SHELL

## 2.1 Navigation

Primary destinations: Today / Stats / Learn / Goals / Jarvis / Audits. Settings is the secondary control plane. Navigation must preserve drafts, relevant scroll state and entity context wherever practical.

## 2.2 Startup/data lifecycle

Initialize IndexedDB.

Restore the latest backup only when the database is genuinely empty.

Run schema migrations.

Initialize repositories/domain configuration.

Generate required recurring occurrences.

Run automatic backup.

Initialize app state and navigation.

Determine onboarding/check-in state from actual stored data.

Render the appropriate page.

## 2.3 Global component primitives

AppHeader

SectionHeader

Primary/Secondary/Destructive Button

IconButton

Chip

Card

StatCard

EntityRow

BottomSheet

ConfirmDialog

ActionProposalCard

EvidenceCard

EmptyState

LoadingState

ErrorState

Undo/Toast

ProgressIndicator

ContextualJarvisCTA

# 3. TODAY — EXECUTION DASHBOARD

## 3.1 Product purpose

Today is the operational cockpit. It should answer: What matters today? What can I do now? What evidence can I record?

## 3.2 Information hierarchy

Date/context

Priority actions

Habit occurrences

Quest/goal actions

Quick evidence/observation

Lightweight progress summary

Contextual Jarvis entry point

## 3.3 Interaction flows

Complete/uncomplete a habit occurrence.

Open a habit or quest detail surface.

Log evidence or an observation.

Ask Jarvis to adjust today's plan.

Open a relevant goal.

Review today's workload when the day feels overloaded.

## 3.4 Frontend architecture

TodayTab should compose reusable HabitRow, QuestCard, EvidenceComposer, ProgressSummary and DetailSheet primitives. Domain calculations remain outside JSX. Local mutations can update optimistically where safe; repository state remains authoritative.

## 3.5 Supporting data/domain

habits + habitOccurrences

questBoard

goals + milestones

logs + observations

routine configuration

stat snapshots

Jarvis action executor

## 3.6 States

No actions: explain the value of planning rather than displaying an empty void.

Overloaded day: surface Review/Audit pathways.

No historical evidence: explain when meaningful review becomes available.

AI unavailable: local execution remains available.

# 4. STATS — MEASUREMENT & INTERPRETATION

## 4.1 Product purpose

Stats is the measurement and interpretation surface. It should help the user understand change, not feel judged by a score.

## 4.2 Six-axis model

| Axis | Meaningful signals | Avoid reducing it to |
| --- | --- | --- |
| Body | Performance, strength, endurance, mobility, recovery, benchmarks | Exercise counts |
| Discipline | Commitments, follow-through, consistency, recovery from failure | Perfect streaks |
| Knowledge | Learning, retrieval, application, projects, understanding | Books/pages alone |
| Social | Relationship depth, communication quality, belonging, meaningful interaction | Interaction counts |
| Creativity | Output, experimentation, iteration, completed work | Idea counts |
| Strategy | Decisions, planning, predictions, post-mortems, experiments, outcomes | Biography/book counts |

## 4.3 Interaction model

Tap an axis → inspect evidence and contributing signals.

Tap a trend → inspect relevant evidence.

Ask Jarvis why a metric changed.

Ask Jarvis to audit whether the metric represents the intended target.

Open the underlying goal/quest/habit.

## 4.4 Frontend architecture

StatsTab

AxisCard

TrendChart

ContributionBreakdown

EvidenceList

Accessible text equivalents for charts

Repository-backed selectors/domain stat engines

## 4.5 Supporting data/domain

statSnapshots

axis_config

logs

evidence

goals

quests

observations

domain engines

domain progress models

Jarvis Review/Audit modes

# 5. LEARN — KNOWLEDGE & CAPABILITY

## 5.1 Product purpose

Learn should move beyond storing resources. The loop is Learn → Practice → Apply → Evidence → Review.

## 5.2 Information architecture

Learning priorities

Active learning items

Roadmaps

Resources

Practice/application

Evidence of understanding

Review/retention

## 5.3 Flows

Create topic → define objective → choose resource → practice → capture evidence.

Open a topic → ask Jarvis for explanation or study plan.

Convert a learning objective into a quest/benchmark.

Use Audits to identify learning gaps.

## 5.4 Frontend architecture

LearnTab

LearningCard

ResourceRow

LearningDetailSheet

PracticePrompt

EvidenceLink

Deep link to Jarvis with learning context

## 5.5 Supporting data/domain

learnings

books/resources where applicable

evidence

goals/quests relations

Jarvis context builder

action executor

# 6. GOALS — DIRECTION & OUTCOMES

## 6.1 Product purpose

Goals answers: What am I trying to make true? It is the direction layer, while habits/quests/routines are execution mechanisms.

## 6.2 Goal lifecycle

Intent → clarification → goal → success definition → timeframe → milestones → execution mechanisms → evidence → review → revision/completion.

## 6.3 Goal detail UX

Prioritize desired outcome and current state.

Show why the goal matters.

Show timeframe and milestones.

Expose supporting habits/quests/learning below the outcome.

Show evidence and blockers.

Offer Jarvis with the current goal already in context.

## 6.4 Interactions

Create/edit/pause/revise goal

Change target definition

Attach execution objects

Review evidence

Audit conflicts

Ask Jarvis to redesign the goal system

## 6.5 Supporting data/domain

goals

milestones

relations

evidence/logs

habits

quests

learnings

Jarvis add_goal / modify_goal / target actions

# 7. JARVIS — CONVERSATIONAL OPERATING LAYER

## 7.1 Product purpose

Jarvis is the intelligence and orchestration layer over the whole application: understand → reason → design → propose → execute → observe → adapt.

## 7.2 Behavioral modes

| Mode | Purpose | Examples |
| --- | --- | --- |
| Ask | Understand | Questions, explanations, exploration |
| Plan | Design | Roadmaps, decomposition, system design |
| Review | Interpret | Progress, trends, evidence |
| Act | Change | Propose system mutations |
| Capture | Record | Evidence, learning, memory |
| Audit | Diagnose | Contradictions, bottlenecks, measurement issues |

## 7.3 Slash command UX

/habit

/quest

/goal

/routine

/plan

/learn

/evidence

/memory

/experiment

/target

/review

/audit

/onboarding

The command palette is progressive disclosure: typing '/' reveals capabilities without permanently occupying the interface. It should support filtering, touch selection, Escape dismissal and eventually keyboard ArrowUp/ArrowDown/Enter navigation.

## 7.4 Action lifecycle

Intent → context assembly → LLM → structured response → schema validation → impact analysis → proposal → approval → deterministic execution → repository mutation → UI refresh → result → undo where possible.

## 7.5 Frontend architecture

JarvisTab

ConversationViewport

MessageRenderer

ActionProposalCard

ImpactPreview

ExecutionResult

ModeSelector

CommandPalette

Composer

ConfirmationSheet

Detail/Edit sheets

## 7.6 AI/domain architecture

jarvisEngine

contextBuilder

jarvisPersona

llmClient

actionSchemas

actionExecutor

impactEngine

evidence validation

jarvisConversations

The configured primary model remains openai/gpt-oss-20b. Behavioral modes are not the same thing as model selection; they should remain separate concepts.

## 7.7 Trust UX

Separate observed fact, inference, recommendation and action.

Show concise evidence/provenance where relevant.

Never claim an action succeeded before the executor succeeds.

Show impact before high-impact changes.

Support Edit/Cancel/Undo.

Keep meaningful mutations human-approved.

# 8. AUDITS — SYSTEM DIAGNOSTICS

## 8.1 Product purpose

Audits asks: Does my system make sense? It should diagnose system quality rather than judge the user.

## 8.2 Audit categories

Goal conflicts

Capacity overload

Stale targets

Weak measurement

Missing evidence

Routine mismatch

Contradictory priorities

Unrealistic execution models

Unresolved experiments

Domain-model mismatch

## 8.3 Audit flow

Finding → evidence → context/severity → explanation → possible correction → user choice. Audit findings do not silently mutate the system.

## 8.4 Frontend architecture

AuditsTab

AuditCard

FindingDetailSheet

RelatedEntityLinks

Filter by unresolved/resolved/domain

Send finding to Jarvis

## 8.5 Supporting data/domain

audits

insights

goals

habits

routines

quests

evidence

domain engines

Jarvis Audit mode

# 9. SETTINGS — CONTROL PLANE

## 9.1 Product purpose

Settings is the control center for AI, data, backups, integrations, appearance, privacy and application configuration.

## 9.2 Information architecture

AI provider/model

Application preferences

Data/export/backup

Memory/privacy controls

Integrations

Appearance

Version/update information

Diagnostics

## 9.3 AI settings

Provider/base URL

API key

Model

Connection verification

Clear explanation of which features depend on AI

## 9.4 Data controls

Export

Restore/import where supported

Backup status

Storage information

Explicit confirmation for destructive actions

## 9.5 Supporting data/domain

settings repository

backupService

restoreLatestBackupIfDatabaseEmpty

LLM client

integration configuration

version/update checker

# 10. ONBOARDING — FIRST-RUN EXPERIENCE

## 10.1 Product purpose

Onboarding establishes identity, current state, constraints, focus, baseline, desired future and targets. It should not immediately manufacture an arbitrary habit/routine system.

## 10.2 Conversational flow

Welcome → Identity → Constraints → Focus → Baseline → Vision → Targets → complete_onboarding → Jarvis design pending.

## 10.3 Engineering boundary

complete_onboarding records direction/context and leaves execution design for Jarvis. This keeps understanding separate from system design.

## 10.4 Supporting data/domain

selfModel

axis_config

onboarding metadata

provenance

Jarvis conversation

complete_onboarding action

# 11. CROSS-PAGE CONTEXT FLOWS

## 11.1 Today → Jarvis

The user sees a current-day problem → opens Jarvis → current-day actions/routine/evidence become context → Jarvis explains or proposes → approval/execution → Today refreshes.

## 11.2 Stats → Jarvis

The user sees a metric/trend → taps Why? → Jarvis receives axis, trend and supporting evidence → explains observed change → proposes next step only when justified.

## 11.3 Goals → Jarvis

The user opens a goal → asks to change it → Jarvis receives goal context → clarifies intent → proposes modification → executor updates goal → Goals refresh.

## 11.4 Learn → Jarvis

The user is stuck → Jarvis receives the learning context → explains, creates practice or proposes a learning plan.

## 11.5 Audits → Jarvis

An audit finding opens in context → Jarvis receives the finding/evidence → proposes a correction → user chooses whether to apply it.

## 11.6 Any page → Evidence

Important actions should create or expose a path to evidence, so the application is evidence-driven rather than merely task-driven.

# 12. ERROR, LOADING & EMPTY-STATE SYSTEM

| State | UX requirement | Example |
| --- | --- | --- |
| Loading | Explain meaningful work | Reviewing recent evidence… |
| Empty | Explain purpose + next action | No active goals yet. Tell Jarvis what you want to change. |
| Ambiguous | Ask focused clarification | Do you mean today's routine or the weekly routine? |
| Validation error | Explain what is missing | A target timeframe is required. |
| Execution error | Confirm existing data is unchanged | The change was not applied. Retry or inspect details. |
| Provider error | Give recovery path | Check Settings → AI and try again. |
| Success | State exactly what changed | Created the 3-day habit and scheduled occurrences. |
| Undo | Offer immediate reversal | Habit created. Undo |

# 13. FRONTEND ENGINEERING ARCHITECTURE

## 13.1 Layering

Presentation components should not own business rules. Recommended flow: React page → feature components/hooks → domain services/selectors → repositories → IndexedDB.

## 13.2 Agentic path

React → Jarvis engine → context builder → LLM → structured response → schema validation → impact engine → approval → action executor → repository → UI refresh.

## 13.3 State categories

UI state: sheets, menus, focus, scroll, keyboard.

Interaction state: drafts, selected mode, command query.

Async state: loading/executing/error/success.

Domain state: goals, habits, quests, evidence, routines.

AI state: conversation, proposals, claims, context.

Persistent state: repositories and settings.

## 13.4 Reliability

Schema validation

Idempotent action execution

Migration-safe persistence

Backup/restore

No silent destructive mutations

Explicit action lifecycle

Local functionality independent of AI availability

# 14. ACCESSIBILITY & MOBILE UX

Design for 360–432px widths first.

Keep important touch targets around 44–48dp.

Support scalable text and semantic labels.

Do not rely on hover.

Use bottom sheets instead of desktop dialogs where appropriate.

Keep composer above the Android keyboard.

Preserve conversation scroll position.

Provide accessible chart/text equivalents.

Support reduced motion.

Use clear focus order after dialogs/sheets.

# 15. EMOTIONAL DESIGN SYSTEM

| Page | Desired emotional response | Avoid |
| --- | --- | --- |
| Today | I can handle today | Guilt / overload |
| Stats | I understand what changed | Score anxiety |
| Learn | I am making progress in understanding | Content dumping |
| Goals | This is my direction | Generic templates |
| Jarvis | It understands and helps me act | Black-box automation |
| Audits | I can see what needs fixing | Punishment |
| Settings | I control my system | Technical clutter |
| Onboarding | The system understands me | Questionnaire fatigue |

# 16. COMPLETE USER JOURNEY

First launch → conversational onboarding → identity/context/baseline/targets → Jarvis design interview → proposed system → approval → Today execution → evidence → Stats interpretation → Goals review → Learn capability building → Audits diagnostics → Jarvis adaptation → revised system.

The product should feel like one continuous loop, not a set of isolated tabs.

# 17. DEFINITION OF DONE — EVERY PAGE

Clear single primary purpose.

Visual hierarchy is understandable immediately.

Empty/loading/error/success states are designed.

Important mutations provide confirmation/result and undo where possible.

Jarvis entry point is context-aware.

Page remains useful without AI connectivity.

Domain logic is outside presentation JSX.

Data is repository-backed and migration-safe.

Responsive at 360–432px.

Typography and spacing follow the shared design system.

Accessibility labels and semantic controls exist.

Evidence/provenance can be surfaced where relevant.

Cross-page navigation preserves context.

Critical interactions are testable.

# 18. IMPLEMENTATION ROADMAP

Create shared design tokens and primitives for typography, spacing, buttons, cards, sheets, states and contextual Jarvis CTAs.

Normalize every page onto those primitives without changing domain behavior.

Standardize loading/empty/error/success/undo states.

Add contextual Jarvis deep links across Today, Stats, Learn, Goals and Audits.

Create a shared action proposal/impact/execution component system.

Make the command registry derive from the real action capability registry.

Add evidence/provenance inspection to Stats, Goals, Audits and Jarvis.

Add entity-aware Jarvis context so entry from any page carries the relevant goal/habit/quest/learning/audit.

Add interaction tests for critical user journeys.

Run visual/UX audits at 360, 390 and 432px before each release.

# 19. FINAL PRODUCT DEFINITION

Actions-Tracker should feel like a single intelligent personal system. Today executes. Stats measures. Learn develops capability. Goals defines direction. Audits diagnoses the system. Settings controls it. Onboarding establishes the initial model. Jarvis connects all of them through conversation, reasoning, structured proposals and deterministic execution.

The product north star is not “more features.” It is reduced friction between intention and meaningful action while preserving evidence, context, user control and long-term adaptability.

Actions-Tracker — Complete Product / UI / UX / Frontend / Domain Architecture
``````

## Appendix D: Remaining screens (Learn, Audits, Settings, Onboarding, goal detail, Stats axis sheet), complete HTML source
Save as `codex-remaining-screens.html`. Same tokens as Appendices A and B.

``````html
<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Actions-Tracker Codex: remaining screens</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@500&display=swap">
<style>
:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);--pg:#e9e9ee;--pt:#16161b}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--pg:#050506;--pt:#e8e8ee}}
:root[data-theme="dark"]{--pg:#050506;--pt:#e8e8ee}
html{scroll-padding-top:env(safe-area-inset-top,0px)}
*{box-sizing:border-box;margin:0}
body{background:var(--pg);color:var(--pt);font:15px/1.5 Geist,system-ui,sans-serif;padding:20px 0 40px}
h1{font:600 24px Geist,sans-serif;padding:0 20px;letter-spacing:-.02em}
.lead{padding:4px 20px 0;font-size:14px;opacity:.7;max-width:62ch}
.dh{padding:26px 20px 4px}.dh h2{font:600 19px Geist,sans-serif}.dh p{font-size:13.5px;opacity:.7;max-width:62ch}
.row{display:flex;gap:24px;overflow-x:auto;scroll-snap-type:x mandatory;padding:10px 20px}
.fr{flex:none;scroll-snap-align:center;width:360px}
.cap{font:500 13px Geist,sans-serif;padding:10px 4px 0;opacity:.85}
.ph{--bg:#0c0d0f;--s1:#141518;--s2:#1d1f23;--tx:#e9e9e4;--mu:#8a8d93;--ac:#e0763a;--on:#1a0d04;--ln:#ffffff14;--f:Geist,sans-serif;width:360px;height:640px;border-radius:32px;position:relative;overflow:hidden;background:var(--bg);color:var(--tx);font-family:var(--f);box-shadow:0 0 0 6px #000,0 0 0 7px #2a2a33}
.hd{display:flex;align-items:flex-end;padding:26px 18px 12px}
.hd h2{font:600 26px/1.1 var(--f);letter-spacing:-.02em}.hd p{font-size:13px;color:var(--mu)}
.pill{margin-left:auto;font:500 11.5px 'Geist Mono',monospace;color:var(--mu);padding:9px 12px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--ln)}
.bd{padding:0 14px}
.k{font:500 11.5px 'Geist Mono',monospace;color:var(--mu)}
.mu{font-size:13px;color:var(--mu)}
.d{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--c,var(--ac));margin-right:6px}
.t1{font:600 22px/1.15 var(--f);letter-spacing:-.02em;margin:4px 0 2px}
.b{font:600 34px/1 var(--f);letter-spacing:-.02em;margin:6px 0}.b small{font-size:14px;color:var(--mu);font-weight:500}
.card{background:var(--s1);border-radius:16px;padding:14px;margin-bottom:10px;box-shadow:inset 0 0 0 1px var(--ln)}
.card h3{font:600 17px/1.2 var(--f);margin:6px 0 2px}.card p{font-size:13px;color:var(--mu)}
.seg{display:flex;gap:3px;margin-top:10px}.seg i{flex:1;height:8px;background:var(--ln)}.seg i.f{background:var(--ac)}
.tp{display:flex;align-items:center}.tg{margin-left:auto;font:500 11px 'Geist Mono',monospace;color:var(--ac);padding:4px 8px;border-radius:8px;box-shadow:inset 0 0 0 1px var(--ac)}
.btn{display:grid;place-items:center;min-height:48px;padding:0 20px;border-radius:12px;background:var(--ac);color:var(--on);font:600 14px var(--f)}
.btn.s{background:var(--s2);color:var(--tx)}
.chs{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 14px}
.ch{min-height:44px;padding:0 14px;display:grid;place-items:center;border-radius:10px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--ln);font:500 13.5px var(--f)}
.ch.on{background:color-mix(in srgb,var(--ac) 18%,var(--s1));box-shadow:inset 0 0 0 1.5px var(--ac)}
.grp{border-radius:16px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--ln);background:var(--s1)}
.rw{display:flex;align-items:center;min-height:52px;padding:0 14px;border-bottom:1px solid var(--ln);font:500 14.5px var(--f)}.rw:last-child{border:0}
.rw .v{margin-left:auto;font:500 12px 'Geist Mono',monospace;color:var(--mu)}.rw .v::after{content:'›';margin-left:8px}.rw .v.n::after{content:none}
.lb{font:500 12.5px var(--f);color:var(--mu);margin:16px 4px 8px}
.fl{font:500 13px var(--f);margin:14px 0 6px}
.in{min-height:48px;display:flex;align-items:center;padding:0 14px;border-radius:12px;background:var(--s2);font:500 13px 'Geist Mono',monospace;box-shadow:inset 0 0 0 1px var(--ln)}
.fd{background:var(--s1);border-radius:16px;padding:14px 14px 12px 18px;margin-bottom:10px;box-shadow:inset 4px 0 0 var(--c)}
.fd h3{font:600 15px var(--f)}.fd p{font-size:12.5px;color:var(--mu);margin-top:2px}
.ft{display:flex;margin-top:8px}.ft span{font:500 11.5px 'Geist Mono',monospace;color:var(--mu)}.ft span:last-child{margin-left:auto;color:var(--tx)}
.dm{position:absolute;inset:0;background:#000a;z-index:5}
.sh{position:absolute;left:0;right:0;bottom:0;z-index:6;background:var(--s1);border-radius:24px 24px 0 0;padding:10px 18px 22px;box-shadow:0 -1px 0 var(--ln)}
.gr{width:36px;height:4px;border-radius:2px;background:#ffffff26;margin:0 auto 12px}
.lp{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin:14px 0}
.lp div{font:500 10.5px 'Geist Mono',monospace;color:var(--mu);padding-top:8px;border-top:3px solid var(--ln)}
.lp .dn{border-color:var(--tx);color:var(--tx)}.lp .on{border-color:var(--ac);color:var(--ac)}
.sq{width:24px;height:24px;border-radius:8px;box-shadow:inset 0 0 0 2px var(--mu);flex:none;display:grid;place-items:center;margin-right:12px}
.sq.on{background:var(--ac);box-shadow:none;color:var(--on)}.sq.on::after{content:'✓';font-size:14px}
.ct{display:flex;align-items:center;gap:10px;min-height:36px;font-size:13px}.ct i{margin-left:auto;width:90px;height:6px;background:var(--ln)}.ct u{display:block;height:100%;background:var(--ac);width:var(--p)}.ct span{font:500 12px 'Geist Mono',monospace;color:var(--mu);width:34px;text-align:right}
.nv{position:absolute;left:0;right:0;bottom:0;height:64px;display:flex;background:var(--s1);box-shadow:0 -1px 0 var(--ln)}
.nv b{flex:1;display:grid;place-items:center;font:500 11.5px var(--f);color:var(--mu)}.nv b.on{color:var(--ac);font-weight:600}
.ask{position:absolute;right:14px;bottom:78px;height:44px;padding:0 18px;display:grid;place-items:center;border-radius:12px;background:var(--ac);color:var(--on);font:600 13.5px var(--f)}
.cp{position:absolute;left:12px;right:12px;bottom:14px;height:60px;border-radius:16px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--ln);display:flex;align-items:center;gap:6px;padding:0 7px;color:var(--mu);font-size:14px}
.cp span{flex:1;padding-left:6px}.cp i{font-style:normal;width:46px;height:46px;border-radius:12px;display:grid;place-items:center;background:var(--s1);color:var(--tx)}.cp i.go{background:var(--ac);color:var(--bg)}
.u{background:var(--s2);padding:10px 14px;border-radius:16px 16px 6px 16px;margin:6px 0 14px auto;font-size:14.5px;width:fit-content;max-width:82%}
svg text{font:500 10px 'Geist Mono',monospace;fill:var(--mu)}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style></head><body>
<h1>Codex: the remaining screens</h1>
<p class="lead">Learn, Audits, Settings, Onboarding, plus the goal detail and the Stats axis sheet. Same tokens as Today, Stats, Goals and Jarvis. Scroll each row sideways.</p>

<div class="dh"><h2>Learn</h2><p>Topic cards show where each topic sits in the loop. The sheet opens the loop, resources and today's practice.</p></div>
<div class="row">
<div class="fr"><div class="ph" data-t="Learn"><div class="hd"><div><h2>Learn</h2><p>3 active topics</p></div><span class="pill">Add topic</span></div><div class="bd" id="l1"></div></div><div class="cap">Learn list</div></div>
<div class="fr"><div class="ph" data-t="Learn" data-s="1"><div class="hd"><div><h2>Learn</h2><p>3 active topics</p></div></div><div class="bd" id="l2"></div><div class="dm"></div>
<div class="sh"><div class="gr"></div><span class="k"><i class="d" style="--c:#6f9fe0"></i>Knowledge</span><h3 class="t1">German B2</h3><p class="mu">Objective: pass the mock exam by March</p>
<div class="lp"><div class="dn">Learn</div><div class="on">Practice</div><div>Apply</div><div>Evidence</div><div>Review</div></div>
<div class="grp"><div class="rw">Course, unit 6<span class="v">12/20</span></div><div class="rw">Listening podcast<span class="v">3 episodes</span></div></div>
<div class="card" style="margin-top:12px"><span class="k">Today's practice</span><p style="color:var(--tx);margin-top:4px">Summarize one article in German in 5 sentences.</p></div>
<div style="display:flex;gap:8px"><div class="btn" style="flex:1">Log practice</div><div class="btn s" style="flex:1">Ask Jarvis</div></div></div></div><div class="cap">Topic sheet</div></div>
</div>

<div class="dh"><h2>Audits</h2><p>Findings are diagnostic and never change anything on their own. The sheet shows evidence, a possible fix and two choices.</p></div>
<div class="row">
<div class="fr"><div class="ph" data-t="Audits"><div class="hd"><div><h2>Audits</h2><p>3 open, 4 resolved</p></div><span class="pill">Run audit</span></div><div class="bd"><div class="chs"><div class="ch on">Unresolved</div><div class="ch">Resolved</div><div class="ch">Domain</div></div><div id="a1"></div></div></div><div class="cap">Audit list</div></div>
<div class="fr"><div class="ph" data-t="Audits" data-s="1"><div class="hd"><div><h2>Audits</h2><p>3 open, 4 resolved</p></div></div><div class="bd"><div id="a2"></div></div><div class="dm"></div>
<div class="sh" style="box-shadow:inset 0 4px 0 #e5484d"><div class="gr"></div><span class="k">High severity</span><h3 class="t1">Capacity conflict</h3>
<div class="lb" style="margin-top:12px">Evidence</div><div class="grp"><div class="rw">Evening plans<span class="v n">2.5 h</span></div><div class="rw">Free evening time<span class="v n">1.5 h</span></div><div class="rw">Evening sessions missed<span class="v n">4 of 5</span></div></div>
<div class="lb">Possible correction</div><div class="card" style="margin-bottom:0"><p style="color:var(--tx)">Move gym to 6:30 am</p><div class="seg" style="margin-top:8px"><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i><i style="background:var(--ac);opacity:.4"></i><i></i><i></i><i></i></div><p style="margin-top:6px">Capacity 62% to 71%</p></div>
<div style="display:flex;gap:8px;margin-top:12px"><div class="btn" style="flex:1">Review fix</div><div class="btn s" style="flex:1">Send to Jarvis</div></div></div></div><div class="cap">Finding sheet</div></div>
</div>

<div class="dh"><h2>Settings</h2><p>A grouped list. The AI screen says plainly what needs AI and what works without it.</p></div>
<div class="row">
<div class="fr"><div class="ph" data-t=""><div class="hd"><div><h2>Settings</h2><p>Control center</p></div><span class="pill">Done</span></div><div class="bd">
<div class="lb" style="margin-top:4px">AI</div><div class="grp"><div class="rw">Provider<span class="v">Custom gateway</span></div><div class="rw">Model<span class="v">openai/gpt-oss-20b</span></div><div class="rw">Connection<span class="v"><i class="d"></i>Verified</span></div></div>
<div class="lb">Data</div><div class="grp"><div class="rw">Backup<span class="v">Automatic, today</span></div><div class="rw">Export data<span class="v"></span></div></div>
<div class="lb">Privacy</div><div class="grp"><div class="rw">Memory<span class="v">Review and edit</span></div></div>
<div class="lb">About</div><div class="grp"><div class="rw">Version<span class="v n">1.0.0</span></div></div></div></div><div class="cap">Settings</div></div>
<div class="fr"><div class="ph" data-t=""><div class="hd"><div><h2>AI</h2><p>Provider and model</p></div><span class="pill">Settings</span></div><div class="bd">
<div class="fl" style="margin-top:0">Base URL</div><div class="in">https://gateway.example/v1</div>
<div class="fl">API key</div><div class="in">••••••••••••3f9a</div>
<div class="fl">Model</div><div class="in">openai/gpt-oss-20b</div>
<div class="btn" style="margin-top:16px">Verify connection</div>
<div class="card" style="margin-top:14px;box-shadow:inset 3px 0 0 var(--ac)"><span class="k">Connected</span><p style="color:var(--tx);margin-top:4px">The model answered in 1.2 s.</p></div>
<div class="card"><span class="k">What needs AI</span><p style="margin-top:4px">Jarvis chat, plans, review and audit explanations. Today, Stats, Goals, Learn logging and backups work without it.</p></div></div></div><div class="cap">AI settings</div></div>
</div>

<div class="dh"><h2>Onboarding</h2><p>One question at a time, tap or type. It ends by saving direction only; Jarvis designs the system next, with approval.</p></div>
<div class="row">
<div class="fr"><div class="ph" data-n="1"><div class="hd"><h2>Jarvis</h2><span class="pill">3 of 7</span></div><div class="bd"><div class="seg" id="o1" style="margin:0 0 16px"></div><span class="k">Constraints</span>
<div class="u" style="margin-top:14px">I train in the evenings after work.</div>
<p style="font-size:16px;line-height:1.45;margin-bottom:6px">What gets in the way of your training most weeks?</p><p class="mu" style="margin-bottom:14px">Pick any that fit, or tell me in your own words.</p>
<div class="chs"><div class="ch on">Time</div><div class="ch">Energy</div><div class="ch on">Schedule changes</div><div class="ch">Motivation</div><div class="ch">Travel</div><div class="ch">Injury</div></div></div>
<div class="cp"><span>Or tell Jarvis in your own words</span><i class="go">↑</i></div></div><div class="cap">Interview question</div></div>
<div class="fr"><div class="ph" data-n="1"><div class="hd"><h2>Jarvis</h2><span class="pill">7 of 7</span></div><div class="bd"><div class="seg" id="o2" style="margin:0 0 20px"></div>
<h3 class="t1" style="font-size:28px">Your direction is saved</h3><p class="mu" style="font-size:14px;margin:6px 0 18px">Next, Jarvis designs your system with you. Nothing is created until you approve it.</p>
<div class="grp"><div class="rw">Focus<span class="v n">Body, Knowledge, Strategy</span></div><div class="rw">Baseline<span class="v n">Gym 1x per week</span></div><div class="rw">Vision<span class="v n">Run a 10K</span></div><div class="rw">Targets<span class="v n">3 drafted</span></div></div>
<div class="btn" style="margin-top:20px">Start design interview</div><div class="btn s" style="margin-top:8px">Review my answers</div></div></div><div class="cap">Complete (setupState: jarvis_design_pending)</div></div>
</div>

<div class="dh"><h2>Detail views</h2><p>Goal detail puts the outcome first. The Stats sheet explains one axis with evidence, and never a single score.</p></div>
<div class="row">
<div class="fr"><div class="ph" data-t="Goals" data-a="Ask about this goal"><div class="hd"><div><h2>Run a 10K</h2><p>Body, Main quest</p></div><span class="pill">Goals</span></div><div class="bd">
<span class="k">Outcome</span><div class="b">34<small>%  10 km without stopping, 6 weeks left</small></div><div class="seg" id="g1" style="margin-bottom:12px"></div>
<div class="card"><span class="k">Why it matters</span><p style="color:var(--tx);margin-top:4px">Builds the endurance base for football season.</p></div>
<div class="grp"><div class="rw"><div class="sq on"></div>5 km</div><div class="rw"><div class="sq"></div>8 km<span class="v n" style="color:var(--ac)">Next</span></div><div class="rw"><div class="sq"></div>10 km continuous</div></div>
<div class="chs" style="margin-top:12px"><div class="ch">Habit: run 3x a week</div><div class="ch">Quest: 10 km</div></div>
<div class="fd" style="--c:#d9c95a"><h3>Blocker: weekday evenings</h3><p>Over capacity. See the audit.</p></div></div></div><div class="cap">Goal detail</div></div>
<div class="fr"><div class="ph" data-t="Stats" data-s="1"><div class="hd"><div><h2>Stats</h2><p>Last 30 days</p></div></div><div class="dm"></div>
<div class="sh"><div class="gr"></div><span class="k"><i class="d" style="--c:#dc85ad"></i>Social</span><div class="b" style="margin:6px 0 2px">43<small>  -5 this month</small></div>
<svg viewBox="0 0 300 78" width="100%" role="img" aria-label="Social trend, falling from 66 to 43 over four weeks"><path d="M0 8H300M0 39H300M0 70H300" stroke="#ffffff14" fill="none"/><polyline points="4,18 100,26 200,42 296,58" fill="none" stroke="#e0763a" stroke-width="2.5" stroke-linejoin="round"/><text x="0" y="78">W1</text><text x="96" y="78">W2</text><text x="196" y="78">W3</text><text x="278" y="78">W4</text></svg>
<div class="lb" style="margin-top:10px">What contributes</div><div class="ct">Meaningful conversations<i><u style="--p:40%"></u></i><span>40%</span></div><div class="ct">Relationship upkeep<i><u style="--p:30%"></u></i><span>30%</span></div><div class="ct">Reflection<i><u style="--p:30%"></u></i><span>30%</span></div>
<div class="lb">Recent evidence</div><div class="grp"><div class="rw">Honest talk with brother<span class="v n">21 Sep</span></div><div class="rw">Missed call with a friend<span class="v n">18 Sep</span></div></div>
<div style="display:flex;gap:8px;margin-top:12px"><div class="btn" style="flex:1">Why did this drop?</div><div class="btn s" style="flex:1">Audit this metric</div></div></div></div><div class="cap">Stats axis sheet</div></div>
</div>

<script>
const seg=(n,t=10)=>Array.from({length:t},(_,i)=>'<i'+(i<n?' class="f"':'')+'></i>').join('');
const L=[['German B2','Knowledge','#6f9fe0','Pass the mock exam by March','Practice',5,'Next: 20 min listening'],['Decision basics','Strategy','#3cc48f','Write 3 decision post-mortems','Apply',3,'Next: post-mortem 2'],['Sketching','Creativity','#a58fdb','Draw one page a day for 2 weeks','Learn',1,'Next: watch lesson 2']];
const A=[['Capacity conflict','High','#e5484d','Evenings hold 2.5 h of plans against 1.5 h free.','Routine, Gym'],['Measurement mismatch','Medium','#d9c95a','Social is counted by activity, but your target is relationship depth.','Stats, Social'],['Stale target','Low','#8a8d93','Your Strategy target predates your latest direction.','Goals, Strategy']];
const $=id=>document.getElementById(id);
const lh=L.map(l=>`<div class="card"><div class="tp"><span class="k"><i class="d" style="--c:${l[2]}"></i>${l[1]}</span><span class="tg">${l[4]}</span></div><h3>${l[0]}</h3><p>${l[3]}</p><div class="seg">${seg(l[5])}</div><p class="k" style="margin-top:8px">${l[6]}</p></div>`).join('');
$('l1').innerHTML=lh;$('l2').innerHTML=lh;
const ah=A.map(a=>`<div class="fd" style="--c:${a[2]}"><h3>${a[0]}</h3><p>${a[3]}</p><div class="ft"><span>${a[4]}</span><span>${a[1]}</span></div></div>`).join('');
$('a1').innerHTML=ah;$('a2').innerHTML=ah;
$('o1').innerHTML=seg(3,7);$('o2').innerHTML=seg(7,7);$('g1').innerHTML=seg(3);
document.querySelectorAll('.ph').forEach(p=>{if(p.dataset.n)return;const t=p.dataset.t;p.insertAdjacentHTML('beforeend',(p.dataset.s?'':'<div class="ask">'+(p.dataset.a||'Ask Jarvis')+'</div>')+'<div class="nv">'+['Today','Stats','Learn','Goals','Audits'].map(x=>'<b'+(x==t?' class="on"':'')+'>'+x+'</b>').join('')+'</div>')});
</script></body></html>

``````
