import React from 'react';
import { relativeTime } from '../../lib/time';

export default function MessageBubble({ message, isMine }) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col gap-space-2xs max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-space-md py-space-sm rounded-xl font-body-md text-body-md whitespace-pre-wrap ${
            isMine
              ? 'bg-primary-container text-on-primary-container rounded-br-sm'
              : 'bg-surface-container-high text-on-surface rounded-bl-sm'
          }`}
        >
          {message.message}
        </div>
        <span className="font-label-xs text-label-xs text-outline px-space-2xs">{relativeTime(message.created_at)}</span>
      </div>
    </div>
  );
}
