import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from '../../lib/auth';

// Signs out, then always returns to /signin -- even if the sign-out call itself fails.
export function useSignOut() {
  const navigate = useNavigate();
  return React.useCallback(async () => {
    try {
      await signOut();
    } catch (err) {
      // signOut() already fell back to a local clear; the user still leaves.
    }
    navigate('/signin', { replace: true });
  }, [navigate]);
}
