import React, { useState, useEffect } from 'react';
import { BottomSheet, ConfirmDialog } from './ui/Overlays.jsx';
import { Button, IconButton } from './ui/Buttons.jsx';
import { EmptyState } from './ui/States.jsx';
import { SegmentedBar } from './ui/Indicators.jsx';
import { EntityRow } from './ui/Cards.jsx';
import { Checkbox } from './ui/Inputs.jsx';
import { Sparkle, PencilSimple, Plus } from '@phosphor-icons/react';
import { EvidenceSheet } from './EvidenceSheet.jsx';

// Axis dot color map (dots only, per design rules)
const AXIS_COLORS = {
  body:       'var(--body)',
  discipline: 'var(--discipline)',
  knowledge:  'var(--knowledge)',
  social:     'var(--social)',
  creativity: 'var(--creativity)',
  strategy:   'var(--strategy)',
};

function GoalCard({ goal, onClick }) {
  const totalTargets = goal.targets?.length || 0;
  const doneTargets = goal.targets?.filter(t => t.completed)?.length || 0;
  const progress = totalTargets > 0 ? Math.round((doneTargets / totalTargets) * 10) : 0;
  const axisColor = AXIS_COLORS[goal.domain?.toLowerCase()] || 'var(--mu)';
  const axisLabel = goal.domain
    ? goal.domain.charAt(0).toUpperCase() + goal.domain.slice(1)
    : 'General';

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
      {/* Mono label: "Main quest, Body" */}
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
        Goal, {axisLabel}
      </div>

      {/* Title */}
      <h3 style={{
        margin: '6px 0 2px',
        fontSize: '18px',
        fontWeight: 600,
        letterSpacing: '-0.02em',
        color: 'var(--tx)',
      }}>
        {goal.label}
      </h3>

      {/* Meta line */}
      <p style={{
        margin: 0,
        fontSize: '12.5px',
        color: 'var(--mu)',
        lineHeight: 1.4,
      }}>
        {totalTargets > 0 ? `${doneTargets}/${totalTargets} milestones` : 'No milestones yet'}
      </p>

      {/* 10-segment bar */}
      <div style={{ marginTop: '10px' }}>
        <SegmentedBar value={progress} segments={10} />
      </div>
    </div>
  );
}

