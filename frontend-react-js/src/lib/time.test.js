import { relativeTime } from './time';

test('returns "now" for a timestamp seconds ago', () => {
  expect(relativeTime(new Date(Date.now() - 5000).toISOString())).toBe('now');
});

test('formats minutes, hours, and days', () => {
  expect(relativeTime(new Date(Date.now() - 5 * 60000).toISOString())).toBe('5m');
  expect(relativeTime(new Date(Date.now() - 3 * 3600000).toISOString())).toBe('3h');
  expect(relativeTime(new Date(Date.now() - 2 * 86400000).toISOString())).toBe('2d');
});

test('parses an RFC 1123 / HTTP-date string (Flask JSON provider format)', () => {
  const httpDate = new Date(Date.now() - 10 * 60000).toUTCString();
  expect(relativeTime(httpDate)).toBe('10m');
});

test('returns empty string for an unparseable date', () => {
  expect(relativeTime('not-a-date')).toBe('');
});
