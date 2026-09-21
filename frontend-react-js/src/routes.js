import React from 'react';
import HomePage from './pages/HomePage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import RequireAuth from './app/RequireAuth';
import AppLayout from './app/AppLayout';
import WorkoutsPage from './app/WorkoutsPage';
import WorkoutPage from './app/WorkoutPage';
import ExercisesPage from './app/ExercisesPage';
import RequireAdmin from './admin/RequireAdmin';
import AdminLayout from './admin/AdminLayout';
import OverviewPage from './admin/pages/OverviewPage';
import ComingNextPage from './admin/pages/ComingNextPage';

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
