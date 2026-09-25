import React, { useState, useEffect } from 'react';
import { BottomSheet, ConfirmDialog } from './ui/Overlays';

export default function SettingsTab({ t, onClose }) {
  const [activeSection, setActiveSection] = useState(null); // 'data', 'memory', 'integrations', 'notifications', 'appearance', 'ai'
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [clearMemoryOpen, setClearMemoryOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreError, setRestoreError] = useState(null);
  const [aiKey, setAiKey] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiVerify, setAiVerify] = useState(null);
  
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
    Promise.all([
      import('../database/settingsRepository.js'),
      import('../native/secureStorage.js')
    ]).then(async ([settings, secure]) => {
      setAiBaseUrl(await settings.getSetting('aiBaseUrl') || 'https://api.groq.com/openai/v1');
      setAiModel(await settings.getSetting('aiModel') || 'openai/gpt-oss-20b');
      setAiKey(await secure.getSecureValue('aiApiKey') || '');
    }).catch(() => {});
    import('../database/memoryRepository.js').then(m => {
      m.getSemanticMemories().then(setMemories);
    });
  }, []);

  const handleClearMemories = async () => {
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

  const handleRestore = async () => {
    if (!restoreFile) return;
    try {
      const json = await restoreFile.text();
      const { importDatabase } = await import('../database/db.js');
      const result = await importDatabase(json);
      setRestoreOpen(false);
      setRestoreFile(null);
      setBackupDate('Restored just now');
      setRestoreError(`Restored ${Object.values(result.counts).reduce((a, b) => a + b, 0)} records. Reload the app to refresh views.`);
    } catch (err) {
      setRestoreError(err.message);
    }
  };

  const handleVerifyAI = async () => {
    setAiVerify({ status: 'checking' });
    const { verifyLLMConnection } = await import('../core/ai/llmClient.js');
    const result = await verifyLLMConnection(aiKey, aiBaseUrl, aiModel);
    setAiVerify(result.ok ? { status: 'ok', ...result } : { status: 'error', error: result.error });
  };

  const handleSaveAI = async () => {
    const { setSetting } = await import('../database/settingsRepository.js');
    const { setSecureValue } = await import('../native/secureStorage.js');
    await setSetting('aiBaseUrl', aiBaseUrl);
    await setSetting('aiModel', aiModel);
    if (aiKey) await setSecureValue('aiApiKey', aiKey);
    setAiKey(aiKey ? '••••••••••••' : '');
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
          AI
          <span style={{ marginLeft: 'auto', font: '500 12px "Geist Mono", monospace', color: 'var(--mu)' }}>Provider & model ›</span>
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
        <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', font: '500 14.5px var(--f)', cursor: 'pointer' }} onClick={() => setRestoreOpen(true)}>
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
      {restoreError && <p style={{ fontSize: '13px', color: restoreError.startsWith('Restored') ? 'var(--success)' : 'var(--danger)' }}>{restoreError}</p>}
      <input id="backup-restore-file" type="file" accept="application/json,.json" style={{ width: '100%', marginTop: '10px', color: 'var(--mu)' }} onChange={e => { setRestoreFile(e.target.files?.[0] || null); setRestoreOpen(true); }} />
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
        onClick={() => setClearMemoryOpen(true)}
      >
        Clear all memories
      </button>
    </div>
  );

  const renderAISection = () => (
    <div className="bd" style={{ padding: '0 14px', flex: 1, overflowY: 'auto' }}>
      <p style={{ fontSize: '13px', color: 'var(--mu)' }}>Jarvis needs an OpenAI-compatible provider. Keys are stored through secure storage and never displayed in full.</p>
      <label style={{ fontSize: '12.5px', color: 'var(--mu)' }}>Base URL</label>
      <input value={aiBaseUrl} onChange={e => setAiBaseUrl(e.target.value)} style={{ width: '100%', margin: '6px 0 12px', minHeight: '46px', padding: '0 12px', borderRadius: '10px', background: 'var(--s2)', color: 'var(--tx)', border: '1px solid var(--ln)' }} />
      <label style={{ fontSize: '12.5px', color: 'var(--mu)' }}>Model</label>
      <input value={aiModel} onChange={e => setAiModel(e.target.value)} style={{ width: '100%', margin: '6px 0 12px', minHeight: '46px', padding: '0 12px', borderRadius: '10px', background: 'var(--s2)', color: 'var(--tx)', border: '1px solid var(--ln)' }} />
      <label style={{ fontSize: '12.5px', color: 'var(--mu)' }}>API key</label>
      <input type="password" value={aiKey} onChange={e => setAiKey(e.target.value)} placeholder="Stored securely" style={{ width: '100%', margin: '6px 0 12px', minHeight: '46px', padding: '0 12px', borderRadius: '10px', background: 'var(--s2)', color: 'var(--tx)', border: '1px solid var(--ln)' }} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleVerifyAI} style={{ flex: 1, minHeight: '48px', borderRadius: '12px', border: 'none', background: 'var(--s2)', color: 'var(--tx)', fontWeight: 600 }}>Verify</button>
        <button onClick={handleSaveAI} style={{ flex: 1, minHeight: '48px', borderRadius: '12px', border: 'none', background: 'var(--ac)', color: 'var(--on-ac)', fontWeight: 600 }}>Save</button>
      </div>
      {aiVerify?.status === 'checking' && <p style={{ color: 'var(--mu)' }}>Checking connection…</p>}
      {aiVerify?.status === 'ok' && <p style={{ color: 'var(--success)' }}>Verified · {aiVerify.model} · {aiVerify.latencyMs} ms</p>}
      {aiVerify?.status === 'error' && <p style={{ color: 'var(--danger)' }}>{aiVerify.error}</p>}
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
      case 'ai': return 'AI';
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
      case 'ai': return 'Provider, model, and verification';
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
      {activeSection === 'ai' && renderAISection()}
      {activeSection === 'integrations' && renderIntegrationsSection()}
      <ConfirmDialog isOpen={!!restoreOpen && !!restoreFile} onClose={() => setRestoreOpen(false)} onConfirm={handleRestore} title="Restore backup" description={restoreFile ? `Restore ${restoreFile.name}? This replaces current data.` : 'Choose a backup file first.'} />
      <ConfirmDialog isOpen={clearMemoryOpen} onClose={() => setClearMemoryOpen(false)} onConfirm={async () => { setClearMemoryOpen(false); await handleClearMemories(); }} title="Clear all memories" description="This removes all saved semantic memories. Hold to confirm." />
      {activeSection === 'notifications' && renderNotificationsSection()}
      {activeSection === 'appearance' && renderAppearanceSection()}
    </BottomSheet>
  );
}
