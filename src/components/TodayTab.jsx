import React, { useState, useCallback } from 'react';
import { formatDisplayDate } from '../helpers/dateHelpers.js';
import { getGracePrompt } from '../core/occurrenceEngine.js';
import { BottomSheet } from './ui/Overlays.jsx';
import { Button } from './ui/Buttons.jsx';
import { EmptyState } from './ui/States.jsx';
import { SegmentedBar } from './ui/Indicators.jsx';
import { Sparkle, Warning, PencilSimple } from '@phosphor-icons/react';

// Axis color map — only used as small dots per design rules
const AXIS_COLORS = {
  body:       'var(--body)',
  discipline: 'var(--discipline)',
  knowledge:  'var(--knowledge)',
  social:     'var(--social)',
  creativity: 'var(--creativity)',
  strategy:   'var(--strategy)',
};

function SquareCheckbox({ checked, onChange, disabled }) {
  return (
    <button
      aria-checked={checked}
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

function QuestRow({ occ, onComplete, onTap }) {
  const isDone = occ.status === 'completed';
  const isExcused = occ.status === 'excused';
  const axisColor = AXIS_COLORS[occ.axis?.toLowerCase()] || 'var(--mu)';
  const axisLabel = occ.axis ? (occ.axis.charAt(0).toUpperCase() + occ.axis.slice(1)) : '';

  return (
    <div
      onClick={() => onTap(occ)}
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
        onChange={e => { e.stopPropagation(); if (!isDone && !isExcused) onComplete(occ.id); }}
        disabled={isExcused}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
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
      </div>
      {/* XP is omitted until a real progression source exists. */}
      <span style={{
        fontFamily: "'Geist Mono', monospace",
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--mu)',
        flexShrink: 0,
      }}>
        {isDone ? 'Done' : ''}
      </span>
    </div>
  );
}

function MainQuestCard({ quest }) {
  if (!quest) return null;
  // Progress: use quest.progress / quest.maxProgress, clamped to 10 segments
  const filled = Math.round(Math.min(10, Math.max(0, ((quest.progress || 0) / (quest.maxProgress || 10)) * 10)));

  return (
    <div style={{
      background: 'var(--s1)',
      borderRadius: 'var(--r-container)',
      padding: '14px 16px',
      boxShadow: 'inset 0 0 0 1px var(--hairline)',
      marginTop: '16px',
    }}>
      <span style={{
        fontFamily: "'Geist Mono', monospace",
        fontSize: '11.5px',
        color: 'var(--mu)',
      }}>
        Main quest
      </span>
      <h3 style={{
        margin: '6px 0 0',
        fontSize: '18px',
        fontWeight: 600,
        letterSpacing: '-0.02em',
        color: 'var(--tx)',
      }}>
        {quest.title}
      </h3>
      <div style={{ marginTop: '10px' }}>
        <SegmentedBar value={filled} segments={10} />
      </div>
    </div>
  );
}

export default function TodayTab({
  t,
  todayOccurrences,
  onCompleteOccurrence,
  onExcuseOccurrence,
  onOccurrenceReason,
  onAddEvidence,
  allQuests,
  onGoToGoals,
  onOpenJarvis,
}) {
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [evidenceText, setEvidenceText] = useState('');
  const [evidenceAxis, setEvidenceAxis] = useState('body');
  const [evidenceType, setEvidenceType] = useState('observation');
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');

  const mainQuest = allQuests?.find(q => q.status === 'active' && q.priority === 'main')
    || allQuests?.find(q => q.status === 'active');

  const occurrences = todayOccurrences || [];
  const overloaded = occurrences.length > 6;

  const handleComplete = useCallback((id) => {
    onCompleteOccurrence(id);
  }, [onCompleteOccurrence]);

  return (
    <div style={{ padding: '0 14px 24px', display: 'flex', flexDirection: 'column' }}>

      {/* Overloaded day strip */}
      {overloaded && (
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
          <span>Heavy day. Review workload?</span>
          <button
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
            Ask Jarvis
          </button>
        </div>
      )}

      {/* Quest Log */}
      <section>
        <span style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '11.5px',
          color: 'var(--mu)',
          display: 'block',
          marginBottom: '4px',
        }}>
          Quest log
        </span>

        {occurrences.length === 0 ? (
          <EmptyState
            title="A clear day."
            description="No habits scheduled for today. Tell Jarvis what you want to focus on."
            actionLabel="Ask Jarvis"
            onAction={onOpenJarvis}
          />
        ) : (
          <div>
            {occurrences.map(occ => (
              <QuestRow
                key={occ.id}
                occ={occ}
                onComplete={handleComplete}
                onTap={setSelectedHabit}
              />
            ))}
          </div>
        )}

        {/* Main Quest Card */}
        <MainQuestCard quest={mainQuest} />

        {/* Bottom CTAs */}
        <div style={{
            display: 'flex',
            gap: '10px',
            marginTop: '20px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
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
              Log evidence
            </button>
        </div>
      </section>

      {/* Habit Detail Sheet */}
      <BottomSheet
        isOpen={!!selectedHabit}
        onClose={() => setSelectedHabit(null)}
        title={selectedHabit?.habitTitle || 'Habit Detail'}
      >
        {selectedHabit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '14px', color: 'var(--mu)', fontFamily: "'Geist Mono', monospace" }}>
              {selectedHabit.axis} • Status: {selectedHabit.status}
            </div>

            {selectedHabit.status !== 'completed' && selectedHabit.status !== 'excused' && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  variant="primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    onCompleteOccurrence(selectedHabit.id);
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

            <button
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
              Ask Jarvis about this habit
            </button>
          </div>
        )}
      </BottomSheet>

      {/* Evidence Composer Sheet */}
      <BottomSheet
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Log Evidence"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <textarea
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
              aria-label="Evidence type"
              value={evidenceType}
              onChange={e => setEvidenceType(e.target.value)}
              style={{ minHeight: '44px', padding: '0 12px', borderRadius: 'var(--r-control)', background: 'var(--s2)', color: 'var(--tx)', border: '1px solid var(--hairline)', font: 'inherit' }}
            >
              {['observation', 'result', 'reflection', 'achievement', 'failure'].map(type => (
                <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '6px', color: 'var(--mu)', fontSize: '13px' }}>
            Axis
            <select
              aria-label="Evidence axis"
              value={evidenceAxis}
              onChange={e => setEvidenceAxis(e.target.value)}
              style={{ minHeight: '44px', padding: '0 12px', borderRadius: 'var(--r-control)', background: 'var(--s2)', color: 'var(--tx)', border: '1px solid var(--hairline)', font: 'inherit' }}
            >
              {['body', 'discipline', 'knowledge', 'social', 'creativity', 'strategy'].map(axis => (
                <option key={axis} value={axis}>{axis[0].toUpperCase() + axis.slice(1)}</option>
              ))}
            </select>
          </label>
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
                  });
                } catch (err) {
                  setEvidenceError('Evidence could not be saved. Your entry is still here; try again.');
                  setSavingEvidence(false);
                  return;
                }
                setEvidenceText('');
                setComposerOpen(false);
                setSavingEvidence(false);
              }}
            >
              {savingEvidence ? 'Saving...' : 'Save evidence'}
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
