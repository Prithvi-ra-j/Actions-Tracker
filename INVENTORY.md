# INVENTORY.md — Actions-Tracker (v1.5.0 in `package.json`)

Read-only audit; no source code was changed. Generated 2026-11-07.

## How to read this document

| Tag | Meaning |
|---|---|
| **[R]** | I read the file(s) cited and the statement follows from the code. |
| **[G]** | Established by a repo-wide grep or a throw-away import-graph script (static `import`/`import()` string literals only). Computed output, not hand-read. |
| **[S]** | Reported by a sub-agent that read the files and cited lines. I spot-checked some claims, not all. |
| **[U]** | UNVERIFIED. Inferred from names/comments, or not read. |

Not done: I did **not** run the app, the test suite, a build, or any device/provider check. No git repo is present (`.git` absent), so there is no history to consult.
The import-graph script cannot see dynamically built import paths or reflection. "Unreachable" below means "no static import path from `src/main.jsx`". A file in the import graph can still be unrendered (see §1).

---

## 1. Screens / routes

There is **no router**. Navigation is a `tab` state in [App.jsx](src/App.jsx) rendered inside [AppShell.jsx](src/components/AppShell.jsx). All tab pages stay mounted and are hidden with `display:none` [R]. Settings is a full-screen swap (`showSettings`) [R].

### Reachable screens

| Screen | File | One line | Reachable from nav? |
|---|---|---|---|
| Onboarding | [onboarding/OnboardingFlow.jsx](src/components/onboarding/OnboardingFlow.jsx) | Wraps `JarvisTab` in `onboardingMode`. First run is a chat with the AI. Shown when `hasUserData()` is false. [R] | Not nav. Gate screen on first run. |
| Jarvis API setup | [jarvis/JarvisApiSetup.jsx](src/components/jarvis/JarvisApiSetup.jsx) | Provider/key form. `JarvisTab` returns it instead of the chat while `apiConfigured` is false (JarvisTab.jsx:288-290). [R] | Shown inside Jarvis. Because onboarding is Jarvis, **first-run setup is gated on AI configuration** [R]; whether a server-gateway path avoids a user key is [U]. |
| Today | [TodayTab.jsx](src/components/TodayTab.jsx) | Today's habit occurrences (check/excuse/reason), a "main quest" card, and a bottom sheet to log manual evidence. [R] | Yes, bottom tab `daily`. |
| Stats | [StatsTab.jsx](src/components/StatsTab.jsx) | Radar chart and per-axis sheet (axis stats, details). [R: imports/structure only] | Yes, bottom tab. |
| Learn | [LearnTab.jsx](src/components/LearnTab.jsx) | Learning topics list, add topic, log practice. [R: structure] | Yes, bottom tab. |
| Goals | [GoalsTab.jsx](src/components/GoalsTab.jsx) | Goal list/create/edit/pause. [R: structure; README/NEXT_RELEASE say lifecycle] | Yes, bottom tab. |
| Audits | [AuditsTab.jsx](src/components/AuditsTab.jsx) | Findings from the AI monthly audit, with ignore/restore. [R: structure] | Yes, bottom tab. |
| Jarvis | [JarvisTab.jsx](src/components/JarvisTab.jsx) (1370 lines) | AI chat with slash commands (`COMMANDS`, line 53), proposals with approve/undo. [R: partial] | **Not in the bottom bar.** Reached via the floating "Ask Jarvis" pill in AppShell, via `onOpenJarvis` buttons in other tabs, and automatically after onboarding. [R] |
| Settings | [SettingsTab.jsx](src/components/SettingsTab.jsx) | Provider settings, export/import JSON, storage, saved memories, Health Connect / NutriLift status + sync, diagnostics, version. [R: grep of headings] | Yes, gear icon in the header (not shown on the Jarvis tab). |
| Level-up ceremony | [LevelUpCeremony.jsx](src/components/LevelUpCeremony.jsx) | Overlay when an axis title threshold is crossed. [R: wiring in App.jsx] | Auto overlay. |
| Completion feedback | [CompletionFeedback.jsx](src/components/CompletionFeedback.jsx) | Toast/overlay after completing an occurrence. [R: wiring] | Auto. |
| Proof/Fear check-in | [ProofFearCheckin.jsx](src/components/ProofFearCheckin.jsx) | Monthly modal, due 30 days after first real activity, then every 30 days. Writes a `proof_check_in` log. [R: App.jsx 460-480, ProofFearCheckin.jsx:41-43] | Auto overlay. |

