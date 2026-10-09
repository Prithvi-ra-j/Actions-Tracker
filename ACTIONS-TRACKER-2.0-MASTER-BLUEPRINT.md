# Actions-Tracker — Real-World Agent Test Lab

## Purpose

Actions-Tracker should be tested as a **personal intelligence system used by real people**, not merely as a collection of screens and functions.

The test lab gives an AI browser agent a realistic user, realistic historical state, realistic environmental conditions, a concrete life situation, and an objective to accomplish. The agent then uses the **live deployed application** as a person would: reading the interface, deciding what to do, typing or speaking naturally, making mistakes, recovering, revisiting previous decisions, and observing what changes.

The goal is to validate five things simultaneously:

1. **Functional correctness** — the feature does the right thing.
2. **State integrity** — canonical data, projections, evidence, stats, and history remain consistent.
3. **AI correctness** — Jarvis interprets, plans, confirms, executes, and explains appropriately.
4. **Resilience** — the system survives time changes, network loss, reloads, stale versions, concurrency, and messy data.
5. **Human experience** — the product feels understandable, trustworthy, calm, responsive, useful, and coherent while a person is using it.

---

# 00. Test Philosophy

Do not organize this system primarily around buttons or components.

The primary unit of testing is:

> **A person in a life situation trying to accomplish something.**

Instead of:

> Open Goal screen → click Add → enter title → click Save.

Prefer:

> A user has fallen behind on a six-month goal, returns on Monday morning, wants to recover without rebuilding everything, and asks Jarvis what to do.

The agent is allowed to explore the interface to accomplish the objective unless a scenario explicitly requires deterministic navigation.

The application under test is the live deployed build wherever possible. Local tooling is used only to control the test environment, seed fixtures, inspect evidence, and reproduce failures.

---

# 01. System Under Test

The default target should be the deployed Actions-Tracker application on Vercel.

The harness should be able to identify:

- deployment URL
- commit/build identifier
- application version
- browser version
- viewport/device profile
- current simulated date/time
- current timezone
- network profile
- active fixture/persona
- test scenario ID

Each run must be reproducible from a declared starting state.

---

# 02. Agent Operating Rules

The browser agent should behave like a user, not like a privileged debugger.

## Allowed

- Navigate the UI.
- Read visible content.
- Type into fields.
- Use voice input where supported.
- Click visible controls.
- Scroll.
- Open and close views.
- Refresh and reopen the application.
- Use the test clock.
- Trigger controlled network conditions.
- Load approved fixtures.
- Capture screenshots, console output, network evidence, and test metadata.
- Inspect test-only state snapshots through explicitly approved test hooks.

## Restricted

The agent must not silently mutate production or another user's data.

Any privileged state manipulation must happen through the dedicated test harness, fixture loader, or test-only instrumentation.

Destructive test scenarios must explicitly declare authorization.

## Exploration limits

Each scenario should define:

- maximum duration
- maximum browser actions
- maximum retries per interaction
- allowed destructive actions
- stop conditions
- expected completion criteria

The agent should stop when continuing would leave the declared test scope or create an unsafe/unrecoverable state.

---

# 03. Environment Matrix

The same scenario should be runnable under different environments.

## Devices / viewports

- Desktop
- Samsung A52 profile
- Samsung A55 profile
- Narrow mobile viewport
- Landscape mobile viewport
- Keyboard-only navigation
- Zoomed / large-text configuration

## Network

- Normal connection
- Slow connection
- Intermittent connection
- Offline
- Disconnect during mutation
- Reconnect during queued work

## Browser / PWA state

- Fresh browser
- Existing user session
- Installed PWA
- Stale PWA version
- Updated service worker
- Cleared browser cache
- Existing IndexedDB data
- Migrated data from an older version

## Time

- Normal morning
- Normal evening
- Midnight crossover
- Day boundary
- Week boundary
- Month boundary
- Year boundary
- Deadline day
- Deadline +1 day
- Long period of inactivity
- Timezone change

## Data volume

- Empty user
- 7-day history
- 30-day history
- 90-day history
- 6–12 month history
- High-volume / stress dataset

---

# 04. Persona Library

Personas represent **behavioral patterns**, not demographic profiles.

## P01 — Disciplined Optimizer

- Logs consistently.
- Completes most actions.
- Uses goals and statistics.
- Reviews progress frequently.
- Rarely makes mistakes.

