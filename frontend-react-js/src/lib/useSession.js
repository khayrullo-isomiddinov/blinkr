import React from 'react';
import { getCurrentAccessToken } from './auth';

// 'checking' | 'in' | 'out' -- a local Amplify session check; the backend still authorizes every request.
export function useSession() {
  const [status, setStatus] = React.useState('checking');
  React.useEffect(() => {
    let cancelled = false;
    getCurrentAccessToken().then((token) => {
      if (!cancelled) setStatus(token ? 'in' : 'out');
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return status;
}
