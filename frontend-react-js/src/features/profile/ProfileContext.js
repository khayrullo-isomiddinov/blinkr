import React from 'react';
import { apiRequest } from '../../lib/api';

const ProfileContext = React.createContext(null);

// Loaded once for the signed-in shell so the header avatar updates the moment the profile page changes it.
export function ProfileProvider({ children }) {
  const [profile, setProfile] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    apiRequest('/api/me')
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const value = React.useMemo(() => ({ profile, setProfile }), [profile]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return React.useContext(ProfileContext) || { profile: null, setProfile: () => {} };
}
