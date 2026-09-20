import React, { useEffect, useState } from 'react';
import { ACCENT } from '../constants.js';

export default function ProfileTab({ t }) {
  return (
    <>
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.4rem' }}>Profile</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>Jack of all trades</div>
    </div>
    <p style={{ marginTop: '1.5rem', fontSize: '0.65rem', color: t.muted, lineHeight: 1.6, fontStyle: 'italic', textAlign: 'center' }}>Your personal context is kept in the system model and used by Jarvis when relevant.</p>
    </>
  );
}