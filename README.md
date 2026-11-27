
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

**Body · Knowledge · Strategy · Creativity · Social · Discipline**

Your stats reflect recorded activity and habit outcomes. Your goals can have milestones. Your learning has a place to land. And when a stat crosses a title threshold, there's a little celebration.

Your next quest might be "read ten pages" instead of "defeat the dragon." Honestly? Some days, both sound equally difficult.

## A few things you can do right now

- **Give today a job.** Create daily habits and check them off as you go.
- **Make the big thing smaller.** Turn a goal into milestones you can work toward.
- **Remember what you're learning.** Save topics and log practice as you explore.
- **Look at the bigger picture.** See stats based on what you've recorded, not imaginary XP.
- **Leave yourself a note.** Record what you did or noticed, even when it doesn't fit neatly into a checkbox.

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