### Components present but not reachable from the UI

| File | Evidence |
|---|---|
| [NavDrawer.jsx](src/components/NavDrawer.jsx) | Imported in App.jsx:41 and `showNavDrawer` state exists, but `<NavDrawer` is never rendered. [R/G] |
| [ReviewPrompt.jsx](src/components/ReviewPrompt.jsx) | Imported (App.jsx:39), never rendered. [G] |
| [UpdateBanner.jsx](src/components/UpdateBanner.jsx) | Imported (App.jsx:51); `updateInfo` is set from `checkForUpdate()`, but the banner is never rendered, so update notices are invisible. [G] |
| [BookTracker.jsx](src/components/BookTracker.jsx) | No importer. [G] |
| [ArchetypeCompiler.jsx](src/components/ArchetypeCompiler.jsx), [InsightsInbox.jsx](src/components/InsightsInbox.jsx), [SundayReflection.jsx](src/components/SundayReflection.jsx), [ProfileTab.jsx](src/components/ProfileTab.jsx), [StatHistoryModal.jsx](src/components/StatHistoryModal.jsx), [EvidencePrompt.jsx](src/components/EvidencePrompt.jsx), [HabitRoadmapEditor.jsx](src/components/HabitRoadmapEditor.jsx), [JarvisRender.jsx](src/components/JarvisRender.jsx), [ui/ActionPrimitives.jsx](src/components/ui/ActionPrimitives.jsx) | No importer. [G] Purposes inferred from filenames only [U]. |
| [dev/PrimitivesDevPage.jsx](src/components/dev/PrimitivesDevPage.jsx), [dev/TokensDevPage.jsx](src/components/dev/TokensDevPage.jsx) | No importer and no route. [G] |

**Props passed but ignored (dead wiring) [R]:**
- `LearnTab` is passed `books`, `onAddBook`, `onStartBook`, `onUpdatePages`, `onFinishBook`; its signature accepts none of them (LearnTab.jsx:269). There is therefore **no reachable UI to add or progress a book**.
- `SettingsTab` is passed `dark`, `setDark`, `todayRecord`, `onRunSync`; its signature takes only `t, onClose, reminders, onSaveReminders` (SettingsTab.jsx:7). It imports `runAllSyncs` itself.
- `TodayTab` is not given `handleDailyToggle`. The legacy 4-checkbox daily UI (body/philosophy/art/history) has no screen. `handleDailyToggle`, `handleGoalToggle`, `handleMilestoneToggle` in App.jsx are unused. [R/G]

---

## 2. Data model

IndexedDB database `actions-tracker`, `DB_VERSION = 12` [R: db.js:15]. 32 object stores created in `onupgradeneeded` [R: db.js:44-241]. The header comment in db.js says "Four object stores" and is stale [R].

### Stores

