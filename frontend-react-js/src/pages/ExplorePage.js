import React from "react";
import { Link } from "react-router-dom";

import { useAuthUser } from '../lib/useAuthUser';
import { apiFetch } from '../lib/api';
import { signOut } from '../lib/auth';
import { relativeTime } from '../lib/time';

export default function ExplorePage() {
  const [activities, setActivities] = React.useState([]);
  const dataFetchedRef = React.useRef(false);
  const user = useAuthUser();

  React.useEffect(() => {
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    apiFetch('/api/activities/home')
      .then((res) => res.json())
      .then((resJson) => setActivities(resJson))
      .catch((err) => console.log(err));
  }, []);

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

      <h1>Explore</h1>

      <ul>
        {activities.map((activity) => (
          <li key={activity.uuid}>
            <strong>{activity.display_name || activity.handle}</strong> @{activity.handle} · {relativeTime(activity.created_at)}
            <p>{activity.message}</p>
          </li>
        ))}
      </ul>
      {activities.length === 0 && <p>No blinks yet.</p>}
    </div>
  );
}
