import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from './useSession';
import { LogoMark } from '../../components/Logo';

export default function RequireAuth({ children }) {
  const status = useSession();
  const location = useLocation();

  // A branded hold instead of a bare "Loading..." flash, while the Cognito session check resolves.
  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950" role="status">
        <LogoMark size={36} className="text-accent motion-safe:animate-pulse" label="Loading Blinkr" />
      </div>
    );
  }
  if (status === 'out') {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }
  return children;
}