| Store | keyPath / indexes | Fields | In JSON backup? | Written by (production code) |
|---|---|---|---|---|
| `settings` | `key` | key/value (String(value) for toggles) | **No** | settingsRepository (many) [G] |
| `goals` (legacy) | `key` ("gi-ti") | checkbox state | Yes | Only legacy migration [U] |
| `milestones` | `key` ("m-mi-ti") | checkbox state | Yes | `setMilestoneCheck` (App `handleMilestoneToggle`, unused) + migration [G] |
| `logs` | `id`; idx `date`, `axis` | `{id, axis, type, value, date, meta, createdAt}` | Yes | `addLog` (see §3) |
| `axis_config` | `axis` | `{axis, expectedPerWeek, paused, hasConsistencyTerm}` (defaults: body 4, discipline 7, knowledge 7, social null, creativity 1, strategy 7 paused) [R] | Yes | `initAxisConfigs`, `updateAxisConfig` |
| `books` | `id` | `{id, title, totalPages, category, pagesRead, status, dateStarted, dateFinished}` [R] | Yes | `addBook` (only from the dead UI/props) |
| `gymSessions` | `id` | `type:'gym_session'` log + session record (gymSessionsRepository.js, [U] fields) | Yes | **Nothing** calls `addGymSession` [G] |
| `questBoard` | `id` | `{id, axis, title, targetValue, currentValue, unit, done, metric?, weight?}` [R] | Yes | `addQuest` (Jarvis `add_quest`); `syncQuestProgress` |
| `statSnapshots` | `id`; idx `date` | `{id, date, modelVersion:'1.0', stats, axisDetails}` [R] | Yes | `checkAndWriteWeeklySnapshot` |
| `facts` | `id`; idx `objectId`, `type`, `localDate`, `type_localDate`, `objectId_type_localDate` | See below | Yes | `syncManager` and Jarvis `actionExecutor` only [G] |
| `lifeObjects` | `id`; idx `type`, `status` | **Goals live here** (`type:'goal'`) via `createGoal`; also legacy habit/task/routine objects from migration [R] | Yes | `addGoal`, migration |
| `selfModel` | `id` ('primary') | `{identity{name,oneLiner,roles,values,strengths,constraints,principles}, currentState, desiredSelf{vision,dimensions}, gaps, priors, onboardingCompletedAt, onboardingVersion, setupState}` [R] | Yes | Jarvis onboarding |
| `telemetry` | `id`; idx `date`, `type` | `saveTelemetryEvent(type, date, payload)`, error logs [R: signatures] | **No** | App boot, errorLogger |
| `habits` | `id`; idx `domain`, `status` | `{id, schemaVersion, name, description, domain, frequency{type,days?}, target, trackingMethod, completionMode, source, scoring{enabled,weight,evidenceType}, exceptionPolicy, masteryRoadmap{currentLevel,levels}, implementationIntention, identityVote, tinyVersion, phase, status, createdAt, updatedAt}` [R] | Yes | `addHabit` ← **only Jarvis `add_habit`** [G] |
| `habitOccurrences` | `id`; idx `habitId`, `scheduledFor`, `status` | `{id, habitId, scheduledFor, status(expected/completed/missed/rescheduled/excused/unknown), completedAt, value, unit, supportingFactIds, reason}` [R] | Yes | `occurrenceEngine.generateOccurrencesForDate` (on boot and after Jarvis actions) |
| `learnings` | `id`; idx `sourceId`, `sourceType` | `{id, concept, loopStep, sourceId, sourceType, explanation, whyItMatters, personalApplication, examples, tags, relatedLearningIds, mastery{exposure,understanding,retention,synthesis,application,impact: 0-1}, createdAt, updatedAt, lastPracticedAt?}` [R] | Yes | `addLearning` (LearnTab, Jarvis) |
| `evidence` | `id`; idx `domain`, `createdAt` | Schema `{id, domain, signal, value, unit, confidence 0-1, timeWindow, supportingFactIds, methodology, createdAt}` [R] | Yes | **Never written.** `addEvidence` is imported by scoreEngine.js:19 but never called anywhere [G] |
| `relations` | `id`; idx `fromId`, `toId` | `{id, fromId, toId, type∈{supports,derived_from,related_to,caused_by,contradicts,applied_in,contributes_to}, confidence}` [R: partial] | Yes | `addLearning` **and** App `handleAddLearning` (duplicate, see §3) |
| `memories` | `id`; idx `status`, `type` | `{id, type, content, confidence, status('proposed' default), supportingFactIds, source, tags, lastReviewedAt, createdAt, updatedAt}` [R] | Yes | Jarvis `propose_memory` |
| `syncState` | `connectorId` | cursor/failure state per connector [U: fields not read] | **No** | syncManager [S] |
| `audits` | `id`; idx `periodStart` | `{id, period{start,end}, domains, evidenceCoverage, scoreChanges, wins, failures, contradictions, patterns, risks, recommendations, findingStates, nextPeriodFocus, supportingEvidenceIds, analysisVersion, contextVersion, promptVersion, modelId, createdAt}` [R] | Yes | `auditEngine.addAudit` |
| `insights` | `id` | [U: fields not read] | Yes | `analysisScheduler.addInsight` |
| `appMeta`, `migrationRegistry` | `key` / `version` | [U] | **No** | `appMetaRepository` has no non-test importer [G] |
| `nutriLiftProjections` | `id` | Projection of imported NutriLift records [S] | **No** | NutriLift connector [S] |
| `proposalExecutions` | `idempotencyKey`; idx `proposalId` | Idempotency ledger for Jarvis proposals [S] | **No** | actionExecutor [S] |
| `jarvisConversations` | `id`; idx `updatedAt` | Persisted chats [U: fields] | Yes | JarvisTab |
| `decisions` | `id`; idx `createdAt` | [U] | Yes | **Nothing** (repo has no importer) [G] |
| `experiments` | `id`; idx `domain`, `createdAt` | [U] | Yes | Jarvis `suggest_experiment` |
| `creativeWorks`, `observations` | `id` | [U] | Yes | **Nothing** (repos have no importer) [G] |
| `routineConfig` | `id` | Routine engine config [U] | Yes | `routineRepository`, Jarvis `adjust_routine` |

