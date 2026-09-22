import React from 'react';
import { apiRequest } from './api';

// Results already fetched this session. A page that remounts (calendar -> day -> calendar) can show them at once
// and refresh in the background, instead of flashing a skeleton.
const cache = new Map();

// Fetch fresh data and store it, so the next page to mount starts from the up-to-date copy.
export async function refreshLoad(path) {
  const data = await apiRequest(path);
  cache.set(path, data);
  return data;
}

// GET `path` on mount and whenever it changes. reload() refetches without dropping the current data.
//   cache        show the last result for this path immediately, then refresh it
//   keepPrevious when `path` changes, keep showing the old data until the new data arrives
// `fetching` is true whenever a request is in flight, even while data is on screen.
export function useLoad(path, { keepPrevious = false, cache: useCache = false } = {}) {
  const [state, setState] = React.useState(() => (
    useCache && cache.has(path)
      ? { status: 'ready', data: cache.get(path), error: null, fetching: true }
      : { status: 'loading', data: null, error: null, fetching: true }
  ));
  const [tick, setTick] = React.useState(0);
  const seenPath = React.useRef(path);

  React.useEffect(() => {
    if (seenPath.current !== path) {
      seenPath.current = path;
      setState((current) => {
        if (useCache && cache.has(path)) return { status: 'ready', data: cache.get(path), error: null, fetching: true };
        if (keepPrevious && current.data) return { ...current, fetching: true };
        return { status: 'loading', data: null, error: null, fetching: true };
      });
    } else {
      setState((current) => (current.fetching ? current : { ...current, fetching: true }));
    }

    let cancelled = false;
    apiRequest(path)
      .then((data) => {
        if (useCache) cache.set(path, data);
        if (!cancelled) setState({ status: 'ready', data, error: null, fetching: false });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', data: null, error, fetching: false });
      });
    return () => {
      cancelled = true;
    };
  }, [path, tick, useCache, keepPrevious]);

  const reload = React.useCallback(() => setTick((n) => n + 1), []);
  return { ...state, reload };
}
