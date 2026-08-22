import React, { useMemo } from 'react';
import { ACCENT } from '../constants.js';
import { getThresholdTitle } from '../helpers/statsEngine.js';
import RadarChart from './RadarChart.jsx';

/**
 * StatsTab — Phase 3 visualization.
 *
 * Props:
 *   t           — theme object
 *   dark        — boolean
 *   stats       — { strength, discipline, knowledge, wisdom, creativity, strategy }
 *   axisDetails — { [axis]: { C, V, M, stat } } from computeAxisDetails()
 *   snapshot    — last weekly statSnapshot record (or null)
 *   allQuests   — full questBoard array
 */

// Clockwise order from top, per spec §9
const AXES = [
  { key: 'strength',   label: 'Strength',   icon: '⚔',  color: '#c1442c', domain: 'Body'        },
  { key: 'discipline', label: 'Discipline', icon: '🔥', color: '#c1442c', domain: 'Body'        },
  { key: 'knowledge',  label: 'Knowledge',  icon: '∞',  color: '#4a7ba6', domain: 'Mind'        },
  { key: 'wisdom',     label: 'Wisdom',     icon: '◎',  color: '#4a7ba6', domain: 'Mind'        },
  { key: 'creativity', label: 'Creativity', icon: '◈',  color: '#d99a2b', domain: 'Art'         },
  { key: 'strategy',   label: 'Strategy',   icon: '♟',  color: '#4f8a5f', domain: 'History'     },
];

// Year-end target stats — what perfect execution yields.
// Computed as C=90, V=100, M=10 per axis (Wisdom: V=100, M=10).
const YEAR_END_TARGETS = {
  strength:   82,
  discipline: 82,
  knowledge:  82,
  wisdom:     60,
  creativity: 82,
  strategy:   82,
};

function MiniBar({ value, max = 100, color, dark }) {
  const pct = Math.min(Math.max(value ?? 0, 0), max) / max * 100;
  return (
    <div style={{ height: 3, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function AxisCard({ t, dark, axisInfo, stat, details, quests }) {
  const { key, label, icon, color } = axisInfo;
  const { C, V, M } = details ?? {};
  const title = getThresholdTitle(key, Math.round(stat));
  const val = Math.round(stat);

  // Calculate expected progress based on Aug 1 - Dec 31 (153 days)
  const aug1 = new Date('2026-08-01T00:00:00').getTime();
  const dec31 = new Date('2026-12-31T23:59:59').getTime();
  const timeProgress = Math.max(0, Math.min(1, (Date.now() - aug1) / (dec31 - aug1)));
  
  const questsWithPace = quests.map(q => {
    const expected = q.targetValue * timeProgress;
    return { ...q, isLagging: !q.done && (q.currentValue < expected * 0.9) }; // 10% buffer
  });
  
  const axisLagging = questsWithPace.some(q => q.isLagging);

  return (
    <div style={{
      padding: '1rem',
      background: t.subtleBg,
      borderLeft: `3px solid ${color}`,
      borderTop: `1px solid ${t.borderFaint}`,
      borderRight: `1px solid ${t.borderFaint}`,
      borderBottom: `1px solid ${t.borderFaint}`,
      position: 'relative'
    }}>
      {axisLagging && (
        <div style={{ position: 'absolute', top: -5, right: -5, width: 12, height: 12, borderRadius: '50%', background: '#c1442c', border: `2px solid ${t.pageBg}` }} title="Lagging pace" />
      )}
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.18em', color, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
            {icon} {label}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: t.muted, textTransform: 'uppercase' }}>
            {title}
          </div>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '1.8rem', fontWeight: 900, color: t.pageText, lineHeight: 1 }}>
          {val}
        </div>
      </div>

      {/* Stat bar */}
      <MiniBar value={val} max={99} color={color} dark={dark} />

      {/* C / V / M breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', marginTop: '0.65rem' }}>
        {[
          { lbl: 'C', val: C, skip: C === null },
          { lbl: 'V', val: V },
          { lbl: 'M', val: M },
        ].map(({ lbl, val: v, skip }) => (
          !skip && (
            <div key={lbl} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: t.muted, letterSpacing: '0.12em' }}>{lbl}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: t.pageText }}>
                {v == null ? '—' : `${Math.round(v)}`}
              </div>
              <MiniBar value={v ?? 0} max={lbl === 'M' ? 20 : 100} color={color} dark={dark} />
            </div>
          )
        ))}
      </div>

      {/* Quests */}
      {questsWithPace.length > 0 && (
        <div style={{ marginTop: '0.65rem', borderTop: `1px solid ${t.borderFaint}`, paddingTop: '0.5rem' }}>
          {questsWithPace.map(q => (
            <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <span style={{
                fontSize: '0.75rem',
                color: q.done ? ACCENT : t.muted,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '65%',
              }}>
                {q.done ? '✓ ' : ''}{q.title}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: q.isLagging ? '#c1442c' : (q.done ? ACCENT : t.muted), flexShrink: 0, marginLeft: '0.4rem', textAlign: 'right' }}>
                {q.done ? 'done' : `${Math.round(q.currentValue)}/${q.targetValue}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StatsTab({ t, dark, stats = {}, axisDetails = {}, snapshot = null, allQuests = [] }) {
  const snapshotStats = snapshot?.stats ?? null;
  const snapshotLabel = snapshot?.date
    ? `vs. ${new Date(snapshot.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    : null;

  const totalStat = useMemo(() => {
    const vals = AXES.map(a => stats[a.key] ?? 0);
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  }, [stats]);

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Character Sheet
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>
            Your Stats
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 900, color: ACCENT, lineHeight: 1 }}>
              {totalStat}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: t.muted, letterSpacing: '0.1em' }}>
              AVG STAT
            </div>
          </div>
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: 16, height: 2, background: ACCENT, opacity: 0.8 }} />
          <span style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: t.muted }}>Current</span>
        </div>
        {snapshotStats && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <div style={{ width: 16, height: 1, background: t.muted, opacity: 0.6, borderTop: '1px dashed' }} />
            <span style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: t.muted }}>
              {snapshotLabel ?? 'Last snapshot'}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: 16, height: 1, borderTop: `1px dashed ${ACCENT}`, opacity: 0.5 }} />
          <span style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: t.muted }}>Year-end target</span>
        </div>
      </div>

      {/* ── Radar Chart ─────────────────────────────────────────────────────── */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '1rem 0.5rem',
        background: t.invertBg,
        borderRadius: 2,
      }}>
        <RadarChart
          stats={stats}
          snapshot={snapshotStats}
          targets={YEAR_END_TARGETS}
          dark={true}
          size={320}
        />
      </div>

      {/* ── Per-axis stat cards ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        {AXES.map(axisInfo => (
          <AxisCard
            key={axisInfo.key}
            t={t}
            dark={dark}
            axisInfo={axisInfo}
            stat={stats[axisInfo.key] ?? 0}
            details={axisDetails[axisInfo.key] ?? {}}
            quests={allQuests.filter(q => q.axis === axisInfo.key)}
          />
        ))}
      </div>

      {/* ── Snapshot note ─────────────────────────────────────────────────────── */}
      <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: t.muted, lineHeight: 1.6, fontStyle: 'italic', textAlign: 'center' }}>
        Snapshot taken weekly. Dashed amber line = your year-end target if all quests are completed. Red badge indicates lagging pace.
      </p>
    </>
  );
}