export default function GoalsTab({ t, onOpenJarvis }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editError, setEditError] = useState('');
  const [goalDraft, setGoalDraft] = useState({ label: '', domain: 'body', start: '', end: '', proof: '', targets: '' });

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    try {
      const { getAllGoals } = await import('../database/goalsRepository.js');
      const data = await getAllGoals();
      setGoals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleTarget(goalId, targetIndex) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const newTargets = [...goal.targets];
    newTargets[targetIndex] = { ...newTargets[targetIndex], completed: !newTargets[targetIndex].completed };

    // Optimistic update
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, targets: newTargets } : g));
    if (selectedGoal?.id === goalId) {
      setSelectedGoal(prev => ({ ...prev, targets: newTargets }));
    }

    try {
      const { updateGoal } = await import('../database/goalsRepository.js');
      await updateGoal(goalId, { targets: newTargets });
    } catch (err) {
      console.error(err);
      loadGoals(); // rollback
    }
  }

  async function handleDeleteGoal() {
    if (!selectedGoal) return;
    const id = selectedGoal.id;
    setSelectedGoal(null);
    setIsEditing(false);
    setShowConfirmDelete(false);
    setGoals(prev => prev.filter(g => g.id !== id));
    try {
      const { deleteGoal } = await import('../database/goalsRepository.js');
      await deleteGoal(id);
    } catch (err) {
      console.error(err);
      loadGoals();
    }
  }

  async function handleCreateGoal() {
    if (!goalDraft.label.trim()) {
      setCreateError('Enter an outcome before saving.');
      return;
    }
    setSavingGoal(true);
    setCreateError('');
    try {
      const { addGoal } = await import('../database/goalsRepository.js');
      const created = await addGoal({
        label: goalDraft.label.trim(),
        domain: goalDraft.domain,
        start: goalDraft.start.trim(),
        end: goalDraft.end.trim(),
        proof: goalDraft.proof.trim(),
        targets: goalDraft.targets.split('\n').map(text => text.trim()).filter(Boolean)
          .map(text => ({ text, metric: '', completed: false })),
      });
      setGoals(prev => [...prev, created]);
      setGoalDraft({ label: '', domain: 'body', start: '', end: '', proof: '', targets: '' });
      setShowCreate(false);
    } catch (err) {
      console.error('[GoalsTab] Failed to create goal:', err);
      setCreateError('Goal could not be saved. Your entry is still here; try again.');
    } finally {
      setSavingGoal(false);
    }
  }

  async function handleSaveGoal() {
    if (!selectedGoal || !goalDraft.label.trim()) {
      setEditError('Enter an outcome before saving.');
      return;
    }
    setSavingGoal(true);
    setEditError('');
    try {
      const { updateGoal } = await import('../database/goalsRepository.js');
      const updated = await updateGoal(selectedGoal.id, {
        label: goalDraft.label.trim(),
        domain: goalDraft.domain,
        start: goalDraft.start.trim(),
        end: goalDraft.end.trim(),
        proof: goalDraft.proof.trim(),
        targets: goalDraft.targets.split('\n').map(text => text.trim()).filter(Boolean)
          .map(text => {
            const existing = selectedGoal.targets?.find(target => target.text === text);
            return { text, metric: existing?.metric || '', completed: !!existing?.completed };
          }),
      });
      setGoals(prev => prev.map(goal => goal.id === updated.id ? updated : goal));
      setSelectedGoal(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('[GoalsTab] Failed to update goal:', err);
      setEditError('Goal could not be saved. Your changes are still here; try again.');
    } finally {
      setSavingGoal(false);
    }
  }

  async function handlePauseGoal() {
    if (!selectedGoal) return;
    try {
      const { updateGoal } = await import('../database/goalsRepository.js');
      const updated = await updateGoal(selectedGoal.id, { status: 'paused' });
      setGoals(prev => prev.map(goal => goal.id === updated.id ? updated : goal));
      setSelectedGoal(null);
    } catch (err) {
      console.error('[GoalsTab] Failed to pause goal:', err);
    }
  }

  const activeGoals = goals.filter(g => !g.completed && !g.paused);

  return (
    <div style={{ padding: '0 14px 24px' }}>

      {/* New goal button — per mockup this is a pill in the header subline, but we place it here as fallback */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '12px',
      }}>
        <button
          onClick={() => { setCreateError(''); setShowCreate(true); }}
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
          New goal
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--mu)', fontSize: '14px', textAlign: 'center', padding: '24px' }}>
          Loading goals...
        </div>
      ) : activeGoals.length === 0 ? (
        <EmptyState
          title="No active goals yet."
          description="Tell Jarvis what you want to change. Your direction becomes a system."
          actionLabel="Ask Jarvis"
          onAction={onOpenJarvis}
        />
      ) : (
        <div>
          {activeGoals.map((goal, idx) => (
              <GoalCard
              key={goal.id}
              goal={goal}
              onClick={() => setSelectedGoal(goal)}
            />
          ))}
        </div>
      )}

      <BottomSheet
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="New goal"
      >
        <div style={{ display: 'grid', gap: '12px' }}>
          <label style={{ display: 'grid', gap: '6px', color: 'var(--mu)', fontSize: '13px' }}>
            Outcome
            <input aria-label="Goal outcome" value={goalDraft.label} onChange={e => setGoalDraft(prev => ({ ...prev, label: e.target.value }))} />
          </label>
          <label style={{ display: 'grid', gap: '6px', color: 'var(--mu)', fontSize: '13px' }}>
            Axis
            <select aria-label="Goal axis" value={goalDraft.domain} onChange={e => setGoalDraft(prev => ({ ...prev, domain: e.target.value }))}>
              {['body', 'discipline', 'knowledge', 'social', 'creativity', 'strategy'].map(axis => (
                <option key={axis} value={axis}>{axis[0].toUpperCase() + axis.slice(1)}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '6px', color: 'var(--mu)', fontSize: '13px' }}>
            Starting point
            <input aria-label="Goal starting point" value={goalDraft.start} onChange={e => setGoalDraft(prev => ({ ...prev, start: e.target.value }))} />
          </label>
          <label style={{ display: 'grid', gap: '6px', color: 'var(--mu)', fontSize: '13px' }}>
            Desired outcome
            <input aria-label="Goal desired outcome" value={goalDraft.end} onChange={e => setGoalDraft(prev => ({ ...prev, end: e.target.value }))} />
          </label>
          <label style={{ display: 'grid', gap: '6px', color: 'var(--mu)', fontSize: '13px' }}>
            How will you know?
            <input aria-label="Goal proof" value={goalDraft.proof} onChange={e => setGoalDraft(prev => ({ ...prev, proof: e.target.value }))} />
          </label>
          <label style={{ display: 'grid', gap: '6px', color: 'var(--mu)', fontSize: '13px' }}>
            Milestones, one per line
            <textarea aria-label="Goal milestones" value={goalDraft.targets} onChange={e => setGoalDraft(prev => ({ ...prev, targets: e.target.value }))} rows={3} />
          </label>
          {createError && <p role="alert" style={{ margin: 0, color: 'var(--danger)', fontSize: '13px' }}>{createError}</p>}
          <Button variant="primary" disabled={savingGoal} onClick={handleCreateGoal}>
            {savingGoal ? 'Saving...' : 'Create goal'}
          </Button>
        </div>
      </BottomSheet>

      {/* Goal Detail Sheet */}
      <BottomSheet
        isOpen={!!selectedGoal}
        onClose={() => { setSelectedGoal(null); setIsEditing(false); }}
        title={selectedGoal?.label || 'Goal'}
      >
        {selectedGoal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Outcome */}
            <div>

              <div style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '11.5px',
                color: 'var(--mu)',
                marginBottom: '4px',
              }}>
                Outcome
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--tx)' }}>
                {selectedGoal.label}
              </div>
            </div>

            {/* Why it matters */}
            {selectedGoal.fear && (
              <div style={{
                background: 'var(--s2)',
                borderRadius: 'var(--r-control)',
                padding: '12px 14px',
              }}>
                <div style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: '11.5px',
                  color: 'var(--mu)',
                  marginBottom: '4px',
                }}>
                  Why it matters
                </div>
                <div style={{ fontSize: '14px', color: 'var(--tx)', lineHeight: 1.5 }}>
                  {selectedGoal.fear}
                </div>
              </div>
            )}

            {/* Milestones */}
            {selectedGoal.targets?.length > 0 && (
              <div>
                <div style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: '11.5px',
                  color: 'var(--mu)',
                  marginBottom: '8px',
                }}>
                  Milestones
                </div>
                <div>
                  {selectedGoal.targets.map((target, idx) => (
                    <EntityRow
                      key={idx}
                      title={
                        <span style={{
                          textDecoration: target.completed ? 'line-through' : 'none',
                          opacity: target.completed ? 0.6 : 1,
                        }}>
                          {target.text}
                        </span>
                      }
                      rightElement={
                        <Checkbox
                          checked={!!target.completed}
                          onChange={() => handleToggleTarget(selectedGoal.id, idx)}
                        />
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                style={{ flex: 1, fontSize: '14px' }}
                onClick={() => {
                  onOpenJarvis?.({
                    page: 'goals',
                    entityType: 'goal',
                    entityId: selectedGoal.id,
                    payload: selectedGoal.label,
                  });
                  setSelectedGoal(null);
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkle size={16} weight="fill" />
                  Ask about this goal
                </span>
              </Button>
              <IconButton
                label="Edit goal"
                icon={<PencilSimple size={18} />}
                onClick={() => {
                  setEditError('');
                  setGoalDraft({
                    label: selectedGoal.label || '',
                    domain: selectedGoal.domain || 'body',
                    start: selectedGoal.start || '',
                    end: selectedGoal.end || '',
                    proof: selectedGoal.proof || '',
                    targets: (selectedGoal.targets || []).map(target => target.text).join('\n'),
                  });
                  setIsEditing(true);
                }}
              />
            </div>

            {selectedGoal.status !== 'paused' && (
              <Button variant="secondary" style={{ width: '100%' }} onClick={handlePauseGoal}>
                Pause goal
              </Button>
            )}

            <Button
              variant="secondary"
              style={{ width: '100%' }}
              onClick={() => setShowEvidence(true)}
            >
              Based on...
            </Button>
          </div>
        )}
      </BottomSheet>

      {/* Edit Sheet */}
      <BottomSheet
        isOpen={isEditing && !!selectedGoal}
        onClose={() => setIsEditing(false)}
        title="Edit Goal"
      >
        <div style={{ display: 'grid', gap: '12px' }}>
          <label style={{ display: 'grid', gap: '6px', color: 'var(--mu)', fontSize: '13px' }}>
            Outcome
            <input aria-label="Edit goal outcome" value={goalDraft.label} onChange={e => setGoalDraft(prev => ({ ...prev, label: e.target.value }))} />
          </label>
          <label style={{ display: 'grid', gap: '6px', color: 'var(--mu)', fontSize: '13px' }}>
            Axis
            <select aria-label="Edit goal axis" value={goalDraft.domain} onChange={e => setGoalDraft(prev => ({ ...prev, domain: e.target.value }))}>
              {['body', 'discipline', 'knowledge', 'social', 'creativity', 'strategy'].map(axis => (
                <option key={axis} value={axis}>{axis[0].toUpperCase() + axis.slice(1)}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '6px', color: 'var(--mu)', fontSize: '13px' }}>
            Starting point
            <input aria-label="Edit goal starting point" value={goalDraft.start} onChange={e => setGoalDraft(prev => ({ ...prev, start: e.target.value }))} />
          </label>
          <label style={{ display: 'grid', gap: '6px', color: 'var(--mu)', fontSize: '13px' }}>
            Desired outcome
            <input aria-label="Edit goal desired outcome" value={goalDraft.end} onChange={e => setGoalDraft(prev => ({ ...prev, end: e.target.value }))} />
          </label>
          <label style={{ display: 'grid', gap: '6px', color: 'var(--mu)', fontSize: '13px' }}>
            How will you know?
            <input aria-label="Edit goal proof" value={goalDraft.proof} onChange={e => setGoalDraft(prev => ({ ...prev, proof: e.target.value }))} />
          </label>
          <label style={{ display: 'grid', gap: '6px', color: 'var(--mu)', fontSize: '13px' }}>
            Milestones, one per line
            <textarea aria-label="Edit goal milestones" value={goalDraft.targets} onChange={e => setGoalDraft(prev => ({ ...prev, targets: e.target.value }))} rows={3} />
          </label>
          {editError && <p role="alert" style={{ margin: 0, color: 'var(--danger)', fontSize: '13px' }}>{editError}</p>}
          <Button variant="primary" disabled={savingGoal} onClick={handleSaveGoal}>
            {savingGoal ? 'Saving...' : 'Save goal'}
          </Button>
          <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
          <Button
            variant="secondary"
            style={{ width: '100%', color: 'var(--danger)' }}
            onClick={() => { setIsEditing(false); setShowConfirmDelete(true); }}
          >
            Delete Goal
          </Button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDeleteGoal}
        title="Delete Goal"
        description="This will permanently remove this goal and its milestones."
      />

      <EvidenceSheet
        isOpen={showEvidence}
        onClose={() => setShowEvidence(false)}
        title={`Evidence for ${selectedGoal?.label}`}
        evidenceItems={[]}
      />
    </div>
  );
}
