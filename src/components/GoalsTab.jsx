import React, { useEffect, useMemo, useState } from 'react';
import { Card } from './ui/Cards.jsx';
import { BottomSheet, ConfirmDialog } from './ui/Overlays.jsx';
import { Button, ContextualJarvisCTA } from './ui/Buttons.jsx';
import { EmptyState, ErrorState, LoadingSkeleton } from './ui/States.jsx';
import { Checkbox } from './ui/Inputs.jsx';
import { Plus, MagicWand, PencilSimple, Pause, Play, CheckCircle, Trash, X } from '@phosphor-icons/react';
import { EvidenceSheet } from './EvidenceSheet.jsx';

const EMPTY_FORM = {
  label: '', domain: '', start: '', end: '', proof: '', whyItMatters: '', fear: '',
  targets: [{ text: '', metric: '', completed: false }],
  blockers: [''],
  supportingObjectIds: [''],
};

function toForm(goal) {
  return {
    label: goal?.label || '', domain: goal?.domain || '', start: goal?.start || '',
    end: goal?.end || '', proof: goal?.proof || '', whyItMatters: goal?.whyItMatters || goal?.fear || '', fear: goal?.fear || '',
    targets: goal?.targets?.length ? goal.targets.map(t => ({ ...t })) : [{ text: '', metric: '', completed: false }],
    blockers: goal?.blockers?.length ? [...goal.blockers] : [''],
    supportingObjectIds: goal?.supportingObjectIds?.length ? [...goal.supportingObjectIds] : [''],
  };
}

