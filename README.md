
# Actions Tracker

### A character sheet for the person you're becoming.

*Powered by bad habits.*

---

You have 37 open tabs, a half-finished book, a plan to work out "starting Monday," and a suspicious ability to spend 45 minutes choosing what to do next.

Same.

**Actions Tracker is a place to turn all that intention into actual, visible action.** Make a habit. Work toward a goal. Write down what you learned. See the little things add up.

No life overhaul required. Just the next move.

## Picture this

**Monday.** You decide you're going to walk more. You add "Go outside for ten minutes" to Today. You do it. You check it off. A tiny win, but a real one.

**Wednesday.** You miss your walk because life happened. The app doesn't need you to pretend otherwise. Earlier unfinished habits are still there if you want to deal with them.

**A few weeks later.** You've been walking, reading, and actually taking steps toward that goal you've been talking about for months. Instead of asking, "Am I even doing anything?", you have something to look back on.

That's the idea.

## Your life, but with a character sheet

Games make progress feel good because you can *see* it. Real life is a little less helpful: nobody pops up to tell you that reading consistently might be paying off.

Actions Tracker brings some of that visibility to six parts of your life:

**Vitality · Intellect · Judgment · Creation · Connection · Discipline**

Your progress view reflects recorded activity and habit outcomes. Your goals can have milestones, and your learning has a place to land.

Your next quest might be "read ten pages" instead of "defeat the dragon." Honestly? Some days, both sound equally difficult.

## A few things you can do right now

- **Give today a job.** Create habits, see them grouped by time of day, and check them off with an undo option.
- **Make room for rest.** Use Rest day to excuse today's open habits; completed habits stay completed.
- **Make the big thing smaller.** Turn a goal into milestones you can work toward.
- **Remember what you're learning.** Save topics and log practice as you explore.
- **Look at the bigger picture.** See recorded activity and an early, personal momentum estimate rather than a rank.
- **Leave yourself a note.** Record what you did or noticed, even when it doesn't fit neatly into a checkbox.

On first use, choose the areas you want to grow, select starter habits or add your own, and choose a preferred time. Your reminder stays off until you opt in after your first check-off. You can change the habit reminder in Settings.

Use **Manage habits** on Today to rename, schedule, pause, resume, or archive a habit, set its tiny version, and opt into a per-habit reminder. The displayed completed-day count comes from recorded occurrences; it is not a streak or proof of continuous use. Rest days are excused rather than marked missed, including habits added later on that day.

Per-habit reminders use local notifications on supported devices. Snooze is available from the habit editor for an open habit today and is cancelled after completion or a rest day. Notification-level snooze and completion actions are not currently available. Recurring reminders can still arrive after a habit is completed or a rest day is selected. Scheduling and device behavior have not yet been validated.

Ved's approved habit edits, pauses, archives and undo reconcile Today's schedule and per-habit reminders; any refresh or scheduling failure is reported. Quest shortcuts and the Today quest card are hidden, and quest actions are temporarily unavailable without deleting existing quest data.

The growth view separates lifetime credits from personal momentum. It includes completed habits, attributed notes and learning practice, selected explicitly attributed evidence records, and newly completed goal milestones. Linked facts are not counted again when already represented by a log, occurrence or milestone. Each item credits its selected primary attribute, optionally split with a second. New habit completions retain their attribution when a habit is edited; older completions are attributed using the saved habit until its first edit. Legacy milestones without a recorded date and attribute, and other unattributed records, are not guessed or counted. When a habit is added to an already calibrated attribute, it counts toward lifetime immediately but joins that attribute's momentum after five non-rest, non-paused active days. Existing baseline activity remains in use.

Lifetime totals do not decrease because time passes, a day is missed or rested, or a baseline changes. The five-second completion undo removes a mistaken check-in; later corrections in habit history add an audit record and remove that completion from the effective total. Removing a completed goal milestone similarly records a correction. Rest dates, weekly baseline history and per-attribute pause/reset controls are saved locally and included in database backups. Calibration requires five active days per attribute and four active weeks for the calibrated label. Momentum uses earlier complete active weeks and a slowly updated baseline; paused and rest days are excluded. The first-week report summarizes recorded load, daily activity, time patterns and, when available, follow-through and recovery after explicit misses.

After calibration, evidence-backed numeric scores require at least 80% coverage and 70% confidence. The provisional stage remains word-only. Scoring uses only explicitly attributed, unsplit evidence supported by each domain engine; split and unattributed records still appear in the growth view as applicable but are not used in numeric scores. Fallbacks are labelled "Early estimate" without a number; the radar appears after seven days only when at least two attributes meet the numeric gate, and excludes unavailable attributes rather than plotting zeros. Onboarding self-assessments remain saved as prior information but are no longer blended into the fallback score. On heavy days, Today can show and record tiny versions. Weekly baseline snapshots are saved when the app is opened, the local day changes while it is open, or the growth view is loaded; weeks when the app is not used have no snapshot. The implementation and device behavior have not been verified; automated and synthetic scenario testing is deferred until the end of the roadmap.

Today also offers an optional daily energy, focus and mood check-in. Answer any or none; readings stay in local settings and backups, appear as context in the first-week report, and do not change growth or scores.

## Meet Ved

Ved is our **optional AI assistant prototype**. Think of it as a brainstorming partner who's still learning the ropes: it can help you reflect, explore plans, and suggest changes. You review and approve its proposals before they're applied.

No AI key? No problem. You can skip the assistant setup and use the core local tracking features without it.

If you do use Ved, it needs an internet connection. Your prompts and selected context are sent to the configured AI provider, directly or through an optional gateway.

## Coming to the party later

We're planning a home for **food logging and analysis**, plus **workout logging and tracking**, right inside the app. For now, Food & Fitness is a work-in-progress page in Settings—not a finished feature.

The old external NutriLift sync has been removed. Previously imported data remains in local backups.

## Your data, your device

Core tracking is local-first and doesn't require an account. On Android, the app also attempts to save JSON backups in Documents. When the database is empty on startup, it tries to restore an available backup without automatically replacing existing data.

You can export and import backups yourself. **Keep an extra copy somewhere safe**: whether Documents files survive an uninstall depends on your device and Android storage behavior.

## Try it out

You'll need **Node.js 22 or newer**:

```bash
npm install
npm run dev
```

For a production web build, run `npm run build`. To open the Android project in Android Studio, run `npm run cap:sync` followed by `npm run cap:android`.

---

You don't have to become a new person overnight.

Just give tomorrow-you something to thank today-you for.

**Actions Tracker — powered by bad habits.**
