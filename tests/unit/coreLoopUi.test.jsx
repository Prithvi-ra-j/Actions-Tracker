// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import TodayTab from '../../src/components/TodayTab.jsx';
import RadarChart from '../../src/components/RadarChart.jsx';

afterEach(cleanup);

describe('core loop UI', () => {
  it('keeps earlier occurrences separate and actionable without duplicating today rows', () => {
    const complete = vi.fn();
    const occurrence = (id, scheduledFor, status = 'expected') => ({
      id, habitId: 'walk', habitTitle: 'Walk', axis: 'body', scheduledFor, status,
      graceState: 'grace_day_one',
    });
    const { container } = render(
      <TodayTab
        today="2026-09-26"
        todayOccurrences={[
          occurrence('today', '2026-09-26'),
          occurrence('yesterday', '2026-09-25'),
          occurrence('finished', '2026-09-24', 'completed'),
        ]}
        onCompleteOccurrence={complete}
        onOpenJarvis={vi.fn()}
      />
    );
    const section = screen.getByText('Quest log').closest('section');
    const earlier = container.querySelector('details');
    const todayRows = within(section).getAllByRole('checkbox').filter(box => !box.closest('details'));
    expect(todayRows).toHaveLength(1);
    fireEvent.click(todayRows[0]);
    expect(complete).toHaveBeenCalledWith('today');
    fireEvent.click(screen.getByText('Earlier occurrences'));
    expect(within(earlier).getAllByRole('checkbox')).toHaveLength(1);
    fireEvent.click(within(earlier).getByRole('checkbox'));
    expect(complete).toHaveBeenCalledWith('yesterday');
  });

  it('uses axis tokens and points side labels toward the chart edges', () => {
    render(<RadarChart stats={{ body: 10 }} />);
    expect(screen.getByText('BODY').getAttribute('fill')).toBe('var(--body)');
    expect(screen.getByText('SOCIAL').getAttribute('fill')).toBe('var(--social)');
    expect(screen.getByText('KNOWLEDGE').getAttribute('text-anchor')).toBe('start');
    expect(screen.getByText('STRATEGY').getAttribute('text-anchor')).toBe('end');
  });

  it('keeps the habit draft available when saving fails', async () => {
    const addHabit = vi.fn().mockRejectedValue(new Error('Storage unavailable'));
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(<TodayTab todayOccurrences={[]} onAddHabit={addHabit} />);
      fireEvent.click(screen.getByRole('button', { name: 'Add habit' }));
      const create = screen.getByRole('button', { name: 'Create habit' });
      expect(create.disabled).toBe(true);
      fireEvent.change(screen.getByLabelText('Habit name'), { target: { value: '  Read  ' } });
      fireEvent.click(create);
      expect((await screen.findByRole('alert')).textContent).toContain('Habit could not be saved');
      expect(screen.getByLabelText('Habit name').value).toBe('  Read  ');
      expect(addHabit).toHaveBeenCalledWith({ name: 'Read', domain: 'general' });
    } finally {
      errorLog.mockRestore();
    }
  });
});
