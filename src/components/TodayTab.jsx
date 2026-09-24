import React, { useState } from 'react';
import { formatDisplayDate } from '../helpers/dateHelpers.js';
import { getGracePrompt } from '../core/occurrenceEngine.js';
import { EntityRow } from './ui/Cards.jsx';
import { Checkbox } from './ui/Inputs.jsx';
import { BottomSheet } from './ui/Overlays.jsx';
import { Button, ContextualJarvisCTA } from './ui/Buttons.jsx';
import { EmptyState } from './ui/States.jsx';
import { Card } from './ui/Cards.jsx';
import { Fire, MagicWand, PencilSimple, Warning } from '@phosphor-icons/react';

export default function TodayTab({
  t,
  todayOccurrences,
  onCompleteOccurrence,
  onExcuseOccurrence,
  onOccurrenceReason,
  allQuests,
  onGoToGoals,
  onOpenJarvis
}) {
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  
  const mainQuest = allQuests?.find(q => q.status === 'active' && q.priority === 'main') || allQuests?.find(q => q.status === 'active');
  const occurrences = todayOccurrences || [];

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {mainQuest && (
        <section>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--mu)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>
            Current Focus
          </div>
          <Card onClick={onGoToGoals} style={{ border: '1px solid var(--ac)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600 }}>{mainQuest.title}</h3>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--mu)' }}>
                  {mainQuest.axis} • {mainQuest.progress}/{mainQuest.maxProgress}
                </div>
              </div>
              <Fire size={24} color="var(--ac)" weight="fill" />
            </div>
          </Card>
        </section>
      )}

      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Today's Routines
          </div>
        </div>

        {occurrences.length > 5 && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            backgroundColor: 'rgba(224, 118, 58, 0.1)', 
            color: 'var(--ac)', 
            padding: '10px 12px', 
            borderRadius: 'var(--r-control)',
            marginBottom: '16px',
            fontSize: '13px',
            fontWeight: 500
          }}>
            <Warning size={16} />
            This is a heavy day. Consider skipping non-essentials.
          </div>
        )}

        {occurrences.length === 0 ? (
          <EmptyState 
            title="A clear day."
            description="You have no habits scheduled for today."
            actionLabel="Review Goals"
            onAction={onGoToGoals}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {occurrences.map(occ => {
              const isDone = occ.status === 'completed';
              const isExcused = occ.status === 'excused';
              
              const labelParts = [];
              if (occ.axis) labelParts.push(occ.axis);
              labelParts.push('+10 xp'); // per mockup
              if (occ.streak && occ.streak > 1) labelParts.push(`${occ.streak}-day run`);
              
              const gracePrompt = getGracePrompt(occ.status, occ.graceState);
              if (gracePrompt) labelParts.push(gracePrompt);

              return (
                <EntityRow
                  key={occ.id}
                  title={<span style={{ textDecoration: isExcused ? 'line-through' : 'none', opacity: isExcused ? 0.6 : 1 }}>{occ.habitTitle || 'Habit'}</span>}
                  label={labelParts.join(' • ')}
                  onClick={() => setSelectedHabit(occ)}
                  rightElement={
                    <Checkbox 
                      checked={isDone} 
                      onChange={() => {
                        if (isDone) {
                          // optimistically revert
                          if (occ.reason) onOccurrenceReason(occ.id, null); 
                        } else {
                          onCompleteOccurrence(occ.id);
                        }
                      }}
                      disabled={isExcused}
                    />
                  }
                />
              );
            })}
          </div>
        )}
        
        {occurrences.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
            <Button 
              variant="secondary" 
              onClick={() => setComposerOpen(true)}
              style={{ display: 'flex', gap: '8px' }}
            >
              <PencilSimple size={18} />
              Log Evidence
            </Button>
            <ContextualJarvisCTA 
              label="Adjust today's routine" 
              contextIcon={<MagicWand size={18} weight="fill" />} 
              onClick={() => {/* will be wired to open Jarvis with context */}}
            />
          </div>
        )}
      </section>

      {/* Habit Detail Sheet */}
      <BottomSheet 
        isOpen={!!selectedHabit} 
        onClose={() => setSelectedHabit(null)} 
        title={selectedHabit?.habitTitle || 'Habit Detail'}
      >
        {selectedHabit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '14.5px', color: 'var(--mu)' }}>
              Status: {selectedHabit.status}
            </div>
            
            {selectedHabit.status !== 'completed' && selectedHabit.status !== 'excused' && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
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
          </div>
        )}
      </BottomSheet>

      {/* Evidence Composer Sheet */}
      <BottomSheet
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Log Evidence"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <textarea 
            placeholder="What did you do?" 
            style={{ 
              width: '100%', minHeight: '100px', padding: '12px', 
              borderRadius: 'var(--r-control)', border: '1px solid var(--hairline)',
              backgroundColor: 'var(--bg)', color: 'var(--tx)', fontFamily: 'inherit',
              resize: 'none'
            }}
          />
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="primary" style={{ flex: 1 }} onClick={() => setComposerOpen(false)}>Save</Button>
            <Button variant="secondary" onClick={() => setComposerOpen(false)}>Cancel</Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
