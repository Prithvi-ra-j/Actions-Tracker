// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GlobalBanners } from '../../src/components/ui/Banners.jsx';

const originalOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');

describe('GlobalBanners', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  });

  afterEach(() => {
    cleanup();
    if (originalOnLine) {
      Object.defineProperty(navigator, 'onLine', originalOnLine);
    } else {
      delete navigator.onLine;
    }
  });

  it('announces offline state and clears it when connectivity returns', () => {
    render(<GlobalBanners />);
    expect(screen.getByRole('status').textContent).toContain('Offline. Local features are still working.');

    fireEvent(window, new Event('online'));
    expect(screen.queryByRole('status')).toBeNull();

    fireEvent(window, new Event('offline'));
    expect(screen.getByRole('status').textContent).toContain('Offline. Local features are still working.');
  });
});