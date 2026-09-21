import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, ApiError } from '../../lib/api';
import { describeApiError } from '../../lib/apiErrors';
import { deleteCognitoAccount, clearSession } from '../../lib/auth';
import { getTheme, setTheme } from '../../lib/theme';
import { ChevronRight } from '../../components/icons';

const CONFIRM_WORD = 'DELETE';

function Appearance() {
  const [theme, setThemeState] = React.useState(getTheme());
  const choose = (value) => {
    setTheme(value);
    setThemeState(value);
  };
  return (
    <section aria-labelledby="appearance-heading" className="card p-5">
      <h2 id="appearance-heading" className="font-display text-lg font-bold">Appearance</h2>
      <p className="mt-1 text-sm text-fg-mute">Choose how Blinkr looks on this device.</p>
      <div role="group" aria-label="Theme" className="mt-4 grid grid-cols-2 gap-2">
        {[['light', 'Light'], ['dark', 'Dark']].map(([value, label]) => (
          <button key={value} type="button" aria-pressed={theme === value} onClick={() => choose(value)} className="seg-btn">{label}</button>
        ))}
      </div>
    </section>
  );
}

function DeleteAccount() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [dataDeleted, setDataDeleted] = React.useState(false);

  async function remove() {
    setBusy(true);
    setError('');
    try {
      if (!dataDeleted) {
        await apiRequest('/api/me', { method: 'DELETE' });
        setDataDeleted(true);
      }
      await deleteCognitoAccount();
      await clearSession();
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(describeApiError(err));
      } else {
        setError('Your workouts and profile were deleted, but your sign-in account could not be removed yet. Try again, or contact support.');
      }
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="account-heading" className="card p-5">
      <h2 id="account-heading" className="font-display text-lg font-bold">Account</h2>
      {!open ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-sm text-sm text-fg-mute">Permanently delete your account, profile photo and every workout you have logged.</p>
          <button type="button" onClick={() => setOpen(true)} className="btn-secondary">Delete account</button>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-fg-soft">
            This permanently deletes your sign-in account, profile photo and all of your workouts, exercises in those workouts, and sets.
            It cannot be undone.
          </p>
          <label htmlFor="delete-confirm" className="field-label mt-4">Type {CONFIRM_WORD} to confirm</label>
          <input id="delete-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="input" />
          {error && <div role="alert" className="alert-error mt-3">{error}</div>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={remove} disabled={busy || typed.trim() !== CONFIRM_WORD} className="btn-danger">
              {busy ? 'Deleting...' : 'Delete my account permanently'}
            </button>
            <button type="button" onClick={() => { setOpen(false); setTyped(''); setError(''); }} disabled={busy} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function SettingsPage() {
  const rows = [['/support', 'Contact support'], ['/privacy', 'Privacy policy'], ['/terms', 'Terms and conditions']];
  return (
    <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-28 pt-6 sm:pb-12 sm:pt-10">
      <h1 className="font-display text-[38px] font-extrabold leading-none tracking-tight">Settings</h1>
      <div className="pt-2" />
      <Appearance />
      <DeleteAccount />
      <section aria-label="Help and legal">
        <ul className="card overflow-hidden">
          {rows.map(([to, label], index) => (
            <li key={to} className={index > 0 ? 'border-t border-ink-700' : ''}>
              <Link to={to} className="flex h-14 items-center justify-between px-4 text-fg hover:bg-ink-800 hover:no-underline">
                {label}<ChevronRight width={18} height={18} className="text-fg-mute" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
