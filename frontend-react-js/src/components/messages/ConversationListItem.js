import React from 'react';
import { Link } from 'react-router-dom';
import { relativeTime } from '../../lib/time';

export default function ConversationListItem({ group, active }) {
  const initial = (group.display_name || group.handle || '?').charAt(0).toUpperCase();

  return (
    <Link
      to={`/messages/@${group.handle}`}
      className={`flex items-center gap-space-sm p-space-sm rounded-xl transition-colors ${
        active ? 'bg-surface-container-high' : 'hover:bg-surface-container'
      }`}
    >
      <span className="w-11 h-11 rounded-full bg-surface-container-highest flex items-center justify-center font-headline-sm text-headline-sm text-primary font-bold shrink-0">
        {initial}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-space-xs">
          <span className="font-label-md text-label-md font-semibold text-on-surface truncate">
            {group.display_name || group.handle}
          </span>
          <span className="font-label-xs text-label-xs text-outline shrink-0">{relativeTime(group.created_at)}</span>
        </div>
        <span className="font-body-sm text-body-sm text-outline truncate block">@{group.handle}</span>
      </div>
    </Link>
  );
}
