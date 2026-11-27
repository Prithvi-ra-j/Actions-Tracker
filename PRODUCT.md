# Actions — Product Foundation

## Promise

Actions helps people turn intentions into visible evidence of growth. It supports steady, self-directed progress without punishment, comparison, or shame.

## First audience

**New professionals trying to build a consistent exercise routine.**

This is the initial beachhead, not a claim that the product is only for this group. Validate it with real users before widening the audience.

## The six attributes

| Display name | Existing key | Definition |
|---|---|---|
| Vitality | `body` | Care for physical energy and health through movement, recovery, and sustainable routines. |
| Intellect | `knowledge` | Learn, understand, and apply ideas. |
| Judgment | `strategy` | Make considered decisions, plan, and reflect on what matters. |
| Creation | `creativity` | Practise creative work, make things, and bring ideas to completion. |
| Connection | `social` | Build meaningful relationships and contribute to other people and shared efforts. |
| Discipline | `discipline` | Follow through on chosen actions, including choosing rest when it is appropriate. |

These are user-facing names. Keep the existing internal keys so current records and saved data do not need a vocabulary migration. The quote themes in `src/data/quotes.js` may inform optional reflection copy; they are not definitions, evidence, or scoring inputs.

## Product rules

1. **First value in under 60 seconds:** a new user should be able to start a useful plan and complete an action without AI or an account.
2. **The daily loop in under 5 seconds:** a returning user with a three-habit day should be able to open Today and complete an action quickly.
3. **Never shame:** missed activity is not a moral failure. Rest is valid, labels stay neutral, and the app does not rank users against one another.

## Growth model

- **Lifetime is the record of accumulated evidence.** Derive it from the user's history and never reduce it because time passed or the user was inactive.
- **Momentum describes recent direction relative to the user's own baseline.** Use plain-language states such as *Building*, *Steady*, and *Resting*, not a failing grade. Rest and excused occurrences do not count as inactivity.
- **Calibration is per attribute.** Until enough evidence exists, show a calm learning state rather than a score or title. Treat the proposed active-day and active-week thresholds in `ActionsTracker_Calibration_Design.md` as starting points to validate, not universal facts.
- **Coverage is optional, not a rank.** It may show which enabled attributes the user has practised recently. Users can turn attributes off without losing their history. Do not display a numeric “80%” philosophy score.
- **Credit evidence transparently.** One primary attribute receives credit by default. Credit a second only when the user explicitly chooses a split; never spread credit automatically.

## Product language

“Powered by bad habits” is a brand line only, not a promise of quit-habit or avoidance tracking. Do not make it a first-run claim unless user testing shows a clear, useful meaning; otherwise revise or remove it.

Use the quote library only as optional reflection inspiration. Its existing themes include knowledge, judgment, strategy, leadership/service, creation, and discipline; the product's attribute definitions and evidence rules remain grounded in the behavior above.

## Decisions and open actions

- **Product name decision:** Actions. The existing repository/package identifiers and internal code names are unchanged by this Phase 0 decision.
- **Synthetic validation:** use the five fictional first-use profiles in `tests/e2e/synthetic-first-use.spec.js` for repeatable checks. They are test cases, not real testers, and cannot establish comprehension, motivation, or usability.
- **Human validation:** still recruit people from the beachhead audience before making real-world usability claims. If recruitment is not feasible, keep the human-validation gate explicitly unverified rather than treating synthetic results as a substitute.
- **Validation:** test the first-use and daily-loop time targets with automated journeys first, then with people who have not helped build the app when feasible. Revise this foundation if evidence contradicts it.