**Backup gap [R]:** `USER_DATA_STORES` in [backupService.js:6-12](src/database/backupService.js) omits `settings`, `telemetry`, `syncState`, `appMeta`, `migrationRegistry`, `nutriLiftProjections`, `proposalExecutions`. The auto-backup/restore path therefore does not preserve settings (e.g. `lastStatTitles`, Jarvis toggles). Whether manual `exportDatabase()` (db.js:~425) uses a different list is [U]: db.js:425 shows a separate list that I did not read in full.

### Fact schema [R: models/factSchema.js]

`{id, schemaVersion:1, type, objectId, value, meta, context{energy,mood,stress,location,sleep}, source{type,connectorId,externalId,externalVersion}, occurredAt, recordedAt, localDate, timezone, correctionOf, supersedes}`.
Allowed `source.type`: manual, voice, health_connect, fitness, finance, chess, book, system.

### Fact types [R: core/facts/factTypes.js]

| Group | Type strings |
|---|---|
| Habit | `habit.completed`, `habit.excused`, `habit.missed` |
| Knowledge | `knowledge.learning.added`, `.mastery_updated`, `.applied`, `knowledge.book.progress`, `knowledge.book.completed` |
| Strategy | `strategy.decision.logged`, `strategy.decision.resolved` |
| Creativity | `creativity.work.logged`, `creativity.work.feedback` |
| Social | `social.experiment.logged`, `social.experiment.result` |
| Body | `body.activity.steps`, `body.training.session`, `body.recovery.sleep`, `body.composition.measurement` |
| System | `system.evaluation`, `system.correction`, `system.retraction` |

Inconsistency [R]: App.jsx builds its evaluations map from `f.type === 'evaluation'` while the constant is `'system.evaluation'`, so that map will not match facts written with the constant [U: whether anything writes the bare string].

---

## 3. Trackable entities

### How each is created and how it reaches stats

| Entity | Schema / store | Created where | Feeds stats via |
|---|---|---|---|
| **Log** | `logs` | `addLog`: Today "evidence" (`manual_evidence`, App.jsx:505); Learn practice (`learning_practice`, :668); monthly check-in (`proof_check_in`); Jarvis `create_plan`/onboarding (`onboarding_assessment`, actionExecutor.js:363); `book_pages`/`book_finished` (booksRepository); analysis failures (`analysis_failure`); migration (`daily_checkbox`) [G] | Legacy `statsEngine` consistency (log count in a 30-day window) and quest derivation |
| **Habit** + **Occurrence** | `habits`, `habitOccurrences` | Habit: **only Jarvis** `add_habit`. Occurrences generated daily by `occurrenceEngine`. Completed from Today. | `completeOccurrence` writes **no log and no fact** [G: no `addFact`/`addLog` in habitOccurrenceRepository]. Counted by `scoreEngine` (discipline) and `statsEngine` (habit mastery multiplier, `allHabits`) [S]. |
| **Quest** | `questBoard` | Jarvis `add_quest` (requires `payload.metric.type` string, actionSchemas.js:64). No preset quests for new installs (`initQuestBoard`). | `syncQuestProgress(logs)`; Volume term of `statsEngine` |
| **Goal** | `lifeObjects` (`type:'goal'`) | GoalsTab (`addGoal`), Jarvis `add_goal` | Not read by `statsEngine` [U]; `doneTargets` in App.jsx is computed but unused |
| **Book** | `books` | `addBook`, but only reachable from dead UI | `book_finished` logs → quest derivation `q-knowledge-books`, `q-strategy-reading` (legacy ids) |
| **Learning** | `learnings` | LearnTab, Jarvis `add_learning` | `knowledgeEngine` via `scoreEngine` [S]; `learning_practice` log |
| **Fact** | `facts` | `syncManager` (Health Connect steps, NutriLift) and Jarvis (`log_evidence`, actionExecutor.js:58/272/510/527) | `evidenceBuilder` → domain engines → `scoreEngine` [S] |
| **Evidence (record)** | `evidence` | Nobody writes it | n/a. Evidence "records" are computed on the fly, not persisted. |
| **Experiment** | `experiments` | Jarvis `suggest_experiment` | Social engine via facts [U] |
| **Memory** | `memories` | Jarvis `propose_memory` | AI context only |
| **Gym session** | `gymSessions` | Nobody | Quest `q-body-sessions` counts logs `type:'gym_session'`; no production code writes that log type outside the unused repo [G] |
| **Decision / Creative work / Observation** | own stores | Nobody | Nothing |
| **Milestone** | `milestones` | Dead handler only | Nothing |

