# Actions Tracker — Phase-wise Roadmap: from 4.5 to 8 out of 10

> Supersedes the phase section of `ActionsTracker_Product_Plan.md` (the thesis, scope freeze and scenario table there still apply).
> Facts about the code are in `ActionsTracker_Master_Reference.md`. This roadmap now follows your finalized **Philosophy & Product Vision** (five attributes + Discipline, evidence over XP, non-punitive progression, Ved as optional companion).
> Sizes are rough guesses for one developer: **S** < 1 day, **M** 2–4 days, **L** ≥ 1 week.
> The scores below are **my judgment**, not measurements. They exist so you can see what each phase is *worth* and stop when it isn't paying off.

---

## 1. What "8/10" means (the rubric)

| Category | Max | Now | What full marks look like |
|---|---|---|---|
| First-run & onboarding | 1.5 | 0.3 | A stranger gets a working plan in under 60 s, no AI, no jargon |
| Daily loop & convenience | 2.0 | 1.0 | Open → done in under 5 s; edit/undo/rest all work; reminders reliable |
| Progress legibility | 1.5 | 0.8 | A user can say "am I growing?" from one screen |
| Philosophy fidelity | 1.0 | 0.5 | The app actually behaves like your doc (no punishment, lifetime vs momentum, transparent attribution) |
| Reliability & trust | 1.5 | 1.0 | Data safe, accessible, fast, device-tested |
| Retention & reflection | 1.0 | 0.35 | A reason to come back in week 3 and week 10 |
| Engineering foundation | 0.5 | 0.45 | Already strong; keep it that way |
| Distribution & real-world proof | 1.0 | 0.1 | Strangers use it and stay |
| **Total** | **10** | **4.5** | |

**Brutal truth:** engineering work alone caps you around **7.25**. The last point and a half needs real users. Nothing in this repo can substitute for that.

## 2. Score path

| After phase | Cumulative | Biggest mover |
|---|---|---|
| Start | 4.50 | |
| 0 — Decisions & foundations | 4.55 | clarity |
| 1 — First 60 seconds | 5.50 | first-run |
| 2 — The daily loop | 6.15 | daily loop |
| 3 — Growth you can see | 6.70 | progress + philosophy |
| 4 — Reflection & hook | 6.95 | retention |
| 5 — Scenario hardening & reliability | 7.25 | reliability |
| 6 — Real-world beta & launch | **8.00** | distribution |
| 7 — Ved & Food & Fitness (beyond 8) | 8.5+ | differentiation |

Do not start a phase until the previous exit test passes.

---

## 3. Philosophy ↔ code: where the product already matches and where it doesn't

| Your philosophy says | What the code does today | Gap |
|---|---|---|
| Five attributes + Discipline | Six axes: body, knowledge, strategy, creativity, social + discipline | Mostly a rename + reframe (mapping below). Discipline is already separate |
| Evidence over XP | No XP ledger; scores recomputed from evidence | ✅ Matches |
| No punishment for missed days | `unknown ≠ missed` invariant; missed is never set automatically | ✅ Matches for habits |
| **Don't erase lifetime achievements** | Scores are **rolling 30-day projections**; they fall when you're inactive | ❌ **Direct contradiction.** A holiday lowers your stat |
| **Lifetime vs current momentum** | Only the rolling window exists (+ weekly snapshots) | ❌ No lifetime layer |
| **Motivate, not shame** | Display titles at the bottom of ranges include **"Inconsistent"** (Discipline) and **"Dormant"** (Creativity) | ❌ Shaming labels |
| Transparent attribution | Each habit has one domain; some Jarvis actions can touch several | Mostly ✅; define the rule for multi-attribute actions |
| Discipline "sometimes means resting" | `excused` occurrences exist; no explicit rest concept in UI | ⚠️ Add a one-tap rest day |
| Foundation across five *and* no universal ideal | Axes can be `paused` | ⚠️ Internal tension in the doc; resolve in Phase 0 |
| Ved: reflective companion, doesn't dictate | Jarvis persona is "strict, skeptical, **no mercy**" | ❌ Personality mismatch; rewrite before Ved ships |
| Usable without mandatory AI or accounts | Core works; first run is still Jarvis-first | ⚠️ Fixed in Phase 1 |
| Universal, user-defined aspirations | Goals exist; first-run has no aspiration step | ⚠️ Phase 1 and 4 |

