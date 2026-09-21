import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import SignInPage from './SignInPage';
import { signIn, clearSession } from '../lib/auth';

jest.mock('../lib/auth', () => ({ signIn: jest.fn(), clearSession: jest.fn() }));

function renderSignIn(entry = '/signin') {
  const router = createMemoryRouter(
    [
      { path: '/signin', element: <SignInPage /> },
      { path: '/admin', element: <p>admin home</p> },
      { path: '/admin/events', element: <p>events page</p> },
    ],
    { initialEntries: [entry] }
  );
  render(<RouterProvider router={router} />);
  return router;
}

function fillAndSubmit(username = 'khayrullo', password = 'correct horse') {
  userEvent.type(screen.getByLabelText('Email or username'), username);
  userEvent.type(screen.getByLabelText('Password'), password);
  userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

test('has labelled fields and the submit button is disabled until both are filled', () => {
  renderSignIn();
  const button = screen.getByRole('button', { name: 'Sign in' });
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  expect(button).toBeDisabled();
  userEvent.type(screen.getByLabelText('Email or username'), 'someone');
  expect(button).toBeDisabled();
  userEvent.type(screen.getByLabelText('Password'), 'pw');
  expect(button).toBeEnabled();
});

test('successful sign-in goes to /admin', async () => {
  signIn.mockResolvedValue({});
  const router = renderSignIn();

  fillAndSubmit('  khayrullo  ', 'pw');

  await waitFor(() => expect(router.state.location.pathname).toBe('/admin'));
  expect(signIn).toHaveBeenCalledWith('khayrullo', 'pw');
});

test('returns to the page the user was sent from', async () => {
  signIn.mockResolvedValue({});
  const router = renderSignIn({ pathname: '/signin', state: { from: '/admin/events' } });
  fillAndSubmit();
  await waitFor(() => expect(router.state.location.pathname).toBe('/admin/events'));
});

test('ignores a non-local "from" destination', async () => {
  signIn.mockResolvedValue({});
  const router = renderSignIn({ pathname: '/signin', state: { from: '//evil.example/x' } });
  fillAndSubmit();
  await waitFor(() => expect(router.state.location.pathname).toBe('/admin'));
});

test('shows a loading state and blocks a second submit while signing in', async () => {
  let finish;
  signIn.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  renderSignIn();

  fillAndSubmit();

  const button = await screen.findByRole('button', { name: 'Signing in...' });
  expect(button).toBeDisabled();
  finish({});
  await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
});

test('shows a clear error, stays on the page, and clears the password on failure', async () => {
  signIn.mockRejectedValue({ code: 'NotAuthorizedException', message: 'raw cognito text' });
  const router = renderSignIn();

  fillAndSubmit();

  expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect username or password.');
  expect(router.state.location.pathname).toBe('/signin');
  expect(screen.getByLabelText('Password')).toHaveValue('');
});

test('an unknown account gets the same message as a wrong password', async () => {
  signIn.mockRejectedValue({ code: 'UserNotFoundException' });
  renderSignIn();
  fillAndSubmit();
  expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect username or password.');
});

test('a Cognito challenge is not left as a half-signed-in session', async () => {
  signIn.mockResolvedValue({ challengeName: 'NEW_PASSWORD_REQUIRED' });
  const router = renderSignIn();

  fillAndSubmit();

  expect(await screen.findByRole('alert')).toHaveTextContent('extra sign-in step');
  expect(clearSession).toHaveBeenCalledTimes(1);
  expect(router.state.location.pathname).toBe('/signin');
});

test('never logs the password', async () => {
  const spies = ['log', 'info', 'warn', 'error', 'debug'].map((m) => jest.spyOn(console, m).mockImplementation(() => {}));
  signIn.mockRejectedValue({ code: 'NotAuthorizedException' });
  renderSignIn();

  fillAndSubmit('someone', 'super-secret-pw-123');
  await screen.findByRole('alert');

  expect(JSON.stringify(spies.flatMap((s) => s.mock.calls))).not.toContain('super-secret-pw-123');
  spies.forEach((s) => s.mockRestore());
});
