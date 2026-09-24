import React, { useState, useEffect } from 'react';
import { Card, EntityRow } from './ui/Cards.jsx';
import { BottomSheet, ConfirmDialog } from './ui/Overlays.jsx';
import { Button, ContextualJarvisCTA } from './ui/Buttons.jsx';
import { EmptyState } from './ui/States.jsx';
import { Checkbox } from './ui/Inputs.jsx';
import { Plus, MagicWand, PencilSimple, Warning } from '@phosphor-icons/react';
import { EvidenceSheet } from './EvidenceSheet.jsx';

export default function GoalsTab({ t, onOpenJarvis }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

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

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Active Goals
        </div>
        <Button variant="secondary" onClick={() => { /* Open create sheet */ }} style={{ padding: '4px 8px', height: 'auto', minHeight: '32px' }}>
          <Plus size={16} />
        </Button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--mu)', fontSize: '14px', textAlign: 'center' }}>Loading goals...</div>
      ) : goals.length === 0 ? (
        <EmptyState 
          title="No active goals yet." 
          description="Tell Jarvis what you want to change." 
          actionLabel="Add Goal" 
          onAction={() => {}} 
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {goals.map(goal => {
            const completedCount = goal.targets?.filter(t => t.completed)?.length || 0;
            const totalCount = goal.targets?.length || 0;
            return (
              <Card key={goal.id} onClick={() => setSelectedGoal(goal)}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 600 }}>{goal.label}</h3>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--mu)' }}>
                  {goal.domain} • {completedCount}/{totalCount} milestones
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Goal Detail Sheet */}
      <BottomSheet 
        isOpen={!!selectedGoal} 
        onClose={() => { setSelectedGoal(null); setIsEditing(false); }}
        title={selectedGoal?.label || 'Goal'}
      >
        {selectedGoal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: 'var(--mu)' }}>Outcome</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{selectedGoal.label}</div>
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: 'var(--mu)' }}>Why it matters</div>
              <div style={{ fontSize: '14px' }}>{selectedGoal.fear || 'Not specified.'}</div>
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--mu)' }}>Milestones</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {selectedGoal.targets?.map((target, idx) => (
                  <EntityRow 
                    key={idx}
                    title={<span style={{ textDecoration: target.completed ? 'line-through' : 'none', opacity: target.completed ? 0.6 : 1 }}>{target.text}</span>}
                    rightElement={<Checkbox checked={!!target.completed} onChange={() => handleToggleTarget(selectedGoal.id, idx)} />}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <ContextualJarvisCTA 
                label="Ask about this goal" 
                contextIcon={<MagicWand size={18} weight="fill" />} 
                onClick={() => {
                  onOpenJarvis({
                    page: 'goals',
                    entityType: 'goal',
                    entityId: selectedGoal.id,
                    payload: selectedGoal.label
                  });
                  setSelectedGoal(null);
                }}
              />
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                <PencilSimple size={18} /> Edit
              </Button>
              <Button variant="secondary" onClick={() => setShowEvidence(true)}>
                Based on...
              </Button>
            </div>
            
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        isOpen={isEditing && !!selectedGoal}
        onClose={() => setIsEditing(false)}
        title="Edit Goal"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ color: 'var(--mu)', fontSize: '14px' }}>
            To revise targets or outcome in depth, ask Jarvis.
          </div>
          <Button variant="secondary" onClick={() => { setIsEditing(false); setShowConfirmDelete(true); }} style={{ color: 'var(--bad)' }}>
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
        evidenceItems={selectedGoal?.proof?.map(p => ({ content: p, date: 'Recent' })) || []}
      />
    </div>
  );
}
