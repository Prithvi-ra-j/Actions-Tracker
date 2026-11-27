// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import JarvisApiSetup from '../../src/components/jarvis/JarvisApiSetup.jsx';
import { verifyLLMConnection } from '../../src/core/ai/llmClient.js';
import { saveJarvisConfig } from '../../src/core/ai/jarvisConfig.js';

vi.mock('../../src/core/ai/llmClient.js', () => ({ verifyLLMConnection: vi.fn() }));
vi.mock('../../src/core/ai/jarvisConfig.js', () => ({
  DEFAULT_JARVIS_BASE_URL: 'https://provider.example/v1',
  DEFAULT_JARVIS_MODEL: 'example-model',
  DEFAULT_JARVIS_GATEWAY_URL: '',
  saveJarvisConfig: vi.fn().mockResolvedValue({}),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Ved setup', () => {
  it('tests a provider key using the defaults before saving', async () => {
    verifyLLMConnection.mockResolvedValue({ ok: true, model: 'example-model', latencyMs: 42 });
    render(<JarvisApiSetup />);
    expect(screen.getByText('Advanced connection settings').closest('details').open).toBe(false);
    fireEvent.change(screen.getByLabelText('Ved API key'), { target: { value: 'test-key' } });
    fireEvent.click(screen.getByRole('button', { name: 'Test and connect' }));
    await waitFor(() => expect(saveJarvisConfig).toHaveBeenCalledWith({
      apiKey: 'test-key', baseUrl: 'https://provider.example/v1', model: 'example-model',
    }));
    expect(verifyLLMConnection).toHaveBeenCalledWith('test-key', 'https://provider.example/v1', 'example-model');
    expect(screen.getByRole('status').textContent).toContain('Connection verified');
  });

  it('offers the gateway in advanced settings and saves it without claiming a test', async () => {
    render(<JarvisApiSetup />);
    fireEvent.click(screen.getByText('Advanced connection settings'));
    fireEvent.change(screen.getByLabelText('Ved server gateway URL'), { target: { value: '/api/ved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save gateway' }));
    await waitFor(() => expect(saveJarvisConfig).toHaveBeenCalledWith({
      gatewayUrl: '/api/ved', baseUrl: 'https://provider.example/v1', model: 'example-model',
    }));
    expect(verifyLLMConnection).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('Gateway saved');
  });

  it('shows an explicit error when no connection is provided', async () => {
    render(<JarvisApiSetup />);
    fireEvent.click(screen.getByRole('button', { name: 'Test and connect' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Enter your API key or configure a server gateway.');
    expect(saveJarvisConfig).not.toHaveBeenCalled();
  });
});
