import React, { useEffect, useState } from 'react';
import { ACCENT } from '../constants.js';
import { getSelfModel, updateSelfModel, markOnboardingComplete } from '../database/selfModelRepository.js';
import { computeGaps, sortedGaps } from '../helpers/gapEngine.js';
import ArchetypeCompiler from './ArchetypeCompiler.jsx';
import { computeGlobalRPG } from '../helpers/rpgEngine.js';
import { getAllFacts } from '../database/factsRepository.js';

/**
 * SelfTab — v2.7 Character Sheet (§3–§6, §10).
 *
 * Displays the full self model: identity, current state per dimension,
 * desired self targets, and gap analysis. Loads its own data from
 * selfModelRepository so App.jsx doesn't need to manage this state.
 *
 * Props:
 *   t    — theme object
 *   dark — boolean
 */

// ─── Life dimension display config ───────────────────────────────────────────

const LIFE_DIMS = [
  { key: 'body',       label: 'Body',       icon: '⚔', color: '#c1442c' },
  { key: 'knowledge',  label: 'Knowledge',  icon: '∞', color: '#4a7ba6' },
  { key: 'strategy',   label: 'Strategy',   icon: '♟', color: '#4f8a5f' },
  { key: 'creativity', label: 'Creativity', icon: '◈', color: '#d99a2b' },
  { key: 'social',     label: 'Social',     icon: '♥', color: '#b95b89' },
  { key: 'discipline', label: 'Discipline', icon: '⚡', color: '#685b8c' },
];

const PRIORITY_COLORS = { high: '#c1442c', medium: '#d99a2b', low: '#4f8a5f' };

// ─── Micro-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.5rem', marginTop: '1.5rem' }}>
      {children}
    </div>
  );
}

function Divider({ t }) {
  return <div style={{ borderBottom: `1px solid ${t.borderFaint}`, margin: '1rem 0' }} />;
}

