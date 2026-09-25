import React, { useState, useEffect } from 'react';
import { BottomSheet } from './ui/Overlays.jsx';
import { Button } from './ui/Buttons.jsx';

export default function SettingsTab({ t, onClose }) {
  const [activeSection, setActiveSection] = useState(null);

  // Data state
  const [backupDate, setBackupDate] = useState('Automatic, today 6:12 am');
  const [storageUsed, setStorageUsed] = useState('0');

  // Memory state
  const [saveMemories, setSaveMemories] = useState(true);
  const [sendContext, setSendContext] = useState(true);
  const [memories, setMemories] = useState([]);

  // Notifications state
  const [proactive, setProactive] = useState(true);
  const [reminders, setReminders] = useState(false);

  // AI state
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [aiSettings, setAiSettings] = useState({
    baseUrl: 'api.openai.com',
    model: 'gpt-4o',
    hasKey: true
  });

  useEffect(() => {
    import('../database/memoryRepository.js').then(m => {
      m.getSemanticMemories().then(setMemories);
    });
    
    // Load AI settings
    import('../database/settingsRepository.js').then(async (repo) => {
      const baseUrl = (await repo.getSetting('aiBaseUrl')) || 'https://api.openai.com/v1';
      const model = (await repo.getSetting('aiModel')) || 'gpt-4o';
      import('../native/secureStorage.js').then(async (sec) => {
        const key = await sec.getSecureValue('aiApiKey');
        setAiSettings({ baseUrl, model, hasKey: !!key });
      });
    });

    // Load storage estimate
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        const mb = (estimate.usage / (1024 * 1024)).toFixed(1);
        setStorageUsed(mb);
      });
    }
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

  const handleVerifyAI = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const { verifyLLMConnection } = await import('../core/ai/llmClient.js');
      const { getSecureValue } = await import('../native/secureStorage.js');
      const apiKey = await getSecureValue('aiApiKey');
      const startTime = Date.now();
      await verifyLLMConnection(apiKey, aiSettings.baseUrl, aiSettings.model);
      const latency = Date.now() - startTime;
      setVerifyResult({ success: true, message: `Verified (${latency}ms latency)` });
    } catch (e) {
      setVerifyResult({ success: false, message: `Connection failed: ${e.message.slice(0, 60)}...` });
    } finally {
      setVerifying(false);
    }
  };

  const groupStyle = {
    borderRadius: 'var(--r-container)',
    overflow: 'hidden',
    boxShadow: 'inset 0 0 0 1px var(--hairline)',
    background: 'var(--s1)',
    marginBottom: '20px'
  };

  const rowStyle = (isLast) => ({
    display: 'flex',
    alignItems: 'center',
    minHeight: '52px',
    padding: '0 14px',
    borderBottom: isLast ? 'none' : '1px solid var(--hairline)',
    fontSize: '14.5px',
    fontWeight: 500,
    cursor: 'pointer',
    color: 'var(--tx)'
  });

  const rowRightStyle = {
    marginLeft: 'auto',
    fontFamily: "'Geist Mono', monospace",
    fontSize: '11.5px',
    color: 'var(--mu)',
  };

  const headerLabelStyle = {
    fontFamily: "'Geist Mono', monospace",
    fontSize: '11.5px',
    color: 'var(--mu)',
    margin: '16px 4px 8px'
  };

  const renderMainMenu = () => (
    <div style={{ padding: '0 14px', flex: 1, overflowY: 'auto' }}>
      <div style={groupStyle}>
        <div style={rowStyle(false)} onClick={() => setActiveSection('ai')}>
          AI & Provider
          <span style={rowRightStyle}>{aiSettings.hasKey ? 'Verified ›' : 'Needs setup ›'}</span>
        </div>
        <div style={rowStyle(false)} onClick={() => setActiveSection('data')}>
          Data
          <span style={rowRightStyle}>Backup & storage ›</span>
        </div>
        <div style={rowStyle(false)} onClick={() => setActiveSection('memory')}>
          Memory & Privacy
          <span style={rowRightStyle}>›</span>
        </div>
        <div style={rowStyle(false)} onClick={() => setActiveSection('integrations')}>
          Integrations
          <span style={rowRightStyle}>›</span>
        </div>
        <div style={rowStyle(false)} onClick={() => setActiveSection('notifications')}>
          Notifications
          <span style={rowRightStyle}>›</span>
        </div>
        <div style={rowStyle(true)} onClick={() => setActiveSection('appearance')}>
          Appearance & App
          <span style={rowRightStyle}>›</span>
        </div>
      </div>
    </div>
  );

  const renderAISection = () => (
    <div style={{ padding: '0 14px', flex: 1, overflowY: 'auto' }}>
      <div style={headerLabelStyle}>Provider settings</div>
      <div style={groupStyle}>
        <div style={rowStyle(false)}>
          Base URL
          <span style={{...rowRightStyle, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{aiSettings.baseUrl}</span>
        </div>
        <div style={rowStyle(false)}>
          API Key
          <span style={rowRightStyle}>{aiSettings.hasKey ? 'sk-••••••••••••' : 'Not set'}</span>
        </div>
        <div style={rowStyle(true)}>
          Model
          <span style={rowRightStyle}>{aiSettings.model}</span>
        </div>
      </div>

      <Button variant="primary" style={{ width: '100%' }} onClick={handleVerifyAI} disabled={verifying}>
        {verifying ? 'Verifying...' : 'Verify connection'}
      </Button>

      {verifyResult && (
        <div style={{
          marginTop: '12px',
          padding: '12px 14px',
          borderRadius: 'var(--r-control)',
          background: verifyResult.success ? 'color-mix(in srgb, var(--strategy) 15%, transparent)' : 'color-mix(in srgb, var(--danger) 15%, transparent)',
          color: verifyResult.success ? 'var(--strategy)' : 'var(--danger)',
          fontSize: '13px',
          fontWeight: 500
        }}>
          {verifyResult.message}
        </div>
      )}

      <div style={headerLabelStyle}>What needs AI?</div>
      <div style={groupStyle}>
        <div style={{ padding: '14px', fontSize: '13px', color: 'var(--mu)', lineHeight: 1.5 }}>
          Local tracking, stats, and streaks work without an AI connection. AI is only used when you explicitly Ask Jarvis, run Audits, or generate impact projections.
        </div>
      </div>
    </div>
  );

  const renderDataSection = () => (
    <div style={{ padding: '0 14px', flex: 1, overflowY: 'auto' }}>
      <div style={headerLabelStyle}>Backup</div>
      <div style={groupStyle}>
        <div style={rowStyle(false)}>
          Status
          <span style={rowRightStyle}>{backupDate}</span>
        </div>
        <div style={rowStyle(true)} onClick={handleBackup}>
          Back up now
        </div>
      </div>

      <div style={headerLabelStyle}>Move data</div>
      <div style={groupStyle}>
        <div style={rowStyle(false)} onClick={handleBackup}>
          Export data
        </div>
        <div style={rowStyle(true)}>
          Restore from backup
        </div>
      </div>

      <div style={headerLabelStyle}>Storage</div>
      <div style={{ ...groupStyle, padding: '14px' }}>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11.5px', color: 'var(--mu)' }}>Used on this device</span>
        <div style={{ fontSize: '34px', fontWeight: 600, letterSpacing: '-.02em', margin: '6px 0 0', color: 'var(--tx)' }}>
          {storageUsed}<small style={{ fontSize: '14px', color: 'var(--mu)', fontWeight: 500 }}> MB</small>
        </div>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--mu)' }}>Restoring replaces current data after you confirm.</p>
    </div>
  );

  const renderMemorySection = () => (
    <div style={{ padding: '0 14px', flex: 1, overflowY: 'auto' }}>
      <div style={groupStyle}>
        <div style={rowStyle(false)}>
          Let Jarvis save memories
          <div style={{ marginLeft: 'auto', width: '44px', height: '26px', borderRadius: '13px', background: saveMemories ? 'var(--ac)' : 'var(--s2)', position: 'relative', boxShadow: 'inset 0 0 0 1px var(--hairline)', cursor: 'pointer' }} onClick={() => setSaveMemories(!saveMemories)}>
            <div style={{ position: 'absolute', top: '3px', left: saveMemories ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: saveMemories ? '#1a0d04' : 'var(--mu)', transition: 'left 0.2s' }}></div>
          </div>
        </div>
        <div style={rowStyle(true)}>
          Send only needed context
          <div style={{ marginLeft: 'auto', width: '44px', height: '26px', borderRadius: '13px', background: sendContext ? 'var(--ac)' : 'var(--s2)', position: 'relative', boxShadow: 'inset 0 0 0 1px var(--hairline)', cursor: 'pointer' }} onClick={() => setSendContext(!sendContext)}>
            <div style={{ position: 'absolute', top: '3px', left: sendContext ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: sendContext ? '#1a0d04' : 'var(--mu)', transition: 'left 0.2s' }}></div>
          </div>
        </div>
      </div>

      <div style={headerLabelStyle}>Saved memories</div>
      <div style={groupStyle}>
        {memories.length === 0 ? (
          <div style={{ padding: '14px', color: 'var(--mu)', fontStyle: 'italic', fontSize: '13px' }}>No memories yet.</div>
        ) : (
          memories.map((m, idx) => (
            <div key={m.id} style={{ padding: '12px 14px', borderBottom: idx === memories.length - 1 ? 'none' : '1px solid var(--hairline)' }}>
              <b style={{ display: 'block', fontSize: '14.5px', fontWeight: 500 }}>{m.content}</b>
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11.5px', color: 'var(--mu)' }}>{m.type || 'Memory'}</span>
            </div>
          ))
        )}
      </div>

      <Button
        variant="secondary"
        style={{ width: '100%', color: 'var(--danger)' }}
        onClick={handleClearMemories}
      >
        Clear all memories
      </Button>
    </div>
  );

  const renderIntegrationsSection = () => (
    <div style={{ padding: '0 14px', flex: 1, overflowY: 'auto' }}>
      <div style={groupStyle}>
        <div style={{ padding: '14px', borderBottom: '1px solid var(--hairline)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <b style={{ fontSize: '14.5px', fontWeight: 500 }}>Health Connect</b>
            <span style={rowRightStyle}>Not connected</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--mu)', margin: '4px 0 0', lineHeight: 1.4 }}>Steps, workouts and sleep feed Body evidence.</p>
        </div>
        <div style={{ padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <b style={{ fontSize: '14.5px', fontWeight: 500 }}>NutriLift</b>
            <span style={rowRightStyle}>Not connected</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--mu)', margin: '4px 0 0', lineHeight: 1.4 }}>Workout sessions and nutrition.</p>
        </div>
      </div>
      <Button variant="primary" style={{ width: '100%' }}>
        Connect Integration
      </Button>
      <p style={{ fontSize: '13px', color: 'var(--mu)', marginTop: '12px', lineHeight: 1.5 }}>Evidence from an integration always shows its source.</p>
    </div>
  );

  const renderNotificationsSection = () => (
    <div style={{ padding: '0 14px', flex: 1, overflowY: 'auto' }}>
      <div style={groupStyle}>
        <div style={rowStyle(false)}>
          Proactive suggestions
          <div style={{ marginLeft: 'auto', width: '44px', height: '26px', borderRadius: '13px', background: proactive ? 'var(--ac)' : 'var(--s2)', position: 'relative', boxShadow: 'inset 0 0 0 1px var(--hairline)', cursor: 'pointer' }} onClick={() => setProactive(!proactive)}>
            <div style={{ position: 'absolute', top: '3px', left: proactive ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: proactive ? '#1a0d04' : 'var(--mu)', transition: 'left 0.2s' }}></div>
          </div>
        </div>
        <div style={rowStyle(false)}>
          Review reminders
          <div style={{ marginLeft: 'auto', width: '44px', height: '26px', borderRadius: '13px', background: reminders ? 'var(--ac)' : 'var(--s2)', position: 'relative', boxShadow: 'inset 0 0 0 1px var(--hairline)', cursor: 'pointer' }} onClick={() => setReminders(!reminders)}>
            <div style={{ position: 'absolute', top: '3px', left: reminders ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: reminders ? '#1a0d04' : 'var(--mu)', transition: 'left 0.2s' }}></div>
          </div>
        </div>
        <div style={rowStyle(true)}>
          Quiet hours
          <span style={rowRightStyle}>10 pm to 7 am</span>
        </div>
      </div>

      <div style={headerLabelStyle}>Preview</div>
      <div style={{ ...groupStyle, padding: '14px' }}>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11.5px', color: 'var(--mu)' }}>Jarvis</span>
        <p style={{ color: 'var(--tx)', margin: '4px 0 0', fontSize: '13px', lineHeight: 1.5 }}>Your evening routine was missed four times this week. Want me to check whether the schedule still fits?</p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <Button variant="primary" style={{ flex: 1, fontSize: '13px' }}>Review</Button>
          <Button variant="secondary" style={{ flex: 1, fontSize: '13px' }}>Adjust</Button>
          <Button variant="secondary" style={{ flex: 1, fontSize: '13px' }}>Dismiss</Button>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSection = () => (
    <div style={{ padding: '0 14px', flex: 1, overflowY: 'auto' }}>
      <div style={groupStyle}>
        <div style={rowStyle(false)}>
          Theme
          <span style={rowRightStyle}>Codex dark</span>
        </div>
        <div style={rowStyle(true)}>
          Reduce motion
          <span style={rowRightStyle}>Follow system</span>
        </div>
      </div>

      <div style={headerLabelStyle}>Diagnostics</div>
      <div style={groupStyle}>
        <div style={rowStyle(false)} onClick={handleCopyDiagnostics}>
          Copy diagnostic info
        </div>
        <div style={rowStyle(true)}>
          Recent errors
          <span style={rowRightStyle}>0</span>
        </div>
      </div>

      <div style={headerLabelStyle}>Version</div>
      <div style={groupStyle}>
        <div style={rowStyle(false)}>
          Version
          <span style={rowRightStyle}>1.5.0</span>
        </div>
        <div style={rowStyle(true)}>
          Check for updates
        </div>
      </div>
    </div>
  );

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'ai': return 'AI & Provider';
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
      case 'ai': return 'Connection and keys';
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {getSectionTitle()}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--mu)' }}>
            {getSectionSubtitle()}
          </p>
        </div>
        {activeSection && (
          <button
            onClick={() => setActiveSection(null)}
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: '11.5px',
              color: 'var(--mu)',
              padding: '9px 12px',
              borderRadius: 'var(--r-control)',
              boxShadow: 'inset 0 0 0 1px var(--hairline)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Back
          </button>
        )}
      </div>

      {!activeSection && renderMainMenu()}
      {activeSection === 'ai' && renderAISection()}
      {activeSection === 'data' && renderDataSection()}
      {activeSection === 'memory' && renderMemorySection()}
      {activeSection === 'integrations' && renderIntegrationsSection()}
      {activeSection === 'notifications' && renderNotificationsSection()}
      {activeSection === 'appearance' && renderAppearanceSection()}
    </BottomSheet>
  );
}
