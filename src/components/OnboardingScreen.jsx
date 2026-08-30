import React, { useState } from 'react';
import { addLog } from '../database/logsRepository.js';
import { updateSelfModel, markOnboardingComplete } from '../database/selfModelRepository.js';
import { ACCENT } from '../constants.js';
import { localDateStr } from '../helpers/dateHelpers.js';

// ─── Dimensions captured during onboarding ────────────────────────────────────

// These map to the 6 stat axes for backward compat with the stats engine.
const STAT_AXES = ['strength', 'discipline', 'knowledge', 'wisdom', 'creativity', 'strategy'];

// Higher-level life dimensions shown in the self-model (more intuitive labels).
const LIFE_DIMS = [
  { key: 'body',      label: 'Body & Health',      icon: '⚔',  axes: ['strength', 'discipline'] },
  { key: 'mind',      label: 'Mind & Knowledge',   icon: '∞',  axes: ['knowledge', 'wisdom']    },
  { key: 'craft',     label: 'Craft & Creativity', icon: '◈',  axes: ['creativity']              },
  { key: 'strategy',  label: 'Strategy & History', icon: '♟',  axes: ['strategy']                },
];

// ─── Micro-components ─────────────────────────────────────────────────────────

function Label({ t, children }) {
  return (
    <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.15, margin: '0 0 0.25rem 0' }}>
      {children}
    </h2>
  );
}

function Subtitle({ t, children }) {
  return (
    <p style={{ color: t.muted, fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
      {children}
    </p>
  );
}

function TagInput({ t, value, onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft('');
  };
  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          style={{
            flex: 1, padding: '0.55rem 0.75rem',
            background: t.subtleBg, border: `1px solid ${t.border}`,
            color: t.pageText, fontFamily: 'Georgia, serif', fontSize: '0.9rem',
            outline: 'none',
          }}
        />
        <button
          onClick={add}
          style={{
            padding: '0.55rem 0.9rem', background: 'transparent',
            border: `1px solid ${t.border}`, color: t.pageText,
            fontFamily: 'monospace', fontSize: '0.65rem', cursor: 'pointer',
          }}
        >
          Add
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {value.map(tag => (
          <span
            key={tag}
            style={{
              padding: '0.25rem 0.6rem', background: t.subtleBg,
              border: `1px solid ${ACCENT}`, color: ACCENT,
              fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.05em',
              cursor: 'pointer',
            }}
            onClick={() => onChange(value.filter(v => v !== tag))}
            title="Click to remove"
          >
            {tag} ×
          </span>
        ))}
      </div>
    </div>
  );
}

function SliderRow({ t, label, icon, value, onChange, min = 0, max = 100, step = 5 }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.1em', color: t.muted }}>
          {icon} {label}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: ACCENT }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: ACCENT }}
      />
    </div>
  );
}

function NavButtons({ t, onBack, onNext, nextLabel = 'Continue →', backLabel = '← Back', canNext = true }) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            flex: '0 0 auto', padding: '0.8rem 1.1rem',
            background: 'transparent', border: `1px solid ${t.border}`,
            color: t.muted, fontFamily: 'monospace', fontSize: '0.65rem',
            letterSpacing: '0.1em', cursor: 'pointer',
          }}
        >
          {backLabel}
        </button>
      )}
      <button
        onClick={onNext}
        disabled={!canNext}
        style={{
          flex: 1, padding: '0.9rem',
          background: canNext ? ACCENT : t.subtleBg,
          border: 'none',
          color: canNext ? '#fff' : t.muted,
          fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: '0.15em',
          textTransform: 'uppercase', cursor: canNext ? 'pointer' : 'default',
          transition: 'background 0.2s',
        }}
      >
        {nextLabel}
      </button>
    </div>
  );
}

