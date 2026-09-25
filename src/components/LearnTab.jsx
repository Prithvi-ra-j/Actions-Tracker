import React, { useState } from 'react';
import { BottomSheet } from './ui/Overlays.jsx';
import { Button } from './ui/Buttons.jsx';
import { EmptyState } from './ui/States.jsx';
import { SegmentedBar } from './ui/Indicators.jsx';
import { Sparkle, Plus } from '@phosphor-icons/react';

const AXIS_COLORS = {
  knowledge:  'var(--knowledge)',
  creativity: 'var(--creativity)',
  strategy:   'var(--strategy)',
  body:       'var(--body)',
  discipline: 'var(--discipline)',
  social:     'var(--social)',
};

// 5-step loop for the topic sheet
const LOOP_STEPS = ['Learn', 'Practice', 'Apply', 'Evidence', 'Review'];

function TopicCard({ topic, stepIndex, onClick }) {
  const axisKey = (topic.tags?.[0] || 'Knowledge').toLowerCase();
  const axisColor = AXIS_COLORS[axisKey] || 'var(--knowledge)';
  const axisLabel = topic.tags?.[0] || 'Knowledge';
  const currentStep = LOOP_STEPS[stepIndex] || LOOP_STEPS[0];

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--s1)',
        borderRadius: 'var(--r-container)',
        padding: '14px 16px',
        marginBottom: '10px',
        boxShadow: 'inset 0 0 0 1px var(--hairline)',
        cursor: 'pointer',
        transition: 'transform 0.12s',
      }}
      onPointerDown={e => e.currentTarget.style.transform = 'scale(0.99)'}
      onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
      onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {/* Top row: axis dot + label, right-aligned step tag */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '11.5px',
          color: 'var(--mu)',
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
        {/* Accent-outlined step tag — per register: omit if loop-step tag has no source; show as present (it's a local concept) */}
        <span style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '10.5px',
          fontWeight: 500,
          color: 'var(--ac)',
          padding: '3px 8px',
          borderRadius: '8px',
          boxShadow: 'inset 0 0 0 1px var(--ac)',
        }}>
          {currentStep}
        </span>
      </div>

      {/* Title */}
      <h3 style={{
        margin: '6px 0 2px',
        fontSize: '17px',
        fontWeight: 600,
        letterSpacing: '-0.02em',
        color: 'var(--tx)',
      }}>
        {topic.concept}
      </h3>

      {/* Objective */}
      <p style={{
        margin: 0,
        fontSize: '12.5px',
        color: 'var(--mu)',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {topic.whyItMatters || 'No objective set'}
      </p>

      {/* 10-segment progress bar */}
      <div style={{ marginTop: '10px' }}>
        <SegmentedBar value={stepIndex + 1} segments={10} />
      </div>
    </div>
  );
}

function TopicSheet({ topic, onClose, onOpenJarvis }) {
  const [practiceLogged, setPracticeLogged] = useState(false);
  const axisKey = (topic.tags?.[0] || 'Knowledge').toLowerCase();
  const axisColor = AXIS_COLORS[axisKey] || 'var(--knowledge)';
  const axisLabel = topic.tags?.[0] || 'Knowledge';
  const currentStepIndex = 1; // "Practice" — would come from learning state in domain

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{
        fontFamily: "'Geist Mono', monospace",
        fontSize: '11.5px',
        color: 'var(--mu)',
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

      <div>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 600, letterSpacing: '-0.02em' }}>
          {topic.concept}
        </h2>
        {topic.whyItMatters && (
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--mu)' }}>
            Objective: {topic.whyItMatters}
          </p>
        )}
      </div>

      {/* 5-step loop strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '4px',
      }}>
        {LOOP_STEPS.map((step, i) => {
          const isDone = i < currentStepIndex;
          const isCurrent = i === currentStepIndex;
          return (
            <div key={step} style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: '10.5px',
              color: isDone ? 'var(--tx)' : isCurrent ? 'var(--ac)' : 'var(--mu)',
              paddingTop: '8px',
              borderTop: `3px solid ${isDone ? 'var(--tx)' : isCurrent ? 'var(--ac)' : 'var(--hairline)'}`,
              fontWeight: isCurrent ? 600 : 400,
            }}>
              {step}
            </div>
          );
        })}
      </div>

      {/* Resources */}
      <div>
        <div style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '11.5px',
          color: 'var(--mu)',
          margin: '4px 0 8px',
        }}>
          Resources
        </div>
        <div style={{
          borderRadius: 'var(--r-container)',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 0 1px var(--hairline)',
          background: 'var(--s1)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            minHeight: '52px',
            padding: '0 14px',
            fontSize: '14.5px',
            fontWeight: 500,
            color: 'var(--mu)',
          }}>
            No resources linked
          </div>
        </div>
      </div>

      {/* Today's practice card */}
      <div style={{
        background: 'var(--s1)',
        borderRadius: 'var(--r-container)',
        padding: '12px 14px',
        boxShadow: 'inset 0 0 0 1px var(--hairline)',
      }}>
        <span style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '11.5px',
          color: 'var(--mu)',
        }}>
          Today's practice
        </span>
        <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--tx)', lineHeight: 1.5 }}>
          Apply what you've learned to a real example. Note any gaps.
        </p>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <Button
          variant="primary"
          style={{ flex: 1 }}
          onClick={() => { setPracticeLogged(true); onClose(); }}
        >
          {practiceLogged ? 'Practice logged ✓' : 'Log practice'}
        </Button>
        <Button
          variant="secondary"
          style={{ flex: 1 }}
          onClick={() => { onClose(); onOpenJarvis?.(); }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkle size={16} />
            Ask Jarvis
          </span>
        </Button>
      </div>
    </div>
  );
}

