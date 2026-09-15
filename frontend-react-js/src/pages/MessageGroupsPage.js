import React from "react";
import { Link } from "react-router-dom";

import { useAuthUser } from '../lib/useAuthUser';
import { apiFetch } from '../lib/api';
import { signOut } from '../lib/auth';
import { relativeTime } from '../lib/time';

export default function MessageGroupsPage() {
  const [messageGroups, setMessageGroups] = React.useState([]);
  const dataFetchedRef = React.useRef(false);
  const user = useAuthUser();

  React.useEffect(()=>{
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    apiFetch('/api/message_groups')
      .then((res) => res.json())
      .then((resJson) => setMessageGroups(resJson))
      .catch((err) => console.log(err));
  }, [])

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

      <h1>Messages</h1>

      <ul>
        {messageGroups.map((group) => (
          <li key={group.uuid}>
            <Link to={`/messages/@${group.handle}`}>
              {group.display_name || group.handle} (@{group.handle}) · {relativeTime(group.created_at)}
            </Link>
          </li>
        ))}
      </ul>
      {messageGroups.length === 0 && <p>No conversations yet.</p>}
    </div>
  );
}
