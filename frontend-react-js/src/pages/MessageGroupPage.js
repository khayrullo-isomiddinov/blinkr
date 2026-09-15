import React from "react";
import { Link, useParams } from 'react-router-dom';

import { useAuthUser } from '../lib/useAuthUser';
import { apiFetch } from '../lib/api';
import { signOut } from '../lib/auth';
import { relativeTime } from '../lib/time';

export default function MessageGroupPage() {
  const [messageGroups, setMessageGroups] = React.useState([]);
  const [messages, setMessages] = React.useState([]);
  const [message, setMessage] = React.useState('');
  const dataFetchedRef = React.useRef(false);
  const params = useParams();
  const user = useAuthUser();

  React.useEffect(()=>{
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    apiFetch('/api/message_groups')
      .then((res) => res.json())
      .then((resJson) => setMessageGroups(resJson))
      .catch((err) => console.log(err));

    apiFetch(`/api/messages/@${params.handle}`)
      .then((res) => res.json())
      .then((resJson) => setMessages(resJson))
      .catch((err) => console.log(err));
  }, [params.handle])

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    try {
      const res = await apiFetch('/api/messages', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, user_receiver_handle: params.handle }),
      });
      const data = await res.json();
      if (res.status === 200) {
        setMessages((current) => [...current, data]);
        setMessage('');
      } else {
        console.log(res);
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

      <h2>Conversations</h2>
      <ul>
        {messageGroups.map((group) => (
          <li key={group.uuid}>
            <Link to={`/messages/@${group.handle}`}>
              {group.handle === params.handle ? <strong>@{group.handle}</strong> : `@${group.handle}`}
            </Link>
          </li>
        ))}
      </ul>

      <h1>@{params.handle}</h1>

      <ul>
        {messages.map((msg) => (
          <li key={msg.uuid}>
            <strong>{!!user && msg.handle === user.handle ? 'You' : `@${msg.handle}`}</strong> · {relativeTime(msg.created_at)}
            <p>{msg.message}</p>
          </li>
        ))}
      </ul>
      {messages.length === 0 && <p>No messages yet -- say hi!</p>}

      <form onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Send a direct message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit" disabled={!message.trim()}>Send</button>
      </form>
    </div>
  );
}
