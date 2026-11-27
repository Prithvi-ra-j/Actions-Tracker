# Actions Tracker — "Learning Your Normal": Calibration & Baseline Design

> Idea (yours): do what WHOOP does before it shows a first reading — spend a calibration period learning *your* normal, then judge everything against *you* — adapted to habits and evidence, with no wearable.
> This doc fits into **Phase 3** of `ActionsTracker_Roadmap_4.5_to_8.md`. Code facts come from `ActionsTracker_Master_Reference.md`.
> Everything below is a **proposal**. Numbers (7 days, 28 days, thresholds) are starting values to tune on real data.

---

## 1. The idea in one paragraph

For the first days the app **does not score you**. It watches what you normally do, shows "Learning your normal", and then produces a **Baseline Report** ("your usual week"). After that, current activity is described **relative to your own baseline** ("Building / Steady / Resting"), never against other people and never as a failing grade. Absolute, cumulative growth is kept separately as **lifetime**, so personal baselines can never hide real progress or erase achievements.

## 2. What WHOOP does (the part worth borrowing)

From public WHOOP material (community answers and WHOOP's own podcast page; I could not verify every detail):
- Recovery scores are **greyed out for roughly the first 4 days** while it estimates your normal range; a fuller personal baseline takes about **30 days**.
- The point of calibration: raw numbers differ hugely between people, so a value only means something **normalized to that person's baseline**.
- Scores are built to be **centered on your own typical state**, not compared with other people.
- Its Healthspan feature uses **longer horizons** (unlock after 21 recoveries within 31 days, fuller calibration at ~90 days).

**Three lessons that transfer:** (1) don't show scores before there's data; (2) compare people to themselves; (3) use several time horizons.
**What does not transfer:** WHOOP's baseline works because its data is **dense, objective and involuntary** (nightly HRV). Yours is **sparse, self-reported and voluntary**, and the baseline is exactly what the user is trying to *change*. So copy the **principle**, not the scoring math, and keep an absolute layer (see §7).

## 3. Calibration states

State is tracked **per attribute** (Vitality, Intellect, Judgment, Creation, Connection) **and for Discipline**, because a user may be active in one area and brand new in another.

| State | Rule (starting values) | What the user sees |
|---|---|---|
| **Calibrating** | fewer than **5 active days** *and* fewer than **7 calendar days** since first use | Greyed ring, "Learning your normal · day 3 of 7". Habits, streaks, evidence, reminders all work; **no scores, no titles** |
| **Provisional** | ≥ 5 active days; baseline from < 4 active weeks | Words only ("Steady"), tagged **Early estimate**, wide uncertainty |
| **Calibrated** | ≥ 4 active weeks of data for that attribute | Baseline stable; momentum words and lifetime bar shown normally |

- **Count active days, not calendar days.** A user who takes a week off doesn't get punished or reset; calibration simply waits (consistent with "no punishment for missed days").
- Rest/excused days never count as inactivity (§8).
- Each attribute calibrates independently; the radar appears once ≥ 2 attributes are at least Provisional.

## 4. What we learn during calibration (no wearables)

| Signal | How it's collected | Used for |
|---|---|---|
| Habits completed per active day ("usual load") | occurrences | Daily load strip, overload detection |
| Completion rate and on-time pattern | occurrences, completion time | Discipline baseline |
| Best time of day, weakest weekday | completion timestamps | Smart reminders, Baseline Report |
| Evidence per week per attribute | logs/facts/manual evidence | Attribute baseline |
| Recovery speed after a miss | gap between a miss and the next completion | Discipline, "welcome back" tone |
| **Daily reading** (optional, ≤ 10 s) | 3 one-tap questions: energy, focus, mood (or sleep) | Context for patterns; gives a "reading" without a device |
| Self-rated starting point | existing onboarding step (self-assessment) | Low-confidence **prior** only |

Per-attribute examples of "usual" (keep consistent with the domain models; Connection is not an interaction count, Judgment is not a book count):
- **Vitality:** sessions/week, active minutes, self-reported energy (steps/sleep later via Health Connect once verified).
- **Intellect:** learning sessions/week, entries with an explanation, applications.
- **Judgment:** decisions logged, weekly planning done, reflections.
- **Creation:** creative sessions/week and minutes, pieces finished.
- **Connection:** meaningful contacts/contributions logged, with reflection.
- **Discipline:** completion rate, on-time rate, follow-through after a miss.

## 5. The math (sketch, deliberately simple and robust)

For an attribute, take weekly **effort-weighted activity** `a_w` over the last up to 4 **active** weeks (weeks with at least one active day).
- `baseline b` = **median** of `a_w` (robust to one odd week)
- `spread s` = **median absolute deviation**, floored at a small minimum so quiet users don't produce huge swings
- Recent level `r` = last 7 days (excluding rest days)
- `z = (r − b) / max(s, floor)`
- Words: `z ≥ +1` → **Building**, `−1 < z < +1` → **Steady**, `z ≤ −1` → **Resting** (never "falling", never red)
- **Confidence** = `min(1, activeWeeks / 4)`. Below 0.5 → show "Early estimate"; below the calibrating gate → grey.
- After calibration, update baseline slowly (e.g. weekly EMA with α ≈ 0.1) so one great or terrible week doesn't move "normal".

**This reuses what's already in the code:** `axis_config.baselineRatePerWeek` already floors the momentum prior; the onboarding self-assessment already blends in and fades out over the first 30 real logs; System B already outputs `confidence`, `coverage` and `low_coverage` warnings. Calibration mostly *formalizes and surfaces* these, plus adds the median/MAD baseline.

## 6. What the user sees

1. **First day:** one honest line — *"Your first week is calibration. Do what you normally do; we'll learn your normal. No scores yet."* The first check-off still gets its win moment.
2. **During calibration:** Today works fully. A small "day 3 of 7" ring on Stats; scores greyed.
3. **Day 7: the Baseline Report** — the payoff and the shareable moment. Example: *"Your usual: 4 habits a day · you do best in the evening · Sundays are your quietest day · you usually restart within 1 day after a miss."* This is useful with **no AI**.
4. **Today "Load" strip (convenience feature):** compares today's plan to your usual — Light / Typical / Heavy. If heavy: one tap to switch to tiny versions or a light day. This directly serves the "overloaded day" scenario.
5. **Stats (after calibration):** per attribute, a **lifetime bar** (unchanged by time, but correctable) and a **momentum word** (Building / Steady / Resting), plus "what moved it".
6. **Optional day-28 note:** "Your baseline has settled. Here is how it compares with week 1." (Growth shown as *your own* change.)

## 7. Why relative scoring is dangerous (and the guardrails)

| Risk | Guardrail |
|---|---|
| **Low baseline inflates praise.** If you do little in week 1, "Building" is easy | Always show **lifetime** (absolute) next to momentum; allow goal-anchored targets that don't depend on the baseline |
| **Baseline drift erases progress.** If you improve, today's effort now reads as "Steady" | Lifetime does not decrease with time or a baseline change; explicit corrections can remove mistaken records. Use a slow EMA and archive baseline versions. |
| **Gaming / sandbagging** | Low stakes (no ranking, no leaderboard); optional minimum floor per attribute so the words can't be trivially earned |
| **Life events** (new job, illness, travel, new baby) | A **"Life changed" button** that pauses learning and, if chosen, starts a fresh baseline while keeping history |
| **Too few data points** | Active-day gating, median/MAD instead of mean, confidence shown honestly |
| **Showing a number that implies judgement** | Words, not numbers, in the main view; numbers only in detail |

Never let relative scores become the only measure. The split is **lifetime = effective cumulative history, momentum = relative to your baseline**. Lifetime is monotonic only in the absence of explicit corrections; an immediate undo removes the check-in, and later corrections retain an audit record.

## 8. Edge cases

- **Takes a week off during calibration:** calibration pauses (no penalty).
- **Rest/excused days:** excluded from the baseline *and* from "recent"; never counted as lower activity.
- **Backup restore / new phone:** baseline data lives in the DB so it restores with everything; the state is recomputed from history if missing.
- **Existing users (you):** compute a baseline **retroactively** from history; skip the grey period; label as "built from your history".
- **Only one attribute used:** others stay Calibrating; no scary zeros anywhere.
- **Habit added to an already calibrated attribute:** keep its existing baseline and status. Exclude only the new habit from momentum until it has five active days, and show an "Updating" tag; its lifetime credit counts immediately. Other evidence and habits remain in the baseline. Rest and paused days do not count toward the five days.
- **Time zone/travel:** days are local days; no double counting.

Shared-credit records contribute their chosen shares to lifetime and momentum (subject to the new-habit gate above). They are excluded from legacy numeric domain scores until per-engine weighting is designed and evaluated; the score view explains this.

## 9. Implementation map (no new store required)

- **New pure module:** `src/core/calibration/baselineEngine.js` → `computeBaseline(history, now) → { status, activeDays, activeWeeks, baseline, spread, confidence }`. Pure, deterministic, injectable clock.
- **Persist:** extra fields on existing `axis_config` records (`calibration: { status, startedAt, baselineVersion, lastComputedAt }`); weekly snapshots already exist — add the baseline snapshot to them. IndexedDB records accept new fields, so no `DB_VERSION` bump is strictly needed; add a migration test anyway.
- **Scoring integration:** `getScoresAsync` returns a `calibration` status per axis; UI greys scores when status is *Calibrating*, tags *Provisional* as Early estimate. Keep the existing authority resolver (coverage ≥ 0.8, confidence ≥ 0.7) as the gate for numeric scores in detail views.
- **Onboarding self-assessment:** keep as a **prior** with low confidence; stop blending it linearly into the final score.
- **UI:** Stats grey state; "Load" strip on Today; Baseline Report screen; optional Daily reading sheet; "Life changed" in Settings.
- **Tests:**
  - unit: median/MAD baseline, gating by active days
  - property: baseline ignores rest/excused days; adding inactivity never lowers lifetime; confidence monotonic with data
  - scenario: 30 days off → still calibrating or "Resting", nothing red; existing-user retroactive baseline; backup/restore preserves state
  - banned-words test (no shaming label strings)
- **Sizes (rough):** engine **M**, UI states + Load strip **M**, Baseline Report **S–M**, Daily reading **S**, tests **M** → about **L** in total.

## 10. Where it lands in the roadmap

- **Phase 1:** only the one-line calibration message and the optional self-assessment prior.
- **Phase 3 (main build):** baseline engine, grey/Provisional/Calibrated states, lifetime + momentum UI.
- **Phase 4:** Baseline Report at day 7 becomes the first "reflection" moment, and the weekly card compares to baseline.
- **Phase 5:** scenario tests above; real-device check that day boundaries and reminders behave.
- **Phase 7 (Ved):** Ved can narrate the Baseline Report and explain "why did my momentum change", but the report must work without AI.

## 11. Open questions

1. Should the **daily reading** exist at all? It adds friction; test with testers before keeping it. Make it skippable and never required for streaks.
2. Calibration length: 7 days feels right for habit data (one weekly cycle), but maybe testers want sooner value; the active-day gate can be lowered to 3–4 days for Provisional.
3. Do you want **numbers** anywhere in the main view, or words only? I recommend words in the main view and numbers in detail.
4. Is it fine that the **first 5–7 days show no scores** if the Baseline Report arrives on day 7? Test it with the 5 strangers in Phase 1.
