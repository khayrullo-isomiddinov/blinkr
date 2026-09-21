import { Auth } from 'aws-amplify';
import { getCurrentAccessToken, signOut, clearSession } from './auth';

jest.mock('aws-amplify', () => ({
  Auth: { signIn: jest.fn(), signOut: jest.fn(), currentSession: jest.fn() },
}));

const session = {
  getAccessToken: () => ({ getJwtToken: () => 'ACCESS-JWT' }),
  getIdToken: () => {
    throw new Error('the ID token must never be used for API authorization');
  },
};

let signedIn;

beforeEach(() => {
  signedIn = true;
  Auth.currentSession.mockImplementation(async () => {
    if (!signedIn) throw new Error('No current user');
    return session;
  });
  Auth.signOut.mockImplementation(async () => {
    signedIn = false;
  });
  localStorage.clear();
});

test('getCurrentAccessToken returns the access token, never the ID token', async () => {
  await expect(getCurrentAccessToken()).resolves.toBe('ACCESS-JWT');
});

test('getCurrentAccessToken is null when signed out', async () => {
  signedIn = false;
  await expect(getCurrentAccessToken()).resolves.toBeNull();
});

test('signOut clears the session and the legacy stored token', async () => {
  localStorage.setItem('access_token', 'legacy-token');

  await signOut();

  expect(Auth.signOut).toHaveBeenCalledWith({ global: true });
  expect(localStorage.getItem('access_token')).toBeNull();
  await expect(getCurrentAccessToken()).resolves.toBeNull();
});

test('signOut still clears local state when the global revoke fails', async () => {
  localStorage.setItem('access_token', 'legacy-token');
  Auth.signOut.mockRejectedValueOnce(new Error('global sign out failed'));

  await signOut();

  expect(Auth.signOut).toHaveBeenCalledTimes(2);
  expect(Auth.signOut).toHaveBeenLastCalledWith();
  expect(localStorage.getItem('access_token')).toBeNull();
  await expect(getCurrentAccessToken()).resolves.toBeNull();
});

test('clearSession is local-only and never throws', async () => {
  Auth.signOut.mockRejectedValueOnce(new Error('nothing to sign out'));
  localStorage.setItem('access_token', 'legacy-token');

  await expect(clearSession()).resolves.toBeUndefined();

  expect(Auth.signOut).toHaveBeenCalledWith();
  expect(localStorage.getItem('access_token')).toBeNull();
});
