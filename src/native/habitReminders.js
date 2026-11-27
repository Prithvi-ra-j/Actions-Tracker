import { LocalNotifications } from '@capacitor/local-notifications';
import { getHabit } from '../database/habitRepository.js';
import { getOccurrencesForDate } from '../database/habitOccurrenceRepository.js';
import { getSetting } from '../database/settingsRepository.js';
import { localDateStr } from '../helpers/dateHelpers.js';

const BASE_ID = 100000;
const IDS_PER_HABIT = 8;

function notificationId(number, offset) {
  return BASE_ID + number * IDS_PER_HABIT + offset;
}

export async function scheduleHabitReminder(habit, { cancelSnooze = false } = {}) {
  if (!habit.reminder?.number) return;
  const { number, enabled, time } = habit.reminder;
  if (enabled && habit.status === 'active' && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time || '')) {
    throw new Error('Choose a valid reminder time.');
  }
  const days = !habit.frequency || habit.frequency.type === 'daily'
    ? [0, 1, 2, 3, 4, 5, 6]
    : habit.frequency?.days || [];
  if (enabled && habit.status === 'active' &&
      (!days.length || days.some(day => !Number.isInteger(day) || day < 0 || day > 6))) {
    throw new Error('The habit has an invalid reminder schedule.');
  }
  const cancelCount = enabled && habit.status === 'active' && !cancelSnooze ? 7 : IDS_PER_HABIT;
  const ids = Array.from({ length: cancelCount }, (_, offset) => ({ id: notificationId(number, offset) }));
  await LocalNotifications.cancel({ notifications: ids });
  if (!enabled || habit.status !== 'active') return;
  const [hour, minute] = time.split(':').map(Number);
  await LocalNotifications.schedule({
    notifications: days.map(day => ({
      id: notificationId(number, day),
      title: 'Actions',
      body: `Time for ${habit.name}, when you are ready.`,
      schedule: { on: { weekday: day + 1, hour, minute }, repeats: true, allowWhileIdle: true },
      sound: null,
      iconColor: '#c4821a',
    })),
  });
}

export async function snoozeHabitReminder(habit, minutes = 15) {
  const current = await getHabit(habit.id);
  if (!current?.reminder?.number || !current.reminder.enabled || current.status !== 'active') {
    throw new Error('Enable this habit reminder before snoozing it.');
  }
  const today = localDateStr();
  const occurrences = await getOccurrencesForDate(today);
  if (await getSetting('restDay') === today ||
      !occurrences.some(occurrence => occurrence.habitId === current.id &&
        ['expected', 'unknown'].includes(occurrence.status))) {
    throw new Error('There is no open occurrence to remind you about today.');
  }
  const id = notificationId(current.reminder.number, 7);
  await LocalNotifications.cancel({ notifications: [{ id }] });
  await LocalNotifications.schedule({ notifications: [{
    id,
    title: 'Actions',
    body: `A gentle reminder for ${current.name}.`,
    schedule: { at: new Date(Date.now() + minutes * 60 * 1000), allowWhileIdle: true },
    sound: null,
    iconColor: '#c4821a',
  }] });
  const latest = await getHabit(current.id);
  const latestOccurrences = await getOccurrencesForDate(today);
  if (localDateStr() !== today || await getSetting('restDay') === today || latest?.status !== 'active' ||
      !latest.reminder?.enabled || latest.reminder.number !== current.reminder.number ||
      !latestOccurrences.some(occurrence => occurrence.habitId === current.id &&
        ['expected', 'unknown'].includes(occurrence.status))) {
    await LocalNotifications.cancel({ notifications: [{ id }] });
    throw new Error('The habit changed before the snooze was scheduled.');
  }
}

export async function cancelHabitSnooze(habit) {
  if (habit?.reminder?.number) {
    await LocalNotifications.cancel({ notifications: [{ id: notificationId(habit.reminder.number, 7) }] });
  }
}
