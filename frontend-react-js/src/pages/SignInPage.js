import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signIn, clearSession } from '../lib/auth';
import { describeAuthError } from '../lib/authErrors';

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
        <p className="text-center text-2xl font-extrabold text-emerald-400 mb-6">Blinkr</p>
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-lg p-6" noValidate>
          <h1 className="text-xl font-bold text-center mb-6">Sign in</h1>

          {!error && location.state && location.state.notice && (
            <div role="status" className="mb-4 px-3 py-2 rounded bg-emerald-950 border border-emerald-900 text-emerald-300 text-sm">
              {location.state.notice}
            </div>
          )}

          {error && (
            <div role="alert" className="mb-4 px-3 py-2 rounded bg-red-950 border border-red-900 text-red-300 text-sm">
              {error}
            </div>
          )}

          <label htmlFor="signin-username" className="block text-sm font-medium text-gray-300 mb-1">
            Email or username
          </label>
          <input
            id="signin-username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full mb-4 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-emerald-600"
          />

          <label htmlFor="signin-password" className="block text-sm font-medium text-gray-300 mb-1">
            Password
          </label>
          <input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-6 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-emerald-600"
          />

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full py-2 rounded text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-4">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
