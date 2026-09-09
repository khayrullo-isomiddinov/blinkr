import './MessageGroupPage.css';
import React from "react";
import { useParams } from 'react-router-dom';

import AppShell from '../components/layout/AppShell';
import MessageGroupFeed from '../components/messages/MessageGroupFeed';
import MessagesFeed from '../components/messages/MessageFeed';
import MessagesForm from '../components/messages/MessageForm';
import { useAuthUser } from '../lib/useAuthUser';
import { apiFetch } from '../lib/api';

export default function MessageGroupPage() {
  const [messageGroups, setMessageGroups] = React.useState([]);
  const [messages, setMessages] = React.useState([]);
  const dataFetchedRef = React.useRef(false);
  const params = useParams();
  const user = useAuthUser();

  const loadMessageGroupsData = async () => {
    try {
      const res = await apiFetch('/api/message_groups');
      let resJson = await res.json();
      if (res.status === 200) {
        setMessageGroups(resJson)
      } else {
        console.log(res)
      }
    } catch (err) {
      console.log(err);
    }
  };

  const loadMessageGroupData = async () => {
    try {
      const handle = `@${params.handle}`;
      const res = await apiFetch(`/api/messages/${handle}`);
      let resJson = await res.json();
      if (res.status === 200) {
        setMessages(resJson)
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

    loadMessageGroupsData();
    loadMessageGroupData();
  }, [])
  return (
    <AppShell user={user} active="messages">
      <section className='message_groups'>
        <MessageGroupFeed message_groups={messageGroups} />
      </section>
      <div className='messages'>
        <MessagesFeed messages={messages} />
        <MessagesForm setMessages={setMessages} />
      </div>
    </AppShell>
  );
}