import React, { useState, useCallback, useEffect } from 'react';
import { formatDisplayDate, localDateStr, subtractDays } from '../helpers/dateHelpers.js';
import { dbGetAll } from '../database/db.js';
import { getAllSettings, setSetting } from '../database/settingsRepository.js';
import { getGracePrompt } from '../core/occurrenceEngine.js';
import { BottomSheet } from './ui/Overlays.jsx';
import { Button } from './ui/Buttons.jsx';
import { EmptyState } from './ui/States.jsx';
import HabitEditor from './HabitEditor.jsx';
import AttributionFields from './AttributionFields.jsx';
import { Sparkle, Warning, PencilSimple } from '@phosphor-icons/react';
import { attributeLabel } from '../constants.js';

// Axis color map — only used as small dots per design rules
const AXIS_COLORS = {
  body:       'var(--body)',
  discipline: 'var(--discipline)',
  knowledge:  'var(--knowledge)',
  social:     'var(--social)',
  creativity: 'var(--creativity)',
  strategy:   'var(--strategy)',
};

function SquareCheckbox({ checked, onChange, disabled, label }) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      role="checkbox"
      onClick={!disabled ? onChange : undefined}
      disabled={disabled}
      style={{
        width: '24px',
        height: '24px',
        borderRadius: 'var(--r-check)',
        border: 'none',
        background: checked ? 'var(--ac)' : 'transparent',
        boxShadow: checked ? 'none' : 'inset 0 0 0 2px var(--mu)',
        color: 'var(--on-ac)',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.2s, box-shadow 0.2s, transform 0.12s',
        padding: 0,
      }}
      onPointerDown={e => !disabled && (e.currentTarget.style.transform = 'scale(0.88)')}
      onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
      onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {checked && (
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
          <path d="M1 5l3.5 3.5L11 1" stroke="var(--on-ac)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

function QuestRow({ occ, onComplete, onTap, showDate = false, tinyVersion = '' }) {
  const isDone = occ.status === 'completed';
  const isExcused = occ.status === 'excused';
  const axisColor = AXIS_COLORS[occ.axis?.toLowerCase()] || 'var(--mu)';
  const axisLabel = occ.axis ? attributeLabel(occ.axis) : '';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minHeight: '56px',
        borderBottom: '1px solid var(--hairline)',
        cursor: 'pointer',
        opacity: isExcused ? 0.5 : 1,
      }}
    >
      <SquareCheckbox
        checked={isDone}
        label={`${isDone ? 'Completed' : 'Complete'} ${occ.habitTitle || 'habit'}`}
        onChange={e => { e.stopPropagation(); if (!isDone && !isExcused) onComplete(occ.id); }}
        disabled={isExcused || isDone}
      />
      <button type="button" onClick={() => onTap(occ)} style={{
        flex: 1, minWidth: 0, padding: '8px 0', textAlign: 'left',
        border: 0, background: 'transparent', color: 'var(--tx)', font: 'inherit', cursor: 'pointer',
      }}>
        <div style={{
          fontSize: '15px',
          fontWeight: 500,
          color: 'var(--tx)',
          textDecoration: (isDone || isExcused) ? 'line-through' : 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {occ.habitTitle || 'Habit'}
        </div>
        {showDate && (
          <div style={{ fontSize: '12px', color: 'var(--mu)' }}>
            {formatDisplayDate(occ.scheduledFor.split('T')[0])}
          </div>
        )}
        {tinyVersion && !isDone && !isExcused && <div style={{ fontSize: '12px', color: 'var(--mu)' }}>
          Tiny version: {tinyVersion}
        </div>}
        {isDone && occ.completionVersion === 'tiny' && <div style={{ fontSize: '12px', color: 'var(--mu)' }}>Tiny version completed</div>}
        {axisLabel && (
          <div style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11.5px',
            color: 'var(--mu)',
            marginTop: '1px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: axisColor, display: 'inline-block', flexShrink: 0,
            }} />
            {axisLabel}
          </div>
        )}
      </button>
      {/* XP is omitted until a real progression source exists. */}
      <span style={{
        fontFamily: "'Geist Mono', monospace",
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--mu)',
        flexShrink: 0,
      }}>
        {isDone ? 'Done' : isExcused ? occ.reason === 'rest_day' ? 'Rested' : 'Excused' : ''}
      </span>
    </div>
  );
}

