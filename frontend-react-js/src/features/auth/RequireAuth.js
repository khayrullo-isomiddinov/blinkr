import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from './useSession';

export default function RequireAuth({ children }) {
  const status = useSession();
  const location = useLocation();

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }
  if (status === 'out') {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }
  return children;
}
