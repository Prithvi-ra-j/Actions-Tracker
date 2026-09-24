import React, { useState, useEffect } from 'react';
import RadarChart from './RadarChart.jsx';
import { LIFE_DIMENSIONS } from '../constants.js';
import { EntityRow } from './ui/Cards.jsx';
import { BottomSheet } from './ui/Overlays.jsx';
import { Button, ContextualJarvisCTA } from './ui/Buttons.jsx';
import { EmptyState } from './ui/States.jsx';
import { MagicWand, ChartLineUp } from '@phosphor-icons/react';
import { EvidenceCard } from './ui/ActionPrimitives.jsx';
import { EvidenceSheet } from './EvidenceSheet.jsx';

export default function StatsTab({
  t, stats, axisDetails, snapshot, allQuests, allLogs, axisConfigs
}) {
  const [selectedAxis, setSelectedAxis] = useState(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSnapshots() {
      try {
        const { getAllSnapshots } = await import('../database/statSnapshotsRepository.js');
        const snaps = await getAllSnapshots();
        setSnapshots(snaps.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSnapshots();
  }, []);

  const totalLogs = allLogs?.length || 0;
  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--mu)' }}>Reviewing recent evidence...</div>;
  }

  if (totalLogs === 0) {
    return (
      <div style={{ padding: '16px' }}>
        <EmptyState 
          title="Not enough evidence" 
          description="Complete some habits or log evidence to generate your stats."
        />
      </div>
    );
  }

  const selectedData = selectedAxis ? {
    info: LIFE_DIMENSIONS.find(d => d.key === selectedAxis),
    stat: Math.round(stats[selectedAxis] || 0),
    details: axisDetails[selectedAxis],
    trend: snapshots.map(s => Math.round(s.stats[selectedAxis] || 0))
  } : null;

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Radar Chart */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 24px' }}>
          <div style={{ width: '100%', maxWidth: '300px' }}>
            <RadarChart stats={stats} snapshot={snapshot?.stats} />
          </div>
        </div>
      </section>

      {/* Axis List */}
      <section>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Dimensions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {LIFE_DIMENSIONS.map(axis => {
            const val = Math.round(stats[axis.key] || 0);
            return (
              <EntityRow
                key={axis.key}
                title={axis.label}
                label={axisDetails[axis.key]?.components?.length > 0 ? 'Active signals' : 'No recent signals'}
                onClick={() => setSelectedAxis(axis.key)}
                rightElement={<span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 600, color: 'var(--tx)' }}>{val}</span>}
              />
            );
          })}
        </div>
      </section>

      {/* Axis Detail Sheet */}
      <BottomSheet
        isOpen={!!selectedAxis}
        onClose={() => setSelectedAxis(null)}
        title={selectedData?.info?.label}
      >
        {selectedData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
              <span style={{ fontSize: '48px', fontWeight: 600, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>{selectedData.stat}</span>
            </div>

            {/* Contribution Breakdown */}
            {selectedData.details?.components?.length > 0 ? (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Top Contributions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedData.details.components.slice(0, 3).map((comp, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: 'var(--mu)' }}>{comp.signal.replace(/_/g, ' ')}</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>+{Math.round(comp.contribution)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--mu)' }}>No recent contributions recorded.</div>
            )}

            {/* Trend */}
            {selectedData.trend.length > 1 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ChartLineUp size={16} /> 4-Week Trend
                </div>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                  {selectedData.trend.slice(0, 4).reverse().map((t, i) => (
                    <div key={i} style={{ padding: '4px 8px', backgroundColor: 'var(--s2)', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowEvidence(true)}>
                Based on...
              </Button>
              <ContextualJarvisCTA 
                label="Why?" 
                contextIcon={<MagicWand size={18} weight="fill" />} 
                onClick={() => {
                  console.log('Open Jarvis for', selectedAxis);
                  setSelectedAxis(null);
                }}
              />
            </div>
          </div>
        )}
      </BottomSheet>

      <EvidenceSheet
        isOpen={showEvidence}
        onClose={() => setShowEvidence(false)}
        title={`Evidence for ${selectedData?.info?.label}`}
        evidenceItems={selectedData?.details?.components?.map(c => ({ content: c.signal, date: 'Recent' })) || []}
      />
    </div>
  );
}