function ProgressDots({ total, current, t }) {
  return (
    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '2rem' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            borderRadius: 3,
            background: i === current ? ACCENT : (i < current ? t.muted : t.borderFaint),
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

// ─── Phase screens ─────────────────────────────────────────────────────────────

function PhaseWelcome({ t, name, setName, onNext }) {
  return (
    <>
      <Label t={t}>Actions-Tracker</Label>
      <SectionTitle>Before we begin.</SectionTitle>
      <Subtitle t={t}>
        This isn't a productivity app. It's a record of who you are, where you are, and where you're going. Answer honestly — vague answers produce vague results.
      </Subtitle>
      <div style={{ marginBottom: '1rem' }}>
        <Label t={t}>Your name</Label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="What do you go by?"
          autoFocus
          style={{
            width: '100%', padding: '0.75rem',
            background: t.subtleBg, border: `1px solid ${t.border}`,
            color: t.pageText, fontFamily: 'Georgia, serif', fontSize: '1rem',
            boxSizing: 'border-box', outline: 'none',
          }}
        />
      </div>
      <NavButtons t={t} onNext={onNext} nextLabel="Begin →" canNext={name.trim().length > 0} />
    </>
  );
}

function PhaseIdentity({ t, identity, setIdentity, onBack, onNext }) {
  const update = (key, val) => setIdentity(prev => ({ ...prev, [key]: val }));
  return (
    <>
      <Label t={t}>§ Who you are</Label>
      <SectionTitle>Identity</SectionTitle>
      <Subtitle t={t}>
        These answers anchor the whole system. Be specific — generic answers will give you generic outputs.
      </Subtitle>

      <div style={{ marginBottom: '1rem' }}>
        <Label t={t}>One sentence about who you are</Label>
        <input
          value={identity.oneLiner}
          onChange={e => update('oneLiner', e.target.value)}
          placeholder='e.g. "I am someone who builds things and reads seriously."'
          style={{
            width: '100%', padding: '0.75rem',
            background: t.subtleBg, border: `1px solid ${t.border}`,
            color: t.pageText, fontFamily: 'Georgia, serif', fontSize: '0.9rem',
            boxSizing: 'border-box', outline: 'none',
          }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <Label t={t}>Roles you hold (press Enter to add)</Label>
        <TagInput t={t} value={identity.roles} onChange={v => update('roles', v)} placeholder="athlete, builder, reader…" />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <Label t={t}>Values you actually live by (not aspirations)</Label>
        <TagInput t={t} value={identity.values} onChange={v => update('values', v)} placeholder="discipline, honesty, craft…" />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <Label t={t}>Real strengths (things you can already do well)</Label>
        <TagInput t={t} value={identity.strengths} onChange={v => update('strengths', v)} placeholder="consistent, analytical, creative…" />
      </div>

      <div>
        <Label t={t}>Real constraints (time, health, context — be honest)</Label>
        <TagInput t={t} value={identity.constraints} onChange={v => update('constraints', v)} placeholder="limited mornings, high stress work…" />
      </div>

      <NavButtons
        t={t}
        onBack={onBack}
        onNext={onNext}
        canNext={identity.roles.length > 0 || identity.values.length > 0}
      />
    </>
  );
}

function PhaseCurrentState({ t, currentState, setCurrentState, onBack, onNext }) {
  const update = (dim, field, val) =>
    setCurrentState(prev => ({
      ...prev,
      [dim]: { ...prev[dim], [field]: val },
    }));

  return (
    <>
      <Label t={t}>§ Where you are now</Label>
      <SectionTitle>Current State</SectionTitle>
      <Subtitle t={t}>
        Rate yourself honestly. These are estimates, not judgements — they will be revised as real data comes in. Confidence = how sure you are of your own rating.
      </Subtitle>

      {LIFE_DIMS.map(dim => {
        const state = currentState[dim.key] ?? { value: 50, confidence: 0.5, evidence: '' };
        return (
          <div key={dim.key} style={{ marginBottom: '1.5rem', padding: '1rem', background: t.subtleBg, borderLeft: `3px solid ${ACCENT}` }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: ACCENT, letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
              {dim.icon} {dim.label.toUpperCase()}
            </div>

            <SliderRow
              t={t} label="Where I am now (0 = nowhere, 100 = elite)"
              icon="▸" value={state.value}
              onChange={v => update(dim.key, 'value', v)}
            />
            <SliderRow
              t={t} label="How confident I am in that rating"
              icon="◇" value={Math.round(state.confidence * 100)} min={0} max={100} step={10}
              onChange={v => update(dim.key, 'confidence', v / 100)}
            />

            <div style={{ marginTop: '0.5rem' }}>
              <Label t={t}>Evidence for your rating (optional but valuable)</Label>
              <input
                value={state.evidence}
                onChange={e => update(dim.key, 'evidence', e.target.value)}
                placeholder='e.g. "Train 3×/week consistently for 2 months"'
                style={{
                  width: '100%', padding: '0.55rem 0.75rem',
                  background: t.pageBg, border: `1px solid ${t.border}`,
                  color: t.pageText, fontFamily: 'Georgia, serif', fontSize: '0.85rem',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>
          </div>
        );
      })}

      <NavButtons t={t} onBack={onBack} onNext={onNext} />
    </>
  );
}

function PhaseDesiredSelf({ t, desiredSelf, setDesiredSelf, onBack, onNext }) {
  const updateVision = v => setDesiredSelf(prev => ({ ...prev, vision: v }));
  const updateDim = (key, field, val) =>
    setDesiredSelf(prev => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [key]: { ...prev.dimensions[key], [field]: val },
      },
    }));

  return (
    <>
      <Label t={t}>§ Where you want to go</Label>
      <SectionTitle>Desired Self</SectionTitle>
      <Subtitle t={t}>
        Be ambitious but honest. "I want to be elite at everything" is not a plan — it's avoidance of prioritisation.
      </Subtitle>

      <div style={{ marginBottom: '1.5rem' }}>
        <Label t={t}>In 1–3 years, who are you?</Label>
        <textarea
          value={desiredSelf.vision}
          onChange={e => updateVision(e.target.value)}
          placeholder='e.g. "A man who trains seriously, reads widely, and makes things."'
          rows={3}
          style={{
            width: '100%', padding: '0.75rem',
            background: t.subtleBg, border: `1px solid ${t.border}`,
            color: t.pageText, fontFamily: 'Georgia, serif', fontSize: '0.9rem',
            boxSizing: 'border-box', outline: 'none', resize: 'vertical',
          }}
        />
      </div>

      {LIFE_DIMS.map(dim => {
        const d = desiredSelf.dimensions[dim.key] ?? { targetValue: 75, why: '', timeframe: '1 year' };
        return (
          <div key={dim.key} style={{ marginBottom: '1.25rem', padding: '1rem', background: t.subtleBg, borderLeft: `3px solid ${ACCENT}` }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: ACCENT, letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
              {dim.icon} {dim.label.toUpperCase()}
            </div>
            <SliderRow
              t={t} label="Target level in 1–3 years"
              icon="▸" value={d.targetValue}
              onChange={v => updateDim(dim.key, 'targetValue', v)}
            />
            <div style={{ marginTop: '0.5rem' }}>
              <Label t={t}>Why does this matter to you?</Label>
              <input
                value={d.why}
                onChange={e => updateDim(dim.key, 'why', e.target.value)}
                placeholder='The real reason, not the socially acceptable one'
                style={{
                  width: '100%', padding: '0.55rem 0.75rem',
                  background: t.pageBg, border: `1px solid ${t.border}`,
                  color: t.pageText, fontFamily: 'Georgia, serif', fontSize: '0.85rem',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>
          </div>
        );
      })}

      <NavButtons t={t} onBack={onBack} onNext={onNext} nextLabel="Finish →"
        canNext={desiredSelf.vision.trim().length > 0}
      />
    </>
  );
}

// ─── Main Onboarding component ─────────────────────────────────────────────────

const PHASES = ['welcome', 'identity', 'currentState', 'desiredSelf'];

export default function OnboardingScreen({ t, onComplete }) {
  const [phase, setPhase] = useState(0);
  const [saving, setSaving] = useState(false);

  // Phase 0 — welcome
  const [name, setName] = useState('');

  // Phase 1 — identity
  const [identity, setIdentity] = useState({
    oneLiner: '', roles: [], values: [], strengths: [], constraints: [], principles: [],
  });

  // Phase 2 — current state (per LIFE_DIM key)
  const [currentState, setCurrentState] = useState({});

  // Phase 3 — desired self
  const [desiredSelf, setDesiredSelf] = useState({ vision: '', dimensions: {} });

  const goNext = () => setPhase(p => Math.min(p + 1, PHASES.length - 1));
  const goBack = () => setPhase(p => Math.max(p - 1, 0));

  const handleFinish = async () => {
    setSaving(true);
    try {
      const today = localDateStr();
      const now = new Date().toISOString();

      // Build currentState entries per life dimension with timestamp
      const currentStateWithMeta = {};
      for (const dim of LIFE_DIMS) {
        const s = currentState[dim.key] ?? { value: 50, confidence: 0.5, evidence: '' };
        currentStateWithMeta[dim.key] = { ...s, lastUpdated: now };
      }

      // Build priors: same values, marked as onboarding-derived
      const priors = {};
      for (const dim of LIFE_DIMS) {
        const s = currentState[dim.key] ?? { value: 50 };
        priors[dim.key] = { value: s.value, setAt: now, decayTarget: 0 };
      }

      // Write to self model store
      await updateSelfModel({
        identity: { ...identity, name },
        currentState: currentStateWithMeta,
        desiredSelf,
        priors,
      });
      await markOnboardingComplete();

      // Write axis baseline logs so the existing stats engine gets its onboarding_assessment.
      // Map life dimensions back to individual stat axes using a simple average across axes.
      const axisValues = {};
      for (const dim of LIFE_DIMS) {
        const val = currentState[dim.key]?.value ?? 50;
        for (const axis of dim.axes) {
          axisValues[axis] = val; // each axis takes its dimension's value
        }
      }
      for (const axis of STAT_AXES) {
        await addLog({
          axis,
          type: 'onboarding_assessment',
          value: axisValues[axis] ?? 50,
          date: today,
          meta: { source: 'onboarding_v2' },
        });
      }

      onComplete();
    } catch (err) {
      console.error('[Onboarding] Save failed:', err);
      setSaving(false);
    }
  };

  const handleLoadDummyData = () => {
    setName('Jane Doe');
    setIdentity({
      oneLiner: 'I am someone who builds things and reads seriously.',
      roles: ['athlete', 'builder', 'reader'],
      values: ['discipline', 'honesty', 'craft'],
      strengths: ['consistent', 'analytical', 'creative'],
      constraints: ['limited mornings', 'high stress work'],
      principles: [],
    });
    setCurrentState({
      body: { value: 60, confidence: 0.8, evidence: 'Train 3x/week consistently' },
      mind: { value: 70, confidence: 0.9, evidence: 'Read one book per week' },
      craft: { value: 45, confidence: 0.6, evidence: 'Learning a new skill slowly' },
      strategy: { value: 50, confidence: 0.7, evidence: 'Quarterly reviews established' },
    });
    setDesiredSelf({
      vision: 'A person who trains seriously, reads widely, and builds systems that last.',
      dimensions: {
        body: { targetValue: 85, why: 'To have the energy for long deep-work sessions.', timeframe: '1 year' },
        mind: { targetValue: 90, why: 'To compound knowledge faster.', timeframe: '1 year' },
        craft: { targetValue: 80, why: 'To build things people actually use.', timeframe: '1 year' },
        strategy: { targetValue: 75, why: 'To avoid working hard on the wrong things.', timeframe: '1 year' },
      }
    });
  };

  const containerStyle = {
    background: t.pageBg,
    color: t.pageText,
    minHeight: '100dvh',
    padding: '2rem 1.5rem',
    maxWidth: 520,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2rem)',
    position: 'relative',
  };

  return (
    <div style={containerStyle}>
      {import.meta.env.DEV && (
        <button
          onClick={handleLoadDummyData}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'transparent', border: 'none', color: t.muted,
            fontFamily: 'monospace', fontSize: '0.6rem', opacity: 0.6,
            cursor: 'pointer', zIndex: 10
          }}
          title="Load Dummy Data (Dev Only)"
        >
          ⚡ Load Dummy Data
        </button>
      )}

      <ProgressDots total={PHASES.length} current={phase} t={t} />

      {phase === 0 && (
        <PhaseWelcome t={t} name={name} setName={setName} onNext={goNext} />
      )}

      {phase === 1 && (
        <PhaseIdentity
          t={t}
          identity={identity}
          setIdentity={setIdentity}
          onBack={goBack}
          onNext={goNext}
        />
      )}

      {phase === 2 && (
        <PhaseCurrentState
          t={t}
          currentState={currentState}
          setCurrentState={setCurrentState}
          onBack={goBack}
          onNext={goNext}
        />
      )}

      {phase === 3 && (
        <PhaseDesiredSelf
          t={t}
          desiredSelf={desiredSelf}
          setDesiredSelf={setDesiredSelf}
          onBack={goBack}
          onNext={saving ? undefined : handleFinish}
        />
      )}

      {saving && (
        <div style={{ textAlign: 'center', marginTop: '1rem', fontFamily: 'monospace', fontSize: '0.65rem', color: t.muted, letterSpacing: '0.15em' }}>
          Saving…
        </div>
      )}
    </div>
  );
}
