import React, { useEffect, useState } from 'react';
import { LIFE_DIMENSIONS } from '../constants.js';
import { dbGetAll } from '../database/db.js';
import { getAllHabits } from '../database/habitRepository.js';
import { getAllLogs } from '../database/logsRepository.js';
import { getAllSettings, setSetting } from '../database/settingsRepository.js';
import { getAllFacts } from '../database/factsRepository.js';
import { getSelfModel } from '../database/selfModelRepository.js';
import { daysBetween, localDateStr } from '../helpers/dateHelpers.js';
import { computeGrowthOverview } from '../core/calibration/baselineEngine.js';
import { archiveBaselines } from '../core/calibration/baselineArchive.js';
import { getAllGoals } from '../database/goalsRepository.js';
import GrowthRadar from './GrowthRadar.jsx';
import { BottomSheet } from './ui/Overlays.jsx';

const card = { padding: '16px', background: 'var(--s1)', borderRadius: 'var(--r-container)', marginBottom: '14px' };
const muted = { color: 'var(--mu)', fontSize: '13px', lineHeight: 1.5 };

export default function StatsTab({ today, isActive, todayOccurrences, allLogs, stats = {}, axisDetails = {},
  onGoToToday, onCorrectCompletion, onRefreshScores }) {
  const [overview, setOverview] = useState(null);
  const [selectedAxis, setSelectedAxis] = useState(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [correcting, setCorrecting] = useState(false);
  const [correctionError, setCorrectionError] = useState('');
  const [calibration, setCalibration] = useState({});
  const [savingCalibration, setSavingCalibration] = useState(false);
  const [baselineHistory, setBaselineHistory] = useState([]);

  useEffect(() => {
    if (!isActive) return undefined;
    let cancelled = false;
    async function load() {
      try {
        const [habits, occurrences, logs, settings, selfModel, facts, goals] = await Promise.all([
          getAllHabits(), dbGetAll('habitOccurrences'), getAllLogs(), getAllSettings(), getSelfModel(), getAllFacts(), getAllGoals(),
        ]);
        const startedAt = selfModel.onboardingCompletedAt;
        const startedOn = startedAt && Number.isFinite(Date.parse(startedAt)) ? localDateStr(new Date(startedAt)) : null;
        const restDays = Object.keys(settings).filter(key => key.startsWith('restDay:') && settings[key] === 'true')
          .map(key => key.slice('restDay:'.length));
        const controls = {};
        for (const axis of LIFE_DIMENSIONS) {
          const raw = settings[`calibration:${axis.key}`];
          if (!raw) continue;
          const control = JSON.parse(raw);
          if (!control || typeof control !== 'object' || !Array.isArray(control.pauses) ||
              !Array.isArray(control.history)) throw new Error(`Invalid calibration settings for ${axis.key}.`);
          controls[axis.key] = control;
        }
        const result = computeGrowthOverview({ habits, occurrences, logs, facts, goals, restDay: settings.restDay,
          restDays, calibration: controls, today, startedOn });
        await archiveBaselines(result, today);
        const archiveSettings = await getAllSettings();
        const history = Object.entries(archiveSettings).filter(([key]) => key.startsWith('baselineSnapshot:'))
          .map(([, value]) => JSON.parse(value));
        if (!cancelled) {
          setOverview(result);
          setCalibration(controls);
          setBaselineHistory(history);
          setError('');
        }
      } catch (err) {
        console.error('[StatsTab] Could not load growth overview:', err);
        if (!cancelled) setError('Could not load your progress. Please try again.');
      }
    }
    load();
    return () => { cancelled = true; };
  }, [today, isActive, todayOccurrences, allLogs, reload]);

  if (error) return <div style={{ padding: '16px' }} role="alert">
    {error} <button type="button" onClick={() => setReload(value => value + 1)}>Retry</button>
  </div>;
  if (!overview) return <div role="status" style={{ padding: '16px', ...muted }}>Learning from your recorded activity...</div>;

  const selected = selectedAxis ? overview.attributes[selectedAxis] : null;
  const name = LIFE_DIMENSIONS.find(axis => axis.key === selectedAxis)?.label;
  const { discipline } = overview;
  const scoredAxes = LIFE_DIMENSIONS.filter(axis => {
    const item = overview.attributes[axis.key];
    const detail = axisDetails[axis.key];
    return !item.paused && item.status === 'Calibrated' && detail?.scoreSource === 'evidence' &&
      detail.coverage >= 0.8 && detail.confidence >= 0.7 &&
      !detail.warnings?.some(warning => warning.startsWith('low_coverage') || warning.includes('pipeline_error')) &&
      Number.isFinite(stats[axis.key]);
  }).map(axis => ({ ...axis, value: stats[axis.key] }));
  const radarReady = overview.firstActivityDate && daysBetween(overview.firstActivityDate, today) >= 6 &&
    scoredAxes.length >= 2;
  async function correctCompletion(record) {
    if (!window.confirm(`Remove the completion recorded for ${record.date}? This correction will be saved in your history.`)) return;
    setCorrecting(true);
    setCorrectionError('');
    try {
      await onCorrectCompletion(record.id);
      setReload(value => value + 1);
    } catch (err) {
      console.error('[StatsTab] Could not correct completion:', err);
      setCorrectionError('Could not correct this completion. Please try again.');
    } finally {
      setCorrecting(false);
    }
  }
  async function changeCalibration(action) {
    if (!selected) return;
    if (action === 'reset' && !window.confirm('Start a new baseline for this attribute? Your activity and previous baseline will be kept.')) return;
    setSavingCalibration(true);
    setCorrectionError('');
    try {
      const current = calibration[selectedAxis] || { since: null, paused: false, pauses: [], history: [] };
      let next;
      if (action === 'reset') {
        next = { since: today, paused: false, pauses: [], history: [...current.history, {
          savedOn: today, since: current.since, baseline: selected.baseline,
          spread: selected.spread, activeDays: selected.activeDays, activeWeeks: selected.activeWeeks,
        }] };
      } else if (current.paused) {
        next = { ...current, paused: false, pauses: current.pauses.map((period, index) =>
          index === current.pauses.length - 1 && !period.end ? { ...period, end: today } : period) };
      } else {
        next = { ...current, paused: true, pauses: [...current.pauses, { start: today, end: null }] };
      }
      await setSetting(`calibration:${selectedAxis}`, JSON.stringify(next));
      setReload(value => value + 1);
    } catch (err) {
      console.error('[StatsTab] Could not update calibration:', err);
      setCorrectionError('Could not update calibration. Please try again.');
    } finally {
      setSavingCalibration(false);
    }
  }
  return <div style={{ padding: '0 14px 24px' }}>
    <section style={card}>
      <h2 style={{ margin: '0 0 8px' }}>Your progress</h2>
      <p style={muted}>Your progress is measured against your own history, not other people. Scores are hidden while each attribute learns its normal.</p>
      <p>Last 7 days: {overview.recentCount} recorded activities. Previous 7 days: {overview.previousCount}.</p>
      <p>Consecutive recorded days: {overview.streak}. Rest days preserve the sequence.</p>
      <p style={muted}>Counts include completed habits, attributed evidence, learning practice and dated milestones. An empty day is not automatically a miss.</p>
      {overview.builtFromHistory && <p style={muted}>Your starting baseline is built from your recorded history.</p>}
    </section>

    {overview.firstWeek && <section style={card}>
      <h2>Your first-week baseline report</h2>
      <p>From {overview.firstWeek.start} to {overview.firstWeek.end}, you recorded {overview.firstWeek.activityCount} activities on {overview.firstWeek.activeDays} days.</p>
      <p>{overview.firstWeek.habitCompletions} habit completions were recorded during that week.</p>
      {overview.firstWeek.typicalLoad !== null && <p>On recorded active days, the typical load was {overview.firstWeek.typicalLoad} completed habits.</p>}
      {overview.firstWeek.frequentTime && <p>Most check-ins with a clear time were recorded in the {overview.firstWeek.frequentTime}, in your current time zone.</p>}
      {overview.firstWeek.timedCompletions >= 3 && <p>{overview.firstWeek.onTime} of {overview.firstWeek.timedCompletions} timed completions were recorded on their scheduled date, in your current time zone.</p>}
      {overview.firstWeek.recoveryDays !== null && <p>After {overview.firstWeek.recoveryCount} explicitly recorded missed {overview.firstWeek.recoveryCount === 1 ? 'occurrence' : 'occurrences'}, the typical recorded return for the same habit took {overview.firstWeek.recoveryDays} days.</p>}
      {overview.firstWeek.restDays > 0 && <p>{overview.firstWeek.restDays} rest {overview.firstWeek.restDays === 1 ? 'day was' : 'days were'} recorded and excluded from follow-through.</p>}
      <details>
        <summary>Recorded activity by day</summary>
        {overview.firstWeek.weekdays.map(day => <p key={day.date}>{day.date}: {day.count} recorded {day.count === 1 ? 'activity' : 'activities'}{day.rest ? ' · rest day' : ''}</p>)}
        <p style={muted}>This is one week of records, not a judgment about your strongest or weakest day.</p>
      </details>
      {overview.firstWeek.habitActiveDays >= 5 && overview.firstWeek.completionRate !== null &&
        <p>{Math.round(overview.firstWeek.completionRate * 100)}% follow-through among {overview.firstWeek.evaluated} evaluated occurrences; open and unknown entries are excluded.</p>}
      <p>{LIFE_DIMENSIONS.filter(axis => overview.firstWeek.credits[axis.key] > 0)
        .map(axis => `${axis.label}: ${Number(overview.firstWeek.credits[axis.key].toFixed(2))} credits`).join(' · ') || 'No attributed non-rest activity recorded in this period.'}</p>
      <p style={muted}>This is a summary of the first week, not a goal or a judgment. Credits exclude recorded rest days.</p>
    </section>}

    <section style={card}>
      <h2>Activity over the last 28 days</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
        {overview.calendar.map(day => <div key={day.date} role="img"
          aria-label={`${day.date}: ${day.rest ? 'rest day, ' : ''}${day.count} recorded activities`}
          title={`${day.date}: ${day.rest ? 'rest day, ' : ''}${day.count} recorded activities`}
          style={{ minHeight: '28px', borderRadius: '4px',
            background: day.rest ? 'var(--s2)' : day.count ? 'var(--ac)' : 'var(--hairline)' }} />)}
      </div>
      <p style={muted}>Colored days have recorded activity. Rest days are neutral; empty days do not mean missed.</p>
    </section>

    <section style={card}>
      <h2>Evidence-backed scores</h2>
      {radarReady ? <GrowthRadar axes={scoredAxes} /> :
        <p style={muted}>The radar needs at least seven days and two attributes with enough evidence for a reliable score. Unavailable attributes are not shown as zero.</p>}
      {LIFE_DIMENSIONS.map(axis => {
        const item = overview.attributes[axis.key];
        const detail = axisDetails[axis.key];
        if (item.paused || item.status === 'Calibrating') return <p key={axis.key}>{axis.label}: Learning your normal</p>;
        if (!detail || detail.warnings?.includes('projection_failed')) return <p key={axis.key}>{axis.label}: Score unavailable.</p>;
        const scored = scoredAxes.find(entry => entry.key === axis.key);
        return <p key={axis.key}>{axis.label}: {scored
          ? `${scored.value} · Evidence-backed`
          : 'Early estimate · not enough evidence for a numeric score'}</p>;
      })}
      <p style={muted}>Scores are optional estimates, not ranks or goals. Numbers require at least 80% coverage and 70% confidence; fallback estimates are not plotted.</p>
      {LIFE_DIMENSIONS.some(axis => axisDetails[axis.key]?.warnings?.includes('projection_failed')) &&
        <button type="button" onClick={onRefreshScores}>Retry scores</button>}
    </section>

    <section style={card}>
      <h2>Learning your normal</h2>
      {LIFE_DIMENSIONS.map(axis => {
        const item = overview.attributes[axis.key];
        return <button key={axis.key} type="button" onClick={() => setSelectedAxis(axis.key)}
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: '12px',
            padding: '12px 0', border: 0, borderBottom: '1px solid var(--hairline)',
            background: 'transparent', color: 'var(--tx)', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
          <span style={{ flex: 1 }}>{axis.label}
            <span style={{ display: 'block', height: '5px', marginTop: '7px', background: 'var(--hairline)', borderRadius: '4px' }}>
              <span style={{ display: 'block', height: '100%', width: `${100 * item.lifetime / (item.lifetime + 10)}%`,
                background: 'var(--ac)', borderRadius: '4px' }} />
            </span>
          </span>
          <span style={muted}>{item.paused ? 'Learning paused' : item.status === 'Calibrating' ? 'Learning your normal'
            : `${item.momentum || 'Not enough baseline yet'}${item.status === 'Provisional' ? ' · Early estimate' : ''}`}</span>
        </button>;
      })}
      <p style={muted}>Bars show cumulative credited activity, not a goal. Splits share one credit; only your chosen attributes receive it. Corrections can reduce a total, but time, rest and baseline changes cannot.</p>
      <p style={muted}>Each attribute learns independently from active days. Rest days are excluded from the comparison. Follow-through below is separate from attribute credit.</p>
      <p style={muted}>Momentum describes recorded activity, not everything you did. Unrecorded days are not marked missed.</p>
    </section>

    <section style={card}>
      <h2>Discipline</h2>
      {discipline.rate === null || discipline.activeDays < 5
        ? <p>Learning your follow-through. A rate will appear after at least five active days and an evaluated occurrence.</p>
        : <p>{Math.round(discipline.rate * 100)}% follow-through across {discipline.completed + discipline.missed} evaluated occurrences in the last seven days.</p>}
      <p style={muted}>Rest, excused, unknown, and still-open occurrences are excluded. This is information, not a grade.</p>
      {discipline.open > 0 && <p style={muted}>{discipline.open} open or unknown occurrences are not evaluated, so the rate is not a measure of every scheduled habit.</p>}
    </section>

    <section style={card}>
      <h2>Habit history</h2>
      {overview.habits.length ? overview.habits.map(habit => <details key={habit.id}>
        <summary>{habit.name}: {habit.completed} recorded completions · last {habit.lastCompleted}</summary>
        {habit.records.map(record => <p key={record.id}>{record.date}
          {record.completionVersion === 'tiny' && ` · Tiny version${record.completionVersionText ? `: ${record.completionVersionText}` : ''}`}{' '}
          <button type="button" disabled={correcting} onClick={() => correctCompletion(record)}>Correct completion</button>
        </p>)}
      </details>) : <p style={muted}>Your completed habits will appear here.</p>}
      {correctionError && <p role="alert">{correctionError}</p>}
      {overview.corrections.length > 0 && <details>
        <summary>Completion corrections</summary>
        {overview.corrections.map(correction => <p key={correction.id}>
          {correction.name}: completion for {correction.scheduledFor} removed on {correction.recordedOn}.
        </p>)}
      </details>}
      {overview.milestoneCorrections.length > 0 && <details>
        <summary>Milestone corrections</summary>
        {overview.milestoneCorrections.map(correction => <p key={correction.id}>
          {correction.name}: completion removed on {correction.recordedOn}.
        </p>)}
      </details>}
      <button type="button" onClick={onGoToToday}>Go to Today</button>
    </section>

    <BottomSheet isOpen={!!selected} onClose={() => setSelectedAxis(null)} title={name}>
      {selected && <div>
        <p>{selected.paused ? 'Learning paused' : selected.status}{selected.status === 'Provisional' && !selected.paused ? ' · Early estimate' : ''}</p>
        <p>{selected.paused ? 'Momentum is paused.' : selected.momentum || 'Learning your normal'}</p>
        <p>{selected.recorded} recorded activities across {selected.days} days.</p>
        <p>{Number(selected.lifetime.toFixed(2))} lifetime credits. A split contributes only its chosen share.</p>
        <p>{selected.completed} habit completions · {selected.notes} evidence entries · {selected.milestones} milestones</p>
        <h3>What moved it</h3>
        {selected.recentItems.length ? selected.recentItems.map((item, index) =>
          <p key={`${item.date}-${index}`}>{item.date}: {item.name} · {Math.round(item.weight * 100)}% credit</p>)
          : <p style={muted}>No attributed activity recorded yet.</p>}
        <p style={muted}>{selected.activeDays} active days across {selected.activeWeeks} active weeks used for calibration. A baseline needs earlier active weeks; it is not a target.</p>
        {selected.baseline !== null && <p style={muted}>Your prior active weeks: typical {Number(selected.baseline.toFixed(2))} credits per week, with spread {Number(selected.spread.toFixed(2))}. Recent: {Number(selected.recent.toFixed(2))} credits in seven days.</p>}
        <p style={muted}>History reflects current records and may change if an entry is corrected or undone.</p>
        <h3>Life changed?</h3>
        <p style={muted}>Pause learning during a transition or start a fresh baseline. Lifetime history stays intact. A paused day is excluded even if learning resumes that day.</p>
        <button type="button" disabled={savingCalibration} onClick={() => changeCalibration('pause')}>
          {selected.paused ? 'Resume learning' : 'Pause learning'}
        </button>{' '}
        <button type="button" disabled={savingCalibration} onClick={() => changeCalibration('reset')}>Start a fresh baseline</button>
        {(calibration[selectedAxis]?.history || []).map((entry, index) => <p key={index} style={muted}>
          Baseline saved {entry.savedOn}: {entry.baseline === null ? 'not yet established' : `${Number(entry.baseline.toFixed(2))} credits per week`}
          {' '}({entry.activeDays} active days, {entry.activeWeeks} active weeks).
        </p>)}
        {baselineHistory.some(entry => entry.axis === selectedAxis) && <details>
          <summary>Weekly baseline history</summary>
          {baselineHistory.filter(entry => entry.axis === selectedAxis)
            .sort((a, b) => b.week.localeCompare(a.week)).map(entry => <p key={`${entry.since}-${entry.week}`} style={muted}>
              Week of {entry.week}: {Number(entry.baseline.toFixed(2))} credits per week
              {' '}({entry.activeDays} active days, {entry.activeWeeks} active weeks).
            </p>)}
        </details>}
        {correctionError && <p role="alert">{correctionError}</p>}
      </div>}
    </BottomSheet>
  </div>;
}
