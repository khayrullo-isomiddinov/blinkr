import React from 'react';
import process from 'process';
import {
  createBrowserRouter,
  RouterProvider
} from "react-router-dom";

import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    region: process.env.REACT_APP_AWS_PROJECT_REGION,
    userPoolId: process.env.REACT_APP_AWS_USER_POOLS_ID,
    userPoolWebClientId: process.env.REACT_APP_AWS_USER_POOLS_WEB_CLIENT_ID,
  }
});

function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <p className="text-gray-400">Application foundation -- product not yet implemented.</p>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />
  }
]);

function App() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;
