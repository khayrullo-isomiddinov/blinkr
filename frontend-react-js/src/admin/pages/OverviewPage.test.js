import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import OverviewPage from './OverviewPage';
import { apiRequest, ApiError } from '../../lib/api';

jest.mock('../../lib/auth', () => ({ getCurrentAccessToken: jest.fn(), clearSession: jest.fn() }));

jest.mock('../../lib/api', () => {
  const actual = jest.requireActual('../../lib/api');
  return { ...actual, apiRequest: jest.fn() };
});

const SESSION_A = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SESSION_B = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER_A = '33333333-cccc-4ccc-8ccc-cccccccccccc';

const OVERVIEW = {
  generated_at: '2026-09-21T17:10:14Z',
  users: { total: 137 },
  workouts: { total: 4821, completed: 4099 },
  exercises: { total: 58 },
  events: { total: 4099, published: 4090, pending: 6, failed_attempts: 3 },
  recent_activity: [
    { workout_session_id: SESSION_A, user_id: USER_A, completed_at: '2026-09-21T16:59:00Z' },
    { workout_session_id: SESSION_B, user_id: USER_A, completed_at: '2026-09-21T16:12:00Z' },
  ],
};

const EMPTY = {
  generated_at: '2026-09-21T17:10:14Z',
  users: { total: 0 },
  workouts: { total: 0, completed: 0 },
  exercises: { total: 0 },
  events: { total: 0, published: 0, pending: 0, failed_attempts: 0 },
  recent_activity: [],
};

const stat = (label) => screen.getByText(label, { selector: 'dt' }).parentElement;

test('shows a restrained loading state while the request is pending', () => {
  apiRequest.mockReturnValue(new Promise(() => {}));
  render(<OverviewPage />);

  expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  expect(screen.getByRole('status')).toHaveTextContent('Loading overview');
  expect(screen.queryByRole('button', { name: 'Refresh' })).not.toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('renders the real values returned by the API', async () => {
  apiRequest.mockResolvedValue(OVERVIEW);
  render(<OverviewPage />);

  await screen.findByRole('heading', { name: 'Platform' });
  expect(apiRequest).toHaveBeenCalledWith('/api/admin/overview');
  expect(screen.getByText('Operational view of the Blinkr workout platform.')).toBeInTheDocument();

  expect(within(stat('Users')).getByText('137')).toBeInTheDocument();
  expect(within(stat('Workouts')).getByText('4,821')).toBeInTheDocument();
  expect(within(stat('Completed workouts')).getByText('4,099')).toBeInTheDocument();
  expect(within(stat('Exercises')).getByText('58')).toBeInTheDocument();

  expect(within(stat('Total events')).getByText('4,099')).toBeInTheDocument();
  expect(within(stat('Published')).getByText('4,090')).toBeInTheDocument();
  expect(within(stat('Pending')).getByText('6')).toBeInTheDocument();
  expect(within(stat('Events with attempts')).getByText('3')).toBeInTheDocument();
});

test('lists recent activity with ids and completion time, and nothing personal', async () => {
  apiRequest.mockResolvedValue(OVERVIEW);
  render(<OverviewPage />);

  const table = await screen.findByRole('table', { name: 'Most recently completed workouts' });
  const rows = within(table).getAllByRole('row');
  expect(rows).toHaveLength(3);
  expect(within(rows[1]).getByText(SESSION_A)).toBeInTheDocument();
  expect(within(rows[1]).getByText(USER_A)).toBeInTheDocument();
  expect(within(rows[2]).getByText(SESSION_B)).toBeInTheDocument();
  expect(rows[1].querySelector('time')).toHaveAttribute('datetime', '2026-09-21T16:59:00Z');
  expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Workout session', 'User', 'Completed']);
  expect(document.body.textContent).not.toMatch(/@/);
});

test('an empty platform shows zeros and an explicit no-activity message, not fake data', async () => {
  apiRequest.mockResolvedValue(EMPTY);
  render(<OverviewPage />);

  expect(await screen.findByText('No completed workouts yet.')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  ['Users', 'Workouts', 'Completed workouts', 'Exercises', 'Total events', 'Published', 'Pending', 'Events with attempts']
    .forEach((label) => expect(within(stat(label)).getByText('0')).toBeInTheDocument());
});

test('every figure comes from the response: different data renders different numbers', async () => {
  apiRequest.mockResolvedValue({
    ...OVERVIEW,
    users: { total: 7 },
    workouts: { total: 9, completed: 8 },
    exercises: { total: 5 },
    events: { total: 4, published: 3, pending: 1, failed_attempts: 0 },
    recent_activity: [],
  });
  render(<OverviewPage />);

  await screen.findByRole('heading', { name: 'Platform' });
  expect(within(stat('Users')).getByText('7')).toBeInTheDocument();
  expect(within(stat('Workouts')).getByText('9')).toBeInTheDocument();
  expect(within(stat('Completed workouts')).getByText('8')).toBeInTheDocument();
  expect(within(stat('Events with attempts')).getByText('0')).toBeInTheDocument();
  expect(screen.queryByText('137')).not.toBeInTheDocument();
  expect(screen.queryByText('4,821')).not.toBeInTheDocument();
});

test('an API error shows a clean message with Retry and never the backend text', async () => {
  apiRequest
    .mockRejectedValueOnce(new ApiError(500, ['psycopg2.OperationalError: password authentication failed']))
    .mockResolvedValueOnce(OVERVIEW);
  render(<OverviewPage />);

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Overview unavailable');
  expect(document.body.textContent).not.toMatch(/psycopg2|password authentication/);
  expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: 'Retry' }));

  expect(await screen.findByRole('heading', { name: 'Platform' })).toBeInTheDocument();
  expect(within(stat('Users')).getByText('137')).toBeInTheDocument();
  expect(apiRequest).toHaveBeenCalledTimes(2);
});

test('a network failure and a malformed response are both treated as errors', async () => {
  apiRequest.mockRejectedValueOnce(new ApiError(0, ['network_error']));
  const { unmount } = render(<OverviewPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Overview unavailable');
  unmount();

  apiRequest.mockResolvedValueOnce({ users: { total: 'lots' } });
  render(<OverviewPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Overview unavailable');
});

test('Refresh reloads on demand, keeps the numbers visible meanwhile, and does not poll', async () => {
  let finishSecond;
  apiRequest
    .mockResolvedValueOnce(OVERVIEW)
    .mockReturnValueOnce(new Promise((resolve) => { finishSecond = resolve; }));
  render(<OverviewPage />);
  await screen.findByRole('heading', { name: 'Platform' });
  expect(apiRequest).toHaveBeenCalledTimes(1);

  userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

  expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
  expect(screen.getByText('Refreshing...')).toBeInTheDocument();
  expect(within(stat('Users')).getByText('137')).toBeInTheDocument();

  finishSecond({ ...OVERVIEW, users: { total: 138 } });

  expect(await within(stat('Users')).findByText('138')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled();
  expect(apiRequest).toHaveBeenCalledTimes(2);
});

test('does not poll on its own', async () => {
  jest.useFakeTimers();
  try {
    apiRequest.mockResolvedValue(OVERVIEW);
    render(<OverviewPage />);
    await screen.findByRole('heading', { name: 'Platform' });
    jest.advanceTimersByTime(10 * 60 * 1000);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});
