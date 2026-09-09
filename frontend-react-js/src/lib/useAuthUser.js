import React from 'react';
import { Auth } from 'aws-amplify';

// Resolves the currently signed-in Cognito user (or null) once on mount.
export function useAuthUser() {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    Auth.currentAuthenticatedUser({ bypassCache: false })
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
