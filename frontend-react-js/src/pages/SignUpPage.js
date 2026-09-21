import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp, confirmSignUp, resendConfirmationCode } from '../lib/auth';
import { describeAuthError } from '../lib/authErrors';
import { inputClass, labelClass, primaryButton, secondaryButton, errorBox } from '../lib/ui';

export default function SignUpPage() {
  const navigate = useNavigate();
  const [step, setStep] = React.useState('details');
  const [form, setForm] = React.useState({ name: '', email: '', username: '', password: '' });
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submitDetails(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signUp({ name: form.name.trim(), email: form.email.trim(), username: form.username.trim(), password: form.password });
      setStep('confirm');
      setNotice('We emailed you a confirmation code.');
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setForm((f) => ({ ...f, password: '' }));
      setLoading(false);
    }
  }

  async function submitCode(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmSignUp(form.username.trim(), code.trim());
      navigate('/signin', { replace: true, state: { notice: 'Account confirmed. Sign in to continue.' } });
    } catch (err) {
      setError(describeAuthError(err));
      setLoading(false);
    }
  }

  async function resend() {
    setError('');
    try {
      await resendConfirmationCode(form.username.trim());
      setNotice('A new code is on its way.');
    } catch (err) {
      setError(describeAuthError(err));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <p className="text-center text-2xl font-extrabold text-emerald-400 mb-6">Blinkr</p>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h1 className="text-xl font-bold text-center mb-6">{step === 'details' ? 'Create your account' : 'Confirm your email'}</h1>
          {error && <div role="alert" className={`${errorBox} mb-4`}>{error}</div>}
          {notice && !error && <div role="status" className="mb-4 px-3 py-2 rounded bg-emerald-950 border border-emerald-900 text-emerald-300 text-sm">{notice}</div>}

          {step === 'details' ? (
            <form onSubmit={submitDetails} className="space-y-4">
              <div>
                <label htmlFor="su-name" className={labelClass}>Name</label>
                <input id="su-name" required autoComplete="name" value={form.name} onChange={set('name')} className={inputClass} />
              </div>
              <div>
                <label htmlFor="su-email" className={labelClass}>Email</label>
                <input id="su-email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} className={inputClass} />
              </div>
              <div>
                <label htmlFor="su-username" className={labelClass}>Username</label>
                <input id="su-username" required autoComplete="username" value={form.username} onChange={set('username')} className={inputClass} />
              </div>
              <div>
                <label htmlFor="su-password" className={labelClass}>Password</label>
                <input id="su-password" type="password" required autoComplete="new-password" value={form.password} onChange={set('password')} className={inputClass} />
              </div>
              <button type="submit" disabled={loading} className={`${primaryButton} w-full`}>{loading ? 'Creating account...' : 'Create account'}</button>
            </form>
          ) : (
            <form onSubmit={submitCode} className="space-y-4">
              <div>
                <label htmlFor="su-code" className={labelClass}>Confirmation code</label>
                <input id="su-code" required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} className={inputClass} />
              </div>
              <button type="submit" disabled={loading || !code.trim()} className={`${primaryButton} w-full`}>{loading ? 'Confirming...' : 'Confirm'}</button>
              <button type="button" onClick={resend} className={`${secondaryButton} w-full`}>Resend code</button>
            </form>
          )}
        </div>
        <p className="text-center text-sm text-gray-400 mt-4">
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
