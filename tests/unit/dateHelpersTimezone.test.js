import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const dateHelpersUrl = new URL('../../src/helpers/dateHelpers.js', import.meta.url).href;

function runInTimezone(timezone, expression) {
  const script = `
    import * as dates from ${JSON.stringify(dateHelpersUrl)};
    const result = (${expression});
    console.log(JSON.stringify(result));
  `;
  return JSON.parse(execFileSync(
    process.execPath,
    ['--input-type=module', '--eval', script],
    {
      encoding: 'utf8',
      env: { ...process.env, TZ: timezone },
    }
  ));
}

describe('local date helpers across timezones', () => {
  it.each([
    ['UTC', '2026-01-01'],
    ['America/New_York', '2025-12-31'],
    ['Asia/Kolkata', '2026-01-01'],
    ['Pacific/Kiritimati', '2026-01-01'],
    ['Etc/GMT+12', '2025-12-31'],
  ])('uses the local calendar date in %s', (timezone, expectedDate) => {
    expect(runInTimezone(timezone, `dates.localDateStr(new Date('2026-01-01T00:30:00Z'))`))
      .toBe(expectedDate);
  });

  it('counts calendar days across the spring daylight-saving transition', () => {
    expect(runInTimezone('America/New_York', `({
      march7To8: dates.addDays('2026-03-07', 1),
      march8To9: dates.addDays('2026-03-08', 1),
      daysBetween: dates.daysBetween('2026-03-08', '2026-03-09'),
      consecutive: dates.areConsecutiveDays('2026-03-08', '2026-03-09'),
      elapsedHours: (dates.startOfDay('2026-03-09') - dates.startOfDay('2026-03-08')) / 3600000,
    })`)).toEqual({
      march7To8: '2026-03-08',
      march8To9: '2026-03-09',
      daysBetween: 1,
      consecutive: true,
      elapsedHours: 23,
    });
  });

  it('counts calendar days across the fall daylight-saving transition', () => {
    expect(runInTimezone('America/New_York', `({
      nextDay: dates.addDays('2026-11-01', 1),
      daysBetween: dates.daysBetween('2026-11-01', '2026-11-02'),
      consecutive: dates.areConsecutiveDays('2026-11-01', '2026-11-02'),
      elapsedHours: (dates.startOfDay('2026-11-02') - dates.startOfDay('2026-11-01')) / 3600000,
    })`)).toEqual({
      nextDay: '2026-11-02',
      daysBetween: 1,
      consecutive: true,
      elapsedHours: 25,
    });
  });
});
