import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { appRoutes } from '../../routes';
import { apiRequest, ApiError } from '../../lib/api';
import { signOut, getCurrentAccessToken } from '../../lib/auth';

jest.mock('../../lib/auth', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  clearSession: jest.fn(),
  getCurrentAccessToken: jest.fn(),
}));

jest.mock('../../lib/api', () => {
  const actual = jest.requireActual('../../lib/api');
  return { ...actual, apiRequest: jest.fn() };
});

const ADMIN = { username: 'khayrullo', groups: ['admin'], expires_at: 1893456000 };

const ADMIN_PATHS = [
  '/admin',
  '/admin/users',
  '/admin/users/abc-123',
  '/admin/events',
  '/admin/infrastructure',
  '/admin/observability',
  '/admin/settings',
];

function renderAt(path) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

// The shell also mounts Overview, which calls the (mocked) API too; its request just stays pending here.
const answerApi = (me) => apiRequest.mockImplementation((path) => (path === '/api/admin/me' ? me() : new Promise(() => {})));

// router 6.4's navigate() is a no-op until the component's passive effects have flushed
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

beforeEach(() => {
  signOut.mockResolvedValue(undefined);
});

test('an unauthenticated visit to /admin redirects to /signin', async () => {
  apiRequest.mockRejectedValue(new ApiError(401, ['missing_session']));

  const router = renderAt('/admin');

  expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/signin');
});

test.each(ADMIN_PATHS)('%s is behind the admin gate (401 -> /signin)', async (path) => {
  apiRequest.mockRejectedValue(new ApiError(401, ['invalid_token']));

  const router = renderAt(path);

  await waitFor(() => expect(router.state.location.pathname).toBe('/signin'));
  expect(screen.queryByRole('navigation', { name: 'Admin' })).not.toBeInTheDocument();
});

test('a backend 200 from /api/admin/me renders the admin shell', async () => {
  answerApi(() => Promise.resolve(ADMIN));

  renderAt('/admin');

  expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  expect(apiRequest).toHaveBeenCalledWith('/api/admin/me');
  expect(screen.getByTestId('admin-username')).toHaveTextContent('khayrullo');
  const nav = screen.getByRole('navigation', { name: 'Admin' });
  ['Overview', 'Users', 'Events', 'Infrastructure', 'Observability', 'Settings'].forEach((label) => {
    expect(nav).toHaveTextContent(label);
  });
});

test('the gate defers to the backend and never inspects the token itself', async () => {
  answerApi(() => Promise.resolve(ADMIN));
  renderAt('/admin');
  await screen.findByRole('heading', { name: 'Overview' });
  expect(getCurrentAccessToken).not.toHaveBeenCalled();
});

test('shows a checking state while the backend decides', () => {
  apiRequest.mockReturnValue(new Promise(() => {}));
  renderAt('/admin');
  expect(screen.getByRole('status')).toHaveTextContent('Checking access');
  expect(screen.queryByRole('navigation', { name: 'Admin' })).not.toBeInTheDocument();
});

test('a backend 403 renders "Admin access required" with a sign-out action, not the shell', async () => {
  apiRequest.mockRejectedValue(new ApiError(403, ['admin_required']));

  const router = renderAt('/admin/users');

  expect(await screen.findByRole('heading', { name: 'Admin access required' })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/admin/users');
  expect(screen.queryByRole('navigation', { name: 'Admin' })).not.toBeInTheDocument();
  expect(screen.queryByText('admin_required')).not.toBeInTheDocument();

  await settle();
  userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

  await waitFor(() => expect(router.state.location.pathname).toBe('/signin'));
  expect(signOut).toHaveBeenCalledTimes(1);
});

test('other failures show an unavailable state without backend internals, and can retry', async () => {
  let calls = 0;
  answerApi(() => (calls++ === 0 ? Promise.reject(new ApiError(500, ['internal_stack_detail_xyz'])) : Promise.resolve(ADMIN)));

  renderAt('/admin');

  expect(await screen.findByRole('heading', { name: 'Admin console unavailable' })).toBeInTheDocument();
  expect(screen.queryByText(/internal_stack_detail_xyz/)).not.toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: 'Retry' }));

  expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
});

test('a network failure or unexpected error also shows the unavailable state', async () => {
  apiRequest.mockRejectedValue(new ApiError(0, ['network_error']));
  renderAt('/admin');
  expect(await screen.findByRole('heading', { name: 'Admin console unavailable' })).toBeInTheDocument();
});

test('sign-out from the admin shell clears auth and returns to /signin', async () => {
  answerApi(() => Promise.resolve(ADMIN));

  const router = renderAt('/admin');
  await screen.findByRole('heading', { name: 'Overview' });

  await settle();
  userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

  await waitFor(() => expect(router.state.location.pathname).toBe('/signin'));
  expect(signOut).toHaveBeenCalledTimes(1);
});

test('sign-out still returns to /signin even if the sign-out call fails', async () => {
  answerApi(() => Promise.resolve(ADMIN));
  signOut.mockRejectedValue(new Error('network down'));

  const router = renderAt('/admin');
  await screen.findByRole('heading', { name: 'Overview' });
  await settle();
  userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

  await waitFor(() => expect(router.state.location.pathname).toBe('/signin'));
});

test('the active section is marked in the navigation', async () => {
  answerApi(() => Promise.resolve(ADMIN));

  renderAt('/admin/users');

  const usersLink = await screen.findByRole('link', { name: 'Users' });
  expect(usersLink).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
});

test('the mobile menu toggles the sidebar', async () => {
  answerApi(() => Promise.resolve(ADMIN));
  renderAt('/admin');
  const toggle = await screen.findByRole('button', { name: 'Menu' });

  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  userEvent.click(toggle);
  expect(screen.getByRole('button', { name: 'Close' })).toHaveAttribute('aria-expanded', 'true');
});
