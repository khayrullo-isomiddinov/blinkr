import React from 'react';
import { currentAuthenticatedUser } from './auth';

// Resolves the currently signed-in Cognito user (or null) once on mount.
export function useAuthUser() {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    currentAuthenticatedUser()
      .then((cognito_user) => {
        setUser({
          display_name: cognito_user.attributes.name,
          handle: cognito_user.attributes.preferred_username,
        });
      })
      .catch((err) => {
        console.log(err);
        setUser(null);
      });
  }, []);

  return user;
}