export default function TodayTab({
  t,
  today = localDateStr(),
  todayOccurrences,
  onCompleteOccurrence,
  onExcuseOccurrence,
  onOccurrenceReason,
  onAddEvidence,
  onAddHabit,
  habits = [],
  onUpdateHabit,
  onRestDay,
  onOpenJarvis,
}) {
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [evidenceText, setEvidenceText] = useState('');
  const [evidenceAxis, setEvidenceAxis] = useState('body');
  const [evidenceSecondary, setEvidenceSecondary] = useState('');
  const [evidenceShare, setEvidenceShare] = useState(50);
  const [evidenceType, setEvidenceType] = useState('observation');
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');
  const [habitComposerOpen, setHabitComposerOpen] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [habitDomain, setHabitDomain] = useState('general');
  const [habitSecondary, setHabitSecondary] = useState('');
  const [habitShare, setHabitShare] = useState(50);
  const [savingHabit, setSavingHabit] = useState(false);
  const [habitError, setHabitError] = useState('');
  const [habitNotice, setHabitNotice] = useState('');
  const [managerOpen, setManagerOpen] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [usualLoad, setUsualLoad] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loadRetry, setLoadRetry] = useState(0);
  const [tinyMode, setTinyMode] = useState(false);
  const [tinyBusy, setTinyBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadUsual() {
      try {
        const [history, settings] = await Promise.all([dbGetAll('habitOccurrences'), getAllSettings()]);
        const restDates = new Set(Object.keys(settings).filter(key => key.startsWith('restDay:') && settings[key] === 'true')
          .map(key => key.slice('restDay:'.length)));
        if (settings.restDay) restDates.add(settings.restDay);
        for (const occurrence of history) {
          if (occurrence.reason === 'rest_day') restDates.add(occurrence.scheduledFor.split('T')[0]);
        }
        const days = new Map();
        for (const occurrence of history) {
          const date = occurrence.scheduledFor.split('T')[0];
          if (occurrence.status !== 'completed' || date < subtractDays(today, 28) || date >= today || restDates.has(date)) continue;
          days.set(date, (days.get(date) || 0) + 1);
        }
        const values = [...days.values()].sort((a, b) => a - b);
        const mid = Math.floor(values.length / 2);
        const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
        if (!cancelled) {
          setUsualLoad(values.length >= 5 ? median : null);
          setTinyMode(settings[`tinyDay:${today}`] === 'true');
          setLoadError('');
        }
      } catch (error) {
        console.error('[TodayTab] Could not load usual habit load:', error);
        if (!cancelled) setLoadError('Could not load your usual habit load.');
      }
    }
    loadUsual();
    return () => { cancelled = true; };
  }, [today, todayOccurrences, loadRetry]);

  const occurrences = (todayOccurrences || []).filter(occ =>
    occ.scheduledFor.split('T')[0] === today && occ.reason !== 'schedule_changed');
  const earlierOccurrences = (todayOccurrences || []).filter(occ => {
    const date = occ.scheduledFor.split('T')[0];
    return date < today && (occ.status === 'expected' || occ.status === 'unknown');
  });
  const planned = occurrences.filter(occ => occ.status !== 'excused').length;
  const loadLabel = usualLoad === null ? null : planned > usualLoad * 1.5 ? 'Heavy' : planned < usualLoad * 0.5 ? 'Light' : 'Typical';
  const allDone = occurrences.length > 0 && occurrences.every(occ => ['completed', 'excused'].includes(occ.status));

  const handleComplete = useCallback((id) => {
    const occurrence = (todayOccurrences || []).find(item => item.id === id);
    onCompleteOccurrence(id, { tiny: tinyMode && occurrence?.scheduledFor.split('T')[0] === today });
  }, [onCompleteOccurrence, tinyMode, today, todayOccurrences]);

  async function changeTinyMode() {
    setTinyBusy(true);
    setLoadError('');
    try {
      await setSetting(`tinyDay:${today}`, !tinyMode);
      setTinyMode(!tinyMode);
    } catch (error) {
      console.error('[TodayTab] Could not update tiny versions:', error);
      setLoadError('Could not change your plan. Please try again.');
    } finally {
      setTinyBusy(false);
    }
  }

  return (
    <div style={{ padding: '0 14px 24px', display: 'flex', flexDirection: 'column' }}>

      {loadError && <p role="alert">{loadError} <button type="button" onClick={() => setLoadRetry(value => value + 1)}>Retry</button></p>}
      {loadLabel && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: 'var(--r-control)',
          background: 'color-mix(in srgb, var(--ac) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--ac) 30%, transparent)',
          marginBottom: '12px',
          fontSize: '13px',
          color: 'var(--ac)',
          fontWeight: 500,
        }}>
          <Warning size={16} weight="fill" />
          <span>{loadLabel} plan compared with your recorded active days.</span>
          {onOpenJarvis && <button
            onClick={onOpenJarvis}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'var(--ac)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Ask Ved
          </button>}
        </div>
      )}
      {loadLabel === 'Heavy' && <details style={{ marginBottom: '12px' }}>
        <summary>See tiny versions</summary>
        {habits.filter(habit => habit.tinyVersion && occurrences.some(occ => occ.habitId === habit.id && occ.status !== 'excused'))
          .map(habit => <p key={habit.id}>{habit.name}: {habit.tinyVersion}</p>)}
        {!habits.some(habit => habit.tinyVersion && occurrences.some(occ => occ.habitId === habit.id && occ.status !== 'excused')) &&
          <p>Set a tiny version in Manage habits, or take a rest day if you need one.</p>}
      </details>}
      {(loadLabel === 'Heavy' || tinyMode) && <button type="button" disabled={tinyBusy} onClick={changeTinyMode}
        style={{ marginBottom: '12px', alignSelf: 'flex-start' }}>
        {tinyMode ? 'Use regular versions today' : 'Use tiny versions today'}
      </button>}

      {/* Quest Log */}
      <section>
        <span style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '11.5px',
          color: 'var(--mu)',
          display: 'block',
          marginBottom: '4px',
        }}>
          Today's habits
        </span>

        {occurrences.length === 0 ? (
          <EmptyState
            eyebrow="A fresh start"
            title="Make room for one good thing."
            description="Nothing scheduled today. Start with a small habit you can come back to."
            example="Try: a 10-minute walk after lunch."
            actionLabel="Add habit"
            actionVariant="primary"
            onAction={() => setHabitComposerOpen(true)}
          />
        ) : (
          <div>
            {allDone && <p role="status">All done for today. Rest is part of discipline.</p>}
            {[
              ['morning', 'Morning'], ['afternoon', 'Afternoon'],
              ['evening', 'Evening'], ['other', 'Any time'],
            ].map(([slot, label]) => {
              const group = occurrences.filter(occ => slot === 'other'
                ? !['morning', 'afternoon', 'evening'].includes(occ.timeSlot)
                : occ.timeSlot === slot);
              if (!group.length) return null;
              return <div key={slot}>
                <h3 style={{ fontSize: '13px', color: 'var(--mu)', margin: '14px 0 2px' }}>{label}</h3>
                {group.map(occ => (
                  <QuestRow key={occ.id} occ={occ} onComplete={handleComplete} onTap={setSelectedHabit}
                    tinyVersion={tinyMode ? habits.find(habit => habit.id === occ.habitId)?.tinyVersion : ''} />
                ))}
              </div>;
            })}
          </div>
        )}

        {earlierOccurrences.length > 0 && (
          <details style={{ marginTop: '16px', color: 'var(--mu)' }}>
            <summary style={{ cursor: 'pointer', fontSize: '13px' }}>Earlier occurrences</summary>
            {earlierOccurrences.map(occ => (
              <QuestRow
                key={occ.id}
                occ={occ}
                showDate
                onComplete={handleComplete}
                onTap={setSelectedHabit}
              />
            ))}
          </details>
        )}

        {habitNotice && <p role="alert" style={{ color: 'var(--danger)', fontSize: '13px' }}>{habitNotice}</p>}

        {/* Bottom CTAs */}
        <div style={{
            display: 'flex',
            gap: '10px',
            marginTop: '20px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            {occurrences.length > 0 && (
              <Button variant="primary" onClick={() => setHabitComposerOpen(true)}>Add habit</Button>
            )}
            <Button variant="secondary" onClick={() => { setEditingHabitId(null); setManagerOpen(true); }}>Manage habits</Button>
            <Button variant="secondary" onClick={onRestDay}>Rest day</Button>
            <span style={{ alignSelf: 'center', color: 'var(--mu)', fontSize: '13px' }}>Rest is part of discipline.</span>
            <button
              onClick={() => setComposerOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                height: '44px',
                padding: '0 18px',
                borderRadius: 'var(--r-control)',
                background: 'var(--s2)',
                color: 'var(--tx)',
                border: 'none',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'transform 0.12s',
              }}
              onPointerDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
              onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <PencilSimple size={16} />
              Log a note
            </button>
        </div>
      </section>

      <HabitEditor habits={habits} open={managerOpen} selectedId={editingHabitId} onSelect={setEditingHabitId}
        onSave={onUpdateHabit} onClose={() => { setManagerOpen(false); setEditingHabitId(null); }} />

      <BottomSheet
        isOpen={habitComposerOpen}
        onClose={() => { if (!savingHabit) setHabitComposerOpen(false); }}
        title="Add daily habit"
      >
        <form
          onSubmit={async e => {
            e.preventDefault();
            if (!habitName.trim() || habitDomain === 'general' || savingHabit) return;
            setSavingHabit(true);
            setHabitError('');
            try {
              const notice = await onAddHabit({ name: habitName.trim(), domain: habitDomain,
                secondaryDomain: habitSecondary || null, primaryShare: habitSecondary ? habitShare : 100 });
              setHabitName('');
              setHabitDomain('general');
              setHabitSecondary('');
              setHabitShare(50);
              setHabitNotice(notice || '');
              setHabitComposerOpen(false);
            } catch (error) {
              console.error('[TodayTab] Could not save habit:', error);
              setHabitError('Habit could not be saved. Your entry is still here; try again.');
            } finally {
              setSavingHabit(false);
            }
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <label style={{ display: 'grid', gap: '6px', color: 'var(--mu)', fontSize: '13px' }}>
            Habit name
            <input
              value={habitName}
              onChange={e => setHabitName(e.target.value)}
              maxLength={120}
              required
              style={{ minHeight: '44px', padding: '0 12px', borderRadius: 'var(--r-control)', background: 'var(--s2)', color: 'var(--tx)', border: '1px solid var(--hairline)', font: 'inherit' }}
            />
          </label>
          <AttributionFields primary={habitDomain} secondary={habitSecondary} share={habitShare}
            onPrimary={setHabitDomain} onSecondary={setHabitSecondary} onShare={setHabitShare} />
          <p style={{ margin: 0, color: 'var(--mu)', fontSize: '13px' }}>Scheduled every day.</p>
          {habitError && <p role="alert" style={{ margin: 0, color: 'var(--danger)', fontSize: '13px' }}>{habitError}</p>}
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button type="submit" style={{ flex: 1 }} disabled={savingHabit || !habitName.trim() || habitDomain === 'general'}>
              {savingHabit ? 'Saving...' : 'Create habit'}
            </Button>
            <Button type="button" variant="secondary" disabled={savingHabit} onClick={() => setHabitComposerOpen(false)}>Cancel</Button>
          </div>
        </form>
      </BottomSheet>

      {/* Habit Detail Sheet */}
      <BottomSheet
        isOpen={!!selectedHabit}
        onClose={() => setSelectedHabit(null)}
        title={selectedHabit?.habitTitle || 'Habit Detail'}
      >
        {selectedHabit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '14px', color: 'var(--mu)', fontFamily: "'Geist Mono', monospace" }}>
              {attributeLabel(selectedHabit.axis)} • Status: {selectedHabit.status}
            </div>
            {selectedHabit.timeSlot && <div>Preferred time: {attributeLabel(selectedHabit.timeSlot)}</div>}
            {habits.find(habit => habit.id === selectedHabit.habitId)?.tinyVersion &&
              <div>Tiny version: {habits.find(habit => habit.id === selectedHabit.habitId).tinyVersion}</div>}
            {habits.some(habit => habit.id === selectedHabit.habitId) && <Button variant="secondary" onClick={() => {
              setEditingHabitId(selectedHabit.habitId);
              setSelectedHabit(null);
              setManagerOpen(true);
            }}>Edit habit</Button>}
            {getGracePrompt(selectedHabit.status, selectedHabit.graceState) && (
              <div style={{ fontSize: '13px', color: 'var(--mu)' }}>
                {getGracePrompt(selectedHabit.status, selectedHabit.graceState)}
              </div>
            )}

            {selectedHabit.status !== 'completed' && selectedHabit.status !== 'excused' && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  variant="primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    handleComplete(selectedHabit.id);
                    setSelectedHabit(null);
                  }}
                >
                  Complete
                </Button>
                <Button
                  variant="secondary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    const reason = prompt('Reason for skipping?');
                    if (reason) {
                      onExcuseOccurrence(selectedHabit.id, reason);
                      setSelectedHabit(null);
                    }
                  }}
                >
                  Skip
                </Button>
              </div>
            )}

            {selectedHabit.status === 'unknown' && selectedHabit.graceState === 'grace_expired' && (
              <Button
                variant="destructive"
                onClick={() => {
                  const reason = prompt('What got in the way?');
                  if (reason) {
                    onOccurrenceReason(selectedHabit.id, reason);
                    setSelectedHabit(null);
                  }
                }}
              >
                Log missing reason
              </Button>
            )}

            {onOpenJarvis && <button
              onClick={() => {
                setSelectedHabit(null);
                onOpenJarvis?.({
                  page: 'today',
                  entityType: 'habit',
                  entityId: selectedHabit.id,
                  payload: { habitTitle: selectedHabit.habitTitle, axis: selectedHabit.axis },
                });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '44px',
                borderRadius: 'var(--r-control)',
                background: 'transparent',
                border: '1px solid var(--hairline)',
                color: 'var(--mu)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Sparkle size={16} />
              Ask Ved about this habit
            </button>}
          </div>
        )}
      </BottomSheet>

      {/* Evidence Composer Sheet */}
      <BottomSheet
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Log a note"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <textarea
            aria-label="Your note"
            value={evidenceText}
            onChange={e => setEvidenceText(e.target.value)}
            placeholder="What did you do? What did you notice?"
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '14px',
              borderRadius: 'var(--r-control)',
              border: '1px solid var(--hairline)',
              backgroundColor: 'var(--s2)',
              color: 'var(--tx)',
              fontFamily: 'inherit',
              fontSize: '14.5px',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.5,
            }}
            onFocus={e => e.target.style.borderColor = 'var(--ac)'}
            onBlur={e => e.target.style.borderColor = 'var(--hairline)'}
          />
          <label style={{ display: 'grid', gap: '6px', color: 'var(--mu)', fontSize: '13px' }}>
            Type
            <select
              aria-label="Note type"
              value={evidenceType}
              onChange={e => setEvidenceType(e.target.value)}
              style={{ minHeight: '44px', padding: '0 12px', borderRadius: 'var(--r-control)', background: 'var(--s2)', color: 'var(--tx)', border: '1px solid var(--hairline)', font: 'inherit' }}
            >
              {['observation', 'result', 'reflection', 'achievement', 'failure'].map(type => (
                <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>
              ))}
            </select>
          </label>
          <AttributionFields primary={evidenceAxis} secondary={evidenceSecondary} share={evidenceShare}
            onPrimary={setEvidenceAxis} onSecondary={setEvidenceSecondary} onShare={setEvidenceShare} />
          {evidenceError && <p role="alert" style={{ margin: 0, color: 'var(--danger)', fontSize: '13px' }}>{evidenceError}</p>}
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="primary"
              style={{ flex: 1 }}
              disabled={savingEvidence || !evidenceText.trim()}
              onClick={async () => {
                if (!evidenceText.trim() || !onAddEvidence) return;
                setSavingEvidence(true);
                setEvidenceError('');
                try {
                  await onAddEvidence({
                    content: evidenceText.trim(),
                    axis: evidenceAxis,
                    evidenceType,
                    secondary: evidenceSecondary || null,
                    primaryShare: evidenceSecondary ? evidenceShare : 100,
                  });
                } catch (err) {
                  setEvidenceError('Your note could not be saved. Your entry is still here; try again.');
                  setSavingEvidence(false);
                  return;
                }
                setEvidenceText('');
                setEvidenceSecondary('');
                setEvidenceShare(50);
                setComposerOpen(false);
                setSavingEvidence(false);
              }}
            >
              {savingEvidence ? 'Saving...' : 'Save note'}
            </Button>
            <Button variant="secondary" onClick={() => setComposerOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
