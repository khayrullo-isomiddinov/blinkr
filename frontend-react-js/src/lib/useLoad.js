import React from 'react';
import { apiRequest } from './api';

// GET `path` on mount and whenever it changes. reload() refetches in the background without dropping the current data.
export function useLoad(path) {
  const [state, setState] = React.useState({ status: 'loading', data: null, error: null });
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    apiRequest(path)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', data: null, error });
      });
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  React.useEffect(() => {
    setState({ status: 'loading', data: null, error: null });
  }, [path]);

  const reload = React.useCallback(() => setTick((n) => n + 1), []);
  return { ...state, reload };
}
