import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signIn, clearSession } from '../../lib/auth';
import { describeAuthError } from '../../lib/authErrors';
import { LegalLinks } from '../../components/PublicPage';
import { Logo } from '../../components/Logo';

// Only ever go back to an in-app path, never an arbitrary URL.
function safeDestination(from) {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/workouts';
}

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const user = await signIn(username.trim(), password);
      if (user && user.challengeName) {
        // e.g. a forced password change -- not supported here, so don't leave a half-signed-in session behind
        await clearSession();
        setError('This account needs an extra sign-in step that this page does not support yet.');
        setLoading(false);
        return;
      }
      navigate(safeDestination(location.state && location.state.from), { replace: true });
    } catch (err) {
      setError(describeAuthError(err));
      setLoading(false);
    } finally {
      setPassword('');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo size={38} /></div>
        <form onSubmit={handleSubmit} className="card p-6" noValidate>
          <h1 className="font-display text-2xl font-extrabold text-center mb-6">Sign in</h1>

          {!error && location.state && location.state.notice && (
            <div role="status" className="alert-success mb-4">
              {location.state.notice}
            </div>
          )}

          {error && (
            <div role="alert" className="alert-error mb-4">
              {error}
            </div>
          )}

          <label htmlFor="signin-username" className="field-label">
            Email or username
          </label>
          <input
            id="signin-username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input mb-4"
          />

          <label htmlFor="signin-password" className="field-label">
            Password
          </label>
          <input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mb-6"
          />

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="btn-primary w-full"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm text-fg-mute mt-4">
          New here? <Link to="/signup">Create an account</Link>
        </p>
        <LegalLinks className="mt-6 justify-center" />
      </div>
    </div>
  );
}
