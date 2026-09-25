import React, { useEffect, useState } from 'react';
import { verifyLLMConnection } from '../../core/ai/llmClient.js';
import {
  DEFAULT_JARVIS_BASE_URL,
  DEFAULT_JARVIS_MODEL,
  saveJarvisConfig,
} from '../../core/ai/jarvisConfig.js';

export default function JarvisApiSetup({ onConfigured }) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(DEFAULT_JARVIS_BASE_URL);
  const [model, setModel] = useState(DEFAULT_JARVIS_MODEL);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [latencyMs, setLatencyMs] = useState(null);

  useEffect(() => {
    // Keep the defaults visible and deterministic for first-time setup.
    setBaseUrl(DEFAULT_JARVIS_BASE_URL);
    setModel(DEFAULT_JARVIS_MODEL);
  }, []);

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setError('Enter your API key first.');
      setStatus('error');
      return;
    }

    setStatus('testing');
    setError('');
    setLatencyMs(null);

    const result = await verifyLLMConnection(
      apiKey.trim(),
      baseUrl.trim(),
      model.trim()
    );

    if (!result.ok) {
      setStatus('error');
      setError(result.error || 'Connection failed.');
      return;
    }

    try {
      await saveJarvisConfig({
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim(),
        model: result.model || model.trim(),
      });
      setLatencyMs(result.latencyMs ?? null);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Could not save Jarvis configuration.');
    }
  };

  const handleContinue = () => {
    if (status !== 'success') return;
    onConfigured?.();
  };

  return (
    <main
      aria-label="Jarvis setup"
      style={{
        minHeight: '100dvh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        padding: 'calc(28px + env(safe-area-inset-top, 0px)) 18px calc(24px + env(safe-area-inset-bottom, 0px))',
        background: 'var(--bg)',
        color: 'var(--tx)',
        fontFamily: "var(--f, 'Geist', sans-serif)",
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ color: 'var(--ac)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Jarvis
          </div>
          <h1 style={{ margin: '6px 0 0', fontSize: '28px', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            Connect Jarvis
          </h1>
        </div>
        <div
          style={{
            minHeight: '32px',
            padding: '0 10px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--s2)',
            color: 'var(--mu)',
            fontSize: '11px',
          }}
        >
          First-time setup
        </div>
      </div>

      <section
        style={{
          width: '100%',
          maxWidth: '560px',
          margin: 'clamp(36px, 11vh, 96px) auto 0',
        }}
      >
        <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, color: 'var(--mu)' }}>
          Add your AI provider key first. Jarvis will test the connection before anything is saved, then take you through the onboarding interview.
        </p>

        <div style={{ marginTop: '26px' }}>
          <label
            htmlFor="jarvis-api-key"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            API key
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minHeight: '52px',
              padding: '0 12px 0 14px',
              borderRadius: '14px',
              background: 'var(--s1)',
              boxShadow: 'inset 0 0 0 1px var(--hairline)',
            }}
          >
            <input
              id="jarvis-api-key"
              aria-label="Jarvis API key"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => {
                setApiKey(e.target.value);
                if (status !== 'idle') {
                  setStatus('idle');
                  setError('');
                  setLatencyMs(null);
                }
              }}
              autoComplete="off"
              spellCheck={false}
              placeholder="Paste your API key"
              style={{
                flex: 1,
                minWidth: 0,
                border: 0,
                outline: 0,
                background: 'transparent',
                color: 'var(--tx)',
                font: 'inherit',
                fontSize: '14px',
              }}
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              style={{
                border: 0,
                background: 'transparent',
                color: 'var(--mu)',
                padding: '8px 4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: '14px', display: 'grid', gap: '12px' }}>
          <label style={{ display: 'grid', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>Provider endpoint</span>
            <input
              aria-label="Jarvis provider endpoint"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: '46px',
                border: 0,
                outline: 0,
                borderRadius: '12px',
                padding: '0 12px',
                background: 'var(--s1)',
                color: 'var(--tx)',
                boxShadow: 'inset 0 0 0 1px var(--hairline)',
                font: 'inherit',
                fontSize: '13px',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>Model</span>
            <input
              aria-label="Jarvis model"
              value={model}
              onChange={e => setModel(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: '46px',
                border: 0,
                outline: 0,
                borderRadius: '12px',
                padding: '0 12px',
                background: 'var(--s1)',
                color: 'var(--tx)',
                boxShadow: 'inset 0 0 0 1px var(--hairline)',
                font: 'inherit',
                fontSize: '13px',
              }}
            />
          </label>
        </div>

        {status === 'success' && (
          <div
            role="status"
            style={{
              marginTop: '14px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'color-mix(in srgb, #4f8a5f 12%, transparent)',
              color: '#4f8a5f',
              fontSize: '13px',
              lineHeight: 1.4,
            }}
          >
            Connection verified{latencyMs != null ? ` · ${latencyMs} ms` : ''}.
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              marginTop: '14px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
              color: 'var(--danger)',
              fontSize: '13px',
              lineHeight: 1.45,
            }}
          >
            {error}
          </div>
        )}
      </section>

      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          margin: 'auto auto 0',
          paddingTop: '28px',
        }}
      >
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={status === 'testing'}
          style={{
            width: '100%',
            minHeight: '50px',
            border: 0,
            borderRadius: '14px',
            background: 'var(--s2)',
            color: 'var(--tx)',
            font: 'inherit',
            fontSize: '14px',
            fontWeight: 600,
            cursor: status === 'testing' ? 'wait' : 'pointer',
            opacity: status === 'testing' ? 0.6 : 1,
          }}
        >
          {status === 'testing' ? 'Testing connection…' : 'Test connection'}
        </button>

        <button
          type="button"
          onClick={handleContinue}
          disabled={status !== 'success'}
          style={{
            width: '100%',
            minHeight: '50px',
            marginTop: '10px',
            border: 0,
            borderRadius: '14px',
            background: 'var(--ac)',
            color: 'var(--on-ac)',
            font: 'inherit',
            fontSize: '14px',
            fontWeight: 700,
            cursor: status === 'success' ? 'pointer' : 'not-allowed',
            opacity: status === 'success' ? 1 : 0.45,
          }}
        >
          Continue to Jarvis
        </button>

        <p
          style={{
            margin: '12px 0 0',
            textAlign: 'center',
            color: 'var(--mu)',
            fontSize: '11px',
            lineHeight: 1.45,
          }}
        >
          Your key is stored through the app's secure-storage layer.
        </p>
      </div>
    </main>
  );
}