Primary tests:

- high-volume normal usage
- projection accuracy
- performance
- longitudinal consistency

## P02 — Inconsistent User

- Starts strongly.
- Misses multiple days.
- Returns after inactivity.
- Wants to recover without starting over.

Primary tests:

- momentum
- streaks
- recovery
- adaptive planning
- overdue behavior

## P03 — Chaotic User

- Creates vague items.
- Reschedules often.
- Changes deadlines.
- Partially completes plans.
- Logs things late.
- Produces contradictory information.

Primary tests:

- ambiguity
- conflict handling
- duplicate detection
- contradiction handling
- adaptation

## P04 — Minimalist User

- Types very little.
- Uses short confirmations.
- Rarely explores settings.
- Expects the system to understand context.

Primary tests:

- minimal input
- sensible defaults
- contextual inference
- low-friction interaction

## P05 — Voice-First User

Most interaction occurs through Jarvis.

Examples:

- “I trained this morning.”
- “Move German to tomorrow.”
- “What do I still have today?”
- “I slept badly last night.”

Primary tests:

- transcription
- natural language understanding
- intent selection
- multi-action planning
- confirmation
- voice/text continuity

## P06 — Power User

- Large history.
- Many goals.
- High action volume.
- Frequent queries.
- Repeated Jarvis use.

Primary tests:

- scale
- speed
- search
- data density
- navigation cost

## P07 — Returning User

Inactive for 30 / 60 / 180 days, then returns.

Primary tests:

- re-entry
- state continuity
- changed priorities
- stale plans
- summary/recovery experience

## P08 — Life-Chaos User

Multiple circumstances change together:

- work schedule changes
- training schedule changes
- goal priority changes
- sleep worsens
- deadlines move

Primary test:

> Does the system adapt instead of blindly preserving a plan that no longer fits?

## P09 — Traveler

- Timezone changes.
- Sleep schedule changes.
- Daily boundaries shift.
- Date interpretation becomes ambiguous.

Primary tests:

- date handling
- timezone correctness
- streak correctness
- schedule adaptation

## P10 — Offline User

Sequence:

1. Start online.
2. Go offline.
3. Create/update state.
4. Close or reload.
5. Reconnect.
6. Synchronize.

Primary tests:

- durability
- queueing
- duplicate prevention
- conflict handling
- timestamp integrity

## P11 — Skeptical First-Timer

- Low patience.
- Skips onboarding details.
- Wants obvious value quickly.
- Will abandon confusing screens.

Primary tests:

- time-to-value
- comprehension
- terminology
- information hierarchy
- first-session confidence

## P12 — Adversarial User

Not necessarily malicious; actively tries to break workflows.

Examples:

- delete everything
- cancel after planning
- repeat the same command
- create many actions at once
- issue contradictory commands
- make rapid repeated submissions

Primary tests:

- safety gates
- idempotency
- bulk operations
- rollback
- recovery

---

# 05. Fixture Library

Fixtures are deterministic starting worlds.

Suggested fixture families:

- empty-user
- fresh-user
- consistent-user
- inconsistent-user
- chaotic-user
- long-term-user
- goal-heavy-user
- overdue-user
- returning-user
- traveler-user
- offline-user
- power-user
- corrupted-edge-user

Each fixture should declare:

```yaml
fixture: inconsistent-user-v3
simulatedDate: 2026-10-02
historyDays: 90
goals: 4
actions: 127
completedWorkouts: 18
missedWorkouts: 9
germanSessions: 12
missedGermanSessions: 6
overdueTasks: 3
```

Fixtures must be deterministic.

A fixture loaded twice should produce the same logical world unless the scenario explicitly advances or mutates it.

---

# 06. Messy Data Fixtures

Do not seed only clean examples.

Include:

- duplicate or near-duplicate records
- incomplete records
- missing evidence
- contradictory evidence
- very old timestamps
- future timestamps where valid test logic allows them
- extremely long text
- empty text
- emoji
- unusual Unicode
- special characters
- rapid repeated mutations
- partially completed plans
- stale projections
- orphaned test records
- high-volume histories

The purpose is to approximate real user-created state, not database-demo state.

---

# 07. Test Clock

Create a test-clock abstraction rather than relying on real waiting.

Conceptually:

```js
testClock.set("2026-10-02T23:58:00+05:30");
testClock.advanceMinutes(5);
```