### Overlaps and duplicates [R unless stated]

1. **Three parallel habit models.** `habitRepository.addHabit` (used) re-implements the same record as `createHabit` in [models/habitSchema.js](src/models/habitSchema.js) (no importer), and a different `createHabit` exists in [lifeObjectSchema.js](src/models/lifeObjectSchema.js) (legacy life-object habit). habitSchema.js's own header says it "can be unified in a future migration phase".
2. **Goals in three places:** legacy `goals` store (checkbox state), `lifeObjects` goals (current), and `GOALS` in `constants.js` used as legacy seed. The `milestones` store is the same legacy lineage.
3. **Life-object factories vs dedicated stores.** `lifeObjectSchema.js` has `createExperiment/Decision/CreativeWork/Observation/Learning`, and each also has its own store and repository. Only experiments and learnings are used.
4. **Two "completion" systems.** Legacy `daily_checkbox` logs (4 fixed tasks, no UI) vs `habitOccurrences`. Quests `q-discipline-days` and `q-creativity-sketchbook` still count `daily_checkbox` logs, which nothing creates any more.
5. **Duplicate relation write.** `learningRepository.addLearning` auto-creates a `derived_from` relation (:74-79) **and** App.jsx `handleAddLearning` (:650-656) creates another for the same pair. This writes two relations for one learning from a source. (Not reachable today because LearnTab does not pass `sourceId` [U].)
6. **Evidence naming collision.** "Evidence" = (a) `manual_evidence` logs written by the Today sheet, (b) the `evidence` store/schema (never written), (c) `EvidenceSheet` (a UI, for audits/goals), (d) `facts` of type `log_evidence` from Jarvis. These are four different things.
7. **Quest metrics not fed.** [questBoardRepository.js](src/database/questBoardRepository.js) supports `habit_completions`, `fact_count`, `fact_sum`, but App.jsx calls `syncQuestProgress(allLogs)` with logs only (App.jsx:284, 454). Occurrences/facts default to `[]`, so those metric types evaluate to 0 in production. Jarvis `add_quest` accepts any metric type string (not validated against derive cases) [R]; unknown types fall back to the stored `currentValue`.
8. **Main-quest card mismatch.** TodayTab selects quests with `q.status === 'active'` / `q.priority === 'main'` (TodayTab.jsx:179-180). Quests created by `add_quest` have neither field (actionExecutor.js:201-210), so the card finds no quest.

---

## 4. Scoring engine

Source: [S] (sub-agent read files, line cites), with App.jsx wiring checked by me [R].

### System A: legacy, log/quest/habit based — [helpers/statsEngine.js](src/helpers/statsEngine.js)
`computeAllStats(logs, axisConfigs, quests, today, allHabits)` → per-axis `calcAxisStat`.

| Term | Formula |
|---|---|
| Consistency C | Non-onboarding / non-proof logs in a rolling 30-day window ÷ `(30/7 × expectedPerWeek)`, clamped 0–100. Strategy pause freezes the window at the latest `book_finished`. |
| Volume V | Weighted average of quest progress: done=1, else `min(currentValue/max(target,1),1)`; habit-mastery multiplier `0.7 + 0.3×level/totalLevels`; ×100. |
| Momentum M | `((recent−prior)/max(prior,1))×100`, clamped −20…20; axis-specific windows (`constants.js:103-110`); early-account baseline. |
| Stat | `C×.45 + V×.40 + M×.15` (habit phases shift to .15/.60/.25 or .25/.50/.25; social = `.55V + .45M`), clamp 0–99. |
| Onboarding | `onboarding_assessment.value` blended linearly until 30 real logs. |

There is **no "XP" in the running app**. Stats are recomputed from the whole log history each time, not accumulated.

### System B: fact/evidence/domain based — [core/scoring/scoreEngine.js](src/core/scoring/scoreEngine.js)
`runScoreProjection(domain, period)` calls a per-domain engine in `src/domains/*` (discipline from occurrences; knowledge from facts + learnings + books; body/strategy/creativity/social from facts). Evidence is *authoritative* only if coverage ≥ 0.8, confidence ≥ 0.7, components exist and no low-coverage warning; otherwise the value is replaced by System A's `calcAxisStat`. Output is clamped 0–100 (`scoreSchema.js`).

