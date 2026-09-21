const KEY = 'blinkr-theme';

export function getTheme() {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch (err) {
    return 'dark';
  }
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme !== 'light');
}

export function setTheme(theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch (err) {
    // the choice still applies for this visit
  }
  applyTheme(theme);
}

export function initTheme() {
  applyTheme(getTheme());
}
