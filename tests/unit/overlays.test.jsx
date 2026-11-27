// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BottomSheet } from '../../src/components/ui/Overlays.jsx';

function Example() {
  const [open, setOpen] = useState(false);
  const [nested, setNested] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <button>Outside</button>
      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title="First sheet">
        <button onClick={() => setNested(true)}>Open nested</button>
        <BottomSheet isOpen={nested} onClose={() => setNested(false)} title="Nested sheet">
          <button>Last action</button>
        </BottomSheet>
      </BottomSheet>
    </>
  );
}

afterEach(cleanup);

describe('BottomSheet', () => {
  it('labels, focuses, traps and restores focus for nested dialogs', async () => {
    const user = userEvent.setup();
    render(<Example />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await user.click(opener);
    const first = screen.getByRole('dialog', { name: 'First sheet' });
    const close = within(first).getByRole('button', { name: 'Close dialog' });
    expect(document.activeElement).toBe(close);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open nested' }));
    await user.tab();
    expect(document.activeElement).toBe(close);
    const nestedOpener = screen.getByRole('button', { name: 'Open nested' });
    await user.click(nestedOpener);
    const nested = screen.getByRole('dialog', { name: 'Nested sheet' });
    expect(document.activeElement).toBe(within(nested).getByRole('button', { name: 'Close dialog' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Nested sheet' })).toBeNull();
    expect(document.activeElement).toBe(nestedOpener);
    expect(screen.getByRole('dialog', { name: 'First sheet' })).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
