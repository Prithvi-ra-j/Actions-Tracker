import React, { useMemo, useState, useEffect } from 'react';
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
import { COLORS } from '../theme.js';

const AXES = [
  { key: 'body',       label: 'Body',       color: COLORS.domains.body },
  { key: 'discipline', label: 'Discipline', color: COLORS.domains.discipline },
  { key: 'knowledge',  label: 'Knowledge',  color: COLORS.domains.knowledge },
  { key: 'social',     label: 'Social',     color: COLORS.domains.social || '#ff9500' },
  { key: 'creativity', label: 'Creativity', color: COLORS.domains.creativity },
  { key: 'strategy',   label: 'Strategy',   color: COLORS.domains.strategy },
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
  const components = details?.components || [];
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
        {components.length > 0 ? (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.55rem', fontFamily: 'monospace', color: t.muted, marginBottom: '0.5rem' }}>
            {components.slice(0, 3).map((comp, idx) => (
              <span key={idx} style={{ background: t.borderFaint, padding: '0.1rem 0.3rem', borderRadius: 2 }}>
                {comp.signal.replace(/_/g, ' ').substring(0, 12).toUpperCase()}: {Math.round(comp.contribution)}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '0.55rem', fontFamily: 'monospace', color: t.muted, marginBottom: '0.5rem' }}>
            No recent signals.
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontFamily: 'monospace', fontSize: '0.52rem', color: t.muted, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
          <span>{details?.scoreSource || 'canonical'} source</span>
          <span>coverage {Math.round((details?.coverage || 0) * 100)}%</span>
          <span>confidence {Math.round((details?.confidence || 0) * 100)}%</span>
        </div>
        {details?.fallbackReason && <div style={{ fontSize: '0.58rem', color: t.muted, marginBottom: '0.5rem' }}>{details.fallbackReason}</div>}
        {details?.warnings?.length > 0 && <div style={{ fontSize: '0.58rem', color: '#c1442c', marginBottom: '0.5rem' }}>{details.warnings[0]}</div>}
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

  // Load Historical Snapshots for Trends
  const [snapshots, setSnapshots] = useState([]);
  useEffect(() => {
    async function loadSnapshots() {
      const { getAllSnapshots } = await import('../database/statSnapshotsRepository.js');
      const snaps = await getAllSnapshots();
      // Sort descending by date
      setSnapshots(snaps.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)); 
    }
    loadSnapshots();
  }, []);

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
            stats={stats}
            snapshot={snapshot}
            dark={dark}
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
          C: Consistency, V: Volume, M: Momentum. Source and evidence quality are shown per domain.
        </div>
      </div>

      {/* Discipline Trends */}
      <div>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.1em', color: t.muted, textTransform: 'uppercase', marginBottom: '1rem' }}>
          Discipline Trends
        </div>
        {snapshots.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: t.muted, fontStyle: 'italic' }}>
            Not enough historical data yet. Check back next week.
          </div>
        ) : (
          <div style={{ border: `1px solid ${t.border}`, background: t.subtleBg, padding: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {snapshots.map(snap => (
                <div key={snap.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: t.pageText }}>
                    {snap.date}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: COLORS.domains.discipline }}>
                      {Math.round(snap.stats.discipline || 0)} score
                    </div>
                    {/* Visual bar */}
                    <div style={{ width: 100, height: 4, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${Math.round(snap.stats.discipline || 0)}%`, background: COLORS.domains.discipline, borderRadius: 2 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
