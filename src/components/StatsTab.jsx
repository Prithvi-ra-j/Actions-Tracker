import React, { useState, useEffect } from 'react';
import RadarChart from './RadarChart.jsx';
import { LIFE_DIMENSIONS } from '../constants.js';
import { BottomSheet } from './ui/Overlays.jsx';
import { Button } from './ui/Buttons.jsx';
import { EmptyState } from './ui/States.jsx';
import { SegmentedBar } from './ui/Indicators.jsx';
import { Sparkle } from '@phosphor-icons/react';

// Axis color map for dots only
const AXIS_COLORS = {
  body:       'var(--body)',
  discipline: 'var(--discipline)',
  knowledge:  'var(--knowledge)',
  social:     'var(--social)',
  creativity: 'var(--creativity)',
  strategy:   'var(--strategy)',
};

function AxisSheet({ axisKey, stats, axisDetails, snapshots, onOpenJarvis, onClose }) {
  const info = LIFE_DIMENSIONS.find(d => d.key === axisKey);
  const val = Math.round(stats[axisKey] || 0);
  const color = AXIS_COLORS[axisKey] || 'var(--mu)';
  const components = axisDetails[axisKey]?.components || [];

  // 4-week trend from snapshots
  const trend = snapshots
    .slice(0, 4)
    .reverse()
    .map(s => Math.round(s.stats?.[axisKey] || 0));

  const maxTrend = Math.max(...trend, val, 1);

  // Monthly delta
  const oldest = trend[0] ?? val;
  const delta = val - oldest;
  const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: color, display: 'inline-block', flexShrink: 0,
        }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--tx)' }}>
          {info?.label || axisKey}
        </span>
      </div>

      {/* Value + delta */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <span style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '34px',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--tx)',
        }}>
          {val}
        </span>
        <span style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '13px',
          color: delta >= 0 ? 'var(--strategy)' : 'var(--danger)',
          fontWeight: 500,
        }}>
          {deltaStr} this month
        </span>
      </div>

      {/* 4-Week trend bars */}
      {trend.length > 1 && (
        <div>
          <div style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11.5px',
            color: 'var(--mu)',
            marginBottom: '8px',
          }}>
            4-week trend
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '6px',
            height: '48px',
          }}>
            {trend.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: '100%',
                  height: `${Math.round((v / maxTrend) * 40)}px`,
                  background: 'var(--ac)',
                  borderRadius: '4px 4px 2px 2px',
                  minHeight: '4px',
                  transition: 'height 0.3s',
                }} />
                <span style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: '10px',
                  color: 'var(--mu)',
                }}>
                  W{i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contributions */}
      {components.length > 0 && (
        <div>
          <div style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11.5px',
            color: 'var(--mu)',
            marginBottom: '8px',
          }}>
            What contributes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {components.slice(0, 4).map((comp, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <span style={{ color: 'var(--tx)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {comp.signal?.replace(/_/g, ' ')}
                </span>
                <div style={{ width: '80px', height: '5px', background: 'var(--hairline)', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, Math.round((comp.contribution / (components[0]?.contribution || 1)) * 100))}%`,
                    background: 'var(--ac)',
                  }} />
                </div>
                <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11.5px', color: 'var(--mu)', flexShrink: 0 }}>
                  +{Math.round(comp.contribution)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent evidence — use components as evidence proxy */}
      {components.length === 0 && (
        <div style={{ fontSize: '13px', color: 'var(--mu)' }}>
          No recent contributions recorded.
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        <Button
          variant="primary"
          style={{ flex: 1, fontSize: '14px' }}
          onClick={() => {
            onClose();
            onOpenJarvis?.({
              page: 'stats',
              entityType: 'axis',
              entityId: axisKey,
              payload: { axis: info?.label || axisKey, value: val, trend, delta },
            });
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkle size={16} weight="fill" />
            Why did this change?
          </span>
        </Button>
      </div>
      <Button
        variant="secondary"
        style={{ width: '100%', fontSize: '14px' }}
        onClick={onClose}
      >
        Audit this metric
      </Button>
    </div>
  );
}

export default function StatsTab({
  t, stats, axisDetails, snapshot, allQuests, allLogs, axisConfigs, onOpenJarvis,
}) {
  const [selectedAxis, setSelectedAxis] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSnapshots() {
      try {
        const { getAllSnapshots } = await import('../database/statSnapshotsRepository.js');
        const snaps = await getAllSnapshots();
        setSnapshots(snaps.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSnapshots();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '24px 14px', color: 'var(--mu)', fontSize: '14px' }}>
        Reviewing recent evidence...
      </div>
    );
  }

  const totalLogs = allLogs?.length || 0;
  if (totalLogs === 0) {
    return (
      <div style={{ padding: '16px' }}>
        <EmptyState
          title="Not enough evidence yet"
          description="Complete some habits or log evidence to generate your stats."
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '0 14px 24px' }}>

      {/* Radar Chart — full width */}
      <div style={{ margin: '8px 0 20px' }}>
        <RadarChart stats={stats} snapshot={snapshot?.stats} />
      </div>

      {/* Axis list — 2-column grid per mockup */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0 16px',
      }}>
        {LIFE_DIMENSIONS.map(axis => {
          const val = Math.round(stats[axis.key] || 0);
          const color = AXIS_COLORS[axis.key] || 'var(--mu)';
          // compute delta from oldest snapshot
          const oldest = snapshots.slice(-1)[0]?.stats?.[axis.key] ?? val;
          const delta = val - Math.round(oldest);
          const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;

          return (
            <div
              key={axis.key}
              onClick={() => setSelectedAxis(axis.key)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                minHeight: '40px',
                borderBottom: '1px solid var(--hairline)',
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onPointerDown={e => e.currentTarget.style.opacity = '0.7'}
              onPointerUp={e => e.currentTarget.style.opacity = '1'}
              onPointerLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--tx)' }}>
                {axis.label}
              </span>
              <span style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '12px',
                color: 'var(--mu)',
                flexShrink: 0,
              }}>
                {val}&nbsp;
                <span style={{ color: delta >= 0 ? 'var(--strategy)' : 'var(--danger)' }}>
                  {deltaStr}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Axis Detail Sheet */}
      <BottomSheet
        isOpen={!!selectedAxis}
        onClose={() => setSelectedAxis(null)}
        title={LIFE_DIMENSIONS.find(d => d.key === selectedAxis)?.label}
      >
        {selectedAxis && (
          <AxisSheet
            axisKey={selectedAxis}
            stats={stats}
            axisDetails={axisDetails}
            snapshots={snapshots}
            onOpenJarvis={onOpenJarvis}
            onClose={() => setSelectedAxis(null)}
          />
        )}
      </BottomSheet>
    </div>
  );
}