Use it to test:

- streak boundaries
- midnight rollover
- deadline expiration
- weekly rollover
- monthly rollover
- yearly rollover
- inactivity periods
- scheduled actions
- notification timing
- day-part behavior

The app should ideally consume a replaceable clock provider so time-dependent behavior can be simulated deterministically.

---

# 08. Life Timeline Engine

A fixture should optionally represent a sequence of life events, not just a snapshot.

Example:

```yaml
timeline:
  - day: -30
    events: [workout, german, work]
  - day: -29
    events: [workout]
  - day: -28
    events: [missed_workout, poor_sleep]
  - day: -27
    events: [german]
  - day: 0
    events: [open_app]
```

This permits realistic longitudinal scenarios without manually replaying weeks of UI interactions.

The test harness should be able to:

- seed historical state
- advance simulated time
- inject events
- pause the timeline
- resume the timeline
- capture a state snapshot at each significant point

---

# 09. Event Injection

Scenarios should be able to inject controlled real-world events.

Examples:

```text
USER_EVENT: job schedule changed
SYSTEM_EVENT: network disconnected
TIME_EVENT: midnight
DATA_EVENT: NutriLift sync completed
USER_EVENT: goal deadline changed
USER_EVENT: goal deleted
SYSTEM_EVENT: application version changed
```

This enables “something changed while the user was away” testing.

---

# 10. Scenario Library

Scenarios should be organized by user outcome, not only by screen.

Suggested groups:

- onboarding
- daily use
- goals
- actions
- evidence
- stats
- Jarvis
- voice
- NutriLift
- offline
- synchronization
- PWA updates
- multi-tab
- recovery
- accessibility
- performance
- security
- migration

---

# 11. Scenario Contract

Every scenario should define:

```yaml
id: JARVIS-MULTI-007
title: Multi-domain morning update
persona: voice-first-user
fixture: inconsistent-user-v3

environment:
  device: samsung-a52
  viewport: 393x851
  network: normal
  clock: test

testTime: 2026-10-02T08:00:00+05:30

objective: "User reports morning activities and asks what remains today."

actions:
  - "Open Jarvis"
  - "Say: I trained this morning, slept seven hours, finished German and tell me what's left today."
  - "Review execution plan"
  - "Allow execution"

expected:
  - workout recorded
  - sleep recorded
  - German completed
  - evidence created
  - stats updated
  - Today refreshed
  - remaining items accurate

invariants:
  - no duplicate workout
  - no duplicate German completion
  - all mutations have provenance
  - UI matches canonical state

breakTests:
  - repeat voice command
  - disconnect during execution
  - reload during execution

evidence:
  screenshots: true
  console: true
  network: true
  stateSnapshot: true
```

---

# 12. Human-Behavior Testing

A scenario should not assume that the user follows the optimal path.

Allow realistic behavior such as:

- hesitation
- backtracking
- changing their mind
- abandoning a screen
- reopening a previous view
- correcting themselves
- using shorthand
- speaking naturally
- asking follow-up questions
- ignoring recommendations
- completing only one part of a plan
- rescheduling rather than completing

This is essential for testing the difference between:

> “The feature technically works.”

and:

> “A human can actually use this feature naturally.”

---

# 13. Jarvis Conversation Scenarios

Jarvis requires dedicated conversational testing.

## Straightforward intent

User:

> “I trained this morning.”

Expected:

- identify the correct intent
- produce a structured action
- execute safely
- update canonical state

## Ambiguity

User:

> “Complete German.”

If multiple German goals exist, expected result is clarification rather than guessing.

## Missing information

User:

> “Create a marathon goal.”

Expected behavior depends on required fields and should request only missing information that actually blocks execution.

## Contradiction

User:

> “I completed German.”

Then:

> “Actually I didn't do German.”

The system must preserve provenance and correctly resolve or surface the contradiction according to product rules.

## Duplicate command

The same command is submitted twice because the user is uncertain whether it was received.

Expected:

- idempotent or deduplicated mutation
- no accidental duplicate record

## Multi-action command

Example:

> “Log my workout, complete German, move groceries to tomorrow, update my marathon goal, tell me what I'm missing, and plan tomorrow.”

This exercises the execution graph, dependency handling, confirmation policy, result passing, and query capabilities.

---

# 14. Voice + Text Continuity

Voice should not be a separate mental model from text.