**Old → new naming map**

| Current key | New display name | Notes |
|---|---|---|
| body | Vitality | Food & Fitness (Phase 7) feeds this |
| knowledge | Intellect | |
| strategy | Judgment | The strategy engine's `leadership` component belongs under **Connection** in your new definitions |
| creativity | Creation | |
| social | Connection | Leadership, contribution move here |
| discipline | Discipline | Separate presence; already its own axis in code |

**Rename strategy:** change the **display layer first** (labels, colors, copy). Keep the internal keys (`body`, `strategy`…) so no data migration is needed. Do a real key migration only if you need it later; `migrateAxisVocabulary` is your precedent for doing that safely. Axis keys appear in many places (logs, habits, facts, snapshots, engines, tests), so a risky rename early buys nothing a user can see.

---

## 4. The phases

### Phase 0 — Decisions & foundations (S–M) → 4.55
**Do this before building anything.**
1. **Write `PRODUCT.md`:** promise, target user, the six names + one-line definitions (from your doc), the three product rules from the plan (60 s to value, 5 s daily, never shame).
2. **Resolve the doc's internal tensions** and write the answers down:
   - *Foundation vs no ideal character.* Suggested resolution: "foundation" is an optional **coverage** view ("you've practised this attribute recently / not yet"), never a ranking, and users may switch an attribute off.
   - *80% philosophy.* It is "not measurable", so **don't show a number called 80%.** Keep it as copy and as the coverage view.
   - *"Powered by bad habits."* I can't tell what this means. If it means **building habits that replace bad ones**, the app has **no quit/avoid-habit type today** (tracking methods are do-habits only), so that is a Phase 2 feature. If it's a brand tone line, it needs a visible payoff somewhere in the UX or it will confuse people.
3. **Pick a launch beachhead.** The philosophy is universal; the first audience should not be. Name one concrete group and 5 real testers.
4. **Define the lifetime-vs-momentum model on paper** (see Phase 3).
5. Shelve `feat/universal-jarvis-intelligence` and `feat/real-world-user-testing`; start `docs/DOGFOOD.md` and use the app daily.
**Exit:** `PRODUCT.md` written, tensions resolved, 5 testers named.

### Phase 1 — The first 60 seconds (M–L) → 5.50
New first run, no AI, no API key, no "axis":
1. **One screen of philosophy**, three lines max: *Become who you always wanted to be. Turn intentions into visible evidence of growth.* One button.
2. **"What do you want to grow?"** — five attribute cards with the one-line descriptions from your doc (Vitality, Intellect, Judgment, Creation, Connection). Pick any; "I want all five" is allowed. Discipline is introduced as "what keeps you going", not as a sixth card.
3. **Starter habits** from a new **habit template library** (~6 per attribute, each with a tiny version). Pre-select 2–3; user can add their own. (`starterPack.js` only has quest templates, so this library is new.)
4. **When?** Morning / afternoon / evening + one reminder time.
5. **Land on Today** with habits listed; the first check-off is the success moment; ask for notification permission after it.
- Add the **display-name layer** now (Vitality, Intellect…) so new users never see the old names.
- Keep Jarvis/Ved reachable from Settings; hide anything that needs a key until one exists.
**Exit test:** 5 strangers complete a habit in **< 60 s** unaided. Record hesitations; fix the top three.

