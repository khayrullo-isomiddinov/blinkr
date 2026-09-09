import React from "react";
import { Link, useParams } from 'react-router-dom';

import AppShell from '../components/layout/AppShell';
import ConversationList from '../components/messages/ConversationList';
import MessageBubble from '../components/messages/MessageBubble';
import MessageComposer from '../components/messages/MessageComposer';
import { useAuthUser } from '../lib/useAuthUser';
import { apiFetch } from '../lib/api';

export default function MessageGroupPage() {
  const [messageGroups, setMessageGroups] = React.useState([]);
  const [messages, setMessages] = React.useState([]);
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

  return (
    <AppShell user={user} active="messages" wide>
      <ConversationList groups={messageGroups} activeHandle={params.handle} />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-space-sm p-space-sm border-b border-outline-variant/30 shrink-0">
          <Link to="/messages" className="md:hidden w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </Link>
          <span className="font-headline-sm text-headline-sm text-on-surface">@{params.handle}</span>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col gap-space-sm p-space-md">
          {messages.map((message) => (
            <MessageBubble key={message.uuid} message={message} isMine={!!user && message.handle === user.handle} />
          ))}
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-outline font-label-sm text-label-sm">
              No messages yet -- say hi!
            </div>
          )}
        </div>
        <MessageComposer setMessages={setMessages} />
      </div>
    </AppShell>
  );
}
