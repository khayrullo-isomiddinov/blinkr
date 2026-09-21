import React from 'react';
import HomePage from './features/home/HomePage';
import SignInPage from './features/auth/SignInPage';
import SignUpPage from './features/auth/SignUpPage';
import RequireAuth from './features/auth/RequireAuth';
import AppLayout from './layouts/AppLayout';
import WorkoutsPage from './features/workouts/WorkoutsPage';
import WorkoutPage from './features/workouts/WorkoutPage';
import ExercisesPage from './features/exercises/ExercisesPage';
import RequireAdmin from './features/admin/RequireAdmin';
import AdminLayout from './features/admin/AdminLayout';
import OverviewPage from './features/admin/pages/OverviewPage';
import ComingNextPage from './features/admin/pages/ComingNextPage';

// Kept separate from App.js so tests can mount the same route table in a memory router.
// Every /admin/* route is a child of the RequireAdmin parent, so none can be added outside the gate.
export const appRoutes = [
  { path: '/', element: <HomePage /> },
  { path: '/signin', element: <SignInPage /> },
  { path: '/signup', element: <SignUpPage /> },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/workouts', element: <WorkoutsPage /> },
      { path: '/workouts/:id', element: <WorkoutPage /> },
      { path: '/exercises', element: <ExercisesPage /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    ),
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'users', element: <ComingNextPage title="Users" /> },
      { path: 'users/:id', element: <ComingNextPage title="User details" /> },
      { path: 'events', element: <ComingNextPage title="Events" /> },
      { path: 'infrastructure', element: <ComingNextPage title="Infrastructure" /> },
      { path: 'observability', element: <ComingNextPage title="Observability" /> },
      { path: 'settings', element: <ComingNextPage title="Settings" /> },
    ],
  },
];
