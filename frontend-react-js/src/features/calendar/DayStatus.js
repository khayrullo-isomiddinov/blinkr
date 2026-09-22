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

// The small marker on a day. Completed is a squared "stamp" (the app's one deliberate non-circular status glyph);
// live states stay circular dots -- filled/pulsing/hollow -- since those read as status lights, not checkboxes.
export function DayMarker({ status, size = 24 }) {
  const box = { width: size, height: size };
  if (status === 'completed') {
    return <span style={box} className="flex flex-none items-center justify-center rounded-md bg-accent text-accent-ink"><Check width={size * 0.56} height={size * 0.56} /></span>;
  }
  if (status === 'in_progress') {
    return <span style={box} className="flex flex-none items-center justify-center rounded-full border-2 border-accent"><span className="h-2 w-2 rounded-full bg-accent motion-safe:animate-pulse" /></span>;
  }
  if (status === 'planned' || status === 'missed') {
    return <span style={box} className={`flex-none rounded-full border-2 ${status === 'missed' ? 'border-ink-600' : 'border-ink-500'}`} />;
  }
  return null;
}
