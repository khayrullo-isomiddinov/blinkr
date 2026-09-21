import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSession } from '../auth/useSession';

export default function HomePage() {
  const status = useSession();
  if (status === 'in') return <Navigate to="/workouts" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-extrabold text-emerald-400 mb-3">Blinkr</h1>
        <p className="text-gray-300 mb-8">Log your workouts, track every set, and see your training add up.</p>
        {status === 'out' && (
          <div className="flex justify-center gap-3">
            <Link to="/signup" className="btn-primary">Create account</Link>
            <Link to="/signin" className="btn-secondary">Sign in</Link>
          </div>
        )}
      </div>
    </div>
  );
}
