import { getCurrentAccessToken, clearSession } from './auth';

// The message deliberately carries no request details or tokens.
export class ApiError extends Error {
  constructor(status, errors = []) {
    super(`request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

let unauthorizedHandler = null;

// Lets the app route to /signin after a 401 clears the session.
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function backendUrl() {
  const base = process.env.REACT_APP_BACKEND_URL;
  if (!base) {
    throw new Error('REACT_APP_BACKEND_URL is not configured');
  }
  return base.replace(/\/+$/, '');
}

async function handleUnauthorized() {
  await clearSession();
  if (unauthorizedHandler) {
    unauthorizedHandler();
  }
}

// The backend returns errors as {'errors': [...]} or, for validation, a bare list.
function extractErrors(data) {
  const list = Array.isArray(data) ? data : data && data.errors;
  return Array.isArray(list) ? list.filter((e) => typeof e === 'string') : [];
}

// 401 clears the session and notifies the handler; 403 is signed-in-but-forbidden and is not a sign-out.
export async function apiRequest(path, { method = 'GET', body, headers = {}, ...rest } = {}) {
  const token = await getCurrentAccessToken();
  if (!token) {
    await handleUnauthorized();
    throw new ApiError(401, ['missing_session']);
  }

  const requestHeaders = {
    Accept: 'application/json',
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...headers,
    Authorization: `Bearer ${token}`,
  };

  const url = `${backendUrl()}${path}`;
  let response;
  try {
    response = await fetch(url, {
      ...rest,
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(0, ['network_error']);
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (response.ok) {
    return data;
  }
  if (response.status === 401) {
    await handleUnauthorized();
  }
  throw new ApiError(response.status, extractErrors(data));
}
