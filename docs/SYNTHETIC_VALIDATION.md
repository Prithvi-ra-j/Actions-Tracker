# Synthetic User Validation

Synthetic journeys provide fast, repeatable checks of product behavior. They are **not human participants** and cannot validate whether real people understand the copy, trust the product, or find it motivating.

## First-use cohort

`tests/e2e/synthetic-first-use.spec.js` exercises the real browser app with five fictional, non-identifying user profiles:

| Profile | Simulated context | What the test checks |
|---|---|---|
| Early-career exercise beginner | Wants a manageable after-work routine | Can add and complete a small movement habit |
| Time-constrained commuter | Has little time during a packed workday | Can choose and finish a two-minute action |
| Privacy-conscious offline user | Does not want an AI connection | Can check off a habit after the plan and Today have loaded and the network disconnects |
| Mobile-first new professional | Uses a narrow phone-sized viewport | Can complete the core journey at 360 × 640 |
| Low-confidence routine builder | Needs an easy starting action | Can enter a simple action without configuring an assistant |

Each run starts with an empty local database, uses a fixed clock, enters only synthetic habit text, and captures browser evidence. The measurable proxy is time from navigation to the first completed habit; the current target is under 60 seconds.

## Other simulated life situations

The existing deterministic test-lab fixtures in `tests/testlab/catalog.js` cover empty and fresh accounts, consistent and inconsistent histories, long-term use, overdue work, returning after inactivity, travel/timezone changes, offline synchronization, high-volume histories, and messy data. Prefer those seeded fixtures for repeatable regression testing instead of copying real user records.

When adding a scenario, make its persona, starting state, device/viewport, network, deterministic time, expected outcomes, invariants, evidence, and limits explicit. Use synthetic values only. Keep scenario IDs stable so failures and attached evidence can be compared across runs.

## What this does and does not establish

- **It can establish:** the tested UI path is reachable; data writes and state changes work under the declared conditions; layout and deterministic edge cases do not regress; the scripted path is within the time budget on the test machine.
- **It cannot establish:** that a real person will discover the right control, interpret the language correctly, feel safe or motivated, or finish within 60 seconds. A script already knows what to click and type.
- **It does not replace:** real-device checks for production performance, accessibility evaluation with assistive technology, or human observation. If people are unavailable, report those gates as unvalidated rather than treating synthetic success as equivalent evidence.

Use synthetic validation continuously during development. Before making claims about real-world usability or retention, validate with people from the chosen audience when feasible and keep their identities out of committed test fixtures.
