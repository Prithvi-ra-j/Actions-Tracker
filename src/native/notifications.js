/**
 * Native Android notification layer via @capacitor/local-notifications.
 *
 * On Android (production): uses native Android notification system.
 *   - Works when app is closed, screen locked, no internet.
 *   - Notifications are truly scheduled in the OS.
 *
 * On web (development): uses the Web Notifications API fallback
 *   provided by the Capacitor plugin. Requires browser permission.
 *
 * IMPORTANT: The Daily Check notification (id=3) must be cancelled and
 * rescheduled every time a daily task is toggled. This is the only way to
 * keep the notification body text current — Android fires notifications with
 * whatever text was set at schedule time; there is no background JS execution.
 */

// ─── Constants ─────────────────────────────────────────────────────────────────

export const NOTIFICATION_IDS = {
  BODY:        1,
  PHILOSOPHY:  2,
  DAILY_CHECK: 3,
};

// ─── Plugin access ─────────────────────────────────────────────────────────────

/**
 * Lazily imports the Capacitor LocalNotifications plugin.
 * Returns null if unavailable (e.g., Capacitor not present in SSR/test env).
 */
async function getPlugin() {
  try {
    const mod = await import('@capacitor/local-notifications');
    return mod.LocalNotifications;
  } catch {
    return null;
  }
}

// ─── Permission ────────────────────────────────────────────────────────────────

/**
 * Requests notification permission from the user.
 * @returns {Promise<boolean>} true if granted
 */
export async function requestNotificationPermission() {
  const plugin = await getPlugin();
  if (!plugin) return false;
  try {
    const { display } = await plugin.requestPermissions();
    return display === 'granted';
  } catch (err) {
    console.error('[Notifications] requestPermissions failed:', err);
    return false;
  }
}

/**
 * Checks the current notification permission status.
 * @returns {Promise<'granted'|'denied'|'prompt'|'unavailable'>}
 */
export async function checkNotificationPermission() {
  const plugin = await getPlugin();
  if (!plugin) return 'unavailable';
  try {
    const { display } = await plugin.checkPermissions();
    return display;
  } catch {
    return 'unavailable';
  }
}

// ─── Scheduling ────────────────────────────────────────────────────────────────

/**
 * Schedules a recurring daily reminder at the specified local time.
 * Cancels any existing notification with the same id first.
 *
 * @param {number} id      Unique notification ID
 * @param {string} title   Notification title
 * @param {string} body    Notification body
 * @param {string} time    "HH:MM" local time
 * @param {number} weekday Capacitor weekday (1=Sunday, 2=Monday, ... 7=Saturday). If null, repeats every day.
 */
export async function scheduleReminder(id, title, body, time, weekday = null) {
  const plugin = await getPlugin();
  if (!plugin) return;

  const [hourStr, minuteStr] = time.split(':');
  const hour   = parseInt(hourStr,   10);
  const minute = parseInt(minuteStr, 10);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    console.error(`[Notifications] Invalid time string: "${time}"`);
    return;
  }

  try {
    // Always cancel first so we never accumulate duplicate schedules
    await plugin.cancel({ notifications: [{ id }] });

    const scheduleObj = {
      on:      { hour, minute },
      repeats: true,
      allowWhileIdle: true,
    };
    
    if (weekday !== null) {
      scheduleObj.on.weekday = weekday;
    }

    await plugin.schedule({
      notifications: [{
        id,
        title,
        body,
        schedule: scheduleObj,
        sound: null,
        iconColor: '#c4821a',
      }],
    });
  } catch (err) {
    console.error(`[Notifications] schedule(id=${id}) failed:`, err);
  }
}

/**
 * Cancels a scheduled notification by ID.
 * @param {number} id
 */
export async function cancelReminder(id) {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    await plugin.cancel({ notifications: [{ id }] });
  } catch (err) {
    console.error(`[Notifications] cancel(id=${id}) failed:`, err);
  }
}

// ─── Bulk scheduling ───────────────────────────────────────────────────────────

/**
 * Schedules (or cancels) all reminders based on the saved configuration.
 * Pass today's record so the texts are accurate. Because we split reminders
 * by weekday, rewriting today's text won't ruin next week's text (they are distinct IDs).
 * Every time the app boots, this rewrites all future days to their default text,
 * preventing stale "Complete" messages from lingering if the app wasn't opened.
 *
 * @param {Array<{id: number, label: string, time: string, enabled: boolean}>} reminders
 * @param {{ body: boolean, philosophy: boolean, art: boolean, history: boolean }} todayRecord
 */
export async function scheduleAllReminders(reminders, todayRecord = {}, onlyToday = false) {
  const jsToday = new Date().getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday

  for (const reminder of reminders) {
    // For each reminder, loop over all 7 days of the week.
    // jsDay = 0 (Sun) .. 6 (Sat)
    for (let jsDay = 0; jsDay <= 6; jsDay++) {
      if (onlyToday && jsDay !== jsToday) {
        continue; // Skip native calls for future/past days when we only need to update today
      }

      const capWeekday = jsDay + 1; // 1 = Sunday .. 7 = Saturday
      // Generate a distinct ID for each weekday: e.g. Body (1) -> 101 for Monday
      const notifId = (reminder.id * 100) + jsDay;

      // Determine if this reminder should fire on this jsDay
      let shouldSchedule = false;
      if (reminder.id === NOTIFICATION_IDS.BODY) {
        // Body only fires on training days: Mon(1), Wed(3), Fri(5), Sat(6)
        if ([1, 3, 5, 6].includes(jsDay)) shouldSchedule = true;
      } else {
        // Philosophy and Daily Check fire every day
        shouldSchedule = true;
      }

      if (!reminder.enabled || !shouldSchedule) {
        await cancelReminder(notifId);
        continue;
      }

      const isToday = (jsDay === jsToday);
      let notifBody = '';

      if (reminder.id === NOTIFICATION_IDS.DAILY_CHECK) {
        // Daily Check logic
        if (isToday) {
          const score = [
            todayRecord.body, todayRecord.philosophy,
            todayRecord.art, todayRecord.history
          ].filter(Boolean).length;
          notifBody = score === 4
            ? 'Day complete. Well done.'
            : `Your day isn't finished yet. ${score}/4 complete.`;
        } else {
          notifBody = `Your day isn't finished yet. 0/4 complete.`; // Reset for future
        }
      } else if (reminder.id === NOTIFICATION_IDS.BODY) {
        if (isToday && todayRecord.body) {
          notifBody = 'Training complete for today. Rest well.';
        } else {
          notifBody = 'Time for your body practice.';
        }
      } else if (reminder.id === NOTIFICATION_IDS.PHILOSOPHY) {
        if (isToday && todayRecord.philosophy) {
          notifBody = 'Reading complete for today.';
        } else {
          notifBody = 'Time for your philosophy practice.';
        }
      }

      await scheduleReminder(
        notifId,
        'Year End Goals',
        notifBody,
        reminder.time,
        capWeekday
      );
    }
  }
}
