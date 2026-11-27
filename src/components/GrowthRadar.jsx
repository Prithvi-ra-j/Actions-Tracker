import React from 'react';

export default function GrowthRadar({ axes }) {
  const center = 150;
  const radius = 90;
  const points = axes.map((axis, index) => {
    const angle = -Math.PI / 2 + index * 2 * Math.PI / axes.length;
    return {
      ...axis, x: center + Math.cos(angle) * radius * axis.value / 100,
      y: center + Math.sin(angle) * radius * axis.value / 100,
      tipX: center + Math.cos(angle) * radius, tipY: center + Math.sin(angle) * radius,
      labelX: center + Math.cos(angle) * (radius + 18),
      labelY: center + Math.sin(angle) * (radius + 18),
    };
  });
  return <svg viewBox="0 0 300 300" width="100%" role="img"
    aria-label={`Evidence-backed scores: ${axes.map(axis => `${axis.label} ${axis.value}`).join(', ')}`}
    style={{ display: 'block', maxWidth: 300, margin: 'auto' }}>
    <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--hairline)" />
    {points.map(point => <line key={point.key} x1={center} y1={center} x2={point.tipX} y2={point.tipY}
      stroke="var(--hairline)" />)}
    {points.length > 2 && <polygon points={points.map(point => `${point.x},${point.y}`).join(' ')}
      fill="var(--ac)" fillOpacity="0.15" stroke="var(--ac)" />}
    {points.map(point => <g key={point.key}>
      <circle cx={point.x} cy={point.y} r="4" fill="var(--ac)" />
      <text x={point.labelX} y={point.labelY} textAnchor="middle" dominantBaseline="middle"
        fill="var(--tx)" fontSize="10">{point.label} {point.value}</text>
    </g>)}
  </svg>;
}
