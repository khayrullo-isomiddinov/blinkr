// Thin fetch wrapper: resolves against the backend URL and attaches the
// stored Cognito access token as a Bearer header when present.
export async function apiFetch(path, options = {}) {
  const backend_url = `${process.env.REACT_APP_BACKEND_URL}${path}`;
  const access_token = localStorage.getItem('access_token');
  const headers = { ...(options.headers || {}) };
  if (access_token) {
    headers['Authorization'] = `Bearer ${access_token}`;
  }
  return fetch(backend_url, { ...options, headers });
}
