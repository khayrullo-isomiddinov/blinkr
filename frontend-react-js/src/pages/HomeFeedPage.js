import React from "react";
import { Link } from "react-router-dom";

import { useAuthUser } from '../lib/useAuthUser';
import { apiFetch } from '../lib/api';
import { signOut } from '../lib/auth';
import { relativeTime } from '../lib/time';

export default function HomeFeedPage() {
  const [activities, setActivities] = React.useState([]);
  const [message, setMessage] = React.useState('');
  const dataFetchedRef = React.useRef(false);
  const user = useAuthUser();

  const loadData = async () => {
    try {
      const res = await apiFetch('/api/activities/home');
      let resJson = await res.json();
      if (res.status === 200) {
        setActivities(resJson)
      } else {
        console.log(res)
      }
    } catch (err) {
      console.log(err);
    }
  };

  React.useEffect(()=>{
    //prevents double call
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    loadData();
  }, [])

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    try {
      const res = await apiFetch('/api/activities', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, ttl: '7-days' }),
      });
      const data = await res.json();
      if (res.status === 200) {
        setActivities((current) => [data, ...current]);
        setMessage('');
      }
    } catch (err) {
      console.log(err);
    }
  };

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

      <h1>Home</h1>

      {user && (
        <form onSubmit={onSubmit}>
          <textarea
            placeholder="What's happening?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button type="submit" disabled={!message.trim()}>Blink</button>
        </form>
      )}

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
