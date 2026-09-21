import { Auth } from 'aws-amplify';

export function signIn(username, password) {
  return Auth.signIn({ username, password });
}

// The access token, never the ID token -- the backend authorizes on it.
export async function getCurrentAccessToken() {
  try {
    const session = await Auth.currentSession();
    return session.getAccessToken().getJwtToken();
  } catch (err) {
    return null;
  }
}

// Local-only clear for after a 401, when the token is already known to be bad.
export async function clearSession() {
  try {
    await Auth.signOut();
  } catch (err) {
    // nothing more to clear
  }
  localStorage.removeItem('access_token');
}

export async function signOut() {
  try {
    await Auth.signOut({ global: true });
  } catch (err) {
    // global revoke needs the network; local state must clear regardless
    await Auth.signOut();
  } finally {
    localStorage.removeItem('access_token');
  }
}

export function signUp({ name, email, username, password }) {
  return Auth.signUp({
    username,
    password,
    attributes: { email, name, preferred_username: username },
  });
}

export function confirmSignUp(username, code) {
  return Auth.confirmSignUp(username, code);
}

export function resendConfirmationCode(username) {
  return Auth.resendSignUp(username);
}

export function forgotPassword(username) {
  return Auth.forgotPassword(username);
}

export function forgotPasswordSubmit(username, code, newPassword) {
  return Auth.forgotPasswordSubmit(username, code, newPassword);
}

export function currentAuthenticatedUser() {
  return Auth.currentAuthenticatedUser({ bypassCache: false });
}
