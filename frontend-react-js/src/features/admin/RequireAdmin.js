import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { apiRequest, ApiError } from '../../lib/api';
import { useSignOut } from '../auth/useSignOut';

const AdminContext = React.createContext(null);

// The signed-in admin as reported by the backend (username, groups, expires_at).
export function useAdmin() {
  return React.useContext(AdminContext);
}

function Notice({ title, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950 text-gray-100 dark">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h1 className="text-lg font-semibold mb-2">{title}</h1>
        {children}
      </div>
    </div>
  );
}


// The backend decides who is an admin; the token is never inspected here.
export default function RequireAdmin({ children }) {
  const location = useLocation();
  const signOut = useSignOut();
  const [state, setState] = React.useState({ status: 'checking', admin: null });
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: 'checking', admin: null });
    apiRequest('/api/admin/me')
      .then((admin) => {
        if (!cancelled) setState({ status: 'ok', admin });
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err instanceof ApiError && err.status === 401 ? 'unauthenticated'
          : err instanceof ApiError && err.status === 403 ? 'forbidden'
          : 'error';
        setState({ status, admin: null });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (state.status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100 dark" role="status">
        <p className="text-gray-400 text-sm">Checking access...</p>
      </div>
    );
  }

  if (state.status === 'unauthenticated') {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  if (state.status === 'forbidden') {
    return (
      <Notice title="Admin access required">
        <p className="text-sm text-gray-400">You are signed in, but this account is not an administrator.</p>
        <button type="button" onClick={signOut} className="btn-secondary mt-4">Sign out</button>
      </Notice>
    );
  }

  if (state.status === 'error') {
    return (
      <Notice title="Admin console unavailable">
        <p className="text-sm text-gray-400">The console could not be loaded. Try again in a moment.</p>
        <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn-secondary mt-4">Retry</button>
      </Notice>
    );
  }

  return <AdminContext.Provider value={state.admin}>{children}</AdminContext.Provider>;
}
