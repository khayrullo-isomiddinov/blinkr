import React from 'react';
import ConversationListItem from './ConversationListItem';

export default function ConversationList({ groups, activeHandle }) {
  return (
    <div className="flex flex-col h-full w-full md:w-[300px] shrink-0 border-r border-outline-variant/30">
      <div className="px-space-sm pt-space-md pb-space-sm shrink-0">
        <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight px-space-xs">Messages</h1>
      </div>
      <div className="flex flex-col gap-space-2xs px-space-sm overflow-y-auto flex-1">
        {groups.map((group) => (
          <ConversationListItem key={group.uuid} group={group} active={group.handle === activeHandle} />
        ))}
        {groups.length === 0 && (
          <div className="py-space-xl flex items-center justify-center text-outline font-label-sm text-label-sm text-center">
            No conversations yet.
          </div>
        )}
      </div>
    </div>
  );
}
