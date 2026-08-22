import React, { useState, useEffect } from 'react';
import { getAllGymSessions, addGymSession } from '../database/gymSessionsRepository.js';
import { localDateStr } from '../helpers/dateHelpers.js';
import { ACCENT } from '../constants.js';

export default function GymLog({ t }) {
  const [sessions, setSessions] = useState([]);
  
  const loadSessions = async () => {
    const data = await getAllGymSessions();
    setSessions(data);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleAddSession = async () => {
    await addGymSession({
      date: localDateStr(),
      exercises: [
        { name: 'Push-ups', sets: 3, reps: 15, weight: 0 },
        { name: 'Pull-ups', sets: 3, reps: 8, weight: 0 }
      ],
      notes: 'Testing log'
    });
    loadSessions();
  };

  return (
    <div style={{ marginTop: '2rem', padding: '1rem', border: `1px solid ${t.border}`, background: t.subtleBg }}>
      <h2 style={{ fontFamily: 'monospace', color: ACCENT, fontSize: '0.8rem', textTransform: 'uppercase' }}>Gym Log (Minimal)</h2>
      {sessions.map(s => (
        <div key={s.id} style={{ marginTop: '1rem', paddingBottom: '1rem', borderBottom: `1px solid ${t.borderSoft}` }}>
          <div><strong style={{ color: t.pageText }}>{s.date}</strong> - {s.notes}</div>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.85rem', color: t.pageText }}>
            {s.exercises.map((ex, i) => <li key={i}>{ex.name}: {ex.sets}x{ex.reps} {ex.weight > 0 ? `(${ex.weight}kg)` : ''}</li>)}
          </ul>
        </div>
      ))}
      <button style={btnStyle(t)} onClick={handleAddSession}>+ Log Sample Session</button>
    </div>
  );
}

function btnStyle(t) {
  return {
    marginTop: '1rem',
    padding: '0.5rem',
    background: 'transparent',
    color: t.pageText,
    border: `1px solid ${t.border}`,
    cursor: 'pointer'
  };
}