export default function GoalsTab({ onOpenJarvis }) {
  const [goals, setGoals] = useState([]);
  const [filter, setFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  useEffect(() => { loadGoals(); }, []);

  async function loadGoals() {
    setLoading(true); setError('');
    try {
      const { getAllGoals } = await import('../database/goalsRepository.js');
      setGoals(await getAllGoals());
    } catch (err) {
      console.error(err); setError('Goals could not be loaded.');
    } finally { setLoading(false); }
  }

  const visibleGoals = useMemo(() => goals.filter(g => filter === 'all' || g.status === filter), [goals, filter]);

  function openCreate() {
    setSelectedGoal(null); setForm({ ...EMPTY_FORM, targets: [{ text: '', metric: '', completed: false }], blockers: [''], supportingObjectIds: [''] });
    setEditorOpen(true);
  }

  function openEdit(goal) { setSelectedGoal(goal); setForm(toForm(goal)); setEditorOpen(true); }

  function updateList(key, index, value) {
    setForm(prev => ({ ...prev, [key]: prev[key].map((item, i) => i === index ? (typeof item === 'object' ? { ...item, ...value } : value) : item) }));
  }

  function addListItem(key, emptyValue) { setForm(prev => ({ ...prev, [key]: [...prev[key], emptyValue] })); }
  function removeListItem(key, index) {
    setForm(prev => ({ ...prev, [key]: prev[key].length > 1 ? prev[key].filter((_, i) => i !== index) : prev[key] }));
  }

  async function saveGoal() {
    if (!form.label.trim()) return;
    setSaving(true);
    try {
      const repo = await import('../database/goalsRepository.js');
      const data = {
        ...form,
        label: form.label.trim(),
        targets: form.targets.filter(t => t.text.trim()).map(t => ({ ...t, text: t.text.trim(), metric: t.metric?.trim() || '' })),
        blockers: form.blockers.filter(Boolean).map(v => v.trim()),
        supportingObjectIds: form.supportingObjectIds.filter(Boolean).map(v => v.trim()),
      };
      const saved = selectedGoal ? await repo.updateGoal(selectedGoal.id, data) : await repo.addGoal(data);
      setGoals(prev => selectedGoal ? prev.map(g => g.id === saved.id ? saved : g) : [...prev, saved]);
      setSelectedGoal(saved); setEditorOpen(false);
    } catch (err) {
      console.error(err); setError('The goal could not be saved.');
    } finally { setSaving(false); }
  }

  async function changeStatus(status) {
    if (!selectedGoal) return;
    try {
      const { setGoalStatus } = await import('../database/goalsRepository.js');
      const updated = await setGoalStatus(selectedGoal.id, status);
      setGoals(prev => prev.map(g => g.id === updated.id ? updated : g));
      setSelectedGoal(updated);
    } catch (err) { console.error(err); setError('The goal status could not be changed.'); }
  }

  async function handleToggleTarget(index) {
    if (!selectedGoal) return;
    const target = selectedGoal.targets?.[index];
    if (!target) return;
    try {
      const { reviseGoalTarget } = await import('../database/goalsRepository.js');
      const updated = await reviseGoalTarget(selectedGoal.id, index, { completed: !target.completed });
      setGoals(prev => prev.map(g => g.id === updated.id ? updated : g));
      setSelectedGoal(updated);
    } catch (err) { console.error(err); setError('The milestone could not be updated.'); }
  }

  async function handleDeleteGoal() {
    if (!selectedGoal) return;
    try {
      const { deleteGoal } = await import('../database/goalsRepository.js');
      await deleteGoal(selectedGoal.id);
      setGoals(prev => prev.filter(g => g.id !== selectedGoal.id));
      setSelectedGoal(null); setShowConfirmDelete(false);
    } catch (err) { console.error(err); setError('The goal could not be deleted.'); }
  }

  const field = (label, value, onChange, placeholder = '') => (
    <label className="goal-field">
      <span>{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );

  return (
    <div className="goals-page">
      <div className="goals-toolbar">
        <div>
          <div className="mono goals-kicker">Goals</div>
          <h2>Outcomes worth tracking</h2>
        </div>
        <Button variant="primary" onClick={openCreate}><Plus size={18} /> New goal</Button>
      </div>

      <div className="goals-filters" role="tablist" aria-label="Goal status">
        {['active', 'paused', 'completed', 'all'].map(status => (
          <button key={status} type="button" role="tab" aria-selected={filter === status} onClick={() => setFilter(status)}>
            {status[0].toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} onRetry={loadGoals} />}
      {loading ? <LoadingSkeleton rows={3} /> : visibleGoals.length === 0 ? (
        <EmptyState
          title={filter === 'active' ? 'No active goals yet.' : `No ${filter} goals.`}
          description="Create an outcome with measurable milestones and revise it as reality changes."
          actionLabel="Create goal"
          onAction={openCreate}
        />
      ) : (
        <div className="goals-list">
          {visibleGoals.map(goal => {
            const total = goal.targets?.length || 0;
            const done = goal.targets?.filter(t => t.completed).length || 0;
            return (
              <Card key={goal.id} onClick={() => setSelectedGoal(goal)} ariaLabel={`Open goal ${goal.label}`}>
                <div className="goal-card-header">
                  <div>
                    <h3>{goal.label}</h3>
                    <div className="mono">{goal.domain || 'Uncategorised'} · {done}/{total} milestones</div>
                  </div>
                  <span className={`goal-status goal-status-${goal.status}`}>{goal.status}</span>
                </div>
                <div className="goal-progress"><span style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
              </Card>
            );
          })}
        </div>
      )}

      <BottomSheet isOpen={!!selectedGoal && !editorOpen} onClose={() => setSelectedGoal(null)} title={selectedGoal?.label || 'Goal'}>
        {selectedGoal && (
          <div className="goal-detail">
            <div className="goal-detail-grid">
              <div><span>Outcome</span><strong>{selectedGoal.label}</strong></div>
              <div><span>Why it matters</span><p>{selectedGoal.whyItMatters || selectedGoal.fear || 'Not specified.'}</p></div>
              <div><span>Starting point</span><p>{selectedGoal.start || 'Not specified.'}</p></div>
              <div><span>Target state</span><p>{selectedGoal.end || 'Not specified.'}</p></div>
            </div>

            <div>
              <div className="goal-section-title">Milestones</div>
              {(selectedGoal.targets || []).map((target, idx) => (
                <div className="goal-target" key={idx}>
                  <Checkbox checked={!!target.completed} onChange={() => handleToggleTarget(idx)} />
                  <div><div className={target.completed ? 'goal-target-done' : ''}>{target.text}</div>{target.metric && <small>{target.metric}</small>}</div>
                </div>
              ))}
            </div>

            {!!selectedGoal.blockers?.length && <div><div className="goal-section-title">Blockers</div>{selectedGoal.blockers.map((b, i) => <div className="goal-note" key={i}>{b}</div>)}</div>}
            {!!selectedGoal.supportingObjectIds?.length && <div><div className="goal-section-title">Supporting objects</div><div className="goal-note">{selectedGoal.supportingObjectIds.join(' · ')}</div></div>}

            <div className="goal-actions">
              <ContextualJarvisCTA label="Ask about this goal" contextIcon={<MagicWand size={18} weight="fill" />} onClick={() => { onOpenJarvis({ page: 'goals', entityType: 'goal', entityId: selectedGoal.id, payload: selectedGoal }); setSelectedGoal(null); }} />
              <Button variant="secondary" onClick={() => openEdit(selectedGoal)}><PencilSimple size={18} /> Edit</Button>
              {selectedGoal.status === 'active' && <Button variant="secondary" onClick={() => changeStatus('paused')}><Pause size={18} /> Pause</Button>}
              {selectedGoal.status === 'paused' && <Button variant="secondary" onClick={() => changeStatus('active')}><Play size={18} /> Resume</Button>}
              {selectedGoal.status !== 'completed' && <Button variant="secondary" onClick={() => changeStatus('completed')}><CheckCircle size={18} /> Complete</Button>}
              <Button variant="secondary" onClick={() => setShowEvidence(true)}>Based on...</Button>
              <Button variant="destructive" onClick={() => setShowConfirmDelete(true)}><Trash size={18} /> Delete</Button>
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet isOpen={editorOpen} onClose={() => setEditorOpen(false)} title={selectedGoal ? 'Edit Goal' : 'Create Goal'}>
        <div className="goal-editor">
          {field('Outcome', form.label, v => setForm(p => ({ ...p, label: v })), 'What outcome do you want?')}
          {field('Domain', form.domain, v => setForm(p => ({ ...p, domain: v })), 'Body, knowledge, strategy...')}
          {field('Starting point', form.start, v => setForm(p => ({ ...p, start: v })))}
          {field('Target state', form.end, v => setForm(p => ({ ...p, end: v })))}
          {field('Why it matters', form.whyItMatters, v => setForm(p => ({ ...p, whyItMatters: v }))}
          {field('Proof of success', form.proof, v => setForm(p => ({ ...p, proof: v })))}

          <div className="goal-editor-section"><strong>Milestones</strong>
            {form.targets.map((target, i) => (
              <div className="goal-editor-row" key={i}>
                <input value={target.text} onChange={e => updateList('targets', i, { text: e.target.value })} placeholder="Milestone" />
                <input value={target.metric || ''} onChange={e => updateList('targets', i, { metric: e.target.value })} placeholder="Metric / threshold" />
                <button type="button" onClick={() => removeListItem('targets', i)} aria-label="Remove milestone"><X size={16} aria-hidden="true" /></button>
              </div>
            ))}
            <Button variant="secondary" onClick={() => addListItem('targets', { text: '', metric: '', completed: false })}><Plus size={16} /> Add milestone</Button>
          </div>

          <div className="goal-editor-section"><strong>Blockers</strong>
            {form.blockers.map((b, i) => <div className="goal-editor-row" key={i}><input value={b} onChange={e => updateList('blockers', i, e.target.value)} placeholder="Known blocker or risk" /><button type="button" onClick={() => removeListItem('blockers', i)} aria-label="Remove blocker"><X size={16} aria-hidden="true" /></button></div>)}
            <Button variant="secondary" onClick={() => addListItem('blockers', '')}><Plus size={16} /> Add blocker</Button>
          </div>

          <div className="goal-editor-section"><strong>Supporting object IDs</strong>
            {form.supportingObjectIds.map((id, i) => <div className="goal-editor-row" key={i}><input value={id} onChange={e => updateList('supportingObjectIds', i, e.target.value)} placeholder="Goal-linked object ID" /><button type="button" onClick={() => removeListItem('supportingObjectIds', i)} aria-label="Remove supporting object"><X size={16} aria-hidden="true" /></button></div>)}
          </div>

          <Button variant="primary" loading={saving} onClick={saveGoal} style={{ width: '100%' }}>Save goal</Button>
        </div>
      </BottomSheet>

      <ConfirmDialog isOpen={showConfirmDelete} onClose={() => setShowConfirmDelete(false)} onConfirm={handleDeleteGoal} title="Delete Goal" description="This permanently removes the goal and its milestones." />
      <EvidenceSheet isOpen={showEvidence} onClose={() => setShowEvidence(false)} title={`Evidence for ${selectedGoal?.label || 'goal'}`} evidenceItems={selectedGoal?.proof ? [{ content: selectedGoal.proof, date: 'Recorded with goal' }] : []} />
    </div>
  );
}
