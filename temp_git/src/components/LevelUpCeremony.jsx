import React, { useEffect, useRef } from 'react';
import { ACCENT } from '../constants.js';

/**
 * LevelUpCeremony — full-screen overlay that fires when an axis crosses a
 * threshold tier boundary (spec §11).
 *
 * Props:
 *   levelUp  — { axis, value, newTitle, color } — the tier that was just crossed
 *   onDismiss — () => void
 */

const AXIS_ICONS = {
  strength:   '⚔',
  discipline: '🔥',
  knowledge:  '∞',
  wisdom:     '◎',
  creativity: '◈',
  strategy:   '♟',
};

export default function LevelUpCeremony({ levelUp, onDismiss }) {
  const { axis, value, newTitle, color } = levelUp;
  const icon = AXIS_ICONS[axis] ?? '✦';

  // Auto-dismiss after 12 s in case the user walks away
  useEffect(() => {
    const timer = setTimeout(onDismiss, 12000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0b0b0b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem',
        cursor: 'pointer',
        animation: 'ceremonyFadeIn 0.5s ease forwards',
      }}
    >
      {/* Radial glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at center, ${color}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Pulse ring */}
      <div style={{
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: '50%',
        border: `1px solid ${color}`,
        opacity: 0.15,
        animation: 'ceremonyPulse 2.5s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: '50%',
        border: `1px solid ${color}`,
        opacity: 0.25,
        animation: 'ceremonyPulse 2.5s ease-in-out infinite 0.5s',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', textAlign: 'center', animation: 'ceremonySlideUp 0.6s ease forwards' }}>
        {/* Label */}
        <div style={{
          fontFamily: 'monospace',
          fontSize: '0.45rem',
          letterSpacing: '0.4em',
          color: color,
          textTransform: 'uppercase',
          marginBottom: '1.5rem',
        }}>
          Threshold Reached
        </div>

        {/* Icon */}
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', lineHeight: 1 }}>
          {icon}
        </div>

        {/* Axis name */}
        <div style={{
          fontFamily: 'monospace',
          fontSize: '0.5rem',
          letterSpacing: '0.3em',
          color: color,
          textTransform: 'uppercase',
          marginBottom: '1.5rem',
        }}>
          {axis}
        </div>

        {/* Stat number */}
        <div style={{
          fontFamily: 'monospace',
          fontSize: 'clamp(4rem, 20vw, 7rem)',
          fontWeight: 900,
          lineHeight: 0.85,
          color: '#f7f3ec',
          letterSpacing: '-0.04em',
          marginBottom: '1rem',
        }}>
          {value}
        </div>

        {/* New title */}
        <div style={{
          fontFamily: 'monospace',
          fontSize: 'clamp(0.85rem, 4vw, 1.1rem)',
          fontWeight: 700,
          color: color,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '3rem',
        }}>
          {newTitle}
        </div>

        {/* Dismiss hint */}
        <div style={{
          fontFamily: 'monospace',
          fontSize: '0.4rem',
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}>
          Tap to continue
        </div>
      </div>

      <style>{`
        @keyframes ceremonyFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ceremonySlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes ceremonyPulse {
          0%, 100% { transform: scale(1);    opacity: 0.15; }
          50%       { transform: scale(1.12); opacity: 0.05; }
        }
      `}</style>
    </div>
  );
}
