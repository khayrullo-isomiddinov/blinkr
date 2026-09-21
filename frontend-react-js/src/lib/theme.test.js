import { getTheme, setTheme, initTheme } from './theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

test('defaults to dark', () => {
  expect(getTheme()).toBe('dark');
  initTheme();
  expect(document.documentElement.classList.contains('dark')).toBe(true);
});

test('choosing light removes the dark class and is remembered', () => {
  setTheme('dark');
  setTheme('light');
  expect(document.documentElement.classList.contains('dark')).toBe(false);
  expect(getTheme()).toBe('light');
  document.documentElement.classList.add('dark');
  initTheme();
  expect(document.documentElement.classList.contains('dark')).toBe(false);
});

test('choosing dark again restores it', () => {
  setTheme('light');
  setTheme('dark');
  expect(document.documentElement.classList.contains('dark')).toBe(true);
  expect(getTheme()).toBe('dark');
});

test('an unknown stored value falls back to dark', () => {
  localStorage.setItem('blinkr-theme', 'purple');
  expect(getTheme()).toBe('dark');
});
