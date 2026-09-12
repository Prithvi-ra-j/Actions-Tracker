import React, { useMemo } from 'react';
import { ACCENT } from '../constants.js';
import { getThresholdTitle } from '../helpers/statsEngine.js';
import RadarChart from './RadarChart.jsx';
import StatHistoryModal from './StatHistoryModal.jsx';

/**
 * StatsTab — Architecture-aligned (§52)
 *
 * Focuses on:
 * - Development Shape (Radar)
 * - Evidence Coverage & Components
 * - Key Signals & Explanation
 */

// Architectural domains mapped to stats engine keys
const AXES = [
  { key: 'strength',   label: 'Body',       color: '#c1442c' },
  { key: 'discipline', label: 'Discipline', color: '#c1442c' },
  { key: 'knowledge',  label: 'Knowledge',  color: '#4a7ba6' },
  { key: 'wisdom',     label: 'Philosophy', color: '#4a7ba6' },
  { key: 'creativity', label: 'Creativity', color: '#d99a2b' },
  { key: 'strategy',   label: 'Strategy',   color: '#4f8a5f' },
];

function MiniBar({ value, max = 100, color, dark }) {
  const pct = Math.min(Math.max(value ?? 0, 0), max) / max * 100;
  return (
    <div style={{ height: 3, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function StatCard({ t, dark, axisInfo, stat, details, quests, onClick }) {
  const { key, label, color } = axisInfo;
  const { C, V, M } = details ?? {};
  const val = Math.round(stat);
  const activeQuests = quests.filter(q => q.status === 'active').length;

  return (
    <div
      onClick={() => onClick(key)}
      style={{
        background: t.subtleBg,
        border: `1px solid ${t.border}`,
        padding: '1.25rem',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'border-color 0.2s',
      }}
      onMouseOver={(e) => (e.currentTarget.style.borderColor = color)}
      onMouseOut={(e) => (e.currentTarget.style.borderColor = t.border)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: color, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            {label}
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{val}</div>
        </div>
        {activeQuests > 0 && (
          <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: t.muted, background: t.borderFaint, padding: '0.2rem 0.4rem', borderRadius: 2 }}>
            {activeQuests} ACTIVE QUESTS
          </div>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.65rem', fontFamily: 'monospace', color: t.muted, marginBottom: '0.5rem' }}>
          {C != null && <span>C: {Math.round(C)}</span>}
          <span>V: {Math.round(V)}</span>
          <span>M: {Math.round(M)}</span>
        </div>
        <MiniBar value={val} color={color} dark={dark} />
      </div>
    </div>
  );
}

export default function StatsTab({
  t, dark, stats, axisDetails, snapshot, allQuests, allLogs, axisConfigs
}) {
  const [selectedAxis, setSelectedAxis] = React.useState(null);

  // Compute Radar shape based on all stats
  const radarData = useMemo(() => {
    return AXES.map(a => ({
      axis: a.label,
      value: Math.max(10, stats[a.key] || 0) // Minimum baseline for visibility
    }));
  }, [stats]);

  const latestStatsDate = snapshot?.date ? new Date(snapshot.date).toLocaleDateString() : 'Live';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Snapshot: {latestStatsDate}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>
            Development Shape
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
        <div style={{ width: '100%', maxWidth: 300, aspectRatio: '1/1' }}>
          <RadarChart
            data={radarData}
            max={100}
            color={ACCENT}
            textColor={t.pageText}
          />
        </div>
      </div>

      <div>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.1em', color: t.muted, textTransform: 'uppercase', marginBottom: '1rem' }}>
          Evidence Coverage & Score Engine
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          {AXES.map(a => (
            <StatCard
              key={a.key}
              t={t}
              dark={dark}
              axisInfo={a}
              stat={stats[a.key]}
              details={axisDetails[a.key]}
              quests={allQuests.filter(q => q.axis === a.key)}
              onClick={setSelectedAxis}
            />
          ))}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: t.muted, marginTop: '1rem', textAlign: 'center' }}>
          C: Consistency (Volume), V: Value (Quests/Milestones), M: Momentum (Recency)
        </div>
      </div>

      {selectedAxis && (
        <StatHistoryModal
          t={t}
          dark={dark}
          axis={selectedAxis}
          axisInfo={AXES.find(a => a.key === selectedAxis)}
          allLogs={allLogs}
          allQuests={allQuests.filter(q => q.axis === selectedAxis)}
          axisConfig={axisConfigs.find(c => c.axis === selectedAxis)}
          onClose={() => setSelectedAxis(null)}
        />
      )}
    </div>
  );
}
