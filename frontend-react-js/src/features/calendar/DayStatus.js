import React from 'react';
import { Check } from '../../components/icons';

const STATUS = {
  completed: ['Completed', 'text-accent'],
  in_progress: ['In progress', 'text-accent'],
  planned: ['Planned', 'text-fg-soft'],
  missed: ['Missed', 'text-fg-mute'],
  rest: ['Rest', 'text-fg-mute'],
};

export default function DayStatus({ status, className = '' }) {
  const [label, color] = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 font-display text-sm font-bold ${color} ${className}`}>
      {status === 'completed' && <Check width={14} height={14} />}
      {label}
    </span>
  );
}
