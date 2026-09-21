import { apiRequest, ApiError, setUnauthorizedHandler } from './api';
import { getCurrentAccessToken, clearSession } from './auth';

jest.mock('./auth', () => ({ getCurrentAccessToken: jest.fn(), clearSession: jest.fn() }));

const TOKEN = 'aaa.bbb.SECRET-SIGNATURE-VALUE';

function respond(status, data) {
  return { status, ok: status >= 200 && status < 300, json: async () => data };
}

beforeEach(() => {
  process.env.REACT_APP_BACKEND_URL = 'https://api.test/';
  getCurrentAccessToken.mockResolvedValue(TOKEN);
  clearSession.mockResolvedValue(undefined);
  global.fetch = jest.fn();
  setUnauthorizedHandler(null);
});

test('attaches the access token as a Bearer header to the configured backend URL', async () => {
  fetch.mockResolvedValue(respond(200, { ok: true }));

  await expect(apiRequest('/api/admin/me')).resolves.toEqual({ ok: true });

  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe('https://api.test/api/admin/me');
  expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  expect(options.method).toBe('GET');
});

test('callers cannot override the Authorization header', async () => {
  fetch.mockResolvedValue(respond(200, {}));
  await apiRequest('/x', { headers: { Authorization: 'Bearer attacker' } });
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${TOKEN}`);
});

test('never logs the token or the Authorization header', async () => {
  const spies = ['log', 'info', 'warn', 'error', 'debug'].map((m) => jest.spyOn(console, m).mockImplementation(() => {}));
  fetch.mockResolvedValueOnce(respond(200, {})).mockResolvedValueOnce(respond(403, { errors: ['admin_required'] }));

  await apiRequest('/ok');
  await apiRequest('/forbidden').catch(() => {});

  const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
  expect(logged).not.toContain(TOKEN);
  expect(logged).not.toContain('Bearer');
  spies.forEach((s) => s.mockRestore());
});

test('sends JSON bodies with a content type', async () => {
  fetch.mockResolvedValue(respond(201, { id: 1 }));
  await apiRequest('/things', { method: 'POST', body: { name: 'x' } });
  const [, options] = fetch.mock.calls[0];
  expect(options.method).toBe('POST');
  expect(options.headers['Content-Type']).toBe('application/json');
  expect(options.body).toBe('{"name":"x"}');
});

test('returns null for an empty 204 response', async () => {
  fetch.mockResolvedValue({ status: 204, ok: true, json: async () => { throw new Error('no body'); } });
  await expect(apiRequest('/x', { method: 'DELETE' })).resolves.toBeNull();
});

test('with no session it fails as unauthenticated without calling the backend', async () => {
  getCurrentAccessToken.mockResolvedValue(null);
  const handler = jest.fn();
  setUnauthorizedHandler(handler);

  await expect(apiRequest('/api/admin/me')).rejects.toMatchObject({ status: 401 });

  expect(fetch).not.toHaveBeenCalled();
  expect(clearSession).toHaveBeenCalled();
  expect(handler).toHaveBeenCalled();
});

test('a 401 clears the session, notifies the handler, and keeps the backend error codes', async () => {
  fetch.mockResolvedValue(respond(401, { errors: ['invalid_token'] }));
  const handler = jest.fn();
  setUnauthorizedHandler(handler);

  const error = await apiRequest('/api/admin/me').catch((e) => e);

  expect(error).toBeInstanceOf(ApiError);
  expect(error.status).toBe(401);
  expect(error.errors).toEqual(['invalid_token']);
  expect(clearSession).toHaveBeenCalledTimes(1);
  expect(handler).toHaveBeenCalledTimes(1);
});

test('a 403 is not treated as unauthenticated: session kept, handler not called', async () => {
  fetch.mockResolvedValue(respond(403, { errors: ['admin_required'] }));
  const handler = jest.fn();
  setUnauthorizedHandler(handler);

  const error = await apiRequest('/api/admin/me').catch((e) => e);

  expect(error.status).toBe(403);
  expect(error.errors).toEqual(['admin_required']);
  expect(clearSession).not.toHaveBeenCalled();
  expect(handler).not.toHaveBeenCalled();
});

test('accepts the backend bare-list error shape', async () => {
  fetch.mockResolvedValue(respond(422, ['name_blank', 'muscle_group_blank']));
  const error = await apiRequest('/x', { method: 'POST', body: {} }).catch((e) => e);
  expect(error.errors).toEqual(['name_blank', 'muscle_group_blank']);
});

test('a non-JSON error body yields an empty error list, not a crash', async () => {
  fetch.mockResolvedValue({ status: 500, ok: false, json: async () => { throw new SyntaxError('bad json'); } });
  const error = await apiRequest('/x').catch((e) => e);
  expect(error).toBeInstanceOf(ApiError);
  expect(error.status).toBe(500);
  expect(error.errors).toEqual([]);
});

test('errors never carry the token', async () => {
  fetch.mockResolvedValueOnce(respond(500, { errors: ['boom'] })).mockRejectedValueOnce(new TypeError('Failed to fetch'));

  const serverError = await apiRequest('/x').catch((e) => e);
  const networkError = await apiRequest('/x').catch((e) => e);

  for (const error of [serverError, networkError]) {
    expect(`${error.message} ${JSON.stringify(error)} ${error.stack}`).not.toContain(TOKEN);
  }
  expect(networkError.status).toBe(0);
});

test('a missing backend URL is a loud configuration error, not a silent network error', async () => {
  delete process.env.REACT_APP_BACKEND_URL;
  const error = await apiRequest('/x').catch((e) => e);
  expect(error).not.toBeInstanceOf(ApiError);
  expect(error.message).toMatch(/REACT_APP_BACKEND_URL/);
  expect(fetch).not.toHaveBeenCalled();
});
