import { Auth } from 'aws-amplify';

// Shared Cognito auth calls, kept out of page components.

export function signIn(email, password) {
  return Auth.signIn({ username: email, password });
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

export function signOut() {
  return Auth.signOut({ global: true });
}

export function currentAuthenticatedUser() {
  return Auth.currentAuthenticatedUser({ bypassCache: false });
}