export default function LearnTab({ t, learnings = [], onAddLearning, onOpenJarvis }) {
  const [sheet, setSheet] = useState(null);
  const [topic, setTopic] = useState('');
  const [objective, setObjective] = useState('');
  const [axis, setAxis] = useState('Knowledge');

  const axes = ['Knowledge', 'Creativity', 'Strategy', 'Body', 'Discipline', 'Social'];

  function handleCreateTopic() {
    if (!topic.trim()) return;
    onAddLearning?.({
      concept: topic,
      whyItMatters: objective,
      tags: [axis],
      sourceType: 'other',
    });
    setSheet(null);
    setTopic('');
    setObjective('');
    setAxis('Knowledge');
  }

  return (
    <div style={{ padding: '0 14px 24px' }}>

      {learnings.length === 0 ? (
        <>
          <div style={{ height: '16px' }} />
          <EmptyState
            title="No active topics."
            description="Create a topic to track your learning loop — Learn, Practice, Apply, Evidence, Review."
            actionLabel="Add topic"
            onAction={() => setSheet({ type: 'create' })}
          />
        </>
      ) : (
        <>
          {/* Add topic button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button
              onClick={() => setSheet({ type: 'create' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '36px',
                padding: '0 14px',
                borderRadius: 'var(--r-control)',
                background: 'var(--s2)',
                border: '1px solid var(--hairline)',
                color: 'var(--tx)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              Add topic
            </button>
          </div>

          {learnings.map((item, idx) => (
            <TopicCard
              key={idx}
              topic={item}
              stepIndex={Math.min(idx, 4)}
              onClick={() => setSheet({ type: 'detail', topic: item })}
            />
          ))}
        </>
      )}

      {/* Create topic sheet */}
      <BottomSheet
        isOpen={sheet?.type === 'create'}
        onClose={() => setSheet(null)}
        title="New topic"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--mu)', margin: '0 0 6px' }}>Topic</div>
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="German B2"
            style={{
              width: '100%',
              minHeight: '48px',
              padding: '0 14px',
              borderRadius: 'var(--r-control)',
              background: 'var(--s2)',
              border: '1px solid var(--hairline)',
              color: 'var(--tx)',
              fontFamily: "'Geist Mono', monospace",
              fontSize: '13px',
              outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--ac)'}
            onBlur={e => e.target.style.borderColor = 'var(--hairline)'}
          />

          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--mu)', margin: '14px 0 6px' }}>Objective</div>
          <input
            value={objective}
            onChange={e => setObjective(e.target.value)}
            placeholder="Pass the mock exam by March"
            style={{
              width: '100%',
              minHeight: '48px',
              padding: '0 14px',
              borderRadius: 'var(--r-control)',
              background: 'var(--s2)',
              border: '1px solid var(--hairline)',
              color: 'var(--tx)',
              fontFamily: "'Geist Mono', monospace",
              fontSize: '13px',
              outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--ac)'}
            onBlur={e => e.target.style.borderColor = 'var(--hairline)'}
          />

          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--mu)', margin: '14px 0 6px' }}>Axis</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
            {axes.map(a => (
              <button
                key={a}
                onClick={() => setAxis(a)}
                style={{
                  minHeight: '44px',
                  padding: '0 14px',
                  borderRadius: 'var(--r-chip)',
                  background: axis === a ? 'color-mix(in srgb, var(--ac) 18%, var(--s1))' : 'var(--s1)',
                  boxShadow: axis === a ? 'inset 0 0 0 1.5px var(--ac)' : 'inset 0 0 0 1px var(--hairline)',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: 'none',
                  color: axis === a ? 'var(--ac)' : 'var(--tx)',
                  transition: 'all 0.2s',
                }}
              >
                {a}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="primary" style={{ flex: 1 }} onClick={handleCreateTopic}>
              Save topic
            </Button>
            <Button variant="secondary" onClick={() => { setSheet(null); onOpenJarvis?.(); }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkle size={16} />
                Ask Jarvis
              </span>
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Topic detail sheet */}
      <BottomSheet
        isOpen={sheet?.type === 'detail'}
        onClose={() => setSheet(null)}
      >
        {sheet?.topic && (
          <TopicSheet
            topic={sheet.topic}
            onClose={() => setSheet(null)}
            onOpenJarvis={onOpenJarvis}
          />
        )}
      </BottomSheet>
    </div>
  );
}
