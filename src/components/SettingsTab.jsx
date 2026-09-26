import React, { useState, useEffect, useRef } from 'react';
import { BottomSheet, ConfirmDialog } from './ui/Overlays.jsx';
import { Button } from './ui/Buttons.jsx';

export default function SettingsTab({ t, onClose, reminders: reminderConfigs = [], onSaveReminders }) {
  const [activeSection, setActiveSection] = useState(null);

  // Data state
  const [backupDate, setBackupDate] = useState('Checking backup status...');
  const [storageUsed, setStorageUsed] = useState('0');
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreStatus, setRestoreStatus] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const restoreInputRef = useRef(null);

  // Memory state
  const [saveMemories, setSaveMemories] = useState(true);
  const [sendContext, setSendContext] = useState(true);
  const [memories, setMemories] = useState([]);
  const [preferenceError, setPreferenceError] = useState('');

  // Notifications state
  const [proactive, setProactive] = useState(true);
  const [reminders, setReminders] = useState(false);

  // AI state
  const [verifying, setVerifying] = useState(false);
  const [savingAISettings, setSavingAISettings] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [aiSaveError, setAiSaveError] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [aiSettings, setAiSettings] = useState({
    baseUrl: '',
    model: '',
    hasKey: false,
  });

  useEffect(() => {
    import('../database/memoryRepository.js').then(m => {
      m.getSemanticMemories().then(setMemories);
    });

    import('../database/settingsRepository.js').then(async ({ getSetting }) => {
      const lastBackupDate = await getSetting('lastAutoBackupDate');
      setBackupDate(lastBackupDate ? `Automatic, ${lastBackupDate}` : 'No automatic backup yet');
    });

    import('../database/settingsRepository.js').then(async ({ getSetting }) => {
      const [saveMemoriesSetting, sendContextSetting, proactiveSetting, remindersSetting] = await Promise.all([
        getSetting('jarvisSaveMemories'),
        getSetting('jarvisSendPageContext'),
        getSetting('jarvisProactiveSuggestions'),
        getSetting('jarvisReviewReminders'),
      ]);
      if (saveMemoriesSetting !== null) setSaveMemories(saveMemoriesSetting === 'true');
      if (sendContextSetting !== null) setSendContext(sendContextSetting === 'true');
      if (proactiveSetting !== null) setProactive(proactiveSetting === 'true');
      if (remindersSetting !== null) setReminders(remindersSetting === 'true');
    });
    setReminders(!!reminderConfigs.find(reminder => reminder.id === 3)?.enabled);
    
    // Load AI settings
    import('../core/ai/jarvisConfig.js').then(async ({ getJarvisConfig }) => {
      const config = await getJarvisConfig();
      setAiSettings({ baseUrl: config.baseUrl, model: config.model, hasKey: config.hasApiKey });
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

  const savePreference = async (key, value, setValue) => {
    const previousValue = value;
    setValue(!previousValue);
    setPreferenceError('');
    try {
      const { setSetting } = await import('../database/settingsRepository.js');
      await setSetting(key, String(!previousValue));
      if (key === 'jarvisProactiveSuggestions' && !previousValue) {
        const { bootstrapAnalysisScheduler } = await import('../core/ai/analysisScheduler.js');
        bootstrapAnalysisScheduler();
      }
    } catch (error) {
      setValue(previousValue);
      setPreferenceError('Preference could not be saved. Try again.');
    }
  };

  const handleReviewReminderToggle = async () => {
    const nextEnabled = !reminders;
    const updatedReminders = reminderConfigs.map(reminder => (
      reminder.id === 3 ? { ...reminder, enabled: nextEnabled } : reminder
    ));
    setReminders(nextEnabled);
    try {
      await onSaveReminders?.(updatedReminders);
    } catch (error) {
      setReminders(!nextEnabled);
      setPreferenceError('Reminder preference could not be saved. Try again.');
    }
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
  };

  const handleRunBackup = async () => {
    const { runAutoBackup } = await import('../database/backupService.js');
    const result = await runAutoBackup({ force: true });
    if (result.success) {
      setBackupDate(`Automatic, ${result.date}`);
      setRestoreStatus({ success: true, message: 'Device backup completed.' });
    } else {
      setRestoreStatus({ success: false, message: `Backup failed: ${result.error?.message || 'device storage unavailable'}` });
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    setRestoring(true);
    setRestoreStatus(null);
    try {
      const { importDatabase } = await import('../database/db.js');
      const result = await importDatabase(await restoreFile.text());
      const recordCount = Object.values(result.counts).reduce((sum, count) => sum + count, 0);
      setRestoreStatus({ success: true, message: `Restore complete. ${recordCount} records imported.` });
      setRestoreFile(null);
      window.location.reload();
    } catch (error) {
      setRestoreStatus({
        success: false,
        message: `${error.message}. Your existing data was not replaced.`,
      });
    } finally {
      setRestoring(false);
    }
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

  const handleSaveAISettings = async () => {
    setSavingAISettings(true);
    setAiSaveError('');
    setVerifyResult(null);
    try {
      const { getJarvisConfig, saveJarvisConfig } = await import('../core/ai/jarvisConfig.js');
      const { setSetting } = await import('../database/settingsRepository.js');
      const baseUrl = aiSettings.baseUrl.trim();
      const model = aiSettings.model.trim();
      if (!baseUrl || !model) throw new Error('Base URL and model are required.');

      if (apiKeyDraft.trim()) {
        await saveJarvisConfig({ apiKey: apiKeyDraft.trim(), baseUrl, model });
        setApiKeyDraft('');
      } else {
        await Promise.all([
          setSetting('aiBaseUrl', baseUrl),
          setSetting('aiModel', model),
        ]);
      }

      const config = await getJarvisConfig();
      setAiSettings({ baseUrl: config.baseUrl, model: config.model, hasKey: config.hasApiKey });
    } catch (error) {
      setAiSaveError(error.message || 'Could not save AI settings.');
    } finally {
      setSavingAISettings(false);
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
          <span style={rowRightStyle}>
            {verifyResult?.success ? 'Verified ›' : aiSettings.hasKey ? 'Configured ›' : 'Needs setup ›'}
          </span>
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
        <label style={{ display: 'grid', gap: '6px', padding: '12px 14px', color: 'var(--mu)', fontSize: '13px' }}>
          Base URL
          <input aria-label="AI base URL" value={aiSettings.baseUrl} onChange={event => setAiSettings(prev => ({ ...prev, baseUrl: event.target.value }))} />
        </label>
        <label style={{ display: 'grid', gap: '6px', padding: '12px 14px', color: 'var(--mu)', fontSize: '13px' }}>
          API key {aiSettings.hasKey ? '(saved; leave blank to keep)' : '(not set)'}
          <input aria-label="Replacement API key" type="password" autoComplete="new-password" value={apiKeyDraft} onChange={event => setApiKeyDraft(event.target.value)} placeholder={aiSettings.hasKey ? 'Stored securely' : 'Enter API key'} />
        </label>
        <label style={{ display: 'grid', gap: '6px', padding: '12px 14px', color: 'var(--mu)', fontSize: '13px' }}>
          Model
          <input aria-label="AI model" value={aiSettings.model} onChange={event => setAiSettings(prev => ({ ...prev, model: event.target.value }))} />
        </label>
      </div>

      {aiSaveError && <p role="alert" style={{ color: 'var(--danger)', fontSize: '13px' }}>{aiSaveError}</p>}
      <Button variant="secondary" style={{ width: '100%', marginBottom: '10px' }} onClick={handleSaveAISettings} disabled={savingAISettings}>
        {savingAISettings ? 'Saving...' : 'Save AI settings'}
      </Button>

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
        <button type="button" style={{ ...rowStyle(true), width: '100%', border: 0, background: 'transparent', color: 'var(--tx)', textAlign: 'left' }} onClick={handleRunBackup}>
          Back up now
        </button>
      </div>

      <div style={headerLabelStyle}>Move data</div>
      <div style={groupStyle}>
        <button type="button" style={{ ...rowStyle(false), width: '100%', border: 0, background: 'transparent', color: 'var(--tx)', textAlign: 'left' }} onClick={handleBackup}>
          Export data
        </button>
        <button
          type="button"
          style={{ ...rowStyle(true), width: '100%', background: 'transparent', border: 0, color: 'var(--tx)', textAlign: 'left' }}
          onClick={() => restoreInputRef.current?.click()}
        >
          Restore from backup
        </button>
        <input
          ref={restoreInputRef}
          type="file"
          accept="application/json,.json"
          aria-label="Choose backup file"
          style={{ display: 'none' }}
          onChange={event => {
            const file = event.target.files?.[0] || null;
            event.target.value = '';
            setRestoreStatus(null);
            setRestoreFile(file);
          }}
        />
        {restoreStatus && (
          <p role={restoreStatus.success ? 'status' : 'alert'} style={{ margin: '10px 0', color: restoreStatus.success ? 'var(--strategy)' : 'var(--danger)', fontSize: '13px' }}>
            {restoreStatus.message}
          </p>
        )}
        <ConfirmDialog
          isOpen={!!restoreFile}
          onClose={() => setRestoreFile(null)}
          onConfirm={handleRestore}
          title="Replace app data?"
          description={`Restore ${restoreFile?.name || 'this backup'}? This replaces the current local data.`}
        />
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
          <button type="button" role="switch" aria-checked={saveMemories} aria-label="Let Jarvis save memories" onClick={() => savePreference('jarvisSaveMemories', saveMemories, setSaveMemories)} style={{ marginLeft: 'auto', minWidth: '44px', minHeight: '32px', border: 0, borderRadius: 'var(--r-control)', background: saveMemories ? 'var(--ac)' : 'var(--s2)', color: saveMemories ? 'var(--on-ac)' : 'var(--tx)', cursor: 'pointer' }}>{saveMemories ? 'On' : 'Off'}</button>
        </div>
        <div style={rowStyle(true)}>
          Attach selected page context
          <button type="button" role="switch" aria-checked={sendContext} aria-label="Attach selected page context" onClick={() => savePreference('jarvisSendPageContext', sendContext, setSendContext)} style={{ marginLeft: 'auto', minWidth: '44px', minHeight: '32px', border: 0, borderRadius: 'var(--r-control)', background: sendContext ? 'var(--ac)' : 'var(--s2)', color: sendContext ? 'var(--on-ac)' : 'var(--tx)', cursor: 'pointer' }}>{sendContext ? 'On' : 'Off'}</button>
        </div>
      </div>
      {preferenceError && <p role="alert" style={{ color: 'var(--danger)', fontSize: '13px' }}>{preferenceError}</p>}

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
          <button type="button" role="switch" aria-checked={proactive} aria-label="Proactive suggestions" onClick={() => savePreference('jarvisProactiveSuggestions', proactive, setProactive)} style={{ marginLeft: 'auto', minWidth: '44px', minHeight: '32px', border: 0, borderRadius: 'var(--r-control)', background: proactive ? 'var(--ac)' : 'var(--s2)', color: proactive ? 'var(--on-ac)' : 'var(--tx)', cursor: 'pointer' }}>{proactive ? 'On' : 'Off'}</button>
        </div>
        <div style={rowStyle(false)}>
          Review reminders
          <button type="button" role="switch" aria-checked={reminders} aria-label="Review reminders" onClick={handleReviewReminderToggle} style={{ marginLeft: 'auto', minWidth: '44px', minHeight: '32px', border: 0, borderRadius: 'var(--r-control)', background: reminders ? 'var(--ac)' : 'var(--s2)', color: reminders ? 'var(--on-ac)' : 'var(--tx)', cursor: 'pointer' }}>{reminders ? 'On' : 'Off'}</button>
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
