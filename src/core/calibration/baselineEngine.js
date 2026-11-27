import { addDays, daysBetween, localDateStr, parseLocalDate, subtractDays } from '../../helpers/dateHelpers.js';
import { getEffectiveFacts } from '../facts/effectiveFacts.js';

const AXES = ['body', 'knowledge', 'strategy', 'creativity', 'social', 'discipline'];

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function weekStart(date) {
  const day = parseLocalDate(date).getDay();
  return subtractDays(date, (day + 6) % 7);
}

function validDate(date, today) {
  return typeof date === 'string' && !!parseLocalDate(date) && date <= today;
}

/**
 * Builds an honest, local-time overview from completed occurrences and manually
 * attributed notes. Unrecorded days are not inferred to be missed.
 */
export function computeGrowthOverview({ habits, occurrences, logs, goals = [], facts = [], restDay, restDays = [],
  calibration = {}, today, startedOn }) {
  if (!parseLocalDate(today)) throw new Error('Invalid date for growth overview.');
  const habitById = new Map(habits.map(habit => [habit.id, habit]));
  const restDates = new Set(occurrences
    .filter(occ => occ.status === 'excused' && occ.reason === 'rest_day')
    .map(occ => occ.scheduledFor.split('T')[0]));
  if (validDate(restDay, today)) restDates.add(restDay);
  for (const date of restDays) if (validDate(date, today)) restDates.add(date);

  const activities = [];
  function credits(primary, secondary, share) {
    if (!AXES.includes(primary)) return [];
    if (!AXES.includes(secondary) || primary === secondary || !Number.isFinite(share) || share <= 0 || share >= 100) {
      return [{ axis: primary, weight: 1 }];
    }
    return [{ axis: primary, weight: share / 100 }, { axis: secondary, weight: (100 - share) / 100 }];
  }
  for (const occurrence of occurrences) {
    const date = occurrence.scheduledFor?.split('T')[0];
    if (occurrence.status !== 'completed' || !validDate(date, today)) continue;
    const habit = habitById.get(occurrence.habitId);
    const attribution = occurrence.attribution || {
      primary: habit?.domain, secondary: habit?.secondaryDomain, primaryShare: habit?.primaryShare,
    };
    activities.push({ date, credits: credits(attribution.primary, attribution.secondary, attribution.primaryShare),
      kind: 'habit', name: habit?.name || 'Archived habit', habitId: occurrence.habitId, occurrenceId: occurrence.id,
      completionVersion: occurrence.completionVersion, completionVersionText: occurrence.completionVersionText });
  }
  const attributedLogTypes = new Set(['manual_evidence', 'learning_practice', 'gym_session',
    'journal_entry', 'master_copy', 'finished_piece']);
  for (const log of logs) {
    if (!attributedLogTypes.has(log.type) || !AXES.includes(log.axis) || !validDate(log.date, today)) continue;
    activities.push({ date: log.date, credits: credits(log.axis, log.meta?.secondary, log.meta?.primaryShare),
      kind: 'note', name: log.type === 'learning_practice' ? 'Learning practice' : log.type === 'gym_session'
        ? 'Training session' : log.type === 'finished_piece' ? 'Finished piece' : 'Evidence' });
  }
  const representedFactIds = new Set([
    ...occurrences.flatMap(occurrence => occurrence.supportingFactIds || []),
    ...logs.flatMap(log => [log.meta?.factId, ...(log.meta?.supportingFactIds || [])]),
  ]);
  const attributedFactTypes = new Set(['habit.completed', 'knowledge.learning.added', 'knowledge.learning.applied',
    'knowledge.book.progress', 'knowledge.book.completed', 'strategy.decision.logged', 'strategy.decision.resolved',
    'creativity.work.logged', 'creativity.work.feedback', 'social.experiment.logged', 'social.experiment.result',
    'body.training.session', 'milestone_completion']);
  const milestoneIds = new Set(goals.flatMap(goal => (goal.targets || [])
    .filter(target => target.completed && target.completionId).map(target => target.completionId)));
  for (const fact of getEffectiveFacts(facts)) {
    const isVedNote = fact.meta?.source === 'jarvis_conversational' && !!fact.meta?.text;
    if ((!isVedNote && !attributedFactTypes.has(fact.type)) ||
        representedFactIds.has(fact.id) || milestoneIds.has(fact.meta?.completionId) ||
        !AXES.includes(fact.meta?.domain) || !validDate(fact.localDate, today)) continue;
    activities.push({ date: fact.localDate,
      credits: credits(fact.meta.domain, fact.meta.secondaryDomain, fact.meta.primaryShare),
      kind: fact.type === 'milestone_completion' ? 'milestone' : 'note',
      name: fact.type === 'milestone_completion' ? 'Milestone' : isVedNote ? 'Ved note' : 'Evidence' });
  }
  for (const goal of goals) {
    for (const target of goal.targets || []) {
      if (!target.completed || !target.completionId || !validDate(target.completedOn, today) ||
          !AXES.includes(target.completedAxis)) continue;
      activities.push({ date: target.completedOn, credits: credits(target.completedAxis),
        kind: 'milestone', name: target.text || 'Milestone' });
    }
  }

  const recentStart = subtractDays(today, 6);
  const previousStart = subtractDays(today, 13);
  const attributes = Object.fromEntries(AXES.map(axis => {
    const items = activities.flatMap(item => {
      const credit = item.credits.find(entry => entry.axis === axis);
      return credit ? [{ ...item, weight: credit.weight }] : [];
    });
    const control = calibration[axis] || {};
    const isPausedOn = date => (control.pauses || []).some(period =>
      date >= period.start && (!period.end || date <= period.end));
    const eligibleItems = items.filter(item => !restDates.has(item.date) && !isPausedOn(item.date) &&
      (!control.since || item.date >= control.since));
    const datedHabits = habits.flatMap(habit => {
      if (!habit.createdAt || !Number.isFinite(Date.parse(habit.createdAt))) return [];
      const createdOn = localDateStr(new Date(habit.createdAt));
      return validDate(createdOn, today) ? [{ habit, createdOn }] : [];
    }).sort((a, b) => a.createdOn.localeCompare(b.createdOn));
    const releases = new Map();
    const updatingHabits = [];
    for (const { habit, createdOn } of datedHabits) {
      const habitItems = eligibleItems.filter(item => item.habitId === habit.id && item.date >= createdOn);
      const selectedAxes = credits(habit.domain, habit.secondaryDomain, habit.primaryShare);
      if (!selectedAxes.some(entry => entry.axis === axis) && !habitItems.length) continue;
      if (habit.status !== 'active' && !habitItems.length) continue;
      const previous = eligibleItems.filter(item => item.habitId !== habit.id && item.date < createdOn &&
        (!releases.has(item.habitId) || (releases.get(item.habitId) && releases.get(item.habitId) < createdOn)));
      const previousDays = new Set(previous.map(item => item.date)).size;
      const previousWeeks = new Set(previous.map(item => weekStart(item.date))).size;
      if (previousDays < 5 || previousWeeks < 4) continue;
      const activeDates = [...new Set(habitItems.map(item => item.date))].sort();
      releases.set(habit.id, activeDates[4] || null);
      if (activeDates.length < 5) updatingHabits.push({ id: habit.id, name: habit.name, activeDays: activeDates.length });
    }
    const updatingIds = new Set(updatingHabits.map(habit => habit.id));
    const baselineItems = eligibleItems.filter(item => !updatingIds.has(item.habitId));
    const activeDays = new Set(baselineItems.map(item => item.date)).size;
    const weeks = new Map();
    for (const item of baselineItems) {
      const week = weekStart(item.date);
      weeks.set(week, (weeks.get(week) || 0) + item.weight);
    }
    const activeWeeks = weeks.size;
    const priorWeeks = [...weeks.entries()].filter(([week]) => week < weekStart(recentStart))
      .sort(([a], [b]) => a.localeCompare(b)).map(([week, count]) => {
        const available = Array.from({ length: 7 }, (_, index) => addDays(week, index))
          .filter(date => !restDates.has(date) && !isPausedOn(date) && (!control.since || date >= control.since)).length;
        return count * 7 / available;
      });
    let baseline = null;
    for (let index = 0; index < priorWeeks.length; index++) {
      const typical = median(priorWeeks.slice(Math.max(0, index - 3), index + 1));
      baseline = baseline === null ? typical : baseline * 0.9 + typical * 0.1;
    }
    const spread = baseline === null ? null : Math.max(1, median(priorWeeks.slice(-4).map(value => Math.abs(value - baseline))));
    const recent = baselineItems.filter(item => item.date >= recentStart)
      .reduce((sum, item) => sum + item.weight, 0);
    const observedDays = Array.from({ length: 7 }, (_, index) => addDays(recentStart, index))
      .filter(date => !restDates.has(date) && !isPausedOn(date) && (!control.since || date >= control.since)).length;
    const status = activeDays < 5 ? 'Calibrating' : activeWeeks < 4 ? 'Provisional' : 'Calibrated';
    let momentum = null;
    if (!control.paused && status !== 'Calibrating' && baseline !== null && observedDays > 0) {
      const z = (recent * 7 / observedDays - baseline) / spread;
      momentum = recent === 0 && baseline > 0 ? 'Resting' : z >= 1 ? 'Building' : z <= -1 ? 'Resting' : 'Steady';
    }
    return {
      axis, status, activeDays, activeWeeks, baseline, spread, recent, momentum, updatingHabits,
      paused: !!control.paused, calibrationSince: control.since || null,
      recorded: items.length,
      lifetime: items.reduce((sum, item) => sum + item.weight, 0),
      completed: items.filter(item => item.kind === 'habit').length,
      notes: items.filter(item => item.kind === 'note').length,
      milestones: items.filter(item => item.kind === 'milestone').length,
      days: new Set(items.map(item => item.date)).size,
      recentItems: [...items].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
        .map(item => ({ date: item.date, name: item.name, weight: item.weight })),
    };
  }));
  const recentOccurrences = occurrences.filter(occ => {
    const date = occ.scheduledFor?.split('T')[0];
    return validDate(date, today) && date >= recentStart && !restDates.has(date);
  });
  const completed = recentOccurrences.filter(occ => occ.status === 'completed').length;
  const missed = recentOccurrences.filter(occ => occ.status === 'missed').length;
  const calendar = Array.from({ length: 28 }, (_, index) => {
    const date = addDays(today, index - 27);
    return { date, count: activities.filter(item => item.date === date).length, rest: restDates.has(date) };
  });
  const firstActivityDate = activities.map(item => item.date).sort()[0] || null;
  const start = validDate(startedOn, today) && (!firstActivityDate || startedOn <= firstActivityDate)
    ? startedOn : firstActivityDate;
  const firstWeekEnd = start ? addDays(start, 6) : null;
  const firstWeekOccurrences = start && firstWeekEnd <= today ? occurrences.filter(occ => {
    const date = occ.scheduledFor?.split('T')[0];
    return validDate(date, today) && date >= start && date <= firstWeekEnd && !restDates.has(date);
  }) : [];
  const firstWeekCompleted = firstWeekOccurrences.filter(occ => occ.status === 'completed');
  const firstWeekMissed = firstWeekOccurrences.filter(occ => occ.status === 'missed');
  const firstWeekDaily = new Map();
  const firstWeekTimes = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  let onTime = 0;
  let timedCompletions = 0;
  for (const occurrence of firstWeekCompleted) {
    const date = occurrence.scheduledFor.split('T')[0];
    firstWeekDaily.set(date, (firstWeekDaily.get(date) || 0) + 1);
    if (!occurrence.completedAt || !Number.isFinite(Date.parse(occurrence.completedAt))) continue;
    timedCompletions++;
    if (localDateStr(new Date(occurrence.completedAt)) === date) onTime++;
    const hour = new Date(occurrence.completedAt).getHours();
    const period = hour >= 5 && hour < 12 ? 'morning' : hour < 17 && hour >= 12 ? 'afternoon'
      : hour < 21 && hour >= 17 ? 'evening' : 'night';
    firstWeekTimes[period]++;
  }
  const rankedTimes = Object.entries(firstWeekTimes).sort((a, b) => b[1] - a[1]);
  const recovery = firstWeekMissed.flatMap(miss => {
    const date = miss.scheduledFor.split('T')[0];
    const next = firstWeekCompleted.filter(item => item.habitId === miss.habitId &&
      item.scheduledFor.split('T')[0] > date).sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))[0];
    return next ? [daysBetween(date, next.scheduledFor.split('T')[0])] : [];
  });
  return {
    attributes,
    recentCount: activities.filter(item => item.date >= recentStart).length,
    previousCount: activities.filter(item => item.date >= previousStart && item.date < recentStart).length,
    discipline: { completed, missed,
      activeDays: new Set(activities.filter(item => item.kind === 'habit' && !restDates.has(item.date)).map(item => item.date)).size,
      open: recentOccurrences.filter(occ => ['expected', 'unknown'].includes(occ.status)).length,
      rate: completed + missed ? completed / (completed + missed) : null },
    calendar,
    habits: habits.map(habit => ({
      id: habit.id, name: habit.name, status: habit.status,
      completed: activities.filter(item => item.habitId === habit.id).length,
      lastCompleted: activities.filter(item => item.habitId === habit.id).map(item => item.date).sort().at(-1) || null,
      records: activities.filter(item => item.habitId === habit.id)
        .sort((a, b) => b.date.localeCompare(a.date)).map(item => ({ date: item.date, id: item.occurrenceId,
          completionVersion: item.completionVersion, completionVersionText: item.completionVersionText })),
    })).filter(habit => habit.completed > 0),
    corrections: facts.filter(fact => fact.type === 'correction' && fact.meta?.action === 'remove_completion')
      .map(fact => {
        const occurrence = occurrences.find(item => item.id === fact.meta.occurrenceId);
        return { id: fact.id, name: habitById.get(occurrence?.habitId)?.name || 'Habit',
          scheduledFor: fact.meta.scheduledFor?.split('T')[0] || 'unknown date', recordedOn: fact.localDate || 'unknown date' };
      }).sort((a, b) => b.recordedOn.localeCompare(a.recordedOn)),
    milestoneCorrections: facts.filter(fact => fact.type === 'correction' && fact.meta?.action === 'remove_milestone')
      .map(fact => ({ id: fact.id, name: fact.meta.previousTarget?.text || 'Milestone',
        recordedOn: fact.localDate || 'unknown date' }))
      .sort((a, b) => b.recordedOn.localeCompare(a.recordedOn)),
    firstActivityDate,
    builtFromHistory: !!startedOn && !!firstActivityDate && firstActivityDate < startedOn,
    streak: (() => {
      const dates = new Set(activities.map(item => item.date));
      let date = today;
      if (!dates.has(date) && !restDates.has(date)) date = subtractDays(date, 1);
      let count = 0;
      while (dates.has(date) || restDates.has(date)) {
        if (dates.has(date)) count++;
        date = subtractDays(date, 1);
      }
      return count;
    })(),
    firstWeek: start && firstWeekEnd <= today ? {
      start,
      end: firstWeekEnd,
      activityCount: activities.filter(item => item.date >= start && item.date <= firstWeekEnd).length,
      activeDays: new Set(activities.filter(item => item.date >= start && item.date <= firstWeekEnd)
        .map(item => item.date)).size,
      habitCompletions: activities.filter(item => item.kind === 'habit' && item.date >= start && item.date <= firstWeekEnd).length,
      typicalLoad: median([...firstWeekDaily.values()]),
      completionRate: firstWeekCompleted.length + firstWeekMissed.length
        ? firstWeekCompleted.length / (firstWeekCompleted.length + firstWeekMissed.length) : null,
      habitActiveDays: firstWeekDaily.size,
      evaluated: firstWeekCompleted.length + firstWeekMissed.length,
      frequentTime: rankedTimes[0][1] >= 3 && rankedTimes[0][1] > rankedTimes[1][1] ? rankedTimes[0][0] : null,
      timedCompletions, onTime, recoveryDays: median(recovery), recoveryCount: recovery.length,
      weekdays: Array.from({ length: 7 }, (_, index) => {
        const date = addDays(start, index);
        return { date, count: activities.filter(item => item.date === date).length, rest: restDates.has(date) };
      }),
      restDays: Array.from({ length: 7 }, (_, index) => addDays(start, index))
        .filter(date => restDates.has(date)).length,
      attributes: Object.fromEntries(AXES.map(axis => [axis, activities
        .filter(item => item.date >= start && item.date <= firstWeekEnd && item.credits.some(credit => credit.axis === axis)).length])),
      credits: Object.fromEntries(AXES.map(axis => [axis, activities
        .filter(item => item.date >= start && item.date <= firstWeekEnd && !restDates.has(item.date))
        .reduce((sum, item) => sum + (item.credits.find(credit => credit.axis === axis)?.weight || 0), 0)])),
    } : null,
  };
}
