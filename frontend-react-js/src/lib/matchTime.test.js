import { elapsedMinute, statusLabel, formatKickoff } from './matchTime';

describe('elapsedMinute', () => {
  test('returns null for a scheduled match', () => {
    expect(elapsedMinute(new Date().toISOString(), 'scheduled')).toBeNull();
  });

  test('returns null for a finished match', () => {
    expect(elapsedMinute(new Date().toISOString(), 'finished')).toBeNull();
  });

  test('returns elapsed minutes for a live match', () => {
    const kickoff = new Date(Date.now() - 40 * 60000).toISOString();
    expect(elapsedMinute(kickoff, 'live')).toBeGreaterThanOrEqual(39);
  });

  test('never returns a negative number for a future kickoff', () => {
    const kickoff = new Date(Date.now() + 5 * 60000).toISOString();
    expect(elapsedMinute(kickoff, 'live')).toBe(0);
  });
});

describe('statusLabel', () => {
  test('formats a live match with its minute', () => {
    expect(statusLabel('live', 63)).toBe("LIVE 63'");
  });

  test('formats half time, full time, and upcoming', () => {
    expect(statusLabel('half_time', null)).toBe('HALF-TIME');
    expect(statusLabel('finished', null)).toBe('FULL-TIME');
    expect(statusLabel('scheduled', null)).toBe('UPCOMING');
  });
});

describe('formatKickoff', () => {
  test('labels a kickoff later today as "Today"', () => {
    const later = new Date();
    later.setHours(later.getHours() + 2);
    expect(formatKickoff(later.toISOString())).toMatch(/^Today ·/);
  });

  test('labels a kickoff tomorrow as "Tomorrow"', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(formatKickoff(tomorrow.toISOString())).toMatch(/^Tomorrow ·/);
  });
});
