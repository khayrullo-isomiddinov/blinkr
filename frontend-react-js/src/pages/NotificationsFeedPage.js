import React from "react";
import { Link } from "react-router-dom";

import { useAuthUser } from '../lib/useAuthUser';
import { signOut } from '../lib/auth';

export default function NotificationsFeedPage() {
  const user = useAuthUser();

  const doSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.log('error signing out: ', error);
    }
  };

  return (
    <div>
      <nav>
        <Link to="/">Home</Link> |{' '}
        <Link to="/explore">Explore</Link> |{' '}
        <Link to="/notifications">Notifications</Link> |{' '}
        <Link to="/messages">Messages</Link>
        {user && (
          <>
            {' '}| <Link to={`/@${user.handle}`}>@{user.handle}</Link>
            {' '}| <button onClick={doSignOut}>Sign Out</button>
          </>
        )}
      </nav>

      <h1>Notifications</h1>
      <p>No notifications yet.</p>
    </div>
  );
}
