import './MessageGroupsPage.css';
import React from "react";

import AppShell from '../components/layout/AppShell';
import MessageGroupFeed from '../components/messages/MessageGroupFeed';
import { useAuthUser } from '../lib/useAuthUser';
import { apiFetch } from '../lib/api';

export default function MessageGroupsPage() {
  const [messageGroups, setMessageGroups] = React.useState([]);
  const dataFetchedRef = React.useRef(false);
  const user = useAuthUser();

  const loadData = async () => {
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

  React.useEffect(()=>{
    //prevents double call
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    loadData();
  }, [])
  return (
    <AppShell user={user} active="messages">
      <section className='message_groups'>
        <MessageGroupFeed message_groups={messageGroups} />
      </section>
    </AppShell>
  );
}