import React, { useState, useEffect } from 'react';
import { BottomSheet } from './ui/Overlays';

export default function SettingsTab({ t, onClose }) {
  const [activeSection, setActiveSection] = useState(null); // 'data', 'memory', 'integrations', 'notifications', 'appearance'
  
  // Data state
  const [backupDate, setBackupDate] = useState('Automatic, today 6:12 am');
  const [storageUsed, setStorageUsed] = useState('12');
  
  // Memory state
  const [saveMemories, setSaveMemories] = useState(true);
  const [sendContext, setSendContext] = useState(true);
  const [memories, setMemories] = useState([]);

  // Notifications state
  const [proactive, setProactive] = useState(true);
  const [reminders, setReminders] = useState(false);

  useEffect(() => {
    import('../database/memoryRepository.js').then(m => {
      m.getSemanticMemories().then(setMemories);
    });
  }, []);

  const handleClearMemories = async () => {
    if (!window.confirm("Delete all memories?")) return;
    const { getSemanticMemories, rejectMemory } = await import('../database/memoryRepository.js');
    const all = await getSemanticMemories();
    for (const mem of all) {
      await rejectMemory(mem.id);
    }
    setMemories([]);
  };

  const handleBackup = async () => {
    const { exportDatabase } = await import('../database/db.js');
    const json = await exportDatabase();
    // Simulate download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `actions-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupDate(`Just now`);
  };

  const handleCopyDiagnostics = async () => {
    const { getErrorLogs } = await import('../core/errorLogger.js');
    const logs = getErrorLogs();
    await navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
    alert("Copied diagnostics to clipboard.");
  };

  const renderMainMenu = () => (
    <div className="bd" style={{ padding: '0 14px', flex: 1, overflowY: 'auto' }}>
      <div className="grp" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--ln)', background: 'var(--s1)', marginTop: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', borderBottom: '1px solid var(--ln)', font: '500 14.5px var(--f)', cursor: 'pointer' }} onClick={() => setActiveSection('data')}>
          Data
          <span style={{ marginLeft: 'auto', font: '500 12px "Geist Mono", monospace', color: 'var(--mu)' }}>Backup & storage ›</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', borderBottom: '1px solid var(--ln)', font: '500 14.5px var(--f)', cursor: 'pointer' }} onClick={() => setActiveSection('memory')}>
          Memory & Privacy
          <span style={{ marginLeft: 'auto', font: '500 12px "Geist Mono", monospace', color: 'var(--mu)' }}>›</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', borderBottom: '1px solid var(--ln)', font: '500 14.5px var(--f)', cursor: 'pointer' }} onClick={() => setActiveSection('integrations')}>
          Integrations
          <span style={{ marginLeft: 'auto', font: '500 12px "Geist Mono", monospace', color: 'var(--mu)' }}>›</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', borderBottom: '1px solid var(--ln)', font: '500 14.5px var(--f)', cursor: 'pointer' }} onClick={() => setActiveSection('notifications')}>
          Notifications
          <span style={{ marginLeft: 'auto', font: '500 12px "Geist Mono", monospace', color: 'var(--mu)' }}>›</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', font: '500 14.5px var(--f)', cursor: 'pointer' }} onClick={() => setActiveSection('appearance')}>
          Appearance & App
          <span style={{ marginLeft: 'auto', font: '500 12px "Geist Mono", monospace', color: 'var(--mu)' }}>›</span>
        </div>
      </div>
    </div>
  );

  const renderDataSection = () => (
    <div className="bd" style={{ padding: '0 14px', flex: 1, overflowY: 'auto' }}>
      <div style={{ font: '500 12.5px var(--f)', color: 'var(--mu)', margin: '16px 4px 8px' }}>Backup</div>
      <div className="grp" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--ln)', background: 'var(--s1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', borderBottom: '1px solid var(--ln)', font: '500 14.5px var(--f)' }}>
          Status
          <span style={{ marginLeft: 'auto', font: '500 12px "Geist Mono", monospace', color: 'var(--mu)' }}>{backupDate}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', font: '500 14.5px var(--f)', cursor: 'pointer' }} onClick={handleBackup}>
          Back up now
        </div>
      </div>

      <div style={{ font: '500 12.5px var(--f)', color: 'var(--mu)', margin: '16px 4px 8px' }}>Move data</div>
      <div className="grp" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--ln)', background: 'var(--s1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', borderBottom: '1px solid var(--ln)', font: '500 14.5px var(--f)', cursor: 'pointer' }} onClick={handleBackup}>
          Export data
        </div>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', font: '500 14.5px var(--f)', cursor: 'pointer' }}>
          Restore from backup
        </div>
      </div>

      <div style={{ font: '500 12.5px var(--f)', color: 'var(--mu)', margin: '16px 4px 8px' }}>Storage</div>
      <div style={{ background: 'var(--s1)', borderRadius: '16px', padding: '14px', marginBottom: '10px', boxShadow: 'inset 0 0 0 1px var(--ln)' }}>
        <span style={{ font: '500 11.5px "Geist Mono", monospace', color: 'var(--mu)' }}>Used on this device</span>
        <div style={{ font: '600 34px/1 var(--f)', letterSpacing: '-.02em', margin: '6px 0' }}>
          {storageUsed}<small style={{ fontSize: '14px', color: 'var(--mu)', fontWeight: 500 }}> MB</small>
        </div>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--mu)' }}>Restoring replaces current data after you confirm.</p>
    </div>
  );

  const renderMemorySection = () => (
    <div className="bd" style={{ padding: '0 14px', flex: 1, overflowY: 'auto' }}>
      <div className="grp" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--ln)', background: 'var(--s1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', borderBottom: '1px solid var(--ln)', font: '500 14.5px var(--f)' }}>
          Let Jarvis save memories
          <div style={{ marginLeft: 'auto', width: '44px', height: '26px', borderRadius: '13px', background: saveMemories ? 'var(--ac)' : 'var(--s2)', position: 'relative', boxShadow: 'inset 0 0 0 1px var(--ln)', cursor: 'pointer' }} onClick={() => setSaveMemories(!saveMemories)}>
            <div style={{ position: 'absolute', top: '3px', left: saveMemories ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: saveMemories ? '#1a0d04' : 'var(--mu)', transition: 'left 0.2s' }}></div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', font: '500 14.5px var(--f)' }}>
          Send only needed context
          <div style={{ marginLeft: 'auto', width: '44px', height: '26px', borderRadius: '13px', background: sendContext ? 'var(--ac)' : 'var(--s2)', position: 'relative', boxShadow: 'inset 0 0 0 1px var(--ln)', cursor: 'pointer' }} onClick={() => setSendContext(!sendContext)}>
            <div style={{ position: 'absolute', top: '3px', left: sendContext ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: sendContext ? '#1a0d04' : 'var(--mu)', transition: 'left 0.2s' }}></div>
          </div>
        </div>
      </div>

      <div style={{ font: '500 12.5px var(--f)', color: 'var(--mu)', margin: '16px 4px 8px' }}>Saved memories</div>
      <div className="grp" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--ln)', background: 'var(--s1)' }}>
        {memories.length === 0 ? (
          <div style={{ padding: '12px 14px', color: 'var(--mu)', fontStyle: 'italic', fontSize: '13px' }}>No memories yet.</div>
        ) : (
          memories.map(m => (
            <div key={m.id} style={{ padding: '12px 14px', borderBottom: '1px solid var(--ln)' }}>
              <b style={{ display: 'block', font: '500 14.5px var(--f)' }}>{m.content}</b>
              <span style={{ font: '500 11.5px "Geist Mono", monospace', color: 'var(--mu)' }}>{m.type || 'Memory'}</span>
            </div>
          ))
        )}
      </div>
      
      <button 
        style={{ marginTop: '14px', minHeight: '48px', width: '100%', padding: '0 20px', borderRadius: '12px', background: 'var(--s2)', color: '#e5484d', font: '600 14px var(--f)', border: 'none', cursor: 'pointer' }}
        onClick={handleClearMemories}
      >
        Clear all memories
      </button>
    </div>
  );

  const renderIntegrationsSection = () => (
    <div className="bd" style={{ padding: '0 14px', flex: 1, overflowY: 'auto' }}>
      <div className="grp" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--ln)', background: 'var(--s1)' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--ln)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <b style={{ font: '500 14.5px var(--f)' }}>Health Connect</b>
            <span style={{ font: '500 11.5px "Geist Mono", monospace', color: 'var(--mu)' }}>Not connected</span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--mu)', marginTop: '4px' }}>Steps, workouts and sleep feed Body evidence.</p>
        </div>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <b style={{ font: '500 14.5px var(--f)' }}>NutriLift</b>
            <span style={{ font: '500 11.5px "Geist Mono", monospace', color: 'var(--mu)' }}>Not connected</span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--mu)', marginTop: '4px' }}>Workout sessions and nutrition.</p>
        </div>
      </div>
      <button style={{ marginTop: '14px', minHeight: '48px', width: '100%', padding: '0 20px', borderRadius: '12px', background: 'var(--ac)', color: 'var(--on)', font: '600 14px var(--f)', border: 'none', cursor: 'pointer' }}>
        Connect Integration
      </button>
      <p style={{ fontSize: '13px', color: 'var(--mu)', marginTop: '12px' }}>Evidence from an integration always shows its source.</p>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="bd" style={{ padding: '0 14px', flex: 1, overflowY: 'auto' }}>
      <div className="grp" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--ln)', background: 'var(--s1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', borderBottom: '1px solid var(--ln)', font: '500 14.5px var(--f)' }}>
          Proactive suggestions
          <div style={{ marginLeft: 'auto', width: '44px', height: '26px', borderRadius: '13px', background: proactive ? 'var(--ac)' : 'var(--s2)', position: 'relative', boxShadow: 'inset 0 0 0 1px var(--ln)', cursor: 'pointer' }} onClick={() => setProactive(!proactive)}>
            <div style={{ position: 'absolute', top: '3px', left: proactive ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: proactive ? '#1a0d04' : 'var(--mu)', transition: 'left 0.2s' }}></div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', borderBottom: '1px solid var(--ln)', font: '500 14.5px var(--f)' }}>
          Review reminders
          <div style={{ marginLeft: 'auto', width: '44px', height: '26px', borderRadius: '13px', background: reminders ? 'var(--ac)' : 'var(--s2)', position: 'relative', boxShadow: 'inset 0 0 0 1px var(--ln)', cursor: 'pointer' }} onClick={() => setReminders(!reminders)}>
            <div style={{ position: 'absolute', top: '3px', left: reminders ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: reminders ? '#1a0d04' : 'var(--mu)', transition: 'left 0.2s' }}></div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', font: '500 14.5px var(--f)' }}>
          Quiet hours
          <span style={{ marginLeft: 'auto', font: '500 12px "Geist Mono", monospace', color: 'var(--mu)' }}>10 pm to 7 am</span>
        </div>
      </div>

      <div style={{ font: '500 12.5px var(--f)', color: 'var(--mu)', margin: '16px 4px 8px' }}>Preview</div>
      <div style={{ background: 'var(--s1)', borderRadius: '16px', padding: '14px', marginBottom: '10px', boxShadow: 'inset 0 0 0 1px var(--ln)' }}>
        <span style={{ font: '500 11.5px "Geist Mono", monospace', color: 'var(--mu)' }}>Jarvis</span>
        <p style={{ color: 'var(--tx)', marginTop: '4px', fontSize: '13px' }}>Your evening routine was missed four times this week. Want me to check whether the schedule still fits?</p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button style={{ flex: 1, minHeight: '48px', padding: '0 8px', borderRadius: '12px', background: 'var(--ac)', color: 'var(--on)', font: '600 14px var(--f)', border: 'none' }}>Review</button>
          <button style={{ flex: 1, minHeight: '48px', padding: '0 8px', borderRadius: '12px', background: 'var(--s2)', color: 'var(--tx)', font: '600 14px var(--f)', border: 'none' }}>Adjust</button>
          <button style={{ flex: 1, minHeight: '48px', padding: '0 8px', borderRadius: '12px', background: 'var(--s2)', color: 'var(--tx)', font: '600 14px var(--f)', border: 'none' }}>Dismiss</button>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSection = () => (
    <div className="bd" style={{ padding: '0 14px', flex: 1, overflowY: 'auto' }}>
      <div className="grp" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--ln)', background: 'var(--s1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', borderBottom: '1px solid var(--ln)', font: '500 14.5px var(--f)' }}>
          Theme
          <span style={{ marginLeft: 'auto', font: '500 12px "Geist Mono", monospace', color: 'var(--mu)' }}>Codex dark</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', font: '500 14.5px var(--f)' }}>
          Reduce motion
          <span style={{ marginLeft: 'auto', font: '500 12px "Geist Mono", monospace', color: 'var(--mu)' }}>Follow system</span>
        </div>
      </div>

      <div style={{ font: '500 12.5px var(--f)', color: 'var(--mu)', margin: '16px 4px 8px' }}>Diagnostics</div>
      <div className="grp" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--ln)', background: 'var(--s1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', borderBottom: '1px solid var(--ln)', font: '500 14.5px var(--f)', cursor: 'pointer' }} onClick={handleCopyDiagnostics}>
          Copy diagnostic info
        </div>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', font: '500 14.5px var(--f)' }}>
          Recent errors
          <span style={{ marginLeft: 'auto', font: '500 12px "Geist Mono", monospace', color: 'var(--mu)' }}>0</span>
        </div>
      </div>

      <div style={{ font: '500 12.5px var(--f)', color: 'var(--mu)', margin: '16px 4px 8px' }}>Version</div>
      <div className="grp" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--ln)', background: 'var(--s1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', borderBottom: '1px solid var(--ln)', font: '500 14.5px var(--f)' }}>
          Version
          <span style={{ marginLeft: 'auto', font: '500 12px "Geist Mono", monospace', color: 'var(--mu)' }}>1.5.0</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', font: '500 14.5px var(--f)' }}>
          Check for updates
        </div>
      </div>
    </div>
  );

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'data': return 'Data';
      case 'memory': return 'Memory and privacy';
      case 'integrations': return 'Integrations';
      case 'notifications': return 'Notifications';
      case 'appearance': return 'Appearance';
      default: return 'Settings';
    }
  };

  const getSectionSubtitle = () => {
    switch (activeSection) {
      case 'data': return 'Backup and storage';
      case 'memory': return 'What Jarvis can remember';
      case 'integrations': return 'Evidence sources';
      case 'notifications': return 'Proactive suggestions';
      case 'appearance': return 'Diagnostics and version';
      default: return 'App configuration';
    }
  };

  return (
    <BottomSheet isOpen={true} onClose={onClose}>
      <div className="hd" style={{ display: 'flex', alignItems: 'flex-end', padding: '10px 0 12px' }}>
        <div>
          <h2 style={{ font: '600 26px/1.1 var(--f)', letterSpacing: '-.02em' }}>{getSectionTitle()}</h2>
          <p style={{ fontSize: '13px', color: 'var(--mu)' }}>{getSectionSubtitle()}</p>
        </div>
        {activeSection && (
          <span 
            className="pill" 
            style={{ marginLeft: 'auto', font: '500 11.5px "Geist Mono", monospace', color: 'var(--mu)', padding: '9px 12px', borderRadius: '12px', boxShadow: 'inset 0 0 0 1px var(--ln)', cursor: 'pointer' }}
            onClick={() => setActiveSection(null)}
          >
            Back
          </span>
        )}
      </div>

      {!activeSection && renderMainMenu()}
      {activeSection === 'data' && renderDataSection()}
      {activeSection === 'memory' && renderMemorySection()}
      {activeSection === 'integrations' && renderIntegrationsSection()}
      {activeSection === 'notifications' && renderNotificationsSection()}
      {activeSection === 'appearance' && renderAppearanceSection()}
    </BottomSheet>
  );
}