function TagRow({ tags, color, t }) {
  if (!tags?.length) return <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: t.muted }}>—</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
      {tags.map(tag => (
        <span
          key={tag}
          style={{
            padding: '0.2rem 0.55rem',
            background: `${color ?? ACCENT}18`,
            border: `1px solid ${color ?? ACCENT}55`,
            color: color ?? ACCENT,
            fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.05em',
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function ConfidenceBar({ value, t }) {
  const pct = Math.round((value ?? 0.5) * 100);
  const color = pct >= 70 ? '#4f8a5f' : pct >= 40 ? '#d99a2b' : '#c1442c';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ flex: 1, height: 3, background: t.subtleBg, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontFamily: 'monospace', fontSize: '0.6rem', color, flexShrink: 0 }}>{pct}%</span>
    </div>
  );
}

function StatBar({ value, t, color }) {
  const pct = Math.min(Math.max(value ?? 0, 0), 100);
  return (
    <div style={{ height: 4, background: t.subtleBg, borderRadius: 3, overflow: 'hidden', marginTop: '0.25rem' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function DimCard({ t, dim, currentDim, desiredDim, gap }) {
  const current   = currentDim?.value     ?? null;
  const target    = desiredDim?.targetValue ?? null;
  const conf      = currentDim?.confidence ?? null;
  const evidence  = currentDim?.evidence   ?? '';
  const why       = desiredDim?.why        ?? '';
  const delta     = gap?.delta             ?? null;
  const priority  = gap?.priority          ?? null;

  return (
    <div style={{
      padding: '1rem',
      background: t.subtleBg,
      borderLeft: `3px solid ${dim.color}`,
      borderTop: `1px solid ${t.borderFaint}`,
      borderRight: `1px solid ${t.borderFaint}`,
      borderBottom: `1px solid ${t.borderFaint}`,
      marginBottom: '0.6rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: dim.color, letterSpacing: '0.15em' }}>
          {dim.icon} {dim.label.toUpperCase()}
        </div>
        {priority && (
          <span style={{
            fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.1em',
            color: PRIORITY_COLORS[priority], textTransform: 'uppercase',
            padding: '0.15rem 0.4rem', border: `1px solid ${PRIORITY_COLORS[priority]}55`,
          }}>
            {priority} gap
          </span>
        )}
      </div>

      {/* Current → Target row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: t.muted, marginBottom: '0.15rem' }}>CURRENT</div>
          <div style={{ fontFamily: 'monospace', fontSize: '1.6rem', fontWeight: 900, lineHeight: 1, color: t.pageText }}>
            {current != null ? current : '—'}
          </div>
          <StatBar value={current} t={t} color={dim.color} />
        </div>

        <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: t.muted, padding: '0 0.25rem' }}>→</div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: t.muted, marginBottom: '0.15rem' }}>TARGET</div>
          <div style={{ fontFamily: 'monospace', fontSize: '1.6rem', fontWeight: 900, lineHeight: 1, color: delta != null && delta > 0 ? ACCENT : '#4f8a5f' }}>
            {target != null ? target : '—'}
          </div>
          {delta != null && (
            <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: PRIORITY_COLORS[priority] }}>
              +{delta} to close
            </div>
          )}
        </div>
      </div>

      {/* Confidence */}
      {conf != null && (
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: t.muted, marginBottom: '0.2rem', letterSpacing: '0.1em' }}>CONFIDENCE IN RATING</div>
          <ConfidenceBar value={conf} t={t} />
        </div>
      )}

      {/* Evidence / Why */}
      {evidence && (
        <div style={{ fontSize: '0.75rem', color: t.muted, fontStyle: 'italic', marginTop: '0.4rem', lineHeight: 1.5 }}>
          Evidence: {evidence}
        </div>
      )}
      {why && (
        <div style={{ fontSize: '0.75rem', color: t.muted, fontStyle: 'italic', marginTop: '0.25rem', lineHeight: 1.5 }}>
          Why: {why}
        </div>
      )}
    </div>
  );
}

// ─── Inline edit field ────────────────────────────────────────────────────────

function EditableVision({ t, value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <div
        onClick={() => { setDraft(value); setEditing(true); }}
        style={{ cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1.6, color: value ? t.pageText : t.muted, fontStyle: value ? 'normal' : 'italic' }}
        title="Click to edit"
      >
        {value || 'Tap to add your vision…'}
      </div>
    );
  }

  return (
    <div>
      <textarea
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        rows={3}
        style={{
          width: '100%', padding: '0.6rem',
          background: t.subtleBg, border: `1px solid ${ACCENT}`,
          color: t.pageText, fontFamily: 'Georgia, serif', fontSize: '0.9rem',
          boxSizing: 'border-box', resize: 'vertical', outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
        <button onClick={() => { onSave(draft); setEditing(false); }} style={{ padding: '0.4rem 0.75rem', background: ACCENT, border: 'none', color: '#fff', fontFamily: 'monospace', fontSize: '0.6rem', cursor: 'pointer' }}>Save</button>
        <button onClick={() => setEditing(false)} style={{ padding: '0.4rem 0.75rem', background: 'transparent', border: `1px solid ${t.border}`, color: t.muted, fontFamily: 'monospace', fontSize: '0.6rem', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Main SelfTab ─────────────────────────────────────────────────────────────

export default function SelfTab({ t, dark }) {
  const [model, setModel] = useState(null);
  const [rpg, setRpg] = useState(null);
  const [realScores, setRealScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCompiler, setShowCompiler] = useState(false);

  useEffect(() => {
    Promise.all([
      getSelfModel(),
      getAllFacts().then(computeGlobalRPG),
      import('../core/scoring/scoreEngine.js').then(async m => {
        const period = { start: '1970-01-01', end: '2099-12-31' }; // all-time
        const scores = {};
        for (const dim of LIFE_DIMS) {
          scores[dim.key] = await m.computeScoreWithExplanation(dim.key, period);
        }
        return scores;
      })
    ]).then(([m, rpgData, scores]) => {
      setModel(m);
      setRpg(rpgData);
      setRealScores(scores);
      setLoading(false);
    });
  }, []);

  const refresh = async () => {
    const m = await getSelfModel();
    setModel(m);
  };

  const saveVision = async (vision) => {
    await updateSelfModel({ desiredSelf: { vision } });
    await refresh();
  };

  const handleCompileVision = async (targets) => {
    // targets is { body: { targetValue, why }, mind: ..., craft: ..., strategy: ... }
    await updateSelfModel({
      desiredSelf: { dimensions: targets }
    });
    await refresh();
    setShowCompiler(false);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'monospace', fontSize: '0.65rem', color: t.muted, letterSpacing: '0.15em' }}>
        Loading…
      </div>
    );
  }

  const { identity, currentState, desiredSelf, gaps: storedGaps } = model;

  // We map the real score projections into the "current state" format for the UI
  // Fall back to old manual currentState estimates if real score is 0 or unavailable
  const hybridCurrentState = { ...currentState };
  for (const key of Object.keys(realScores)) {
    const s = realScores[key]?.score;
    // Overwrite if score engine has data
    if (s && typeof s.value === 'number') {
      hybridCurrentState[key] = {
        value: s.value,
        confidence: s.confidence,
        evidence: realScores[key]?.explanation?.headline || s.warnings?.join(', ') || '',
      };
    }
  }

  // Recompute gaps live from current stored values
  const liveGaps = desiredSelf?.dimensions
    ? computeGaps(hybridCurrentState ?? {}, desiredSelf.dimensions)
    : {};
  const sorted = sortedGaps(liveGaps);

  const hasIdentity = identity?.roles?.length > 0 || identity?.values?.length > 0 || identity?.oneLiner;
  const hasCurrentState = Object.keys(hybridCurrentState ?? {}).length > 0;

  return (
    <>
      {/* ── Header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase' }}>
            Profile
          </div>
          {rpg && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 'bold', color: ACCENT }}>
                LVL {rpg.level}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: t.muted }}>
                {rpg.totalXP} XP
              </div>
              <div style={{ width: '40px', height: '2px', background: t.border, marginTop: '2px', float: 'right' }}>
                <div style={{ width: `${rpg.progressPct}%`, height: '100%', background: ACCENT }} />
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', clear: 'both' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>
            {identity?.name ? identity.name : 'Who Am I'}
          </div>
          {sorted.length > 0 && (
            <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: t.muted, textAlign: 'right' }}>
              <span style={{ color: PRIORITY_COLORS.high }}>{sorted.filter(g => g.priority === 'high').length}</span> high ·{' '}
              <span style={{ color: PRIORITY_COLORS.medium }}>{sorted.filter(g => g.priority === 'medium').length}</span> medium ·{' '}
              <span style={{ color: PRIORITY_COLORS.low }}>{sorted.filter(g => g.priority === 'low').length}</span> low gaps
            </div>
          )}
        </div>
        {identity?.oneLiner && (
          <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: t.muted, fontStyle: 'italic', lineHeight: 1.5 }}>
            {identity.oneLiner}
          </div>
        )}
      </div>

      {/* ── Empty state ── */}
      {!hasIdentity && !hasCurrentState && (
        <div style={{ padding: '2rem', background: t.subtleBg, textAlign: 'center', border: `1px solid ${t.border}` }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: t.muted, lineHeight: 1.8 }}>
            Your self model is empty.<br />Complete onboarding to populate it.
          </div>
        </div>
      )}

      {/* ── Identity ── */}
      {hasIdentity && (
        <>
          <SectionLabel>§ Identity</SectionLabel>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {identity.roles?.length > 0 && (
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: t.muted, letterSpacing: '0.1em', marginBottom: '0.4rem' }}>ROLES</div>
                <TagRow tags={identity.roles} color={ACCENT} t={t} />
              </div>
            )}
            {identity.values?.length > 0 && (
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: t.muted, letterSpacing: '0.1em', marginBottom: '0.4rem' }}>VALUES</div>
                <TagRow tags={identity.values} color='#4a7ba6' t={t} />
              </div>
            )}
            {identity.strengths?.length > 0 && (
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: t.muted, letterSpacing: '0.1em', marginBottom: '0.4rem' }}>STRENGTHS</div>
                <TagRow tags={identity.strengths} color='#4f8a5f' t={t} />
              </div>
            )}
            {identity.constraints?.length > 0 && (
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: t.muted, letterSpacing: '0.1em', marginBottom: '0.4rem' }}>CONSTRAINTS</div>
                <TagRow tags={identity.constraints} color='#8a7060' t={t} />
              </div>
            )}
          </div>
          <Divider t={t} />
        </>
      )}

      {/* ── Vision ── */}
      {(desiredSelf?.vision || hasCurrentState) && (
        <>
          <SectionLabel>§ Vision</SectionLabel>
          <EditableVision
            t={t}
            value={desiredSelf?.vision ?? ''}
            onSave={saveVision}
          />
          {desiredSelf?.vision && (
            <button
              onClick={() => setShowCompiler(true)}
              style={{
                marginTop: '1rem', background: 'transparent', border: `1px solid ${ACCENT}`,
                color: ACCENT, padding: '0.4rem 0.8rem', borderRadius: '4px',
                fontFamily: 'monospace', fontSize: '0.65rem', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all 0.2s', width: '100%'
              }}
            >
              Compile Vision →
            </button>
          )}
          <Divider t={t} />
        </>
      )}

      {/* ── Archetype Compiler Overlay ── */}
      {showCompiler && (
        <ArchetypeCompiler
          t={t}
          vision={desiredSelf?.vision}
          onSave={handleCompileVision}
          onCancel={() => setShowCompiler(false)}
        />
      )}

      {/* ── Dimensions (current state + gaps) ── */}
      {hasCurrentState && (
        <>
          <SectionLabel>§ Current → Desired</SectionLabel>
          <div style={{ fontSize: '0.75rem', color: t.muted, marginBottom: '0.75rem', lineHeight: 1.5 }}>
            Estimates set at onboarding. Updated as real facts accumulate. Confidence = how certain you were.
          </div>
          {LIFE_DIMS.map(dim => (
            <DimCard
              key={dim.key}
              t={t}
              dim={dim}
              currentDim={hybridCurrentState[dim.key]}
              desiredDim={desiredSelf?.dimensions?.[dim.key]}
              gap={liveGaps[dim.key]}
            />
          ))}
          <Divider t={t} />
        </>
      )}

      {/* ── Gap summary ── */}
      {sorted.length > 0 && (
        <>
          <SectionLabel>§ Gap Analysis</SectionLabel>
          <div style={{ fontSize: '0.75rem', color: t.muted, marginBottom: '0.75rem', lineHeight: 1.5 }}>
            Sorted by priority (delta from current to target). High gap = significant effort needed.
          </div>
          {sorted.map(g => {
            const dim = LIFE_DIMS.find(d => d.key === g.dim);
            return (
              <div key={g.dim} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.6rem 0.75rem', marginBottom: '0.35rem',
                background: t.subtleBg, borderLeft: `3px solid ${PRIORITY_COLORS[g.priority]}`,
              }}>
                <div>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: dim?.color ?? t.muted }}>
                    {dim?.icon} {dim?.label ?? g.dim}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: t.pageText }}>
                    {g.currentValue} → {g.targetValue}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: PRIORITY_COLORS[g.priority], marginLeft: '0.5rem' }}>
                    (+{g.delta})
                  </span>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── Footer note ── */}
      <p style={{ marginTop: '1.5rem', fontSize: '0.65rem', color: t.muted, lineHeight: 1.6, fontStyle: 'italic', textAlign: 'center' }}>
        These are estimates, not judgements. They decay as real logged activity replaces them. Tap your vision to edit it.
      </p>
    </>
  );
}