Core test flow:

```text
speak
  ↓
transcription
  ↓
editable text composer
  ↓
user corrects transcript
  ↓
Send
  ↓
same Jarvis orchestration path as text
```

Test:

- normal speech
- mis-transcription
- short utterances
- long utterances
- mixed English / common Indian speech patterns
- background noise where supported
- interruption
- cancel recording
- repeated recording
- transcript correction
- switching from voice to typing mid-conversation

---

# 15. Chaos Experiments

Deliberately interrupt normal operation.

Examples:

- disconnect network during execution
- refresh during execution
- close tab during execution
- reopen after a partial execution
- open a second tab
- submit the same command twice
- rapidly click Send
- rapidly trigger voice input
- switch pages while execution is running
- change the simulated time during execution
- reload after a failure
- deploy a new version while an old PWA session is open

The objective is not simply to see whether an error appears.

The objective is to determine whether the system reaches a **valid recoverable state**.

---

# 16. Multi-Tab Scenarios

Test shared state and concurrency.

Example:

```text
TAB A
Create goal

       ↕
   shared state

TAB B
Update same goal
```

Test:

- stale state
- simultaneous mutation
- duplicate submission
- refresh
- conflict resolution
- projection consistency

---

# 17. Deployment Upgrade Scenarios

Test real-world version transitions.

Example:

```text
Version N
  ↓
user has old PWA state
  ↓
Version N+1 deployed
  ↓
user returns
```

Verify:

- migrations
- service-worker updates
- stale assets
- IndexedDB compatibility
- data preservation
- UI/code/schema compatibility
- no silent history loss

---

# 18. Oracles / Invariants

An AI agent must not judge correctness only by appearance.

Create deterministic assertions that encode product truth.

Examples:

### Evidence invariant

If an action is marked complete, the required completion evidence must exist according to the product's rule set.

### Projection invariant

If canonical state changes, dependent projections must eventually converge to the correct state.

### Failure invariant

If execution fails, the interface must not claim successful completion.

### Confirmation invariant

Operations requiring confirmation must not mutate state before confirmation.

### Idempotency invariant

Equivalent repeated requests with the same idempotency key must not create duplicate mutations.

### Provenance invariant

Mutations initiated through Jarvis must retain the expected source/provenance metadata.

### Referential integrity invariant

Deleting or archiving an object must not leave broken references in dependent views.

### Temporal invariant

A date-sensitive operation must behave consistently under the declared timezone and test clock.

---

# 19. Three Levels of Verification

Every important scenario should verify three layers.

## Level 1 — Visual

Does the interface show the correct state?

## Level 2 — Behavioral

Did the interaction behave correctly?

## Level 3 — Data integrity

Did the canonical data and dependent projections actually change correctly?

Example:

```text
UI says:
✓ Workout logged

      ↓
Repository:
workout exists

      ↓
Evidence:
evidence exists

      ↓
Stats:
recalculated

      ↓
Today:
projection updated
```

---

# 20. Human-Experience Oracles

Correctness alone is insufficient.

Every major scenario should optionally record:

- Was the user's intent obvious?
- Was the next action obvious?
- Did the interface create unnecessary work?
- Did the user understand what just happened?
- Did the system feel trustworthy?
- Did the user feel in control?
- Was the response speed perceived as acceptable?
- Did the UI communicate uncertainty clearly?
- Did the system surprise the user?
- Was the surprise helpful, neutral, or harmful?
- Did the system ask for too much information?
- Did the system ask for too little and make an unsafe assumption?
- Did the experience preserve continuity with the previous interaction?
- Did the system make the user feel that progress was real rather than simulated?

These should be treated as first-class test observations rather than subjective afterthoughts.

---

# 21. UX Friction Probes

Measure where a user has to stop and think.

Capture:

- time to first meaningful action
- number of interactions to complete common jobs
- number of backtracks
- number of corrections
- number of clarifications
- number of unnecessary confirmations
- number of failed interactions
- number of times the user searches for a control
- number of times they abandon and reopen a surface

For AI interactions, also capture:

- time from speech/text to usable plan
- time from plan to confirmation
- time from confirmation to visible outcome
- recovery time after an execution failure

---

# 22. Perceived Intelligence Tests

Actions-Tracker should not only be correct. It should feel context-aware.

Test whether the system:

- remembers recent context appropriately
- avoids repeating questions it already knows
- understands references such as “that goal” or “tomorrow” when unambiguous
- asks clarifying questions only when necessary
- distinguishes known facts from inference
- recognizes when previous plans no longer fit current circumstances
- explains meaningful changes
- notices contradictions without becoming annoying
- surfaces relevant information without flooding the user

The evaluation target is **useful intelligence**, not maximum automation.

---

# 23. Trust and Agency Tests

For consequential operations, test whether the product preserves user control.

Verify:

- proposed mutations are distinguishable from completed mutations
- destructive actions are clear
- confirmations are understandable
- users can cancel where the architecture allows it
- users can understand what will change before execution
- failures are reported honestly
- partial completion is visible
- the system never presents planned work as completed work
- explanations are tied to actual system state
- undo/recovery behavior is predictable where supported

---

# 24. Recovery Scenarios

A mature personal system should be tested heavily after mistakes.

Examples:

- accidental completion
- accidental deletion
- wrong date
- wrong goal selected
- duplicate action
- partial execution
- failed synchronization
- stale state
- interrupted voice recording
- interrupted multi-action plan

Ask:

> Can the user understand what happened and recover without needing to become a system administrator?

---

# 25. Accessibility Scenarios

Test:

- keyboard-only navigation
- visible focus state
- screen-reader semantics where applicable
- large text / browser zoom
- touch target size
- reduced motion
- contrast
- form labels
- error messaging
- voice alternatives
- text alternatives to voice-only functionality

The accessibility user should also behave unpredictably rather than simply tabbing through every control.

---

# 26. Performance Scenarios

Measure under realistic history sizes.

Test:

- startup
- first meaningful render
- navigation between major views
- opening Jarvis
- loading long histories
- chart rendering
- high-volume search
- IndexedDB access
- sync operations
- offline queue replay
- execution-plan rendering
- voice transcription latency

Important: evaluate **perceived latency** as well as raw timing.

A fast operation that gives no feedback can feel slower than a slightly longer operation with clear progress.

---

# 27. Security / Prompt-Injection Scenarios

Test Jarvis with hostile or misleading inputs.

Examples:

- instructions embedded inside imported text
- malicious-looking goal text
- fake system instructions in user notes
- requests attempting to bypass confirmation
- requests attempting to expose unrelated data
- large repetitive prompts
- malformed tool arguments
- unknown tools
- invalid execution dependencies

Verify that the application remains authoritative over the model.

---

# 28. Failure Evidence Bundle

Every significant failure should produce a reproducible evidence package.

Recommended contents:

- scenario ID
- persona
- fixture
- application version / commit
- timestamp / simulated timestamp
- timezone
- viewport
- device profile
- network profile
- steps performed
- screenshot before
- screenshot at failure
- screenshot after
- browser console output
- relevant network events
- Jarvis input
- model output / structured turn when permitted
- execution plan
- action statuses
- state snapshot
- expected result
- actual result
- severity
- suspected category

---

# 29. Severity Model

## P0 — Data / Safety Critical

Examples:

- data corruption
- duplicate destructive mutation
- silent history loss
- unauthorized destructive action
- irrecoverable state corruption

## P1 — Core Workflow Broken

A primary user workflow cannot be completed or leaves the application in an invalid state.

## P2 — Major Feature Failure

Important functionality is broken but a workaround exists.

## P3 — UX / Quality Issue

The workflow works but causes meaningful friction, confusion, or inconsistency.

## P4 — Cosmetic

Minor visual or wording issue with low functional impact.

Every issue should also have one or more categories:

- regression
- data integrity
- AI reasoning
- execution
- UI
- performance
- accessibility
- offline
- security
- migration
- trust / explainability

---

# 30. Unknown-Path Exploration

Not every scenario should prescribe the exact route.

Example mission:

> You are a first-time user. Figure out how to prepare tomorrow without being told where the feature is.

Record:

- whether the user found the capability
- number of interactions
- wrong turns
- terminology confusion
- abandonment points
- unnecessary use of Jarvis
- confidence after completion
- whether the user understood the resulting state

This is AI-assisted usability testing rather than scripted QA.

---

# 31. Regression Corpus

Every valuable failure becomes a permanent scenario.

Pipeline:

```text
Scenario
   ↓
Failure
   ↓
Fix
   ↓
Regression scenario
   ↓
Future test runs
```