### Phase 2 — The daily loop (M–L) → 6.15
- One-tap complete + **undo** toast. (S)
- Today grouped by time of day; an "All done" state. (S–M)
- Streak/day count derived from occurrences (no new store). (M)
- **Habit editor:** rename, days (daily/weekdays/custom), time, reminder, tiny version, pause, archive. (M)
- **Rest day** (one tap, "Rest is part of discipline"): uses the existing `excused` status, protects streaks, never reads as a miss. (S–M)
- **Bad-habit / quit-habit type** — only if Phase 0 says "powered by bad habits" means this. Needs a new tracking method ("avoided today") and a rule for how a slip is shown without shame. (M)
- Remove the Main-quest card until quests have a UI; hide quest features for now. (S)
- Reminder quality: per-habit reminders, snooze, complete-from-notification if feasible. (M)
**Exit test:** returning user open → done **< 5 s** for a 3-habit day; add/edit/pause/archive/rest all work with no dead ends; a week of your own use with no workaround.

### Phase 3 — Growth you can see (L) → 6.70  ← where your philosophy becomes real
This is the most important phase for differentiation. It fixes the biggest contradiction (§3).
1. **Lifetime layer.** Derive per attribute from effective cumulative history: total evidence, days practised, habits completed, milestones. Time, inactivity, missed days, rest and baseline changes never reduce it. Explicit corrections may reduce it: the immediate undo removes a mistaken check-in, and later corrections are saved as new correction records. Pure functions over existing logs/facts/occurrences first; no schema change needed. Optionally store lifetime in weekly snapshots.
2. **Momentum layer (existing).** Keep the rolling window but present it as **direction**, not score: *Building / Steady / Resting*. Never red; "Resting" is a valid state.
3. **Character sheet as a mirror.** Per attribute: lifetime bar (unchanged by time, but correctable) + momentum word + "what moved it". No rank, no comparison, no ideal. A holiday must leave the lifetime bar untouched.
4. **Retitle shaming labels** ("Inconsistent", "Dormant", etc.) to neutral stage names for the low end of each range. Test: no title implies failure.
5. **Discipline gets its own panel:** follow-through rate over the period, rest-aware (rest/excused days excluded), with a plain-language sentence. It motivates; it doesn't grade.
6. **Transparent attribution rule:** each habit/evidence item credits **one primary attribute** chosen by the user; an optional second one with an explicit split shown on screen. No automatic spreading.
7. **Honest scores:** show "Early estimate" when the engine falls back; hide the radar until there is enough data (suggest ≥ 7 days and ≥ 2 attributes).
8. **Stats top section** in plain words: this week vs last week, streak, calendar heat-grid, per-habit history.
9. **Calibration & baseline engine** ("Learning your normal"): no scores in the first days, a Baseline Report at day 7, momentum measured against the user's own baseline, per-attribute states (Calibrating / Provisional / Calibrated). Full design in `ActionsTracker_Calibration_Design.md`. Adds roughly an **L** to this phase; it is what makes items 1–2 and 7 coherent.
**Tests to add:** property test "lifetime never decreases without a user correction"; test that an undone completion is not counted; scenario "30 days of inactivity changes momentum but not lifetime"; test that no title string is on a banned-word list.
**Exit test:** 5 testers answer "Are you growing?" and "What's hardest for you?" from the screen in **< 15 s**; the "holiday test" (30 days off) leaves lifetime unchanged and shows "Resting", not a drop.

### Phase 4 — Reflection & hook (M) → 6.95
This completes your development cycle: Aspiration → Direction → Action → Evidence → Reflection → Development.
- **Aspiration step:** "What kind of person do I want to become?" — one free-text line, editable any time, linked to Goals. (S–M)
- **Weekly reflection (no AI):** three prompts — what did I do, what did I learn, what will I change. Stored as a dated record. (The `observations` store exists but has no writer; reuse it or add a dedicated reflection type; decide in Phase 0.) (M)
- **Weekly "what changed" card:** your wins, one pattern, one suggested adjustment using the routine-capacity logic. (M)
- **Optional journey mode:** a 66-day-style day counter per habit with milestones. Copy must not promise 66 days works for everyone; it is a research average. Keep it only if testers using it retain better. (M)
- **Milestone badges and a share card** (image only; nothing leaves the device unless the user shares). (S–M)
**Exit test:** ≥ 60% of testers complete at least one weekly reflection in weeks 2–3 without being nagged.

