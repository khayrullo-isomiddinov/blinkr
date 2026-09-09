import React from "react";

import AppShell from '../components/layout/AppShell';
import ConversationList from '../components/messages/ConversationList';
import { useAuthUser } from '../lib/useAuthUser';
import { apiFetch } from '../lib/api';

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

  return (
    <AppShell user={user} active="messages" wide>
      <ConversationList groups={messageGroups} />
      <div className="hidden md:flex flex-1 items-center justify-center text-outline font-label-sm text-label-sm">
        Select a conversation to start messaging.
      </div>
    </AppShell>
  );
}
