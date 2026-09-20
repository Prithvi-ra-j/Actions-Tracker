import React, { useState } from 'react';
import { SectionTitle, Subtitle } from './shared.jsx';

export default function SetupChecklist({ t, onClose }) {
  const [items, setItems] = useState([
    { id: 'health', label: 'Connect Health Data', done: false, desc: 'Sync sleep and activity for Body scores.' },
    { id: 'nutrilift', label: 'Connect NutriLift', done: false, desc: 'Sync workout logs and nutrition facts.' },
    { id: 'backup', label: 'Configure Backup', done: false, desc: 'Run your first backup and test restore.' },
    { id: 'jarvis', label: 'First Jarvis Audit', done: false, desc: 'Available after 3 days of data.' }
  ]);

  const toggle = (id) => {
    setItems(items.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const allDone = items.every(i => i.done);

  return (
    <div style={{ padding: '1rem', background: t?.subtleBg, border: `1px solid ${t?.border}`, borderRadius: '6px', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, color: t?.pageText, fontSize: '1.1rem' }}>Setup Checklist</h3>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', color: t?.muted, cursor: 'pointer' }}>×</button>}
      </div>
      <Subtitle t={t}>Complete these steps to finish setting up your system.</Subtitle>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {items.map(item => (
           <label key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', opacity: item.id === 'jarvis' ? 0.6 : 1 }}>
             <input 
               type="checkbox" 
               checked={item.done} 
               onChange={() => toggle(item.id)} 
               disabled={item.id === 'jarvis'}
               style={{ marginTop: '0.2rem' }}
             />
             <div>
               <div style={{ color: t?.pageText, fontWeight: 'bold', fontSize: '0.9rem', textDecoration: item.done ? 'line-through' : 'none' }}>
                 {item.label}
               </div>
               <div style={{ color: t?.muted, fontSize: '0.75rem' }}>
                 {item.desc}
               </div>
             </div>
           </label>
        ))}
      </div>
      
      {allDone && (
        <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#e6ffe6', color: '#006600', fontSize: '0.85rem', borderRadius: '4px' }}>
          All setup steps completed!
        </div>
      )}
    </div>
  );
}