### Which is live
- App.jsx displays scores via `getScoresAsync()` → `runScoreProjection` (System B with A as fallback) [S]. `JarvisTab` also calls `statsEngine` directly [R: JarvisTab.jsx:13].
- `scoreParityCheck.runParityCheck()` runs 15 s after boot if user data + API config exist; it prints a table and warns, does not throw [S]. It omits `allHabits` on the legacy side, so its comparison can be structurally unequal [S].
- Level-up: persisted `lastStatTitles` (settings) are compared with current titles from `getThresholdTitle(axis, round(stat))`; thresholds are hard-coded per axis in `statsEngine.js:329-380` [S/R]. After onboarding, titles are seeded silently [R: App.jsx 855-870].
- **Unused engines:** `helpers/rpgEngine.js` (10/25/15/50/100/5 XP table, `level = floor(sqrt(XP/100))+1`) has no importer; `core/scoring/calibration.js` and `scoringContracts.js` are imported only by `tests/unit/workstreamCalibrationScoring.test.js`; `core/evidence/evidenceQuery.js` has no importer. [G/S]
- README claims "Activities log points ('Evidence') against your stats, automatically leveling up". The shipped path is the derived-score model above, not a points ledger [R].

Hard-coded duplicates [S]: default axis config in both `axisConfigRepository.js` and `statsEngine.js`; axis windows in `constants.js`. `statSnapshotsRepository.js` documentation still names `strength` and `wisdom` axes (older vocabulary; `migrateAxisVocabulary` exists) [R].

---

## 5. Integrations