### Phase 5 — Scenario hardening & reliability (M–L) → 7.25
Run the 17-row scenario table from the plan, **plus these philosophy rows:**

| # | Scenario | Desired behavior |
|---|---|---|
| P1 | 30+ days inactive, then return | Lifetime intact, momentum "Resting", one-tap restart, no overdue pile |
| P2 | User changes aspiration or turns an attribute off | History kept; coverage view respects the choice |
| P3 | Habit touches two attributes | Primary attribute only unless the user set an explicit split |
| P4 | Rest day in a streak | Streak preserved, labelled |
| P5 | New user with no evidence | No scary zero scores; a calm "Not enough evidence yet" |

- Real-device QA on the release APK: in-place upgrade preserves data, reinstall + restore, `adb logcat` clean, TalkBack, 130% text, 360 px width, battery-optimization effect on reminders, cold start under ~2 s.
- Hide Health Connect until it is verified on a device.
- Lint 0 errors, tests and e2e green, bundle budget held.
**Exit test:** all rows pass on one real phone and the automated suite.

### Phase 6 — Real-world beta & launch (L) → **8.00**
Nothing before this phase can produce the last points. Do all of it:
- **Beta with 10–20 real people for 4 weeks.** Start with the 5 named in Phase 0; add through your network and one community of your beachhead audience.
- **Feedback loop:** weekly check-in with testers; Settings → "Copy diagnostics" (telemetry is local already).
- **Store path:** signed build; privacy policy in plain words (data stays on the device; nothing leaves unless an optional AI is configured); screenshots; listing. Check Google's *current* testing requirements for new developer accounts before planning dates; I can't confirm today's rules.
- **Name check:** "Actions Tracker" is generic and hard to find; decide before listing.
- Fix the top 5 issues from the beta before public release.
**"8/10" gate (all must hold):**
| Measure | Target |
|---|---|
| Stranger install → first completed habit | < 60 s on ≥ 10 people |
| Day-7 still using | ≥ 60% of beta users |
| Day-30 still using | ≥ 35% |
| Crash-free sessions | ≥ 99.5% |
| Data-loss reports | 0 |
| "Would recommend" | ≥ 7 of 10 |

### Phase 7 — Ved & Food & Fitness (beyond 8)
- **Rewrite the persona** from strict/"no mercy" to a reflective companion that "helps users reflect, recognize patterns, explore possibilities and plan" and never dictates. Keep the evidence-only and no-flattery rules; change the tone. Rename in the UI first; internal `jarvis*` file names can stay.
- **Gateway first:** add authentication and rate limiting to `api/jarvis.js` before normal users touch it, so nobody needs an API key.
- First Ved jobs: personalize the starter plan, run the weekly reflection with the user, explain "why did this change?".
- **Food & Fitness** must feed **Vitality** (steps, training, sleep, nutrition facts) and show up in the same character sheet, not as a separate tracker (your own rule). Do not start before the 8/10 gate.

---

## 5. Things to avoid on the way

- **Showing the philosophy before the product.** Users should feel it in the behavior (no punishment, a mirror, a rest day), not read it. Keep the front door to three lines.
- **Renaming everything at the database level** before there are users.
- **Adding lifetime *and* momentum *and* coverage as three competing numbers.** One bar, one word, one coverage dot is enough.
- **Measuring philosophy by claiming it.** Every promise in the doc needs a test (§3 and Phase 3 give them).
- **Letting Phase 7 pull you forward.** It is the most fun and the least necessary for the first 8.

## 6. Open questions for you

1. What does "Powered by bad habits" mean in product terms?
2. Which single audience is the beachhead?
3. Who are the first 5 testers (names)?
4. Do you want the display rename in Phase 1 (my recommendation) or only after launch?
5. Keep the product name "Actions Tracker" or change it before listing?