The corpus should preserve the original failure conditions, not just the final happy path.

Over time, the suite should become a repository of real behavioral failures discovered in the product.

---

# 32. Test Matrix

The long-term system should support combinatorial runs across:

```text
Persona
×
Fixture
×
Environment
×
Timeline
×
Network
×
Device
×
Jarvis mode
×
Failure injection
```

Not every combination needs to run every time.

Use:

- smoke runs for every deployment
- core regression runs for every merge
- extended scenario runs periodically
- chaos runs on demand
- long-horizon simulations on scheduled test cycles

---

# 33. Certification Gates

A deployment should not be declared “healthy” merely because unit tests pass.

Suggested gates:

### Gate A — Functional

Core workflows complete successfully.

### Gate B — State Integrity

Canonical state and projections remain consistent.

### Gate C — AI Safety / Correctness

Jarvis does not invent capabilities, bypass confirmation, or report false completion.

### Gate D — Resilience

Critical recovery scenarios pass.

### Gate E — Human Experience

Critical journeys remain understandable, low-friction, and trustworthy.

### Gate F — Device / PWA

Critical mobile and installed-PWA journeys pass.

### Gate G — Regression

Previously fixed high-severity failures remain fixed.

---

# 34. Proposed Test Lab Architecture

```text
                    ACTIONS-TRACKER TEST LAB
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
     PERSONA              FIXTURE             ENVIRONMENT
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
                       LIFE TIMELINE
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
             TEST CLOCK              EVENT INJECTION
                 │                         │
                 └────────────┬────────────┘
                              ▼
                       LIVE VERCEL APP
                              │
                              ▼
                        BROWSER AGENT
                              │
                   Observe → Think → Act
                              │
                              ▼
                         APP STATE
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
            UI            CANONICAL DATA    PROJECTIONS
             │                │                │
             └────────────────┼────────────────┘
                              ▼
                     MACHINE ORACLES
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
          PASS                              FAILURE
                                               │
                                       Evidence Bundle
                                               │
                                       Regression Case
```

---

# 35. Interaction Experience Validation

Functional correctness is necessary but insufficient. The test lab must also capture **how the interaction feels while it is happening**. The agent should not merely report whether a task succeeded; it should capture observable evidence about clarity, effort, confidence, control, continuity, responsiveness, cognitive load, surprise, trust, and recovery.

This is not an attempt to claim that an AI agent can literally experience human emotion. Instead, the harness records **observable interaction signals and the agent's interpreted user-perspective observations**, then compares them with objective telemetry and canonical state.

## 35.1 Experience questions

For every major journey, record: 

- Did the user immediately understand what the surface was asking them to do?
- Did the interaction require unnecessary effort?
- Did the system communicate what was happening at the right time?
- Did the user feel in control of the action?
- Did the system do anything surprising?
- Did the user trust that the requested change actually happened?
- Did the interaction preserve continuity with what happened before?
- When something went wrong, was recovery obvious?
- Did the system reduce or increase cognitive load?
- Did the final state match what the user believed had happened?

## 35.2 Observable interaction signals

Capture hard evidence alongside the agent's observations:

```text
click count
keystrokes
backtracks
repeated actions
time to first feedback
time to useful feedback
time to final result
clarification count
retries
errors
screens visited
voice transcription latency
network latency / interruption
loading-state transitions
screenshots at key moments
console errors
canonical data state
projection state
```

These signals should be treated as evidence of interaction friction rather than as direct measurements of emotion.

## 35.3 Interaction experience record

Each important scenario should produce an experience trace similar to:

```text
INTERACTION EXPERIENCE

Task:
  "Log workout and plan my evening."

User goal:
  Fast, low-effort logging.

Expected mental model:
  Speak once → system understands → changes are made.

Observed path:
  Voice → transcription → clarification → confirmation → execution.

Experience signals:
  Clarity:         HIGH
  Effort:          MEDIUM
  Confidence:      HIGH
  Control:         HIGH
  Cognitive load:  LOW
  Perceived speed: HIGH
  Surprise:        LOW
  Continuity:      HIGH
  Trust:           HIGH

Friction detected:
  - unnecessary clarification
  - two additional taps

Mental-model mismatch:
  User expected completion to update both evidence and goal progress.
  System updated evidence only.
```

The exact qualitative labels may evolve, but the underlying observations and supporting telemetry must remain available for audit.

