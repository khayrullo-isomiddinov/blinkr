import React from 'react';
import HomePage from './features/home/HomePage';
import SignInPage from './features/auth/SignInPage';
import SignUpPage from './features/auth/SignUpPage';
import RequireAuth from './features/auth/RequireAuth';
import AppLayout from './layouts/AppLayout';
import WorkoutsPage from './features/workouts/WorkoutsPage';
import WorkoutPage from './features/workouts/WorkoutPage';
import ExercisesPage from './features/exercises/ExercisesPage';
import ProfilePage from './features/profile/ProfilePage';
import CalendarPage from './features/calendar/CalendarPage';
import DayPage from './features/calendar/DayPage';
import WeekStudioPage from './features/calendar/WeekStudioPage';
import WorkoutEditorPage from './features/calendar/WorkoutEditorPage';
import SettingsPage from './features/settings/SettingsPage';
import SupportPage from './features/support/SupportPage';
import PrivacyPage from './features/legal/PrivacyPage';
import TermsPage from './features/legal/TermsPage';
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
  { path: '/support', element: <SupportPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/terms', element: <TermsPage /> },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/calendar', element: <CalendarPage /> },
      { path: '/calendar/:date', element: <DayPage /> },
      { path: '/plan', element: <WeekStudioPage /> },
      { path: '/plan/workouts/new', element: <WorkoutEditorPage /> },
      { path: '/plan/workouts/:id', element: <WorkoutEditorPage /> },
      { path: '/workouts', element: <WorkoutsPage /> },
      { path: '/workouts/:id', element: <WorkoutPage /> },
      { path: '/exercises', element: <ExercisesPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/settings', element: <SettingsPage /> },
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
