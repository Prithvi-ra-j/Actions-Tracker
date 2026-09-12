import React, { useState, useEffect, useMemo } from 'react';
import { ACCENT } from '../constants.js';
import { getAllSnapshots } from '../database/statSnapshotsRepository.js';

export default function StatHistoryModal({ t, axisInfo, allLogs, onClose }) {
  const { key: axis, label, color, icon } = axisInfo;
  
  const [history, setHistory] = useState([]);

  useEffect(() => {
    async function loadHistory() {
      const snaps = await getAllSnapshots();
      // Snaps are sorted newest-first. We want chronological for the graph.
      const chronological = [...snaps].reverse();
      
      const arr = chronological.map(snap => ({
        date: snap.date,
        modelVersion: snap.modelVersion ?? '0.1',
        stat: snap.stats[axis] ?? 0,
        C: snap.axisDetails?.[axis]?.C ?? 0,
        V: snap.axisDetails?.[axis]?.V ?? 0,
        M: snap.axisDetails?.[axis]?.M ?? 0,
      }));
      setHistory(arr);
    }
    loadHistory();
  }, [axis]);

  // 2. Generate Evidence Feed
  const evidenceFeed = useMemo(() => {
    return allLogs
      .filter(l => l.axis === axis)
      .sort((a, b) => b.date.localeCompare(a.date)); // reverse chronological
  }, [allLogs, axis]);

  // Find min/max for graph scaling
  const maxStat = Math.max(...history.map(h => h.stat), 10);
  const minStat = Math.min(...history.map(h => h.stat));
  const range = Math.max(maxStat - minStat, 1);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: t.pageBg, zIndex: 1000,
      overflowY: 'auto',
      padding: '1.5rem', paddingBottom: '4rem',
      fontFamily: 'Georgia, serif', color: t.pageText
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: t.pageText, fontSize: '1.5rem', cursor: 'pointer' }}>
          ×
        </button>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color }}>
          {icon} {label} History
        </div>
        <div style={{ width: '1.5rem' }} /> {/* balance flex */}
      </div>

      {/* Formula Breakdown (Explainability) */}
      {history.length > 0 && (
        <div style={{ background: t.subtleBg, padding: '1rem', border: `1px solid ${t.border}`, marginBottom: '1.5rem' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: t.muted, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Current Stat Formula Breakdown
          </div>
          <div style={{ fontSize: '0.8rem', color: t.pageText, marginBottom: '0.75rem', lineHeight: '1.4' }}>
            <strong>Score = 0.45(V) + 0.40(C) + 0.15(M)</strong>
            <br/>
            <span style={{ color: t.muted, fontSize: '0.75rem' }}>Calculated dynamically from the evidence log below.</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color }}>{Math.round(history[0].V)}</div>
              <div style={{ fontSize: '0.65rem', color: t.muted }}>Volume</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color }}>{Math.round(history[0].C)}</div>
              <div style={{ fontSize: '0.65rem', color: t.muted }}>Consistency</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color }}>{Math.round(history[0].M)}</div>
              <div style={{ fontSize: '0.65rem', color: t.muted }}>Momentum</div>
            </div>
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
              <div style={{ color }}>{Math.round(history[0].stat)}</div>
              <div style={{ fontSize: '0.65rem', color: t.muted }}>Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Snapshot Graph */}
      <div style={{ background: t.subtleBg, padding: '1rem', border: `1px solid ${t.border}`, marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: t.muted, marginBottom: '1rem', textTransform: 'uppercase' }}>
          Historical Snapshots
        </div>
        {history.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: t.muted, fontStyle: 'italic' }}>No snapshots yet.</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', height: 120, gap: '4px', position: 'relative' }}>
              {history.map((h, i) => {
                const hPct = range > 0 ? ((h.stat - minStat) / range) * 100 : 50;
                return (
                  <div key={h.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', position: 'relative' }} title={`${h.date}: ${Math.round(h.stat)} (v${h.modelVersion})`}>
                    <div style={{ width: '100%', height: `${hPct}%`, background: color, minHeight: 4, opacity: i === history.length - 1 ? 1 : 0.6, borderRadius: '2px 2px 0 0' }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.5rem', color: t.muted }}>
              <span>{history[0]?.date}</span>
              <span>{history[history.length - 1]?.date}</span>
            </div>
          </>
        )}
      </div>

      {/* Evidence Feed */}
      <div>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: t.muted, marginBottom: '1rem', textTransform: 'uppercase' }}>
          Evidence contributing to this period
        </div>
        {evidenceFeed.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: t.muted, fontStyle: 'italic' }}>No evidence yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {evidenceFeed.map((log, i) => {
              const isVolume = ['book_finished', 'journal_entry', 'quest_progress'].includes(log.type);
              const tag = isVolume ? 'VOLUME' : 'CONSISTENCY';
              return (
                <div key={log.id ?? i} style={{ padding: '0.75rem', borderLeft: `2px solid ${color}`, background: t.subtleBg }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: t.muted }}>{log.date}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.55rem', color, padding: '2px 4px', background: t.pageBg, borderRadius: '2px' }}>{tag} (+{log.value ?? 1})</span>
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    {log.type === 'daily_checkbox' && `Daily Checkbox (${log.meta?.task})`}
                    {log.type === 'journal_entry' && `Journal: "${log.meta?.text}"`}
                    {log.type === 'book_finished' && `Finished a book`}
                    {!['daily_checkbox', 'journal_entry', 'book_finished'].includes(log.type) && `Log: ${log.type}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