| Integration | Direction / data | Credentials | Status |
|---|---|---|---|
| **Health Connect** ([HealthConnectConnector.js](src/core/sync/connectors/HealthConnectConnector.js)) | Device → app only. Reads `Steps` (count, start/end, metadata id, unit) into `body.activity.steps` facts. No write permissions requested. [S] | Android permission | Registered in App.jsx; sync via Settings button. Native-only (null on web). **Never tested on a device** (NEXT_RELEASE.md) [R]. |
| **NutriLift** ([NutriLiftConnector.js](src/core/sync/connectors/NutriLiftConnector.js)) | Supabase → app. Paginated read of NutriLift records (`record_type`, `external_id`, `payload`, timestamps, schema/version, deletion state) → immutable facts + `nutriLiftProjections`; retraction handling. [S] | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` + **a signed-in Supabase user** | Wired for sync. **No UI calls `signInWithPassword`** (only defined in supabaseAuth.js; grep shows no caller) [G], so with no way to sign in the sync cannot authenticate from the app [U: a session might be injected externally]. Live Supabase never verified (NEXT_RELEASE.md). |
| **Supabase (other)** | Client/auth helpers only; no other tables or writes found. [S] | Anon key in the browser bundle (normal for anon keys; RLS must protect data [U]) | Partial |
| **Jarvis / AI provider** ([llmClient.js](src/core/ai/llmClient.js), [jarvisEngine.js](src/core/ai/jarvisEngine.js), [contextBuilder.js](src/core/ai/contextBuilder.js)) | App → provider. POSTs system prompt, conversation history, built context, user message, model, temperature, token limit. Context includes self model, score snapshot, active goals/habits, routine config, experiments, semantic memories and **recent evidence facts** (so health/steps and journal-type content can be sent) [S]. Provider response → proposals. | OpenAI-compatible endpoint (default Groq). API key in `secureStorage` (native secure plugin, local fallback on web). base URL / model / gateway in IndexedDB `settings`. [S] | Fully wired in the UI. Settings toggles `jarvisSendPageContext`, `jarvisSaveMemories` exist [R]; whether they filter the payload is [U]. |
| **Server gateway** ([api/jarvis.js](api/jarvis.js), 80 lines) | App → your server → provider. Forwards arbitrary `messages` using server-side `AI_PROVIDER_API_KEY` / `GROQ_API_KEY`. [S] | Server env | Optional. **No authentication is visible in the handler** [S]: if deployed publicly it would proxy anyone's prompts on your key. Deployment exposure is [U]. |
| **Jarvis write surface** ([actionSchemas.js](src/core/ai/actionSchemas.js)) | 18 action types: `add_habit, modify_habit, pause_habit, archive_habit, add_quest, modify_roadmap, adjust_routine, update_mastery_level, add_learning, suggest_experiment, revise_target, log_evidence, propose_memory, create_plan, complete_onboarding, add_goal, modify_goal, update_experiment`. Needs explicit approval; `undoAction` supported; idempotency in `proposalExecutions`. [S] | n/a | Wired. |
| **Update checker** ([updateChecker.js](src/core/updateChecker.js)) | App → `api.github.com/repos/Prithvi-ra-j/Actions-Tracker/releases?per_page=1`, unauthenticated, cached 6 h in `sessionStorage` [S]. Called at boot (App.jsx:~290, [R]). | none | Fetched but **result never displayed** (UpdateBanner not rendered). |
| **Local notifications / filesystem backup / haptics / status bar / secure storage** | Device-local. Backup writes `ActionsTracker_Latest_Backup.json` to Documents [R: backupService.js:5]. | n/a | Wired [S]. |
| **Service worker / PWA** | [public/sw.js](public/sw.js) exists; [main.jsx](src/main.jsx) states it is intentionally **not registered**. Manifest is linked. [R/S] | n/a | `sw.js` is dead. README still calls the app a "PWA" with offline PWA behaviour [R]. |

---

## 6. Dead, half-built or flagged code

Explicit `TODO/FIXME/HACK` markers: **none** found in `src` (grep). The items below are structural findings, not TODOs.

**Unreachable source files (no static importer path from `src/main.jsx`) [G]:** the 13 components above, plus
`core/ai/feedbackEngine.js` (only imported by dead InsightsInbox), `core/evidence/evidenceQuery.js`, `core/domain/domainEvents.js` (test only), `core/scoring/calibration.js` and `scoringContracts.js` (test only), `data/quotes.js` (**4,747 lines, no importer**), `data/starterPack.js` (no importer), `database/{appMetaRepository (test only), commit, creativeWorkRepository, decisionRepository, gymSessionsRepository, observationRepository}.js`, `helpers/rpgEngine.js`, `models/{creativeWorkSchema, decisionSchema, factSchema, habitSchema, observationSchema}.js`, `scripts/dummyDataGenerator.js`, `theme.js`.
Note: `models/factSchema.js` (the `buildFact` validator) has **no importer** [G], so facts are validated by whatever `factsRepository.addFact` does [U: not read].

**Dead handlers/state in App.jsx [R]:** `handleDailyToggle`, `handleGoalToggle`, `handleMilestoneToggle`, `handleStartBook`, `TOTAL_TARGETS`, `doneTargets`, `showNavDrawer`/`NavDrawer`, `ReviewPrompt`, `UpdateBanner`, `hasSundayReflection`.

**Half-built:**
- Books: store, repo and UI exist, but UI is not reachable (§1).
- Gym sessions: repo + quest rules + store, no writer.
- `evidence` store: schema, repo, query layer, and `addEvidence` import; no writer.
- Supabase auth: helper functions with no sign-in UI.
- `BaseConnector` methods throw `not implemented` by design (abstract) [R].
- Legacy `q-*` quest ids in `deriveQuestValue` refer to presets that are no longer seeded (`initQuestBoard` seeds nothing, [R]); `DEFAULT_QUESTS` is retained but unused by `initQuestBoard` [R].

**Stray files at the repo root:** `patch.js` (a one-off script that rewrites `src/App.jsx`), `fixes.patch` (a diff), `implementation_plan_go thorugh ti once thorughly using claude` (41 KB plan, no extension) [R: head of each]. Release docs `NEXT_RELEASE.md` / `release-notes.md` are release-process files. `README.md` says "Vite proxy uses port 3000 for Supabase connections" [U: not checked against `vite.config.js`].

---

## 7. Size

Method: non-blank lines (PowerShell `Measure-Object -Line`), `*.js, *.jsx, *.css, *.mjs`, excluding `node_modules`, `android/`, `dist`. Java/Gradle/XML/Markdown/JSON excluded. **234 files, 32,927 lines.**

| Module | Files | Lines |
|---|---|---|
| `src/components` (jsx + css) | 43 | 9,030 |
| `tests` | 66 | 5,816 |
| `src/data` | 2 | 4,825 (4,747 = quotes.js) |
| `src/core` | 32 | 3,956 |
| `src/database` | 37 | 3,565 |
| `src/domains` | 6 | 1,454 |
| `src` (top level files) | 6 | 1,149 |
| `simulations` | 16 | 781 |
| `src/models` | 9 | 782 |
| `src/helpers` | 4 | 721 |
| `src/native` | 3 | 294 |
| `scripts` | 1 | 151 |
| `src/scripts` | 1 | 140 |
| `api` | 1 | 80 |
| other (`playwright/vitest/vite` config, `patch.js`, `public/sw.js`, `src/integrations`) | 7 | ~165 |

**Top 10 largest files:**

| # | Lines | File |
|---|---|---|
| 1 | 4,747 | `src/data/quotes.js` (unreferenced) |
| 2 | 1,370 | `src/components/JarvisTab.jsx` |
| 3 | 925 | `src/components/JarvisTab.css` |
| 4 | 820 | `src/App.jsx` |
| 5 | 600 | `src/components/SettingsTab.jsx` |
| 6 | 528 | `src/database/db.js` |
| 7 | 500 | `src/core/ai/actionExecutor.js` |
| 8 | 497 | `src/components/GoalsTab.jsx` |
| 9 | 458 | `tests/scenarios/ui-journeys.test.jsx` |
| 10 | 453 | `src/components/TodayTab.jsx` |

Excluding `quotes.js`, the app is ~28,000 lines. About 3,500 lines of non-test code sit in files with no static importer (estimate from §6 [G], not summed exactly).

---

## 8. Tests

Not run by me. `NEXT_RELEASE.md` records "44 files, 279 tests passed (2026-09-26)" [R: quoted]. My own file count is 56 vitest files (`tests/**/*.test.js[x]`) plus 5 Playwright specs; the difference from 44 is unexplained [U], so the doc may be older than the tree.

Config [R]: `vitest.config.js` uses `environment: 'node'` and the include list `tests/**/*.test.js[x]`; coverage `include` is only `src/helpers/**` and `questBoardRepository.js`. `.jsx` tests need a per-file jsdom annotation [U: not checked]. `playwright.config.js` runs `tests/e2e` on desktop Chrome plus a mobile-chromium smoke project, base `http://127.0.0.1:4174`, service workers blocked.

| Suite | Files (approx. test count by regex) | Covers |
|---|---|---|
| `tests/unit` | 31 | Stat engine, tiers, volume, momentum, quest derivation, consistency; Jarvis engine/gateway/action contracts/schemas/AI context boundaries; LLM client; actionExecutor on IndexedDB; backup/restore; connectors (Health Connect, NutriLift), sync manager; occurrence grace, routine engine; date/timezone; banners |
| `tests/scenarios` | 6 | Persona simulations (checkbox gamer, ideal, inactive, strategy reader); `ui-journeys.test.jsx` (~21 tests: goals, learn, audits, backup import, provider settings); Jarvis approval/undo |
| `tests/properties` | 4 | Property-based (fast-check): bounds, determinism, independence, monotonicity |
| `tests/adversarial`, `tests/sensitivity` | 4 + 4 | Score gaming and weight/window sensitivity |
| `tests/migration` | 5 | IndexedDB upgrade, v1→v2 migration, axis vocabulary |
| `tests/regression` | 1 | Monthly check-in date |
| `tests/testlab` | 1 test + 3 helpers | Scenario harness |
| `tests/e2e` | 5 specs | Backup/restore, local data recovery, mobile smoke, NutriLift sync retry, test-lab harness |

**Static reach from unit/component tests [G]:** of 142 `src` files, 41 are imported directly by a vitest test and 110 are reachable transitively. Transitive reach only means the module is loaded, not exercised.

**Not reached even transitively by vitest tests [G]** (32 files): `main.jsx`, `ErrorBoundary`, `ToastContext`, the 13 unreachable components, `feedbackEngine`, `evidenceQuery`, `quotes`, `starterPack`, `commit`, three unused repos, `gymSessionsRepository`, `rpgEngine`, five schema files, `dummyDataGenerator`, `theme`.

**Gaps by inference [U]:**
- No test found that proves a habit completion changes a displayed stat end to end. `completeOccurrence` writes no log or fact (§3).
- No test of the "metric type not fed by `syncQuestProgress`" case (§3.7).
- Settings omitted from backup (§2) — `databaseBackup*.test.js` read only by name.
- Health Connect, live Supabase, TalkBack and in-place Android upgrade are untested by design (NEXT_RELEASE.md).
- `JarvisTab.jsx` (1,370 lines) has jarvis approval/undo and ui-journey coverage; slash commands/long threads are listed as implementation gaps in NEXT_RELEASE.md [R].
- Android native tests are the Capacitor template examples only (`ExampleUnitTest.java`) [U].
