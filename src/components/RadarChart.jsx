import React, { useMemo } from 'react';

/**
 * RadarChart — SVG hexagonal radar chart (spec §9).
 *
 * Props:
 *   stats        — values for the six life dimensions (0–99)
 *   snapshot     — same shape, last weekly snapshot (or null) → historical overlay
 *   targets      — same shape, year-end targets → target overlay
 *   size         — optional SVG width/height (default 300)
 */

// Axis order clockwise from top (spec §9)
const AXES = [
  { key: 'body',       label: 'Body',       color: 'var(--body)' },
  { key: 'discipline', label: 'Discipline', color: 'var(--discipline)' },
  { key: 'knowledge',  label: 'Knowledge',  color: 'var(--knowledge)' },
  { key: 'social',     label: 'Social',     color: 'var(--social)' },
  { key: 'creativity', label: 'Creativity', color: 'var(--creativity)' },
  { key: 'strategy',   label: 'Strategy',   color: 'var(--strategy)' },
];

const MAX_VALUE = 99;
const GRID_RINGS = [20, 40, 60, 80, 99];

/** Converts a value (0–99) and axis index to an SVG point. */
function axisPoint(cx, cy, maxR, axisIndex, value) {
  const angle = -Math.PI / 2 + axisIndex * (Math.PI / 3); // clockwise from top
  const r = (value / MAX_VALUE) * maxR;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

/** Builds a polygon points string from a stats object. */
function statsToPoints(cx, cy, maxR, stats) {
  return AXES.map(({ key }, i) => {
    const val = Math.max(0, Math.min(stats[key] ?? 0, MAX_VALUE));
    const p = axisPoint(cx, cy, maxR, i, val);
    return `${p.x},${p.y}`;
  }).join(' ');
}

/** Builds a hexagon ring at a given radius. */
function hexPoints(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = -Math.PI / 2 + i * (Math.PI / 3);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

export default function RadarChart({ stats = {}, snapshot = null, targets = null, size = 300 }) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.28;

  // Label positions — pushed out beyond the max ring
  const labelOffset = maxR * 1.22;

  const axisEndpoints = useMemo(() =>
    AXES.map(({ key, label, color }, i) => {
      const angle = -Math.PI / 2 + i * (Math.PI / 3);
      const tipX = cx + (maxR + 2) * Math.cos(angle);
      const tipY = cy + (maxR + 2) * Math.sin(angle);
      const lx = cx + labelOffset * Math.cos(angle);
      const ly = cy + labelOffset * Math.sin(angle);
      return { key, label, color, tipX, tipY, lx, ly, angle };
    }),
    [cx, cy, maxR, labelOffset],
  );

  const currentPts  = statsToPoints(cx, cy, maxR, stats);
  const snapshotPts = snapshot ? statsToPoints(cx, cy, maxR, snapshot) : null;
  const targetPts   = targets  ? statsToPoints(cx, cy, maxR, targets)  : null;

  const gridColor = 'var(--hairline)';
  const axisColor = 'var(--mu)';
  const ringLabelColor = 'var(--mu)';

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      style={{ display: 'block', maxWidth: size, margin: '0 auto' }}
      aria-label="Character stats radar chart"
      role="img"
    >
      <title>Character stats radar chart</title>
      <desc>
        {AXES.map(a => `${a.label}: ${Math.round(stats[a.key] || 0)}`).join(', ')}
      </desc>
      
      {/* ── Grid rings ─────────────────────────────────────────────────────── */}
      {GRID_RINGS.map(v => (
        <polygon
          key={v}
          points={hexPoints(cx, cy, (v / MAX_VALUE) * maxR)}
          fill="none"
          stroke={v === 99 ? axisColor : gridColor}
          strokeWidth={v === 99 ? 1.5 : 1}
        />
      ))}

      {/* Ring value labels (at rightmost vertex of each ring) */}
      {GRID_RINGS.filter(v => v !== 99).map(v => {
        const r = (v / MAX_VALUE) * maxR;
        const angle = -Math.PI / 2 + 1 * (Math.PI / 3); // axis 1 = top-right
        return (
          <text
            key={v}
            x={cx + r * Math.cos(angle) + 3}
            y={cy + r * Math.sin(angle) + 1}
            fontSize="5"
            fill={ringLabelColor}
            fontFamily="monospace"
          >
            {v}
          </text>
        );
      })}

      {/* ── Axis lines from centre to each tip ────────────────────────────── */}
      {axisEndpoints.map(({ key, tipX, tipY }) => (
        <line
          key={key}
          x1={cx} y1={cy}
          x2={tipX} y2={tipY}
          stroke={axisColor}
          strokeWidth={1}
        />
      ))}

      {/* ── Target polygon (year-end goal line) ───────────────────────────── */}
      {targetPts && (
        <polygon
          points={targetPts}
          fill="none"
          stroke="var(--ac)"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.45}
        />
      )}

      {/* ── Snapshot / historical polygon ─────────────────────────────────── */}
      {snapshotPts && (
        <polygon
          points={snapshotPts}
          fill="var(--mu)"
          fillOpacity={0.04}
          stroke="var(--mu)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      )}

      {/* ── Current stats polygon ─────────────────────────────────────────── */}
      <polygon
        points={currentPts}
        fill="var(--ac)"
        fillOpacity={0.18}
        stroke="var(--ac)"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* ── Data point dots on current polygon ───────────────────────────── */}
      {AXES.map(({ key }, i) => {
        const val = Math.max(0, Math.min(stats[key] ?? 0, MAX_VALUE));
        const p = axisPoint(cx, cy, maxR, i, val);
        return (
          <circle
            key={key}
            cx={p.x} cy={p.y}
            r={3}
            fill="var(--ac)"
            stroke="var(--bg)"
            strokeWidth={1.5}
          />
        );
      })}

      {/* ── Axis labels ───────────────────────────────────────────────────── */}
      {axisEndpoints.map(({ key, label, color, lx, ly, angle }) => {
        // Determine text-anchor and vertical alignment based on angle position
        let anchor = 'middle';
        if (Math.cos(angle) > 0.1) anchor = 'start';
        else if (Math.cos(angle) < -0.1) anchor = 'end';

        const val = Math.round(stats[key] ?? 0);

        return (
          <g key={key}>
            <text
              x={lx}
              y={ly - 5}
              textAnchor={anchor}
              fontSize="7.5"
              fontFamily="monospace"
              letterSpacing="0.08em"
              fill={color}
              fontWeight="bold"
            >
              {label.toUpperCase()}
            </text>
            <text
              x={lx}
              y={ly + 6}
              textAnchor={anchor}
              fontSize="9"
              fontFamily="monospace"
              fontWeight="900"
              fill="var(--tx)"
            >
              {val}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
