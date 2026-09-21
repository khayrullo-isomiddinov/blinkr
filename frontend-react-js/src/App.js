import React from 'react';
import process from 'process';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { Amplify } from 'aws-amplify';

import { appRoutes } from './routes';
import { setUnauthorizedHandler } from './lib/api';

Amplify.configure({
  Auth: {
    region: process.env.REACT_APP_AWS_PROJECT_REGION,
    userPoolId: process.env.REACT_APP_AWS_USER_POOLS_ID,
    userPoolWebClientId: process.env.REACT_APP_AWS_USER_POOLS_WEB_CLIENT_ID,
  }
});

const router = createBrowserRouter(appRoutes);

// A 401 from any API call clears the session (in lib/api.js), then lands here.
setUnauthorizedHandler(() => router.navigate('/signin', { replace: true }));

function App() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;