## 35.4 User-state / interaction-state trace

The agent should record observable transitions in the user's apparent interaction state, without presenting these as medical or psychological measurements. For example:

```text
CONFIDENT
   ↓
UNCERTAIN
   ↓
FRUSTRATED
   ↓
RELIEVED
```

These states should be inferred from behavior such as repeated attempts, backtracking, clarification requests, abandonment, successful continuation, or explicit user-like statements.

## 35.5 Perceived latency

Do not measure only total response time. Record the sequence of feedback:

```text
user action
   ↓
time to acknowledgment
   ↓
time to meaningful progress feedback
   ↓
time to result
```

A 2.5-second operation with clear intermediate feedback can be experienced very differently from a 2.5-second blank screen. Voice, Jarvis planning, sync, and mutations should receive particular attention.

## 35.6 Mental-model alignment

For important operations, capture five layers:

```text
USER INTENT
    ↓
WHAT THE USER EXPECTED TO HAPPEN
    ↓
WHAT THE UI COMMUNICATED
    ↓
WHAT JARVIS DECIDED / EXECUTED
    ↓
WHAT CANONICAL STATE ACTUALLY CHANGED
```

A scenario fails the experience contract when these layers materially diverge, even if the UI looks successful.

Example:

```text
User: "Move my workout to tomorrow."

UI:     Shows success.
Jarvis: Reports success.
State:  Old workout remains today and a duplicate is created tomorrow.

Result: FUNCTIONALLY APPEARS SUCCESSFUL → EXPERIENCE / DATA INTEGRITY FAILURE
```

## 35.7 Cognitive load

The test lab should explicitly look for moments where the application makes a user's situation harder to understand. Examples include:

- presenting too many actions when the user is overwhelmed
- exposing internal system concepts unnecessarily
- requiring repeated confirmation for low-risk actions
- hiding the consequence of a mutation
- presenting multiple equivalent choices without clear differentiation
- forcing the user to reconstruct context the system already knows

A useful scenario result is therefore not only "completed" but also:

> **Did the system make the situation simpler or more complicated?**

## 35.8 Trust, control, and recovery

For AI-assisted actions, verify that the user can answer:

- What is Jarvis about to do?
- What has already happened?
- What did not happen?
- Can I stop it?
- Can I correct it?
- Can I undo it?
- Why did it choose this action?

Destructive or multi-step workflows should be judged especially strictly for user control and recoverability.

## 35.9 Longitudinal experience

Repeat experience-oriented scenarios across days or months of simulated time. Track whether the system gradually feels more coherent because it remembers useful context, or more frustrating because the user repeatedly has to correct it.

Important longitudinal signals include:

- repeated corrections
- repeated clarification
- stale assumptions
- inappropriate personalization
- missed preferences
- trust recovery after failures
- growing or declining interaction effort

The objective is to test whether Actions-Tracker becomes a system the user can **live with**, not merely a system that can complete isolated tasks.

## 35.10 Experience failure classification

A run may produce any of the following combinations:

```text
FUNCTION PASS + EXPERIENCE PASS
FUNCTION PASS + EXPERIENCE FAIL
FUNCTION FAIL + EXPERIENCE PASS
FUNCTION FAIL + EXPERIENCE FAIL
```

The second case is especially important: the feature may technically work while the interaction remains confusing, high-friction, misleading, or low-trust.

## 35.11 Experience evidence bundle

When experience quality is poor, preserve:

- scenario ID
- persona
- fixture
- simulated date/time
- environment
- interaction trace
- screenshots before/during/after
- telemetry
- console/network evidence
- agent observation
- expected mental model
- actual system behavior
- canonical state snapshot
- suggested regression scenario

This makes the result actionable rather than subjective.

---

# 36. Guiding Principle

The ultimate question is not:

> “Did the feature work?”

It is:

> **“What did the user believe was happening, what did the system actually do, and did those two things remain aligned?”**

A mature Actions-Tracker test system should validate the gap between those three layers:

```text
USER INTENT
    ↓
USER PERCEPTION
    ↓
SYSTEM BEHAVIOR
    ↓
CANONICAL STATE
    ↓
LONGITUDINAL CONSEQUENCE
```

The strongest test cases are the ones where all five remain aligned under realistic human behavior, changing life circumstances, model uncertainty, time progression, partial failure, and imperfect connectivity.
